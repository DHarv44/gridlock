"""Wagon bodies with their own trade (Redrock), on wagon.py's running gear: the stagecoach, the fire
company's water wagon and the army's gatling wagon. Metres from the wagon's centre; looks from the
style (specs/redrock/vehicles.json). Shared pieces (bench, plank bed, lamps) are in wagon_bodies.py."""
import math

import horse
import kit
import materials as M
from wagon_bodies import bench, cargo, footboard, lamp, plank_bed


def _side_y(stations, x):
    for a, b in zip(stations, stations[1:]):
        if b[0] <= x <= a[0]:
            f = (a[0] - x) / ((a[0] - b[0]) or 1.0)
            return a[3] + (b[3] - a[3]) * f
    return stations[-1][3]


def coach(st, L, W, H, col):
    """A Concord-style coach: the rocker-bottomed body slung on leather thoroughbraces between iron
    jacks, doors with windows, the driver's box up front, boots fore and aft, a railed roof with
    luggage, and lamps."""
    body = st["body_stations"]  # [x, z bottom, z top, half-width], front to back
    paint, trim = st.get("paint", "coach_red"), st.get("trim", "coach_yellow")
    out = [horse.loft_path("body", [(x, (zb + zt) / 2, (zt - zb) / 2, hw) for x, zb, zt, hw in body], col, paint, n=20, e=5.0, sharp=50)]
    zt = max(s[2] for s in body)
    xf, xb = body[0][0], body[-1][0]
    hw = max(s[3] for s in body)
    out.append(kit.box("roof", xb + 0.04, xf - 0.04, -hw + 0.03, hw - 0.03, zt - 0.02, zt + 0.04, col, M.get(st.get("roof", paint)), bev=0.02))
    for sd in (1, -1):  # the roof's edge moulding
        out.append(kit.box("eave", xb + 0.03, xf - 0.03, sd * (hw - 0.03) - 0.015, sd * (hw - 0.03) + 0.015, zt + 0.02, zt + 0.06, col, M.get("lacquer")))
    # Doors (centre) and the windows fore and aft, pinstriped; the belt rail along each side.
    for sd in (1, -1):
        for wx0, wx1, door in ((-0.3, 0.3, True), (0.45, 0.8, False), (-0.8, -0.45, False)):
            yw = sd * (_side_y(body, (wx0 + wx1) / 2) + 0.004)
            out.append(kit.box("window", wx0 + 0.06, wx1 - 0.06, min(yw, yw + sd * 0.01), max(yw, yw + sd * 0.01), 1.42, 1.82, col, M.get("glass")))
            if door:
                y = sd * (_side_y(body, 0.0) + 0.012)
                loop = [(wx0, y, 0.82), (wx1, y, 0.82), (wx1, y, 1.92), (wx0, y, 1.92), (wx0, y, 0.82)]
                out.append(kit.tube("door", loop, 0.012, col, M.get(trim), n=4, caps=False))
                out.append(kit.box("handle", wx1 - 0.1, wx1 - 0.04, min(y, y + sd * 0.025), max(y, y + sd * 0.025), 1.3, 1.33, col, M.get("brass")))
        rail = [(x, sd * (_side_y(body, x) + 0.01), 1.36) for x in [xf - 0.08 - (xf - xb - 0.16) * k / 8 for k in range(9)]]
        out.append(kit.tube("belt", rail, 0.014, col, M.get(trim), n=4))
    # Roof rail on posts, luggage under a tarp and a trunk.
    rz = zt + 0.16
    rx0, rx1, ry = xb + 0.1, xf - 0.35, hw - 0.06
    out.append(kit.tube("roofrail", [(rx0, ry, rz), (rx1, ry, rz), (rx1, -ry, rz), (rx0, -ry, rz), (rx0, ry, rz)], 0.014, col, M.get("iron"), n=4, caps=False))
    for x in (rx0, (rx0 + rx1) / 2, rx1):
        for sd in (1, -1):
            out.append(kit.tube("post", [(x, sd * ry, zt + 0.04), (x, sd * ry, rz)], 0.01, col, M.get("iron"), n=4))
    out += cargo([["trunk", -0.55, 0.2]], zt + 0.04, col)
    out.append(horse.loft_path("tarp", [(-0.2, zt + 0.12, 0.08, 0.2), (-0.1, zt + 0.14, 0.12, 0.45), (0.35, zt + 0.14, 0.12, 0.48), (0.5, zt + 0.1, 0.06, 0.3)], col,
                               "canvas_white", n=10, e=3.0))
    # The driver's box: seat on the front of the roof, footboard over the front boot.
    out += bench(xf - 0.18, zt + 0.16, hw - 0.12, zt + 0.02, col, back=0.22, depth=0.3)
    out.append(kit.prism("fboot", [(xf - 0.02, 1.08), (xf - 0.02, zt - 0.12), (xf + 0.3, zt - 0.4), (xf + 0.26, 1.18)], -hw + 0.2, hw - 0.2, col, M.get("leather_black"), bev=0.02))
    out += footboard(xf + 0.28, xf + 0.48, zt - 0.42, zt - 0.22, hw - 0.12, col)
    for sd in (1, -1):  # iron stays from the roof to the footboard
        out.append(kit.tube("stay", [(xf - 0.05, sd * (hw - 0.14), zt + 0.02), (xf + 0.46, sd * (hw - 0.14), zt - 0.24)], 0.01, col, M.get("iron"), n=4))
    out.append(kit.prism("rboot", [(xb + 0.02, 1.0), (xb + 0.02, 1.78), (xb - 0.52, 1.66), (xb - 0.56, 1.08)], -hw + 0.12, hw - 0.12, col, M.get("leather_black"), bev=0.03))
    for sd in (1, -1):
        out += lamp(xf - 0.02, sd * (hw - 0.02), 1.72, col)
        # Thoroughbraces: the body rides on these leather straps, jack to jack.
        y = sd * 0.42
        jf, jr = st["gear"]["front"][0] - 0.15, st["gear"]["rear"][0] + 0.12
        out.append(kit.tube("brace", [(jf, y, 1.12), (jf - 0.3, y, 0.78), (0.0, y, 0.66), (jr + 0.3, y, 0.78), (jr, y, 1.12)], 0.022, col, M.get("leather_dark"), n=5))
        for jx, ax in ((jf, st["gear"]["front"]), (jr, st["gear"]["rear"])):
            out.append(kit.tube("jack", [(ax[0], y, ax[1] + 0.03), (jx, y, 1.16)], 0.03, col, M.get("iron"), n=5))
    return out


