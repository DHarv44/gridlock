"""Trucks: a cab (a short car body, car.py) on a chassis with dual rear wheels, and the body behind it:
box, ambulance, fire tender, garbage compactor, army canopy, tractor unit, or a trailer on its own.
Axles are fractions of the whole length (+ = front); cab sizes are metres."""
import math

import car
import kit
import materials as M
import parts


def _shift(obs, dx):
    for o in obs:
        o.location.x += dx
    return obs


def cab(vid, st, dims, col):
    c = st["cab"]
    L, W = dims["length"], dims["width"]
    clen, ch = c["len"], c["h"]
    off = L / 2 - clen / 2
    front = st["wheel"]["x"][0] * L
    cstyle = dict(c)
    cstyle["wheel"] = dict(st["wheel"], x=[(front - off) / clen])
    cstyle.setdefault("bumpers", {"ends": [1], "h": 0.22})
    cstyle["tail"] = None
    return _shift(car.Car(vid + "_cab", cstyle, {"length": clen, "width": W, "height": ch}, col).build(), off), off - clen / 2


def chassis(st, dims, col, x_front):
    """Frame rails from the cab back, rear wheels (dual), mudguards, rear bumper and lamps."""
    L, W = dims["length"], dims["width"]
    wh = st["wheel"]
    r, tw = wh["r"], wh["w"]
    out = []
    rail_z = st.get("rail_z", r * 0.85)
    for sd in (1, -1):
        y = sd * W * 0.3
        out.append(kit.box("rail", -L / 2 + 0.05, x_front, y - 0.06, y + 0.06, rail_z, rail_z + 0.24, col, M.get("underbody")))
    rears = wh["x"][1:]
    for x in rears:
        xm = x * L
        for sd in (1, -1):
            yo = sd * (W / 2 - 0.03 - tw / 2)
            out += parts.wheel("rw", xm, yo, r, tw, col, rim=wh.get("rim", "rim"), spokes=0, side=sd)
            if wh.get("dual", True):
                out += parts.wheel("rwi", xm, yo - sd * (tw + 0.03), r, tw, col, rim="rim_dark", spokes=0, side=sd)
        out.append(kit.tube("axle", [(xm, -W / 2 + 0.3, r), (xm, W / 2 - 0.3, r)], 0.07, col, M.get("underbody"), n=6))
    if rears and st.get("guards", True):
        x0, x1 = min(rears) * L - r * 1.15, max(rears) * L + r * 1.15
        for sd in (1, -1):
            y0, y1 = sorted((sd * (W / 2 - 2 * tw - 0.12), sd * (W / 2 + 0.01)))
            out.append(kit.box("guard", x0, x1, y0, y1, 2 * r + 0.05, 2 * r + 0.09, col, M.get("trim"), bev=0.015))
    rb = st.get("rear_bumper", rail_z - 0.05)
    out.append(kit.box("rbumper", -L / 2 - 0.02, -L / 2 + 0.12, -W / 2 + 0.08, W / 2 - 0.08, rb, rb + 0.16, col, M.get("trim"), bev=0.02))
    for sd in (1, -1):
        out.append(kit.box("tail", -L / 2 - 0.035, -L / 2 - 0.01, sd * (W / 2 - 0.28) - 0.12, sd * (W / 2 - 0.28) + 0.12, rb + 0.02, rb + 0.12, col, M.get("tail"), bev=0.01))
    return out


def box_body(st, dims, col, x0, z0, mat="paint", x1=None):
    L, W, H = dims["length"], dims["width"], dims["height"]
    x1 = -L / 2 + 0.04 if x1 is None else x1
    out = [kit.box("box", x1, x0, -W / 2, W / 2, z0, H, col, M.get(mat), bev=0.04, seg=2)]
    # Corner posts, roof rail and rear door frame in bare metal.
    for x in (x0, x1):
        for sd in (1, -1):
            out.append(kit.box("post", x - 0.04, x + 0.04, sd * W / 2 - 0.05, sd * W / 2 + 0.012, z0, H + 0.01, col, M.get("steel")))
    for sd in (1, -1):
        out.append(kit.box("rub", x1, x0, sd * W / 2 - 0.02, sd * W / 2 + 0.015, z0, z0 + 0.12, col, M.get("steel")))
        out.append(kit.box("roofrail", x1, x0, sd * W / 2 - 0.04, sd * W / 2 + 0.012, H - 0.06, H + 0.01, col, M.get("steel")))
    out.append(kit.box("door_seam", x1 - 0.015, x1 + 0.005, -0.012, 0.012, z0 + 0.1, H - 0.1, col, M.get("grille")))
    for sd in (1, -1):
        out.append(kit.box("handle", x1 - 0.03, x1, sd * 0.12 - 0.015, sd * 0.12 + 0.015, z0 + 0.4, z0 + 1.2, col, M.get("steel")))
        out.append(kit.box("marker", x1 + 0.2, x1 + 0.28, sd * W / 2, sd * W / 2 + sd * 0.012, H - 0.15, H - 0.1, col, M.get("amber")))
    return out


