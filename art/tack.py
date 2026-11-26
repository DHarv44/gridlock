"""Tack for horse.py's horses: the western stock saddle (or the army's McClellan) on its blanket,
stirrups, cinch and the saddle's extras (bedroll, saddlebags, rifle scabbard, lariat); the bridle
and reins; and driving harness (collar and hames, back pad, traces, breeching, blinkers).

Everything is laid onto the horse's barrel through Horse.on_barrel / section / head_point, so it
fits every breed. Looks (specs "saddle", "bridle", "harness"): x is in the reference horse's
metres along the length; materials by name (materials.py)."""
import math

import horse
import kit
import materials as M


def _patch(name, h, xs, a0, a1, lift, col, mat, k=9, thick=0.008):
    """A sheet draped over the barrel: from x = xs[0] to xs[-1], round from angle a0 to a1."""
    rings = [[h.on_barrel(x, a0 + (a1 - a0) * j / (k - 1), lift) for j in range(k)] for x in xs]
    v, f = kit.loft(rings, cap0=False, cap1=False, closed=False)
    ob = kit.recalc(kit.mesh(name, v, f, col, M.get(mat), smooth=True, sharp=60))
    if thick:
        m = ob.modifiers.new("Solid", 'SOLIDIFY')
        m.thickness, m.offset = thick, 1.0
    return ob


def _girth(name, h, x, lift, col, mat, r=0.016, a=1.2):
    """A band round the belly (cinch, belly band), from one side under to the other."""
    n = 9
    pts = [h.on_barrel(x, a + (2 * math.pi - 2 * a) * j / (n - 1), lift) for j in range(n)]
    return kit.tube(name, pts, r, col, M.get(mat), n=5)


def _xs(h, x0, x1, n=5):
    return [h.ax + (x0 + (x1 - x0) * i / (n - 1)) * h.sx for i in range(n)]


def saddle(h, look):
    col, su = h.col, h.su
    x0, x1 = look.get("x", [0.2, -0.3])
    xc = h.ax + (x0 + x1) / 2 * h.sx
    zc = h.top(xc)
    out = []
    # Blanket (with a border of another colour showing round it), then the leather skirts.
    bl = look.get("blanket", "blanket_red")
    if look.get("border"):
        out.append(_patch("border", h, _xs(h, x0 + 0.06, x1 - 0.06), -1.32, 1.32, 0.006, col, look["border"]))
    out.append(_patch("blanket", h, _xs(h, x0 + 0.03, x1 - 0.03), -1.25, 1.25, 0.012, col, bl))
    lea = look.get("leather", "leather")
    mclellan = look.get("type") == "mcclellan"
    out.append(_patch("skirt", h, _xs(h, x0 - 0.02, x1 + 0.04), -1.0 if not mclellan else -0.75, 1.0 if not mclellan else 0.75, 0.03, col, lea, thick=0.012))
    # The seat: a dished loft, the fork and horn in front, the cantle behind.
    sx = h.sx
    seat = [(xc + 0.2 * sx, zc + 0.08, 0.06, 0.1), (xc + 0.13 * sx, zc + 0.07, 0.05, 0.16), (xc + 0.0, zc + 0.05, 0.045, 0.18),
            (xc - 0.13 * sx, zc + 0.06, 0.045, 0.18), (xc - 0.21 * sx, zc + 0.08, 0.05, 0.15)]
    out.append(horse.loft_path("seat", [(x, z, hu * su, hs * h.sy) for x, z, hu, hs in seat], col, lea, y=h.ay, n=10, e=2.6))
    fx = xc + 0.2 * sx
    out.append(horse.loft_path("fork", [(fx - 0.03, zc + 0.06, 0.06 * su, 0.12 * h.sy), (fx, zc + 0.16, 0.045 * su, 0.09 * h.sy),
                                        (fx + 0.012, zc + 0.19, 0.03 * su, 0.06 * h.sy)], col, lea, y=h.ay, n=10))
    if not mclellan:
        out.append(kit.tube("horn", [(fx + 0.01, h.ay, zc + 0.17), (fx + 0.02, h.ay, zc + 0.25)], 0.017 * su, col, M.get(lea), n=8))
        out.append(kit.lathe("cap", [(-0.012, 0.0), (-0.012, 0.042 * su), (0.008, 0.045 * su), (0.012, 0.0)], col, M.get(lea), n=10, axis='Z', at=(fx + 0.022, h.ay, zc + 0.262)))
    cy = 0.16 * h.sy
    cant = [(xc - 0.2 * sx + 0.05 * (y / cy) ** 2, h.ay + y, zc + 0.06) for y in [cy * (1 - 2 * i / 6) for i in range(7)]]
    out.append(kit.sweep("cantle", cant, [(-0.01, -0.02), (0.03, -0.02), (0.07, 0.11 if not mclellan else 0.08), (0.04, 0.13 if not mclellan else 0.1)], col, M.get(lea)))
    # Fenders down each side to the stirrups; the cinch under the belly.
    fx0, fx1 = xc - 0.03 * sx, xc + 0.11 * sx
    zs = look.get("stirrup_z", 0.78) * h.sz
    for sd in (1, -1):
        rings = []
        for x in (fx0, fx1):
            zcx, hux, hsx = h.section(x)
            ring = [h.on_barrel(x, sd * a, 0.04 + 0.02 * a) for a in (0.75, 1.1, 1.4, 1.62)]
            low = ring[-1]
            ring += [(x, low[1], (low[2] + zs + 0.12) / 2), (x, low[1], zs + 0.12)]
            rings.append(ring if sd > 0 else ring[::-1])
        v, f = kit.loft(rings, cap0=False, cap1=False, closed=False)
        fen = kit.recalc(kit.mesh("fender", v, f, col, M.get(lea if not mclellan else "leather_black"), smooth=True, sharp=50))
        fen.modifiers.new("Solid", 'SOLIDIFY').thickness = 0.012
        out.append(fen)
        ys = rings[0][-1 if sd > 0 else 0][1]
        sxm = (fx0 + fx1) / 2
        loop = [(sxm - 0.06, ys, zs + 0.12), (sxm - 0.065, ys, zs + 0.02), (sxm - 0.05, ys, zs), (sxm + 0.05, ys, zs), (sxm + 0.065, ys, zs + 0.02), (sxm + 0.06, ys, zs + 0.12)]
        out.append(kit.tube("stirrup", loop, 0.013, col, M.get("wood_dark" if not mclellan else "iron"), n=5))
        out.append(kit.box("tread", sxm - 0.055, sxm + 0.055, ys - 0.05, ys + 0.05, zs - 0.012, zs + 0.012, col, M.get("wood_dark" if not mclellan else "iron")))
    out.append(_girth("cinch", h, xc + 0.13 * sx, 0.035, col, look.get("cinch", "rope"), r=0.02))
    for ex in look.get("extras", []):
        out += EXTRAS[ex](h, xc, zc, col, look)
    return out


