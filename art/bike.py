"""Motorbikes: a sports bike with a fairing, and a dirt bike. The spec gives axles, wheel size and the
type; the rest is built around those. x forward, metres."""
import math

import kit
import materials as M
import parts


def ellipse_rings(stations, n=12):
    """[(x, half_width, z_low, z_high)] -> rings of an elliptical section."""
    rings = []
    for x, hw, z0, z1 in stations:
        zc, hz = (z0 + z1) / 2, max((z1 - z0) / 2, 0.005)
        rings.append([(x, max(hw, 0.005) * math.cos(2 * math.pi * k / n), zc + hz * math.sin(2 * math.pi * k / n)) for k in range(n)])
    return rings


def shell(name, stations, col, mat, n=12):
    v, f = kit.loft(ellipse_rings(stations, n))
    return kit.recalc(kit.mesh(name, v, f, col, M.get(mat), smooth=True, sharp=60))


def bike_wheel(name, x, r, w, col, spokes, rim="rim"):
    out = [kit.lathe(name + "_tyre", [(-w / 2, r * 0.78), (-w / 2, r * 0.93), (-w / 4, r), (w / 4, r), (w / 2, r * 0.93), (w / 2, r * 0.78)],
                     col, M.get("tyre"), n=18, axis='Y', at=(x, 0, r), caps=False)]
    out.append(kit.lathe(name + "_rim", [(-w * 0.3, r * 0.8), (-w * 0.3, r * 0.74), (w * 0.3, r * 0.74), (w * 0.3, r * 0.8)],
                         col, M.get(rim), n=18, axis='Y', at=(x, 0, r), caps=False))
    out.append(kit.lathe(name + "_hub", [(-0.07, 0.0), (-0.07, 0.06), (0.07, 0.06), (0.07, 0.0)], col, M.get("steel"), n=10, axis='Y', at=(x, 0, r)))
    for k in range(spokes):
        a = 2 * math.pi * k / spokes
        for sd in (1, -1):
            out.append(kit.tube(name + "_sp", [(x + math.cos(a) * 0.05, sd * 0.05, r + math.sin(a) * 0.05),
                                               (x + math.cos(a + 0.4) * r * 0.75, sd * 0.02, r + math.sin(a + 0.4) * r * 0.75)], 0.012 if spokes > 6 else 0.025, col, M.get(rim), n=4))
    return out