def water(st, L, W, H, col):
    """A fire company's water wagon: a hooped wooden tank on cradles, a hand pump at the back, hose
    coiled on the tail, leather fire buckets hung down the sides."""
    z0 = st["gear"]["bed"]
    frame = M.get(st["gear"].get("frame", "wood_dark"))
    x0, x1, r = st["tank"]
    zc = z0 + 0.1 + r
    out = []
    for sd in (1, -1):
        out.append(kit.box("sill", x0 - 0.15, x1 + 0.5, sd * 0.42 - 0.05, sd * 0.42 + 0.05, z0, z0 + 0.1, col, frame, bev=0.01))
    prof = [(x0, 0.0), (x0, r * 0.84), (x0 + 0.12, r * 0.93), ((x0 + x1) / 2, r), (x1 - 0.12, r * 0.93), (x1, r * 0.84), (x1, 0.0)]
    out.append(kit.lathe("tank", prof, col, M.get("wood"), n=20, axis='X', at=(0, 0, zc)))
    for t in (0.07, 0.3, 0.7, 0.93):
        x = x0 + (x1 - x0) * t
        rr = r * (0.84 + 0.16 * math.sin(math.pi * t) ** 0.5) + 0.008
        out.append(kit.lathe("hoop", [(x - 0.03, rr), (x + 0.03, rr)], col, M.get("iron"), n=20, axis='X', at=(0, 0, zc), caps=False))
    for x in (x0 + 0.35, x1 - 0.35):
        out.append(kit.prism("cradle", [(x - 0.1, z0 + 0.1), (x + 0.1, z0 + 0.1), (x + 0.1, zc - r * 0.6), (x - 0.1, zc - r * 0.6)], -0.5, 0.5, col, frame))
    out.append(kit.box("hatch", (x0 + x1) / 2 - 0.15, (x0 + x1) / 2 + 0.15, -0.15, 0.15, zc + r - 0.02, zc + r + 0.05, col, M.get("wood_dark"), bev=0.01))
    # Pump at the tail: barrel, brake handle, outlet; hose coiled on a bracket.
    px = x0 - 0.18
    out.append(kit.lathe("pump", [(z0 + 0.1, 0.0), (z0 + 0.1, 0.09), (zc + 0.2, 0.08), (zc + 0.26, 0.05), (zc + 0.26, 0.0)], col, M.get("brass"), n=10, axis='Z', at=(px, 0.2, 0)))
    out.append(kit.tube("pump_handle", [(px, 0.2, zc + 0.24), (px - 0.05, 0.2, zc + 0.32), (px - 0.05, -0.45, zc + 0.32)], 0.018, col, M.get("iron"), n=5))
    n = 14
    for k in range(3):
        rr = 0.22 - k * 0.025
        loop = [(px - 0.02 - k * 0.03, -0.2 + rr * math.cos(2 * math.pi * i / n), zc - 0.1 + rr * math.sin(2 * math.pi * i / n)) for i in range(n + 1)]
        out.append(kit.tube("hose", loop, 0.025, col, M.get("leather_dark"), n=5, caps=False))
    for x in (x0 + 0.5, x1 - 0.5):
        for sd in (1, -1):
            out.append(kit.lathe("bucket", [(0.0, 0.0), (0.0, 0.07), (0.24, 0.1), (0.24, 0.0)], col, M.get("leather_black"), n=8, axis='Z', at=(x, sd * 0.55, z0 - 0.15)))
    bx, zs, bw = st["bench"]
    out.append(kit.box("riser", bx - 0.18, bx + 0.18, -0.4, 0.4, z0, zs - 0.4, col, frame, bev=0.01))
    out += bench(bx, zs, bw, zs - 0.4, col, back=0.2)
    out += footboard(bx + 0.2, bx + 0.5, z0, zs - 0.25, bw, col)
    return out