def ambulance(st, dims, col, x0, z0):
    L, W, H = dims["length"], dims["width"], dims["height"]
    out = box_body(st, dims, col, x0, z0)
    x1 = -L / 2 + 0.04
    for sd in (1, -1):
        y = sd * (W / 2 + 0.006)
        out.append(kit.box("stripe", x1, x0, min(y, y - sd * 0.01), max(y, y - sd * 0.01), z0 + 0.55, z0 + 0.75, col, M.get("red")))
        cx, cz = (x0 + x1) / 2 - 0.3, z0 + 1.35
        out.append(kit.box("cross_v", cx - 0.1, cx + 0.1, min(y, y + sd * 0.012), max(y, y + sd * 0.012), cz - 0.35, cz + 0.35, col, M.get("red")))
        out.append(kit.box("cross_h", cx - 0.35, cx + 0.35, min(y, y + sd * 0.012), max(y, y + sd * 0.012), cz - 0.1, cz + 0.1, col, M.get("red")))
    for sd in (1, -1):
        out.append(kit.box("rearwin", x1 - 0.02, x1 + 0.01, sd * 0.4 - 0.25, sd * 0.4 + 0.25, H - 0.95, H - 0.45, col, M.get("glass")))
    base, lamps = parts.lightbar("bar", x0 - 0.2, H, W * 0.42, col)
    return out + base + lamps


def fire(st, dims, col, x0, z0):
    L, W, H = dims["length"], dims["width"], dims["height"]
    hb = H - 0.45
    out = box_body(st, dict(dims, height=hb), col, x0, z0)
    x1 = -L / 2 + 0.04
    # Roller-shutter lockers along both sides.
    n = 4
    span = (x0 - x1 - 0.3) / n
    for i in range(n):
        a = x1 + 0.15 + i * span + 0.06
        b = a + span - 0.12
        for sd in (1, -1):
            y = sd * (W / 2 + 0.008)
            out.append(kit.box("locker", a, b, min(y, y - sd * 0.02), max(y, y - sd * 0.02), z0 + 0.2, hb - 0.2, col, M.get("steel"), bev=0.01))
            for k in range(1, 6):
                z = z0 + 0.2 + k * (hb - z0 - 0.4) / 6
                out.append(kit.box("slat", a, b, min(y, y + sd * 0.006), max(y, y + sd * 0.006), z - 0.012, z + 0.012, col, M.get("grille")))
    # The ladder: two rails and rungs, on a turntable at the back.
    lx0, lx1, lz = x1 + 0.3, x0 + 1.2, hb + 0.25
    for sd in (1, -1):
        out.append(kit.box("lrail", lx0, lx1, sd * 0.32 - 0.03, sd * 0.32 + 0.03, lz, lz + 0.14, col, M.get("chrome")))
    k = 0
    x = lx0 + 0.15
    while x < lx1 - 0.1:
        out.append(kit.tube("rung", [(x, -0.3, lz + 0.07), (x, 0.3, lz + 0.07)], 0.018, col, M.get("chrome"), n=5))
        x += 0.3
        k += 1
    out.append(kit.lathe("turntable", [(hb, 0.55), (hb + 0.25, 0.5)], col, M.get("steel"), n=16, axis='Z', at=(x1 + 0.7, 0, 0)))
    return out


def garbage(st, dims, col, x0, z0):
    L, W, H = dims["length"], dims["width"], dims["height"]
    xh = -L / 2 + 1.4  # the hopper behind the body
    out = box_body(st, dims, col, x0, z0, x1=xh)
    hop = [(xh, z0 - 0.3), (xh, H - 0.05), (xh - 0.4, H - 0.2), (-L / 2, z0 + 0.6), (-L / 2, z0 - 0.3)]
    out.append(kit.prism("hopper", hop, -W / 2 + 0.03, W / 2 - 0.03, col, M.get("steel"), bev=0.03))
    out.append(kit.prism("hopper_mouth", [(-L / 2 - 0.01, z0 - 0.2), (-L / 2 - 0.01, z0 + 0.5), (xh - 0.6, z0 + 0.5)], -W / 2 + 0.25, W / 2 - 0.25, col, M.get("grille")))
    for sd in (1, -1):
        out.append(kit.tube("ram", [(xh - 0.05, sd * (W / 2 - 0.06), H - 0.3), (-L / 2 + 0.1, sd * (W / 2 - 0.06), z0 + 0.5)], 0.05, col, M.get("chrome"), n=6))
    return out