def chopper(st, col):
    """Long and low: raked forks out front, a tall thin front wheel, a fat rear, a V-twin, ape-hangers."""
    fx, rx = st["axles"]
    fr, rr = st["r_front"], st["r"]
    out = bike_wheel("fw", fx, fr, 0.09, col, 24, "chrome")
    out += bike_wheel("rw", rx, rr, 0.2, col, 24, "chrome")
    head = (fx - 0.62, 0, 0.95)
    for sd in (1, -1):
        out.append(kit.tube("fork", [(fx, sd * 0.07, fr), (head[0], sd * 0.07, head[2])], 0.022, col, M.get("chrome"), n=8))
        out.append(kit.tube("rail", [(rx, sd * 0.1, rr), (-0.35, sd * 0.1, 0.42), (head[0] - 0.05, sd * 0.03, head[2] - 0.08)], 0.02, col, M.get("trim"), n=6))
        out.append(kit.tube("stay", [(rx, sd * 0.1, rr), (-0.4, sd * 0.1, 0.68)], 0.018, col, M.get("trim"), n=6))
        # Twin pipes, low along the right.
        out.append(kit.tube("pipe", [(0.05, 0.12 + (0.05 if sd > 0 else 0), 0.42 + sd * 0.08), (-0.2, 0.18 + (0.05 if sd > 0 else 0), 0.3 + sd * 0.05),
                                     (-1.1, 0.2 + (0.05 if sd > 0 else 0), 0.32 + sd * 0.05)], 0.03, col, M.get("chrome"), n=8))
    out.append(kit.tube("downtube", [(head[0], 0, head[2] - 0.05), (head[0] + 0.05, 0, 0.35), (-0.35, 0, 0.3)], 0.025, col, M.get("trim"), n=6))
    out.append(kit.tube("backbone", [(head[0], 0, head[2]), (-0.4, 0, 0.7)], 0.025, col, M.get("trim"), n=6))
    # V-twin: crankcase, two cylinders leaning apart, primary cover, air cleaner.
    out.append(kit.prism("crank", [(-0.25, 0.25), (0.2, 0.25), (0.25, 0.38), (-0.2, 0.42)], -0.11, 0.11, col, M.get("steel"), bev=0.03))
    for a, x in ((0.45, 0.08), (-0.45, -0.12)):
        out.append(kit.tube("cyl", [(x, 0, 0.38), (x + math.sin(a) * 0.25, 0, 0.38 + math.cos(a) * 0.25)], 0.06, col, M.get("chrome"), n=10))
    out.append(kit.lathe("cleaner", [(0.0, 0.0), (0.0, 0.08), (0.04, 0.08), (0.04, 0.0)], col, M.get("chrome"), n=12, axis='Y', at=(-0.02, 0.14, 0.52)))
    out.append(shell("tank", [(-0.3, 0.04, 0.72, 0.74), (-0.15, 0.12, 0.68, 0.84), (0.1, 0.11, 0.72, 0.88), (0.22, 0.05, 0.8, 0.86)], col, "paint"))
    out.append(shell("seat", [(-0.55, 0.06, 0.66, 0.72), (-0.4, 0.15, 0.64, 0.74), (-0.22, 0.13, 0.66, 0.72), (-0.15, 0.06, 0.7, 0.72)], col, "seat"))
    out.append(shell("rear_fender", [(-1.2, 0.05, 0.58, 0.6), (-1.0, 0.12, 0.6, 0.68), (-0.7, 0.12, 0.62, 0.7), (-0.55, 0.06, 0.6, 0.64)], col, "paint"))
    out.append(kit.tube("sissy", [(-0.7, 0.12, 0.68), (-0.78, 0.12, 1.05), (-0.78, -0.12, 1.05), (-0.7, -0.12, 0.68)], 0.015, col, M.get("chrome"), n=6))
    out.append(kit.tube("bars", [(head[0] - 0.02, -0.38, head[2] + 0.42), (head[0], -0.3, head[2] + 0.05), (head[0], 0.3, head[2] + 0.05), (head[0] - 0.02, 0.38, head[2] + 0.42)],
                        0.016, col, M.get("chrome"), n=6))
    for sd in (1, -1):
        out.append(kit.tube("grip", [(head[0] - 0.02, sd * 0.38, head[2] + 0.42), (head[0] - 0.08, sd * 0.46, head[2] + 0.44)], 0.022, col, M.get("tyre"), n=8))
    out.append(kit.lathe("lamp", [(0.0, 0.0), (0.0, 0.08), (0.1, 0.085), (0.11, 0.0)], col, M.get("chrome"), n=12, axis='X', at=(head[0] + 0.04, 0, head[2] - 0.05)))
    out.append(kit.lathe("lens", [(0.11, 0.0), (0.11, 0.075), (0.115, 0.0)], col, M.get("head"), n=12, axis='X', at=(head[0] + 0.04, 0, head[2] - 0.05)))
    out.append(kit.box("tail", -1.22, -1.19, -0.04, 0.04, 0.6, 0.64, col, M.get("tail")))
    return out