def _bedroll(h, xc, zc, col, look):
    x = xc - 0.32 * h.sx
    z = h.top(x) + 0.07
    w = 0.26 * h.sy
    out = [kit.lathe("bedroll", [(-w, 0.0), (-w, 0.065), (w, 0.065), (w, 0.0)], col, M.get(look.get("roll", "blanket_grey")), n=10, axis='Y', at=(x, h.ay, z))]
    for sd in (1, -1):
        out.append(kit.lathe("strap", [(sd * w * 0.6 - 0.015, 0.068), (sd * w * 0.6 + 0.015, 0.068)], col, M.get("leather_dark"), n=10, axis='Y', at=(x, h.ay, z), caps=False))
    return out


def _saddlebags(h, xc, zc, col, look):
    """A pair of bags behind the cantle, slung over the loins by a strap across the back: each
    hangs flat against the flank from high on the side, so from above they hug the horse."""
    out = []
    x = xc - 0.3 * h.sx
    bags, lea = M.get(look.get("bags", "leather_dark")), M.get(look.get("leather", "leather"))
    top = h.top(x)
    for sd in (1, -1):
        p = h.on_barrel(x, sd * 0.95, 0.0)
        y0, y1 = sorted((p[1], p[1] + sd * 0.07))
        out.append(kit.box("bag", x - 0.13, x + 0.13, y0, y1, p[2] - 0.26, p[2] + 0.01, col, bags, bev=0.025, seg=2))
        out.append(kit.box("flap", x - 0.135, x + 0.135, y0 - 0.005, y1 + 0.005, p[2] - 0.1, p[2] + 0.02, col, lea, bev=0.015))
    # The strap joining them over the back.
    w = h.section(x)[2]
    out.append(kit.box("bag_strap", x - 0.05, x + 0.05, h.ay - w * 0.85, h.ay + w * 0.85, top - 0.01, top + 0.012, col, lea))
    return out


