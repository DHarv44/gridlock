"""Wagons (Redrock): the running gear every wagon shares (spoked wheels with iron tyres, axle beds,
bolsters, the reach, the front hounds that take the pole, a brake), and the body on top from
wagon_bodies.py (buckboard, covered, coach, buggy, water, gatling).

A wagon is a trailer (`<id>_trailer`, sized to the team's trailer spec: its front edge is the hitch,
where the team's pole ends) or stands on its own (`standing: true`, the `*_standing` vehicles: the
pole lowered to the ground in front). Positions are metres from the wagon's centre (x + = front,
z up); materials by name. Nothing is `paint`: a trailer is tinted with its team's coat colour.

gear: front / rear = [x, wheel radius]; track = half the distance between the wheels' centre
planes; tw = tyre width; spokes = [front, rear]; wheel / tyre / frame = materials; bed = bed height.
"""
import math

import kit
import materials as M
import wagon_bodies
import wagon_special


def spoked_wheel(name, x, y, r, w, n_spokes, side, col, wood, tyre):
    """Iron tyre on a wooden felloe, a turned hub, dished spokes. side +1 = left (+y)."""
    n = 20
    out = [kit.lathe(name + "_tyre", [(-w / 2, r - 0.022), (-w / 2, r), (w / 2, r), (w / 2, r - 0.022), (-w / 2, r - 0.022)], col, tyre, n=n, axis='Y', at=(x, y, r), caps=False),
           kit.lathe(name + "_felloe", [(-w / 2 + 0.006, r - 0.075), (-w / 2 + 0.006, r - 0.02), (w / 2 - 0.006, r - 0.02), (w / 2 - 0.006, r - 0.075),
                                        (-w / 2 + 0.006, r - 0.075)], col, wood, n=n, axis='Y', at=(x, y, r), caps=False)]
    hub = [(-0.16, 0.0), (-0.16, 0.05), (-0.12, 0.075), (-0.03, 0.085), (0.06, 0.08), (0.1, 0.06), (0.14, 0.045), (0.15, 0.0)]
    out.append(kit.lathe(name + "_hub", [(side * a, rr * min(1.0, r / 0.5) ** 0.5) for a, rr in hub], col, wood, n=12, axis='Y', at=(x, y, r)))
    out.append(kit.lathe(name + "_cap", [(side * 0.15, 0.0), (side * 0.15, 0.045), (side * 0.16, 0.04), (side * 0.165, 0.0)], col, tyre, n=10, axis='Y', at=(x, y, r)))
    dish = side * 0.03
    for k in range(n_spokes):
        a = 2 * math.pi * (k + 0.5) / n_spokes
        c, s = math.cos(a), math.sin(a)
        out.append(kit.tube(name + "_sp", [(x + c * 0.07, y - dish, r + s * 0.07), (x + c * (r - 0.07), y, r + s * (r - 0.07))], 0.016 if r > 0.45 else 0.013, col, wood, n=4, caps=False))
    return out


def gear(st, L, W, col):
    g = st["gear"]
    wood, tyre, frame = M.get(g.get("wheel", "wood")), M.get(g.get("tyre", "iron")), M.get(g.get("frame", "wood_dark"))
    (xf, rf), (xr, rr) = g["front"], g["rear"]
    tr, tw = g["track"], g.get("tw", 0.07)
    sf, sr = g.get("spokes", [12, 14])
    bed = g.get("bed", max(rf, rr) + 0.1)
    out = []
    for x, r, n in ((xf, rf, sf), (xr, rr, sr)):
        for sd in (1, -1):
            out += spoked_wheel("wh", x, sd * tr, r, tw, n, sd, col, wood, tyre)
        # Axle bed across, iron arms into the hubs, a bolster up to the bed.
        out.append(kit.box("axle", x - 0.06, x + 0.06, -tr + 0.18, tr - 0.18, r - 0.07, r + 0.05, col, frame, bev=0.01))
        out.append(kit.tube("arm", [(x, -tr - 0.05, r), (x, tr + 0.05, r)], 0.03, col, tyre, n=6))
        if bed - (r + 0.05) > 0.03:
            out.append(kit.box("bolster", x - 0.07, x + 0.07, -tr + 0.25, tr - 0.25, r + 0.05, bed, col, frame, bev=0.01))
    zr = min(rf, rr) - 0.03
    out.append(kit.tube("reach", [(xf + 0.05, 0, rf - 0.04), (xr - 0.25, 0, rr - 0.04)], 0.035, col, frame, n=6))
    # Hounds from the front axle forward to the pole socket at the front edge.
    xe = L / 2
    for sd in (1, -1):
        out.append(kit.tube("hound", [(xf - 0.35, sd * 0.3, rf - 0.02), (xf, sd * 0.32, rf - 0.02), (xe - 0.05, sd * 0.07, 0.7)], 0.03, col, frame, n=5))
    out.append(kit.box("socket", xe - 0.18, xe, -0.08, 0.08, 0.64, 0.76, col, tyre))
    if st.get("standing"):
        # The pole down on the ground ahead, the doubletree hung on it.
        pl = st.get("pole_len", 2.2)
        out.append(kit.tube("pole", [(xe - 0.1, 0, 0.7), (xe + pl * 0.55, 0, 0.32), (xe + pl, 0, 0.05)], 0.045, col, frame, n=8))
        out.append(kit.lathe("pole_tip", [(0.0, 0.0), (0.0, 0.05), (0.12, 0.04), (0.14, 0.0)], col, tyre, n=8, axis='X', at=(xe + pl - 0.04, 0, 0.06)))
        xd = xe + 0.25
        zd = 0.7 - (0.7 - 0.32) * 0.35 / (pl * 0.55) - 0.02
        out.append(kit.tube("doubletree", [(xd, 0.42, zd), (xd, -0.42, zd)], 0.035, col, frame, n=6))
        for sd in (1, -1):
            out.append(kit.tube("singletree", [(xd + 0.05, sd * 0.42 + 0.3, zd), (xd + 0.05, sd * 0.42 - 0.3, zd)], 0.025, col, frame, n=6))
    if g.get("brake"):
        xb = xr + rr + 0.05
        out.append(kit.box("brake_beam", xb - 0.04, xb + 0.04, -tr + 0.02, tr - 0.02, rr - 0.05, rr + 0.03, col, frame))
        for sd in (1, -1):
            out.append(kit.box("shoe", xb - 0.06, xb, sd * tr - 0.05, sd * tr + 0.05, rr - 0.12, rr + 0.12, col, tyre))
        lx, lz = g["brake"]
        out.append(kit.tube("brake_lever", [(xb, -tr + 0.06, rr), (lx, -W / 2 + 0.25, lz)], 0.016, col, tyre, n=5))
    return out


def build(vid, st, dims, col):
    L, W, H = dims["length"], dims["width"], dims["height"]
    out = gear(st, L, W, col)
    out += BODIES[st["body"]](st, L, W, H, col)
    return out


BODIES = {**wagon_bodies.BODIES, **wagon_special.BODIES}