def police(st, col, dims):
    """A touring bike in police kit: fairing and screen, saddlebags with crash bars, light bar."""
    fx, rx = st["axles"]
    r, w = st["r"], st["w"]
    out = bike_wheel("fw", fx, r, w, col, 0, "rim_dark") + bike_wheel("rw", rx, r, w * 1.3, col, 0, "rim_dark")
    head = (fx - 0.24, 0, 0.92)
    for sd in (1, -1):
        out.append(kit.tube("fork", [(fx, sd * 0.08, r), (head[0], sd * 0.08, head[2])], 0.032, col, M.get("chrome"), n=8))
        out.append(kit.tube("swing", [(rx, sd * 0.1, r), (-0.15, sd * 0.1, 0.42)], 0.03, col, M.get("trim"), n=6))
        # Saddlebags and the crash bars round the engine and bags.
        out.append(kit.box("bag", -0.9, -0.45, sd * 0.2 if sd > 0 else -0.38, 0.38 if sd > 0 else -0.2, 0.42, 0.78, col, M.get("paint"), bev=0.05, seg=2))
        out.append(kit.tube("guard", [(0.32, sd * 0.1, 0.62), (0.34, sd * 0.32, 0.5), (0.25, sd * 0.32, 0.3), (0.12, sd * 0.12, 0.28)], 0.018, col, M.get("chrome"), n=6))
        out.append(kit.tube("bagguard", [(-0.4, sd * 0.2, 0.75), (-0.42, sd * 0.42, 0.62), (-0.9, sd * 0.42, 0.45)], 0.016, col, M.get("chrome"), n=6))
    out.append(kit.prism("engine", [(-0.2, 0.25), (0.28, 0.25), (0.32, 0.55), (-0.15, 0.62)], -0.15, 0.15, col, M.get("steel"), bev=0.03))
    out.append(kit.tube("pipe", [(0.2, 0.18, 0.3), (-0.3, 0.2, 0.32), (-0.95, 0.22, 0.38)], 0.04, col, M.get("chrome"), n=8))
    out.append(shell("tank", [(-0.15, 0.1, 0.78, 0.84), (0.0, 0.18, 0.72, 0.96), (0.3, 0.17, 0.76, 0.98), (0.4, 0.1, 0.84, 0.96)], col, "paint"))
    out.append(shell("seat", [(-0.5, 0.08, 0.84, 0.9), (-0.35, 0.18, 0.82, 0.92), (-0.08, 0.17, 0.8, 0.9), (0.0, 0.08, 0.82, 0.88)], col, "seat"))
    out.append(shell("fairing", [(0.42, 0.24, 0.45, 0.98), (0.6, 0.28, 0.5, 1.08), (0.72, 0.2, 0.62, 1.04), (0.8, 0.06, 0.78, 0.9)], col, "paint", n=14))
    v = [(0.66, -0.22, 1.06), (0.66, 0.22, 1.06), (0.5, 0.18, 1.38), (0.5, -0.18, 1.38)]
    g = kit.recalc(kit.mesh("screen", v, [(0, 1, 2, 3)], col, M.get("glass")))
    g.modifiers.new("Solid", 'SOLIDIFY').thickness = 0.01
    out.append(g)
    out.append(kit.box("lamp", 0.79, 0.81, -0.08, 0.08, 0.76, 0.86, col, M.get("head")))
    for sd in (1, -1):
        out.append(kit.box("strobe", 0.7, 0.74, sd * 0.24 - 0.04, sd * 0.24 + 0.04, 0.9, 0.96, col, M.get("siren_red" if sd > 0 else "siren_blue")))
    out.append(shell("rear_fender", [(-1.08, 0.05, 0.7, 0.72), (-0.9, 0.12, 0.68, 0.78), (-0.5, 0.13, 0.7, 0.82)], col, "paint"))
    out.append(kit.box("radio", -0.85, -0.55, -0.18, 0.18, 0.86, 1.1, col, M.get("white"), bev=0.04, seg=2))
    base, lamps = parts.lightbar("bar", -0.7, 1.1, 0.2, col, length=0.1)
    out += base + lamps
    out.append(kit.tube("mast", [(-0.75, 0.0, 1.1), (-0.75, 0.0, 1.5)], 0.008, col, M.get("trim"), n=4))
    out.append(kit.box("tail", -1.1, -1.07, -0.05, 0.05, 0.72, 0.77, col, M.get("tail")))
    out.append(kit.tube("bars", [(head[0] - 0.05, -0.36, head[2] + 0.1), (head[0], 0, head[2] + 0.06), (head[0] - 0.05, 0.36, head[2] + 0.1)], 0.016, col, M.get("trim"), n=6))
    return out