def gatling(st, L, W, H, col):
    """An army wagon carrying a gatling gun on a pedestal mount: ten barrels round a shaft between
    two plates, the brass breech casing, the crank on the right, the feed on top; ammunition chests
    behind. (The gun is part of the static model: the client draws no moving parts on trailers.)"""
    x0, x1, hw, hs = st["bed"]
    z0 = st["gear"]["bed"]
    out = plank_bed(x0, x1, hw, z0, hs, col, st.get("bed_mat", "army_blue"), planks=2)
    bx, zs, bw = st["bench"]
    out += bench(bx, zs, bw, z0 + 0.05, col)
    out += footboard(x1, x1 + 0.28, z0 + 0.05, z0 + 0.42, hw, col)
    g = st["gun"]
    gx, gz = g["x"], g["z"]
    iron, brass, steel = M.get("iron"), M.get("brass"), M.get("steel")
    out.append(kit.lathe("pedestal", [(z0 + 0.05, 0.0), (z0 + 0.05, 0.16), (z0 + 0.1, 0.14), (z0 + 0.14, 0.06), (gz - 0.22, 0.05), (gz - 0.16, 0.08), (gz - 0.13, 0.08), (gz - 0.13, 0.0)],
                         col, iron, n=12, axis='Z', at=(gx, 0, 0)))
    for sd in (1, -1):
        out.append(kit.prism("cheek", [(gx - 0.12, gz - 0.16), (gx + 0.12, gz - 0.16), (gx + 0.05, gz + 0.03), (gx - 0.05, gz + 0.03)], sd * 0.14 - 0.015, sd * 0.14 + 0.015, col, iron))
    cb, cf = gx - 0.32, gx + 0.04   # breech casing
    out.append(kit.lathe("casing", [(cb - 0.06, 0.0), (cb - 0.06, 0.03), (cb - 0.02, 0.03), (cb, 0.1), (cf - 0.03, 0.11), (cf, 0.09), (cf, 0.0)], col, brass, n=16, axis='X', at=(0, 0, gz)))
    xm = gx + g["length"]
    for k in range(10):
        a = 2 * math.pi * k / 10
        out.append(kit.lathe("barrel", [(cf, 0.012), (xm, 0.011)], col, steel, n=6, axis='X', at=(0, 0.055 * math.cos(a), gz + 0.055 * math.sin(a)), caps=False))
    for x, r in ((cf + 0.02, 0.085), (cf + (xm - cf) * 0.55, 0.075), (xm - 0.04, 0.072)):
        out.append(kit.lathe("plate", [(x - 0.015, 0.0), (x - 0.015, r), (x + 0.015, r), (x + 0.015, 0.0)], col, brass if x < xm - 0.1 else iron, n=14, axis='X', at=(0, 0, gz)))
    out.append(kit.lathe("shaft", [(cf, 0.022), (xm + 0.01, 0.022)], col, iron, n=8, axis='X', at=(0, 0, gz)))
    out.append(kit.tube("crank", [(cb + 0.08, -0.1, gz), (cb + 0.08, -0.2, gz), (cb + 0.08, -0.2, gz - 0.14), (cb + 0.08, -0.27, gz - 0.14)], 0.014, col, iron, n=5))
    out.append(kit.box("feed", cb + 0.06, cb + 0.16, -0.035, 0.035, gz + 0.09, gz + 0.32, col, brass, bev=0.008))
    out.append(kit.lathe("cascabel", [(cb - 0.06, 0.02), (cb - 0.14, 0.02), (cb - 0.16, 0.035), (cb - 0.19, 0.0)], col, brass, n=8, axis='X', at=(0, 0, gz)))
    # The gunner's stool, the ammunition chests at the tail.
    sx = g.get("stool", gx - 0.5)
    out.append(kit.lathe("stool", [(z0 + 0.05, 0.0), (z0 + 0.05, 0.03), (g["seat"] - 0.05, 0.03), (g["seat"] - 0.05, 0.13), (g["seat"], 0.13), (g["seat"], 0.0)], col, iron, n=10, axis='Z', at=(sx, 0, 0)))
    for y in (-0.26, 0.26):
        out.append(kit.box("chest", x0 + 0.08, x0 + 0.52, y - 0.22, y + 0.22, z0 + 0.05, z0 + 0.4, col, M.get("army_blue"), bev=0.02))
        out.append(kit.box("chest_lid", x0 + 0.07, x0 + 0.53, y - 0.225, y + 0.225, z0 + 0.36, z0 + 0.41, col, M.get("wood_dark"), bev=0.01))
    return out


BODIES = {"coach": coach, "water": water, "gatling": gatling}