def _scabbard(h, xc, zc, col, look):
    """A rifle in its boot along the off (right, -y) side, stock forward and up by the fork."""
    a = h.on_barrel(xc + 0.28 * h.sx, -1.45, 0.08)
    b = h.on_barrel(xc - 0.45 * h.sx, -1.75, 0.07)
    a = (a[0], a[1], a[2] + 0.05)
    b = (b[0], b[1], b[2] - 0.18)
    out = [kit.tube("boot", [a, b], 0.04, col, M.get(look.get("leather", "leather")), n=8)]
    d = [q - p for p, q in zip(a, b)]
    stock_end = (a[0] - d[0] * 0.28, a[1] - d[1] * 0.28, a[2] - d[2] * 0.28)
    out.append(kit.tube("stock", [a, stock_end], 0.032, col, M.get("wood"), n=6))
    return out


def _lariat(h, xc, zc, col, look):
    """A coiled rope hung on the near (left) side of the fork."""
    p = h.on_barrel(xc + 0.16 * h.sx, 1.2, 0.07)
    n, r = 12, 0.12
    out = []
    for k in range(3):
        rr = r - k * 0.012
        loop = [(p[0] + rr * math.cos(2 * math.pi * i / n), p[1] + 0.012 * k, p[2] - rr + rr * math.sin(2 * math.pi * i / n)) for i in range(n + 1)]
        out.append(kit.tube("lariat", loop, 0.009, col, M.get("rope"), n=4, caps=False))
    return out


EXTRAS = {"bedroll": _bedroll, "saddlebags": _saddlebags, "scabbard": _scabbard, "lariat": _lariat}