def build(vid, st, dims, col):
    if st["type"] == "chopper":
        return chopper(st, col)
    if st["type"] == "police":
        return police(st, col, dims)
    fx, rx = st["axles"]
    r, w = st["r"], st["w"]
    dirt = st["type"] == "dirt"
    out = bike_wheel("fw", fx, r, w, col, 16 if dirt else 5, "rim_dark" if not dirt else "steel")
    out += bike_wheel("rw", rx, r, w * 1.25, col, 16 if dirt else 5, "rim_dark" if not dirt else "steel")
    head = (fx - (0.3 if dirt else 0.22), 0, 1.0 if dirt else 0.9)
    # Forks and the swingarm.
    for sd in (1, -1):
        out.append(kit.tube("fork", [(fx, sd * 0.07, r), (head[0], sd * 0.07, head[2])], 0.026 if dirt else 0.03, col, M.get("chrome" if dirt else "trim"), n=8))
        out.append(kit.tube("swing", [(rx, sd * 0.08, r), (-0.12, sd * 0.08, 0.45)], 0.025, col, M.get("trim"), n=6))
    out.append(kit.tube("bars", [(head[0] - 0.05, -0.36, head[2] + 0.08), (head[0] - 0.02, 0, head[2] + 0.04), (head[0] - 0.05, 0.36, head[2] + 0.08)],
                        0.016, col, M.get("trim"), n=6))
    for sd in (1, -1):
        out.append(kit.tube("grip", [(head[0] - 0.05, sd * 0.36, head[2] + 0.08), (head[0] - 0.06, sd * 0.44, head[2] + 0.085)], 0.022, col, M.get("tyre"), n=8))
    # Engine, frame spine, exhaust.
    # Crankcase low between the wheels, the cylinder block leaning forward above it, fins in steel.
    z0 = 0.3 if not dirt else 0.38
    out.append(kit.prism("crank", [(-0.18, z0), (0.22, z0), (0.28, z0 + 0.18), (-0.1, z0 + 0.28)], -0.12, 0.12, col, M.get("underbody"), bev=0.03))
    out.append(kit.prism("block", [(0.02, z0 + 0.22), (0.24, z0 + 0.16), (0.34, z0 + 0.42), (0.12, z0 + 0.48)], -0.1, 0.1, col, M.get("steel"), bev=0.02))
    for k in range(3):
        z = z0 + 0.27 + k * 0.06
        out.append(kit.prism("fin", [(0.04 + k * 0.02, z), (0.27 + k * 0.02, z - 0.04), (0.28 + k * 0.02, z - 0.025), (0.05 + k * 0.02, z + 0.015)], -0.115, 0.115, col, M.get("steel")))
    out.append(kit.tube("spine", [(head[0], 0, head[2] - 0.05), (0.15, 0, 0.82), (-0.12, 0, 0.6), (-0.12, 0, 0.42)], 0.04, col, M.get("trim"), n=8))
    if dirt:
        out.append(kit.tube("pipe", [(0.22, 0.1, 0.5), (0.0, 0.17, 0.75), (-0.45, 0.17, 0.85)], 0.035, col, M.get("steel"), n=8))
        out.append(kit.lathe("can", [(-0.75, 0.0), (-0.75, 0.05), (-0.7, 0.06), (-0.45, 0.06), (-0.43, 0.04)], col, M.get("steel"), n=10, axis='X', at=(0, 0.17, 0.87)))
        out.append(shell("tank", [(-0.12, 0.08, 0.8, 0.86), (0.0, 0.15, 0.76, 0.98), (0.25, 0.14, 0.82, 1.02), (0.36, 0.05, 0.92, 0.98)], col, "paint"))
        out.append(kit.box("seat", -0.65, 0.02, -0.12, 0.12, 0.88, 0.97, col, M.get("seat"), bev=0.03, seg=2))
        out.append(shell("rear_fender", [(-0.95, 0.05, 0.94, 0.95), (-0.7, 0.1, 0.9, 0.96), (-0.45, 0.12, 0.84, 0.94)], col, "paint"))
        out.append(shell("front_fender", [(fx - 0.25, 0.05, 0.82, 0.84), (fx, 0.08, 0.79, 0.85), (fx + 0.28, 0.06, 0.74, 0.77)], col, "paint"))
        out.append(kit.box("plate", head[0] + 0.02, head[0] + 0.06, -0.14, 0.14, head[2] - 0.32, head[2] - 0.02, col, M.get("white"), bev=0.02))
        out.append(kit.box("lamp", head[0] + 0.06, head[0] + 0.08, -0.06, 0.06, head[2] - 0.22, head[2] - 0.12, col, M.get("head")))
        for sd in (1, -1):
            out.append(kit.prism("sidepanel", [(-0.55, 0.72), (-0.2, 0.72), (-0.1, 0.92), (-0.5, 0.92)], sd * 0.13, sd * 0.15, col, M.get("white")))
        out.append(kit.box("tail", -0.98, -0.94, -0.04, 0.04, 0.9, 0.94, col, M.get("tail")))
    else:
        out.append(kit.tube("pipe", [(0.25, 0.08, 0.3), (0.0, 0.14, 0.24), (-0.3, 0.16, 0.32)], 0.035, col, M.get("steel"), n=8))
        out.append(kit.lathe("can", [(-0.72, 0.0), (-0.72, 0.06), (-0.66, 0.075), (-0.3, 0.075), (-0.27, 0.04)], col, M.get("chrome"), n=12, axis='X', at=(0, 0.16, 0.42)))
        out.append(shell("fairing", [(0.38, 0.16, 0.38, 0.82), (0.55, 0.2, 0.42, 0.98), (0.7, 0.15, 0.55, 0.95), (0.8, 0.05, 0.72, 0.84)], col, "paint", n=14))
        out.append(shell("tank", [(-0.08, 0.1, 0.78, 0.86), (0.05, 0.17, 0.74, 0.98), (0.3, 0.16, 0.76, 1.0), (0.42, 0.1, 0.82, 0.96)], col, "paint"))
        out.append(shell("seat", [(-0.5, 0.05, 0.86, 0.9), (-0.35, 0.12, 0.84, 0.92), (-0.05, 0.14, 0.8, 0.9)], col, "seat"))
        out.append(shell("tail", [(-0.85, 0.03, 0.9, 0.92), (-0.7, 0.1, 0.84, 0.98), (-0.45, 0.13, 0.8, 0.94), (-0.3, 0.12, 0.76, 0.86)], col, "paint"))
        v = [(0.62, -0.17, 0.98), (0.62, 0.17, 0.98), (0.5, 0.13, 1.12), (0.5, -0.13, 1.12)]
        g = kit.recalc(kit.mesh("screen", v, [(0, 1, 2, 3)], col, M.get("glass")))
        g.modifiers.new("Solid", 'SOLIDIFY').thickness = 0.01
        out.append(g)
        out.append(kit.box("lamp", 0.79, 0.81, -0.07, 0.07, 0.74, 0.82, col, M.get("head")))
        out.append(kit.box("tail", -0.86, -0.84, -0.05, 0.05, 0.9, 0.95, col, M.get("tail")))
        out.append(shell("front_fender", [(fx - 0.2, 0.06, r + 0.3, r + 0.32), (fx, 0.08, r + 0.33, r + 0.38), (fx + 0.2, 0.06, r + 0.25, r + 0.28)], col, "paint"))
    return out
