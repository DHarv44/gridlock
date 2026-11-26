"""Horses (Redrock): a body lofted from elliptical sections along side-view paths (barrel, neck,
head, legs, tail), so it reads as a horse from the street camera above and side-on in the shop.

The style (specs/redrock/vehicles.json, "horse") is a reference horse in metres, `ref` = [length,
width, height]; each breed is scaled to its own size and given its own build (`build`: girth =
barrel width, depth = barrel depth, neck, head, leg = thickness, feather = hairy fetlocks).
Paths are [x, z, hu, hs]: a point on the path in the side view, the half-size across the path in
that view and the half-width. The barrel is [x, top, bottom, half-width].

Each leg is its own moving part: anim leg_fl / leg_fr / leg_rl / leg_rr (front/rear, left = +y),
pivoting at the top of the leg (shoulder, hip). The coat is `paint` (tinted per horse); mane, tail
and hooves are fixed. Saddles and harness are in tack.py.
"""
import math

import kit
import materials as M


def _sgn_pow(v, p):
    return math.copysign(abs(v) ** p, v)


def loft_path(name, pts, col, mat, y=0.0, n=10, e=2.0, caps=True, sharp=70):
    """Sections along a path in the x-z plane (at side offset y): pts = [(x, z, hu, hs)]. Each ring
    is a superellipse (e = 2 an ellipse, more is boxier) square to the path in the side view."""
    rings = []
    for i, (x, z, hu, hs) in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        tx, tz = b[0] - a[0], b[1] - a[1]
        tl = math.hypot(tx, tz) or 1.0
        ux, uz = -tz / tl, tx / tl
        ring = []
        for k in range(n):
            t = 2 * math.pi * k / n
            c, s = _sgn_pow(math.cos(t), 2 / e), _sgn_pow(math.sin(t), 2 / e)
            ring.append((x + ux * hu * c, y + hs * s, z + uz * hu * c))
        rings.append(ring)
    v, f = kit.loft(rings, cap0=caps, cap1=caps)
    return kit.recalc(kit.mesh(name, v, f, col, M.get(mat), smooth=True, sharp=sharp))


def _lerp_rows(rows, x):
    """Rows sorted by descending x (front to back): the row interpolated at x."""
    if x >= rows[0][0]:
        return list(rows[0])
    for a, b in zip(rows, rows[1:]):
        if b[0] <= x <= a[0]:
            f = (a[0] - x) / ((a[0] - b[0]) or 1.0)
            return [p + (q - p) * f for p, q in zip(a, b)]
    return list(rows[-1])