def canopy(st, dims, col, x0, z0):
    """Army truck: dropside bed under a canvas tilt on hoops."""
    L, W, H = dims["length"], dims["width"], dims["height"]
    x1 = -L / 2 + 0.04
    out = [kit.box("bed", x1, x0, -W / 2, W / 2, z0, z0 + 0.12, col, M.get("paint"), bev=0.02)]
    for sd in (1, -1):
        out.append(kit.box("side", x1, x0, sd * W / 2 - 0.05 if sd > 0 else -W / 2, sd * W / 2 if sd > 0 else -W / 2 + 0.05, z0, z0 + 0.55, col, M.get("paint"), bev=0.015))
    out.append(kit.box("tailgate", x1, x1 + 0.05, -W / 2, W / 2, z0, z0 + 0.55, col, M.get("paint"), bev=0.015))
    # Canvas: a loft of rounded-top sections along the bed.
    zb, zt = z0 + 0.5, H
    rings = []
    n = 9
    for x in (x1 + 0.02, x0 - 0.02):
        ring = []
        for k in range(n):
            a = math.pi * k / (n - 1)
            y = W / 2 * 0.99 * math.cos(a)
            z = zb + (zt - zb) * (0.78 + 0.22 * math.sin(a)) if 0 < k < n - 1 else zb
            if k in (1, n - 2):
                z = zb + (zt - zb) * 0.8
                y = math.copysign(W / 2 * 0.99, y)
            ring.append((x, y, z))
        rings.append(ring)
    v, f = kit.loft(rings, cap0=True, cap1=True, closed=False)
    tilt = kit.recalc(kit.mesh("tilt", v, f, col, M.get("canvas"), smooth=True, sharp=50))
    out.append(tilt)
    k = x1 + 0.4
    while k < x0 - 0.2:
        for sd in (1, -1):
            out.append(kit.box("strap", k - 0.03, k + 0.03, sd * (W / 2 + 0.004) - 0.004, sd * (W / 2 + 0.004) + 0.004, zb, zb + (zt - zb) * 0.75, col, M.get("trim")))
        k += 0.9
    return out


def tractor(st, dims, col, x0, z0):
    """Semi tractor: sleeper box, fifth wheel, exhaust stacks and fuel tanks."""
    L, W, H = dims["length"], dims["width"], dims["height"]
    c = st["cab"]
    xs = x0
    out = [kit.box("sleeper", xs - 0.9, xs + 0.02, -W / 2 + 0.05, W / 2 - 0.05, z0 + 0.2, c["h"] + 0.15, col, M.get("paint"), bev=0.06, seg=2)]
    fw = st["wheel"]["x"][1] * L + 0.25
    out.append(kit.lathe("fifth", [(z0 + 0.0, 0.55), (z0 + 0.12, 0.55), (z0 + 0.12, 0.08)], col, M.get("steel"), n=16, axis='Z', at=(fw, 0, 0)))
    for sd in (1, -1):
        y = sd * (W / 2 - 0.12)
        out.append(kit.tube("stack", [(xs - 0.05, y, z0), (xs - 0.05, y, c["h"] + 0.9)], 0.07, col, M.get("chrome"), n=10))
        out.append(kit.lathe("tank", [(xs - 0.1 - 1.2, 0.3), (xs - 0.1, 0.3)], col, M.get("chrome"), n=14, axis='X', at=(0, sd * (W / 2 - 0.32), 0.62)))
    return out


def trailer(st, dims, col):
    """A box trailer: deck on two rails, tandem axle at the back, landing legs at the front."""
    L, W, H = dims["length"], dims["width"], dims["height"]
    wh = st["wheel"]
    deck = st.get("deck", 1.25)
    out = box_body(st, dims, col, L / 2 - 0.02, deck, mat=st.get("mat", "white"))
    out += chassis(dict(st, wheel=dict(wh, x=[None] + wh["x"]), rail_z=deck - 0.26, rear_bumper=0.45), dims, col, L / 2 - 0.3)
    for sd in (1, -1):
        y = sd * W * 0.32
        out.append(kit.box("leg", L / 2 - 2.6, L / 2 - 2.5, y - 0.05, y + 0.05, 0.08, deck, col, M.get("steel")))
        out.append(kit.box("foot", L / 2 - 2.7, L / 2 - 2.4, y - 0.12, y + 0.12, 0.0, 0.08, col, M.get("steel")))
        out.append(kit.box("flap", -L / 2 + 0.25, -L / 2 + 0.28, y - 0.25 + sd * 0.2, y + 0.25 + sd * 0.2, 0.15, 0.75, col, M.get("tyre")))
    return out


KINDS = {"box": box_body, "ambulance": ambulance, "fire": fire, "garbage": garbage, "canopy": canopy, "tractor": tractor}


def build(vid, st, dims, col):
    if st.get("body") == "trailer":
        return trailer(st, dims, col)
    objs, x_back = cab(vid, st, dims, col)
    rail_top = st["wheel"]["r"] * 0.85 + 0.24
    objs += chassis(st, dims, col, x_back + 0.4)
    z0 = st.get("deck", rail_top + 0.02)
    objs += KINDS[st["body"]](st, dims, col, x_back - 0.08, z0)
    return objs
