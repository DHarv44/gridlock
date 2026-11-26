"""Wagon bodies (Redrock) on wagon.py's running gear: the buckboard, the covered wagon and the
doctor's buggy, plus the pieces every body uses (plank beds, the driver's bench, cargo). The
stagecoach, water wagon and gatling wagon are in wagon_special.py. Metres from the wagon's centre;
looks from the style (specs/redrock/vehicles.json): `bed` = [x back, x front, half-width, side
height], `bench` = [x, seat height, half-width], `cargo` = [[kind, x, y], ...]."""
import math

import horse
import kit
import materials as M


def plank_bed(x0, x1, hw, z0, hs, col, mat, planks=3, edge="iron"):
    """A floor and plank sides with gaps between the boards, and iron corner straps."""
    m = M.get(mat)
    out = [kit.box("floor", x0, x1, -hw, hw, z0, z0 + 0.05, col, m)]
    ph = hs / planks
    for i in range(planks):
        za, zb = z0 + 0.05 + i * ph + 0.008, z0 + 0.05 + (i + 1) * ph - 0.008
        for sd in (1, -1):
            out.append(kit.box("side", x0, x1, sd * hw - 0.025 if sd > 0 else -hw, hw if sd > 0 else -hw + 0.025, za, zb, col, m))
        for x in (x0, x1):
            out.append(kit.box("end", x - 0.0125, x + 0.0125, -hw + 0.025, hw - 0.025, za, zb, col, m))
    for x in (x0, x1):
        for sd in (1, -1):
            out.append(kit.box("strap", x - 0.03, x + 0.03, sd * hw - 0.03, sd * hw + 0.03, z0, z0 + 0.05 + hs + 0.01, col, M.get(edge)))
    # Stakes down the sides.
    n = max(1, int((x1 - x0) / 0.7))
    for k in range(1, n):
        x = x0 + (x1 - x0) * k / n
        for sd in (1, -1):
            out.append(kit.box("stake", x - 0.025, x + 0.025, sd * (hw + 0.015) - 0.015, sd * (hw + 0.015) + 0.015, z0 - 0.04, z0 + 0.05 + hs, col, M.get(edge if mat != "wood" else "wood_dark")))
    return out


def bench(x, zs, hw, z0, col, seat="leather_black", frame="wood_dark", back=0.28, depth=0.32):
    """The driver's seat: a box on the bed, a cushion with its top at zs, a back rail."""
    f = M.get(frame)
    out = [kit.box("seatbox", x - depth / 2, x + depth / 2, -hw, hw, z0, zs - 0.07, col, f, bev=0.01),
           kit.box("cushion", x - depth / 2 + 0.01, x + depth / 2 - 0.01, -hw + 0.02, hw - 0.02, zs - 0.07, zs, col, M.get(seat), bev=0.025, seg=2)]
    if back:
        xb = x - depth / 2 - 0.02
        out.append(kit.box("seatback", xb - 0.03, xb + 0.01, -hw + 0.02, hw - 0.02, zs + 0.05, zs + back, col, M.get(seat), bev=0.015))
        for sd in (1, -1):
            out.append(kit.tube("rail", [(x - depth / 2 + 0.02, sd * hw, zs - 0.06), (xb - 0.01, sd * hw, zs + back * 0.6), (xb - 0.02, sd * (hw - 0.04), zs + back)], 0.012, col, M.get("iron"), n=5))
    return out


def footboard(x0, x1, z0, z1, hw, col, mat="wood_dark"):
    """A sloping board the driver braces his feet on."""
    return [kit.prism("footboard", [(x0, z0), (x0 + 0.04, z0), (x1, z1), (x1 - 0.04, z1)], -hw, hw, col, M.get(mat))]


def barrel(x, y, z, r, h, col, axis='Z', mat="wood"):
    prof = [(0.0, 0.0), (0.0, r * 0.85), (h * 0.5, r), (h, r * 0.85), (h, 0.0)]
    at = (x, y, z) if axis == 'Z' else (x - h / 2, y, z)
    if axis == 'X':
        at = (0, y, z)
        prof = [(x - h / 2 + a, rr) for a, rr in prof]
    out = [kit.lathe("barrel", prof, (col), M.get(mat), n=12, axis=axis, at=at)]
    for t in (0.12, 0.88):
        rr = r * (0.85 + 0.15 * math.sin(math.pi * t)) + 0.006
        a = h * t
        p = [(a - 0.02, rr), (a + 0.02, rr)] if axis == 'Z' else [(x - h / 2 + a - 0.02, rr), (x - h / 2 + a + 0.02, rr)]
        out.append(kit.lathe("hoop", p, col, M.get("iron"), n=12, axis=axis, at=at, caps=False))
    return out