class Horse:
    """One horse placed at `at` (its reference origin: centre of the length, ground level)."""

    def __init__(self, st, dims, col, at=(0.0, 0.0), key=""):
        self.st, self.col, self.key = st, col, key
        rl, rw, rh = st["ref"]
        self.sx, self.sy, self.sz = dims["length"] / rl, dims["width"] / rw, dims["height"] / rh
        self.su = (self.sx + self.sz) / 2
        self.ax, self.ay = at
        b = st.get("build", {})
        self.b = {k: b.get(k, 1.0) for k in ("girth", "depth", "neck", "head", "leg")}
        self.feather = b.get("feather", 0.0)
        # The barrel in this horse's metres: [x, zc, hu, hs], front to back.
        self.barrel = []
        for x, top, bot, hw in st["barrel"]:
            zc, hu = (top + bot) / 2 * self.sz, (top - bot) / 2 * self.sz * self.b["depth"]
            self.barrel.append([self.ax + x * self.sx, zc, hu, hw * self.sy * self.b["girth"]])
        self.out = []

    # ------------------------------------------------------------ geometry helpers
    def P(self, x, z):
        return self.ax + x * self.sx, z * self.sz

    def path(self, pts, scale=1.0, side=1.0):
        return [(*self.P(x, z), hu * self.su * scale, hs * self.sy * scale * side) for x, z, hu, hs in pts]

    def section(self, x):
        """(z centre, half-height, half-width) of the barrel at x (this horse's metres)."""
        _, zc, hu, hs = _lerp_rows(self.barrel, x)
        return zc, hu, hs

    def on_barrel(self, x, ang, lift=0.0):
        """A point on the barrel's skin at x, `ang` round from the top (radians, + toward +y)."""
        zc, hu, hs = self.section(x)
        return (x, self.ay + (hs + lift) * math.sin(ang), zc + (hu + lift) * math.cos(ang))

    def top(self, x):
        zc, hu, _ = self.section(x)
        return zc + hu

    def head_point(self, t, across=0.0, side=0.0):
        """A point on the head: t from the poll (0) to the muzzle (1), `across` toward the forehead
        (+1) or the jaw (-1) in half-sizes, `side` in half-widths (+ = +y)."""
        pts = self.path(self.st["head"], self.b["head"])
        segs = [math.dist(a[:2], b[:2]) for a, b in zip(pts, pts[1:])]
        d, tot = t * sum(segs), 0.0
        for i, s in enumerate(segs):
            if tot + s >= d or i == len(segs) - 1:
                f = (d - tot) / (s or 1.0)
                a, b = pts[i], pts[i + 1]
                x, z, hu, hs = [p + (q - p) * f for p, q in zip(a, b)]
                tx, tz = b[0] - a[0], b[1] - a[1]
                tl = math.hypot(tx, tz) or 1.0
                return (x + -tz / tl * hu * across, self.ay + hs * side, z + tx / tl * hu * across)
            tot += s

    def add(self, ob, anim=None, pivot=None):
        if anim:
            ob["anim"], ob["pivot"] = anim, pivot
            if self.key:
                ob["part"] = "%s.%s" % (anim, self.key)
        self.out.append(ob)
        return ob

    # ------------------------------------------------------------ the horse
    def build(self):
        st, col = self.st, self.col
        self.add(loft_path("barrel", [(x, zc, hu, hs) for x, zc, hu, hs in self.barrel], col, "paint", y=self.ay, n=16, e=2.2, sharp=85))
        neck = self.path(st["neck"], self.b["neck"])
        self.add(loft_path("neck", neck, col, "paint", y=self.ay, n=12, sharp=85))
        self.add(loft_path("head", self.path(st["head"], self.b["head"]), col, "paint", y=self.ay, n=12))
        self.mane(neck)
        self.face()
        self.add(loft_path("tail", self.path(st["tail"]), col, "hair", y=self.ay, n=8, sharp=85))
        for front, path, pivot in ((True, st["leg_front"], st["pivot_front"]), (False, st["leg_hind"], st["pivot_hind"])):
            for sd in (1, -1):
                self.leg(front, sd, path, pivot)
        return self.out

    def mane(self, neck):
        """A crest of hair along the top of the neck, falling to the off (right) side, and a forelock."""
        m = self.st.get("mane", {})
        h, w = m.get("h", 0.05) * self.su, m.get("w", 0.035) * self.sy
        pts = []
        for i, (x, z, hu, hs) in enumerate(neck[1:], 1):
            a, b = neck[i - 1], neck[min(len(neck) - 1, i + 1)]
            tx, tz = b[0] - a[0], b[1] - a[1]
            tl = math.hypot(tx, tz) or 1.0
            ux, uz = -tz / tl, tx / tl
            pts.append((x + ux * (hu - h * 0.55), z + uz * (hu - h * 0.55), h, w))
        # Tapering out at the withers and at the poll.
        pts[0] = (pts[0][0], pts[0][1], h * 0.55, w * 0.7)
        pts[-1] = (pts[-1][0], pts[-1][1], h * 0.75, w * 0.85)
        self.add(loft_path("mane", pts, col=self.col, mat="hair", y=self.ay - m.get("fall", 0.02) * self.sy, n=8, caps=True, sharp=85))
        fx, fy, fz = self.head_point(0.12, 1.0)
        tx, ty, tz = self.head_point(0.3, 1.05)
        self.add(kit.tube("forelock", [(fx - 0.01, fy, fz + 0.03), ((fx + tx) / 2, fy, (fz + tz) / 2 + 0.01), (tx, ty, tz)], 0.03 * self.su, self.col, M.get("hair"), n=6))

    def face(self):
        """Ears, eyes, nostrils."""
        col, su = self.col, self.su
        for sd in (1, -1):
            bx, by, bz = self.head_point(0.02, 0.7, sd * 0.55)
            e = self.st.get("ears", [0.03, 0.13])
            ear = [(bx, bz, e[0] * su, e[0] * 0.7 * su), (bx - 0.005, bz + e[1] * 0.45 * su, e[0] * 1.05 * su, e[0] * 0.75 * su),
                   (bx + 0.01, bz + e[1] * su, 0.004, 0.004)]
            self.add(loft_path("ear", ear, col, "paint", y=by + sd * 0.012, n=6))
            ex, ey, ez = self.head_point(0.3, 0.45, sd * 0.97)
            self.add(kit.lathe("eye", [(-0.018, 0.0), (-0.012, 0.016), (0.0, 0.02), (0.012, 0.016), (0.018, 0.0)], col, M.get("eye"), n=8, axis='Y', at=(ex, ey, ez)))
            nx, ny, nz = self.head_point(0.93, 0.25, sd * 0.62)
            self.add(kit.lathe("nostril", [(-0.012, 0.0), (0.0, 0.014), (0.012, 0.0)], col, M.get("hair"), n=6, axis='X', at=(nx + 0.02, ny, nz)))

    def leg(self, front, sd, path, pivot):
        """One leg as its own moving part: the limb, its hoof and (drafts) the feathered fetlock."""
        tag = "leg_%s%s" % ("f" if front else "r", "l" if sd > 0 else "r")
        y = self.ay + sd * self.st["legs_y"][0 if front else 1] * self.sy * self.b["girth"]
        lg = self.b["leg"]
        pts = [(*self.P(x, z), hu * self.su * lg, hs * self.su * lg) for x, z, hu, hs in path]
        px, pz = self.P(*pivot)
        pv = (px, y, pz)
        self.add(loft_path(tag, pts, self.col, "paint", y=y, n=10 if not front else 8, sharp=85), tag, pv)
        hx, hz = pts[-1][0], pts[-1][1]
        r0, r1, hh = self.st["hoof"]
        r0, r1, hh = r0 * self.su * lg, r1 * self.su * lg, hh * self.sz
        hoof = kit.lathe("hoof", [(0.0, 0.0), (0.0, r0), (hh, r1), (hh, 0.0)], self.col, M.get("hoof"), n=10, axis='Z', at=(hx + r0 * 0.15, y, 0))
        self.add(hoof, tag, pv)
        if self.feather:
            # Long hair from the fetlock spreading over the hoof, open at the bottom like a skirt.
            fz = pts[-3][1]
            fr = self.feather * self.su
            r0 = pts[-3][2] * 0.95
            self.add(kit.lathe("feather", [(fz + 0.05, r0), (fz - 0.03, r0 * 1.25), (hh + 0.035, fr * 0.9), (hh + 0.005, fr)], self.col, M.get("hair"),
                               n=10, axis='Z', at=(hx - 0.005, y, 0), caps=False), tag, pv)


def build(vid, st, dims, col):
    """A saddle horse: the horse, its saddle and bridle (tack.py)."""
    import tack
    h = Horse(st, dims, col)
    out = h.build()
    out += tack.saddle(h, st.get("saddle", {}))
    out += tack.bridle(h, st.get("bridle", {}), reins="saddle")
    return out
