"""Cars, vans, SUVs, pickups and truck cabs from a style (art/specs/vehicles.json).

A body is two lofts: the lower body (nose to tail, cross-sections following the side silhouette and
the plan shape) and the greenhouse on top (windscreen, roof, rear glass, with pillars where the
style puts them). Wheel arches, cockpits and pickup beds are cut out; lights, grille, plates and
door seams are thin decals laid onto the finished skin. Sizes: x and the silhouette lines are
fractions of length / height, widths fractions of half-width, wheels in metres.
"""
import math

import kit
import materials as M
import parts

BANDS = 9  # faces between the 10 points of a half cross-section


def curve(pts, x):
    """Catmull-Rom through [[x, v]] (sorted by x), clamped at the ends."""
    if x <= pts[0][0]:
        return pts[0][1]
    if x >= pts[-1][0]:
        return pts[-1][1]
    i = max(k for k in range(len(pts) - 1) if pts[k][0] <= x)
    p0, p1, p2, p3 = (pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, len(pts) - 1)])
    t = (x - p1[0]) / (p2[0] - p1[0])
    a, b, c, d = p0[1], p1[1], p2[1], p3[1]
    v = 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3)
    lo, hi = min(b, c), max(b, c)
    return min(max(v, lo - 0.03), hi + 0.03)