def cargo(items, z, col):
    out = []
    for kind, x, y in items:
        if kind == "crate":
            out.append(kit.box("crate", x - 0.22, x + 0.22, y - 0.18, y + 0.18, z, z + 0.3, col, M.get("wood_grey"), bev=0.02))
            for d in (-0.1, 0.1):
                out.append(kit.box("slat", x + d - 0.02, x + d + 0.02, y - 0.185, y + 0.185, z + 0.01, z + 0.29, col, M.get("wood_dark")))
        elif kind == "sack":
            out.append(horse.loft_path("sack", [(x - 0.28, z + 0.1, 0.06, 0.1), (x - 0.2, z + 0.11, 0.11, 0.16), (x + 0.12, z + 0.11, 0.11, 0.17), (x + 0.26, z + 0.09, 0.06, 0.08)],
                                       col, "canvas_white", y=y, n=10))
        elif kind == "barrel":
            out += barrel(x, y, z, 0.2, 0.55, col)
        elif kind == "trunk":
            out.append(kit.box("trunk", x - 0.3, x + 0.3, y - 0.2, y + 0.2, z, z + 0.32, col, M.get("leather_dark"), bev=0.03, seg=2))
            for d in (-0.18, 0.18):
                out.append(kit.box("band", x + d - 0.02, x + d + 0.02, y - 0.205, y + 0.205, z, z + 0.325, col, M.get("brass")))
    return out


def lamp(x, y, z, col, facing=1):
    """A brass carriage lamp with a lens that lights up at night."""
    return [kit.lathe("lamp", [(-0.1, 0.0), (-0.1, 0.04), (-0.05, 0.06), (0.08, 0.06), (0.12, 0.03), (0.16, 0.0)], col, M.get("brass"), n=8, axis='Z', at=(x, y, z)),
            kit.box("lens", x + facing * 0.055, x + facing * 0.066, y - 0.035, y + 0.035, z - 0.04, z + 0.06, col, M.get("head"))]


# ---------------------------------------------------------------- bodies

def buckboard(st, L, W, H, col):
    x0, x1, hw, hs = st["bed"]
    z0 = st["gear"]["bed"]
    out = plank_bed(x0, x1, hw, z0, hs, col, st.get("bed_mat", "wood"))
    bx, zs, bw = st["bench"]
    out += bench(bx, zs, bw, z0 + 0.05, col)
    out += footboard(x1, x1 + 0.28, z0 + 0.05, z0 + 0.42, hw, col)
    out += cargo(st.get("cargo", []), z0 + 0.05, col)
    return out


def covered(st, L, W, H, col):
    x0, x1, hw, hs = st["bed"]
    z0 = st["gear"]["bed"]
    out = plank_bed(x0, x1, hw, z0, hs, col, st.get("bed_mat", "wood"))
    # The bonnet: canvas over hoops, its ends raised and flared past the bed.
    zb = z0 + 0.05 + hs
    k = 13
    rings = []
    hb = hw + 0.012  # the canvas is tied down along the top of the bed's sides
    for x, zt, w, dz in st["bonnet"]:
        ring = []
        for j in range(k):
            a = math.pi * j / (k - 1)
            s = math.sin(a) ** 0.55
            ring.append((x, (hb + (w - hb) * s ** 0.5) * math.cos(a), zb + dz * (1 - s) + (zt - zb - dz) * s))
        rings.append(ring)
    v, f = kit.loft(rings, cap0=False, cap1=False, closed=False)
    cv = kit.recalc(kit.mesh("bonnet", v, f, col, M.get(st.get("canvas", "canvas_white")), smooth=True, sharp=50))
    cv.modifiers.new("Solid", 'SOLIDIFY').thickness = 0.012
    out.append(cv)
    for ring in rings[1:-1]:
        out.append(kit.tube("hoop", [(p[0], p[1] * 1.012, zb + (p[2] - zb) * 1.008) for p in ring], 0.012, col, M.get("wood_grey"), n=4))
    # Dark inside behind each puckered end.
    # (The bonnet runs back to front: its second and second-to-last hoops close off the inside.)
    for idx, inward in ((1, 1), (-2, -1)):
        x, zt, w, _ = st["bonnet"][idx]
        x += inward * 0.05
        out.append(horse.loft_path("inside", [(x, zb, zt - zb - 0.06, w - 0.06), (x + inward * 0.01, zb, zt - zb - 0.06, w - 0.06)], col, "interior", n=14))
    bx, zs, bw = st["bench"]
    out += bench(bx, zs, bw, z0 + 0.05, col, back=0.22)
    out += footboard(bx + 0.2, bx + 0.55, z0 - 0.05, z0 + 0.3, bw, col)
    # A jockey box on the near side, a bucket under the back.
    out.append(kit.box("toolbox", -0.6, 0.4, hw, hw + 0.12, z0 + 0.05, z0 + 0.3, col, M.get("wood_dark"), bev=0.01))
    out.append(kit.lathe("bucket", [(0.0, 0.0), (0.0, 0.11), (0.26, 0.14), (0.26, 0.0)], col, M.get("wood_grey"), n=10, axis='Z', at=(x0 - 0.12, 0.25, z0 - 0.42)))
    out += cargo(st.get("cargo", []), z0 + 0.05, col)
    return out