def _ring(h, t, lift, n=10, a0=0.0, a1=2 * math.pi):
    return [h.head_point(t, (1 + lift) * math.cos(a0 + (a1 - a0) * i / n), (1 + lift) * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def bridle(h, look, reins="saddle", to=None):
    """Headstall, browband and noseband; cheek pieces to the bit; reins back to the saddle horn or,
    for a driven horse, through the back pad's terrets to `to` (the driver)."""
    col = h.col
    lea = M.get(look.get("leather", "leather_dark"))
    out = [kit.tube("headstall", _ring(h, 0.1, 0.1), 0.009, col, lea, n=4, caps=False),
           kit.tube("noseband", _ring(h, 0.7, 0.1), 0.009, col, lea, n=4, caps=False)]
    bits = []
    for sd in (1, -1):
        top = h.head_point(0.1, 0.0, sd * 1.1)
        bit = h.head_point(0.84, -0.45, sd * 1.12)
        out.append(kit.tube("cheek", [top, h.head_point(0.45, -0.1, sd * 1.1), bit], 0.008, col, lea, n=4))
        out.append(kit.lathe("bit", [(-0.006, 0.0), (-0.006, 0.026), (0.006, 0.026), (0.006, 0.0)], col, M.get("iron"), n=8, axis='Y', at=bit))
        bits.append(bit)
        if look.get("blinkers"):
            ex, ey, ez = h.head_point(0.3, 0.45, sd * 1.3)
            out.append(kit.box("blinker", ex - 0.05, ex + 0.04, ey - 0.006, ey + 0.006, ez - 0.035, ez + 0.04, col, M.get("leather_black")))
    if reins == "saddle":
        x = h.ax + 0.17 * h.sx
        hand = (x + 0.1, h.ay, h.top(x) + 0.12)
        sag = [(b[0] - 0.15, b[1] * 0.5 + h.ay * 0.5 + (b[1] - h.ay) * 0.6, b[2] - 0.1) for b in bits]
        out.append(kit.tube("reins", [bits[0], sag[0], hand, sag[1], bits[1]], 0.007, col, lea, n=4))
    else:  # driven: through the terrets back to the driver's hands, or tied off at the pad
        for b in bits:
            sd = 1 if b[1] > h.ay else -1
            terret = (h.ax, h.ay + sd * 0.07, h.top(h.ax) + 0.1)
            neck = (h.ax + 0.6 * h.sx, h.ay + sd * 0.1, h.top(h.ax + 0.5 * h.sx) + 0.15)
            out.append(kit.tube("rein", [b, neck, terret] + ([to] if to else []), 0.007, col, lea, n=4))
    return out


def collar_frame(h, look):
    """Where the collar sits: the neck section's centre (x, z), half-sizes and its up vector."""
    neck = h.path(h.st["neck"], h.b["neck"])
    i = look.get("collar_at", 1)
    x, z, hu, hs = neck[i]
    a, b = neck[i - 1], neck[i + 1]
    tl = math.hypot(b[0] - a[0], b[1] - a[1])
    return x, z, hu, hs, -(b[1] - a[1]) / tl, (b[0] - a[0]) / tl


def collar_bottom(h, look):
    x, z, hu, hs, ux, uz = collar_frame(h, look)
    return (x - ux * (hu + 0.06), h.ay, z - uz * (hu + 0.06))


def harness(h, look, trace_to):
    """Driving harness: collar and hames at the neck's base, back pad with its terrets, belly band,
    traces back to the singletree (`trace_to`: a point per side, or None to leave them looped),
    breeching round the quarters with hip straps and the crupper."""
    col, su = h.col, h.su
    lea = look.get("leather", "leather_black")
    out = []
    # The collar: a padded ring round the neck where it meets the shoulders.
    x, z, hu, hs, ux, uz = collar_frame(h, look)
    n = 14

    def cring(lift, a0=0.0, a1=2 * math.pi, k=n):
        return [(x + ux * (hu + lift) * math.cos(a0 + (a1 - a0) * j / k), h.ay + (hs + lift) * math.sin(a0 + (a1 - a0) * j / k),
                 z + uz * (hu + lift) * math.cos(a0 + (a1 - a0) * j / k)) for j in range(k + 1)]
    out.append(kit.tube("collar", cring(0.035), 0.045 * su, col, M.get(lea), n=8, caps=False))
    for sd in (1, -1):
        out.append(kit.tube("hame", cring(0.07, sd * 0.15, sd * 2.6, 8), 0.014 * su, col, M.get("brass"), n=5))
    # Back pad, terrets, belly band.
    out.append(_patch("pad", h, _xs(h, 0.12, -0.12, 3), -1.15, 1.15, 0.02, col, lea, k=7, thick=0.02))
    for sd in (1, -1):
        p = h.on_barrel(h.ax, sd * 0.35, 0.05)
        out.append(kit.lathe("terret", [(-0.006, 0.02), (-0.006, 0.035), (0.006, 0.035), (0.006, 0.02)], col, M.get("brass"), n=8, axis='X', at=(p[0], p[1], p[2] + 0.03)))
    out.append(_girth("bellyband", h, h.ax + 0.02 * h.sx, 0.03, col, lea, r=0.018))
    # Traces: from the hames' sides along the flanks.
    for k, sd in enumerate((1, -1)):
        start = (x + ux * 0.02, h.ay + sd * (hs + 0.07), z - uz * hu * 0.25)
        mid = h.on_barrel(h.ax + 0.0, sd * 1.62, 0.05)
        back = h.on_barrel(h.ax - 0.45 * h.sx, sd * 1.75, 0.07)
        if trace_to:
            end = trace_to[k]
            out.append(kit.tube("trace", [start, mid, back, end], 0.014, col, M.get(lea), n=5))
        else:  # unhooked: looped up and tied off at the back pad
            out.append(kit.tube("trace", [start, mid, back, (back[0] + 0.15, back[1], back[2] + 0.12), (h.ax, mid[1], mid[2] + 0.12)], 0.014, col, M.get(lea), n=5))
    # Breeching round the quarters, hip straps over the croup, crupper along the spine.
    xb, zb = h.ax - 0.42 * h.sx, 0.98 * h.sz
    _, _, hsb = h.section(h.ax - 0.55 * h.sx)
    rx, ry = 0.4 * h.sx, hsb + 0.07
    pts = [(xb - rx * math.cos(t), h.ay + ry * math.sin(t), zb) for t in [math.pi * (-0.5 + j / 10) for j in range(11)]]
    out.append(kit.tube("breeching", pts, 0.02, col, M.get(lea), n=5))
    xh = h.ax - 0.5 * h.sx
    out.append(kit.tube("hipstrap", [h.on_barrel(xh, -1.45 + 2.9 * j / 8, 0.02) for j in range(9)], 0.012, col, M.get(lea), n=4))
    crupper = [(h.ax - (0.1 + 0.66 * j / 6) * h.sx, h.ay, 0.0) for j in range(7)]
    crupper = [(cx, cy, h.top(cx) + 0.018) for cx, cy, _ in crupper]
    out.append(kit.tube("crupper", crupper, 0.012, col, M.get(lea), n=4))
    return out