class Car:
    def __init__(self, vid, st, dims, col):
        self.id, self.s, self.col = vid, st, col
        self.L, self.W, self.H = dims["length"], dims["width"], dims["height"]
        self.hw = self.W / 2
        self.cr = st.get("crown", 0.03) * self.W

    # ---- the shape
    def zt(self, xf):
        return curve(self.s["top"], xf) * self.H

    def zb(self, xf):
        return curve(self.s["bottom"], xf) * self.H

    def w(self, xf):
        def end(d, r, e):
            if d >= r:
                return 1.0
            t = d / r
            return e + (1 - e) * math.sqrt(max(0.0, 1 - (1 - t) ** 2))
        p = self.s["plan"]
        front, rear = (0.5 - xf) * self.L, (xf + 0.5) * self.L
        k = min(end(front, p["nose"], p["nose_w"]), end(rear, p["tail"], p["tail_w"]))
        return self.hw * k * (1 - p.get("waist", 0.0) * math.sin(math.pi * (xf + 0.5)) ** 8)

    def fender(self, xf):
        """Raised wings over the wheels (low cars whose bonnet sits below the tyre tops)."""
        f = self.s.get("fender", 0.0)
        if not f:
            return 0.0
        wh = self.s["wheel"]
        reach = wh["r"] * 1.7 / self.L
        return max(f * max(0.0, 1 - ((xf - x) / reach) ** 2) for x in wh["x"])

    def half(self, xf):
        w, zt, zb, cr = self.w(xf), self.zt(xf), self.zb(xf), self.cr
        h = zt - zb
        b = self.fender(xf)
        sh = self.s.get("shoulder", 0.13)
        pts = [(0.0, zt), (0.55 * w, zt - 0.3 * cr + 0.35 * b), (0.88 * w, zt - cr + b), (0.975 * w, zt - cr - min(0.05, 0.15 * h) + b),
               (w, zt - cr - min(sh, 0.3 * h) + 0.85 * b), (0.995 * w, zb + 0.45 * h), (0.985 * w, zb + min(0.17, 0.3 * h)),
               (0.95 * w, zb + min(0.04, 0.08 * h)), (0.85 * w, zb), (0.0, zb)]
        # The side runs downward from the shoulder; short end sections must not fold over.
        out = pts[:4]
        for y, z in pts[4:]:
            out.append((y, min(z, out[-1][1] - 0.002)))
        return out

    def band_mat(self, b, xf):
        """Material of band b (0 = roof-centre strip ... 8 = underside) at x."""
        for lv in self.s.get("livery", []):
            if b in lv["bands"] and lv["x"][0] <= xf <= lv["x"][1]:
                return lv["mat"]
        if b >= 7:
            return "underbody"
        if b == 6:
            r = self.s["wheel"]["r"]
            fx, rx = self.s["wheel"]["x"][0], self.s["wheel"]["x"][-1]
            beyond = xf > fx + r * 1.1 / self.L or xf < rx - r * 1.1 / self.L
            return self.s.get("bumper", "trim") if beyond else self.s.get("rocker", "paint")
        if b == 5 and self.s.get("cladding"):
            return self.s["cladding"]
        return "paint"

    # ---- the build
    def lower(self):
        n = self.s.get("stations", 30)
        xs = sorted(set([-0.5 + 0.5 * (1 - math.cos(math.pi * i / (n - 1))) for i in range(n)]))
        rings, mats_of = [], []
        for xf in xs:
            hp = self.half(xf)
            ring = [(xf * self.L, y, z) for y, z in hp] + [(xf * self.L, -y, z) for y, z in reversed(hp[1:-1])]
            rings.append(ring)
        k = len(rings[0])
        v, _ = kit.loft(rings, cap0=False, cap1=False)
        names = sorted({self.band_mat(b, xf) for b in range(BANDS) for xf in xs} | {"paint", "trim", "underbody"})
        idx = {nm: i for i, nm in enumerate(names)}
        faces, fm = [], []
        for i in range(len(rings) - 1):
            xm = (xs[i] + xs[i + 1]) / 2
            for j in range(k):
                j2 = (j + 1) % k
                faces.append((i * k + j, (i + 1) * k + j, (i + 1) * k + j2, i * k + j2))
                b = j if j < 9 else 17 - j
                fm.append(idx[self.band_mat(b, xm)])
        # End faces: strips across between matching points of the two sides.
        for i, xf in ((0, xs[0]), (len(rings) - 1, xs[-1])):
            base = i * k
            for j in range(9):
                a, b2 = j, j + 1
                ma = 0 if a == 0 else (9 if a == 9 else 18 - a)
                mb = 0 if b2 == 0 else (9 if b2 == 9 else 18 - b2)
                quad = [base + a, base + b2, base + mb, base + ma]
                quad = [q for n_, q in enumerate(quad) if q not in quad[:n_]]
                if len(quad) >= 3:
                    faces.append(tuple(quad))
                    fm.append(idx[self.band_mat(j, xf)])
        ob = kit.mesh(self.id + "_body", v, faces, self.col, [M.get(nm) for nm in names], face_mats=fm, smooth=True, sharp=38)
        kit.recalc(ob)
        return ob

    def arches(self, body):
        wh = self.s["wheel"]
        r = wh["r"]
        for x in wh["x"]:
            # One well per wheel, only as deep as the tyre (a full-width cutter would slice a low
            # bonnet in two).
            inner = self.w(x) - wh["w"] - 0.12
            for sd in (1, -1):
                c = kit.lathe("arch_cut", [(sd * inner, r * 1.1 + 0.015), (sd * (self.hw + 0.5), r * 1.1 + 0.015)], self.col,
                              M.get("underbody"), n=20, axis='Y', at=(x * self.L, 0, r + 0.02), smooth=False)
                kit.cut(body, c)
        return body

    def cuts(self, body):
        """Cockpits (open cars) and beds (pickups): boxes cut down from the top."""
        for c in self.s.get("cuts", []):
            x0, x1 = c["x"][0] * self.L, c["x"][1] * self.L
            y = self.hw * c.get("y", 0.86)
            z0 = c["z"] * self.H
            cutter = kit.box("cut", x0, x1, -y, y, z0, self.H * 2, self.col, M.get(c.get("mat", "interior")))
            kit.cut(body, cutter)
        return body

    def greenhouse(self):
        g = self.s.get("cabin")
        if not g:
            return None
        cowl, atop, ctop, rear = g["x"]
        roof = g["roof"]
        stops = {cowl, atop, ctop, rear}
        for a, b in g.get("pillars", []):
            stops |= {a, b}
        stops |= set(g.get("side", [rear, cowl]))
        n_mid = 4
        for i in range(1, n_mid):
            stops.add(ctop + (atop - ctop) * i / n_mid)
        xs = sorted(s for s in stops if rear <= s <= cowl)
        roof_w, drip = g.get("roof_w", 0.74), g.get("drip", 0.05)
        rings = []
        for xf in xs:
            w, zt = self.w(xf), self.zt(xf)
            base_y, base_z = 0.87 * w, zt - self.cr - 0.006
            if xf >= atop:
                t = (cowl - xf) / (cowl - atop) if cowl > atop else 1.0
                zr = curve(roof, atop) * self.H
            elif xf <= ctop:
                t = (xf - rear) / (ctop - rear) if ctop > rear else 1.0
                zr = curve(roof, ctop) * self.H
            else:
                t, zr = 1.0, curve(roof, xf) * self.H
            t = max(0.0, min(1.0, t))
            yr = w * roof_w
            target = [(base_y, base_z), (yr + 0.045 * w, zr - drip), (yr, zr - 0.012), (0.0, zr + 0.012 * self.W)]
            hp = []
            for k, (ty, tz) in enumerate(target):
                y0 = base_y if k < 3 else 0.0
                hp.append((y0 + (ty - y0) * t if k else base_y, base_z + (tz - base_z) * t if k else base_z))
            ring = [(xf * self.L, y, z) for y, z in hp] + [(xf * self.L, -y, z) for y, z in reversed(hp[:-1])]
            rings.append(ring)
        k = len(rings[0])
        v, _ = kit.loft(rings, cap0=False, cap1=False, closed=False)
        side = g.get("side", [rear, cowl])
        rear_glass = g.get("rear_glass", True)
        faces, fm = [], []
        for i in range(len(rings) - 1):
            xm = (xs[i] + xs[i + 1]) / 2
            in_pillar = any(a <= xm <= b for a, b in g.get("pillars", []))
            front, back = xm > atop, xm < ctop
            side_glass = side[0] <= xm <= side[1] and not in_pillar
            for j in range(k - 1):
                faces.append((i * k + j, (i + 1) * k + j, (i + 1) * k + j + 1, i * k + j + 1))
                band = j if j < 3 else 5 - j  # 0 side, 1 pillar/drip, 2 roof
                if band == 0:
                    mat = 1 if (side_glass or front) else 0
                elif band == 1:
                    mat = 0
                else:
                    mat = 1 if front or (back and rear_glass) else 0
                fm.append(mat)
        ob = kit.mesh(self.id + "_cabin", v, faces, self.col, [M.get(g.get("mat", "paint")), M.get("glass")], face_mats=fm, smooth=True, sharp=28)
        return kit.recalc(ob)

    def details(self, skin):
        s, L, hw, col = self.s, self.L, self.hw, self.col
        cabin = skin[1]
        surf = parts.Surface([o for o in skin if o])
        out = []
        front_z, rear_z = self.zt(0.5) - self.cr, self.zt(-0.5) - self.cr
        hd = s.get("head", {"y": 0.62, "dz": 0.06, "w": 0.3, "h": 0.1})
        tl = s.get("tail", {"y": 0.7, "dz": 0.05, "w": 0.24, "h": 0.12})
        for sd in (1, -1):
            out.append(parts.decal("head", surf, (L / 2 + 1, sd * hw * hd["y"], front_z - hd["dz"]), (0, 1, 0), (0, 0, 1),
                                   hd["w"], hd["h"], (-1, 0, 0), col, "head", depth=0.012))
            if tl:
                out.append(parts.decal("tail", surf, (-L / 2 - 1, sd * hw * tl["y"], rear_z - tl["dz"]), (0, 1, 0), (0, 0, 1),
                                       tl["w"], tl["h"], (1, 0, 0), col, "tail", depth=0.012))
        gr = s.get("grille", {"w": 0.72, "h": 0.1, "dz": 0.07})
        if gr:
            out.append(parts.decal("grille", surf, (L / 2 + 1, 0, front_z - gr["dz"]), (0, 1, 0), (0, 0, 1),
                                   hw * gr["w"], gr["h"], (-1, 0, 0), col, gr.get("mat", "grille"), nu=6, nv=1, depth=0.008))
        bh = s.get("bumpers", {}) or {}
        for end in bh.get("ends", (1, -1)):
            zp = self.zb(end * 0.5) + bh.get("z", 0.04) + bh.get("h", 0.17) * 0.5
            out.append(parts.decal("plate", surf, (end * (L / 2 + 1), 0, zp), (0, 1, 0), (0, 0, 1), 0.34, 0.09, (-end, 0, 0), col, "plate", nu=2, nv=1))
        # Door shut lines and handles, both sides.
        belt = self.zt(0.0) - self.cr - 0.03
        for x in s.get("seams", []):
            zb = self.zb(x) + 0.1
            for sd in (1, -1):
                out.append(parts.decal("seam", surf, (x * L, sd * (hw + 1), (belt + zb) / 2), (1, 0, 0), (0, 0, 1),
                                       0.012, belt - zb, (0, -sd, 0), col, "grille", nu=1, nv=3, lift=0.002))
        for x in s.get("handles", []):
            for sd in (1, -1):
                out.append(parts.decal("handle", surf, (x * L, sd * (hw + 1), belt - 0.06), (1, 0, 0), (0, 0, 1),
                                       0.12, 0.025, (0, -sd, 0), col, s.get("handle_mat", "trim"), nu=1, nv=1, lift=0.003, depth=0.01))
        mx = s.get("mirrors")
        if mx is not None and cabin is not None:
            for sd in (1, -1):
                y = self.w(mx) * 0.92 * sd
                out += parts.mirror_box("mirror", mx * L, y, self.zt(mx) - self.cr + 0.02, col, side=sd)
        return [o for o in out if o]

    def extras(self):
        """Light bars, roof signs, roof racks."""
        s, L, col = self.s, self.L, self.col
        out = []
        for e in s.get("extras", []):
            x = e.get("x", -0.05)
            z = (curve(s["cabin"]["roof"], x) * self.H + 0.012 * self.W) if s.get("cabin") else self.zt(x)
            if e["kind"] == "lightbar":
                base, lamps = parts.lightbar("lightbar", x * L, z - 0.005, self.hw * e.get("w", 0.62), col)
                out += base + lamps
            elif e["kind"] == "sign":
                out.append(kit.box("sign", x * L - 0.14, x * L + 0.14, -self.hw * 0.32, self.hw * 0.32, z - 0.005, z + 0.16, col, M.get(e.get("mat", "white")), bev=0.03, seg=2))
            elif e["kind"] == "rack":
                for sd in (1, -1):
                    out.append(kit.box("rail", (x - 0.2) * L, (x + 0.2) * L, sd * self.hw * 0.62 - 0.02, sd * self.hw * 0.62 + 0.02, z, z + 0.05, col, M.get("trim"), bev=0.01))
            elif e["kind"] == "seats":
                for sd in (1, -1):
                    y = sd * self.hw * 0.42
                    zb = e["z"] * self.H
                    out.append(kit.box("seat", (x - 0.05) * L, (x + 0.04) * L, y - 0.24, y + 0.24, zb, zb + 0.18, col, M.get("seat"), bev=0.04, seg=2))
                    out.append(kit.box("back", (x - 0.07) * L, (x - 0.04) * L, y - 0.23, y + 0.23, zb + 0.1, zb + 0.62, col, M.get("seat"), bev=0.04, seg=2))
            elif e["kind"] == "gunring":
                out += parts.gun_turret(x * L, z - 0.02, col, shield=e.get("shield", True))
            elif e["kind"] == "screen_post":
                # A split windscreen: a post up the middle from the cowl to the roof.
                g = s["cabin"]
                x0, x1 = g["x"][0] * L, g["x"][1] * L
                z0 = self.zt(g["x"][0]) - self.cr
                z1 = curve(g["roof"], g["x"][1]) * self.H
                out.append(kit.tube("post", [(x0 + 0.01, 0, z0), (x1 + 0.01, 0, z1)], 0.03, col, M.get("paint"), n=6))
            elif e["kind"] == "hatch":
                out.append(kit.lathe("hatch", [(z - 0.01, 0.36), (z + 0.07, 0.34), (z + 0.09, 0.0)], col, M.get("paint"), n=14, axis='Z', at=(x * L, 0, 0)))
            elif e["kind"] == "pushbar":
                # A push bumper in front of the grille: two uprights, two rails, rubber pads.
                xf = L / 2 + 0.12
                z0, z1 = self.zb(0.5) + 0.05, self.zt(0.5) - 0.02
                yw = self.w(0.5) * 0.55
                for sd in (1, -1):
                    out.append(kit.tube("pb_up", [(xf - 0.12, sd * yw, z0), (xf, sd * yw, z0 + 0.08), (xf, sd * yw, z1), (xf - 0.1, sd * yw, z1 + 0.06)], 0.025, col, M.get("trim"), n=6))
                    out.append(kit.box("pb_pad", xf - 0.01, xf + 0.035, sd * yw - 0.05, sd * yw + 0.05, z0 + 0.15, z1 - 0.05, col, M.get("tyre"), bev=0.01))
                for zz in (z0 + 0.2, z1 - 0.06):
                    out.append(kit.tube("pb_rail", [(xf, -yw, zz), (xf, yw, zz)], 0.022, col, M.get("trim"), n=6))
            elif e["kind"] == "lettering":
                for sd in (1, -1):
                    out.append(parts.text("letters", e["text"], e["size"], (x * L, sd * (self.w(x) + 0.004), e["z"] * self.H),
                                          (math.pi / 2, 0, 0 if sd < 0 else math.pi), col, e.get("mat", "white"), depth=0.004))
            elif e["kind"] == "spotlight":
                xa = s["cabin"]["x"][0] - 0.01
                y = -self.w(xa) * 0.9
                za = self.zt(xa) - self.cr + 0.15
                out.append(kit.lathe("spot", [(0.0, 0.0), (0.0, 0.06), (0.1, 0.07), (0.11, 0.0)], col, M.get("chrome"), n=10, axis='X', at=(xa * L - 0.05, y - 0.06, za)))
            elif e["kind"] == "windscreen":
                # Open cars: a framed screen standing on the cowl.
                xc = e["x"]
                zc = self.zt(xc) - self.cr
                h = e.get("h", 0.32)
                tilt = e.get("tilt", 0.5)
                w = self.w(xc) * 0.86
                v = [(xc * L, -w, zc), (xc * L, w, zc), (xc * L - h * tilt, w * 0.93, zc + h), (xc * L - h * tilt, -w * 0.93, zc + h)]
                g = kit.recalc(kit.mesh("screen", v, [(0, 1, 2, 3)], col, M.get("glass")))
                m = g.modifiers.new("Solid", 'SOLIDIFY')
                m.thickness = 0.02
                out.append(g)
                out.append(kit.tube("frame", [v[0], v[3], v[2], v[1]], 0.018, col, M.get("trim"), n=6))
        return out

    def bumpers(self):
        """Bars wrapping each end from the wheel arch round to the other side."""
        b = self.s.get("bumpers", {})
        if b is False:
            return []
        r, wx = self.s["wheel"]["r"], self.s["wheel"]["x"]
        out = []
        for end in b.get("ends", (1, -1)):
            xa = (wx[0] if end > 0 else wx[-1]) + end * r * 1.2 / self.L
            n = 7
            xs = [xa + (end * 0.5 - xa) * (1 - math.cos(math.pi / 2 * i / (n - 1))) for i in range(n)]
            xs[-1] = end * 0.4995
            side = [(x * self.L, self.w(x), self.zb(x)) for x in xs]
            # Clockwise from above, so the profile's "out" points away from the car.
            if end > 0:
                path = [(x, -y, z) for x, y, z in side] + [(x, y, z) for x, y, z in reversed(side)]
            else:
                path = [(x, y, z) for x, y, z in side] + [(x, -y, z) for x, y, z in reversed(side)]
            h = b.get("h", 0.17)
            lo = b.get("z", 0.04)
            prof = [(-0.04, lo), (0.03, lo + 0.005), (0.05, lo + h * 0.45), (0.04, lo + h), (-0.04, lo + h + 0.01)]
            out.append(kit.sweep("bumper", path, prof, self.col, M.get(b.get("mat", self.s.get("bumper", "trim")))))
        return out

    def wheels(self):
        wh = self.s["wheel"]
        out = []
        for x in wh["x"]:
            for sd in (1, -1):
                y = sd * (self.w(x) - wh.get("inset", 0.02) - wh["w"] / 2)
                out += parts.wheel("wheel", x * self.L, y, wh["r"], wh["w"], self.col, rim=wh.get("rim", "rim"), spokes=wh.get("spokes", 5), side=sd)
        return out

    def build(self):
        body = self.cuts(self.arches(self.lower()))
        cabin = self.greenhouse()
        bars = self.bumpers()
        rest = self.details([body, cabin] + bars) + self.extras() + self.wheels()
        return [body] + ([cabin] if cabin else []) + bars + rest


def build(vid, st, dims, col):
    return Car(vid, st, dims, col).build()