def buggy(st, L, W, H, col):
    """The doctor's buggy: a black lacquered box on four tall wheels, a buttoned seat with its hood
    folded down behind, a curved dash, carriage lamps and the doctor's bag."""
    x0, x1, hw, hs = st["bed"]
    z0 = st["gear"]["bed"]
    lac, lea = M.get("lacquer"), M.get("leather_black")
    out = [kit.box("body", x0, x1, -hw, hw, z0, z0 + hs, col, lac, bev=0.03, seg=2)]
    for sd in (1, -1):
        out.append(kit.box("pin", x0 + 0.02, x1 - 0.02, sd * hw - 0.004, sd * hw + 0.004, z0 + hs - 0.05, z0 + hs - 0.04, col, M.get("coach_red")))
    bx, zs, bw = st["bench"]
    out.append(kit.box("cushion", bx - 0.22, bx + 0.22, -bw, bw, z0 + hs, zs, col, lea, bev=0.03, seg=2))
    out.append(kit.prism("lazyback", [(bx - 0.24, zs - 0.02), (bx - 0.2, zs - 0.02), (bx - 0.25, zs + 0.24), (bx - 0.3, zs + 0.24)], -bw, bw, col, lea, bev=0.015))
    out.append(kit.prism("dash", [(x1, z0 + 0.12), (x1 + 0.03, z0 + 0.12), (x1 + 0.2, z0 + 0.46), (x1 + 0.17, z0 + 0.48)], -hw + 0.03, hw - 0.03, col, lea))
    out.append(kit.box("toe", x1 - 0.02, x1 + 0.16, -hw + 0.03, hw - 0.03, z0 + 0.1, z0 + 0.14, col, lac))
    # The hood, folded: bows fanned back from the seat's corners under a gathered leather roll.
    px, pz = bx - 0.26, zs + 0.06
    bows = []
    for i, ang in enumerate(st.get("hood", [1.38, 1.47, 1.56, 1.65])):
        r = 0.5 - i * 0.025
        ex, ez = px - math.sin(ang) * r, pz + math.cos(ang) * r
        bw2 = bw + 0.02
        bow = [(px, bw2, pz), (ex, bw2, ez), (ex - 0.02, bw2 * 0.6, ez + 0.07), (ex - 0.02, -bw2 * 0.6, ez + 0.07), (ex, -bw2, ez), (px, -bw2, pz)]
        bows.append(bow)
        out.append(kit.tube("bow", bow, 0.011, col, M.get("iron"), n=4))
    rings = [[(p[0] - 0.015, p[1] * 1.03, p[2] + 0.02) for p in bow] for bow in bows]
    v, f = kit.loft(rings, cap0=False, cap1=False, closed=False)
    hood = kit.recalc(kit.mesh("hood", v, f, col, lea, smooth=True, sharp=60))
    hood.modifiers.new("Solid", 'SOLIDIFY').thickness = 0.02
    out.append(hood)
    for sd in (1, -1):
        out.append(kit.tube("joint", [(px, sd * (bw + 0.03), pz), (px - 0.25, sd * (bw + 0.03), pz + 0.05)], 0.01, col, M.get("brass"), n=4))
        out += lamp(x1 + 0.05, sd * (hw + 0.05), z0 + 0.38, col)
    out.append(kit.box("bag", bx - 0.05, bx + 0.2, -bw + 0.05, -bw + 0.3, zs, zs + 0.18, col, M.get("leather_dark"), bev=0.04, seg=2))
    out.append(kit.box("clasp", bx + 0.05, bx + 0.1, -bw + 0.04, -bw + 0.31, zs + 0.17, zs + 0.2, col, M.get("brass")))
    # Elliptic springs over the axles.
    for x in (st["gear"]["front"][0], st["gear"]["rear"][0]):
        for sd in (1, -1):
            y = sd * 0.3
            out.append(kit.tube("spring", [(x - 0.25, y, z0 - 0.02), (x, y, z0 - 0.09), (x + 0.25, y, z0 - 0.02)], 0.018, col, M.get("iron"), n=4))
    return out


BODIES = {"buckboard": buckboard, "covered": covered, "buggy": buggy}
