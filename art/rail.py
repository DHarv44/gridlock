"""Railroad cars (Redrock): a 4-4-0 locomotive with its tender, and a wooden passenger coach.

Spec (specs/redrock/vehicles.json): {"kind": "rail", "body": "locomotive" | "coach"}. Built to the
game's size (dims: length, width, height), front +x, centre of the length at the origin, rails at
z = 0. The coach's body is `paint` (tinted per car); the locomotive is fixed colours: black boiler
and tender, a red cab and wheels, brass trim.
"""
import kit
import materials as M


def _wheels(out, col, xs, r, y, mat, n=14):
    """A pair of wheels (both sides) at each x, radius r, their faces at +-y."""
    for x in xs:
        for sd in (1, -1):
            out.append(kit.lathe("wheel", [(-0.07, 0.0), (-0.07, r), (0.07, r), (0.07, 0.0)], col, M.get(mat), n=n, axis='Y', at=(x, sd * y, r)))
            out.append(kit.lathe("hub", [(-0.1, 0.0), (-0.1, r * 0.22), (0.1, r * 0.22), (0.1, 0.0)], col, M.get("brass"), n=8, axis='Y', at=(x, sd * y, r)))


def locomotive(dims, col):
    L, W = dims["length"], dims["width"]
    k = L / 14.6  # laid out on a 14.6 m car; scaled to the game's length
    X = lambda x: x * k
    hw = W / 2
    out = []
    # Frame and running boards.
    out.append(kit.box("frame", X(-7.2), X(6.4), -hw * 0.82, hw * 0.82, 0.95, 1.15, col, M.get("iron")))
    # Boiler, bands and smokebox.
    zb, rb = 2.15, 0.72
    out.append(kit.lathe("boiler", [(X(-0.7), 0.0), (X(-0.7), rb), (X(5.6), rb), (X(5.6), 0.0)], col, M.get("lacquer"), n=20, axis='X', at=(0, 0, zb)))
    for x in (0.6, 2.6, 4.4):
        out.append(kit.lathe("band", [(X(x), 0.0), (X(x), rb + 0.02), (X(x) + 0.12, rb + 0.02), (X(x) + 0.12, 0.0)], col, M.get("brass"), n=20, axis='X', at=(0, 0, zb)))
    out.append(kit.lathe("smokebox", [(X(5.55), 0.0), (X(5.55), rb + 0.06), (X(6.45), rb + 0.06), (X(6.45), 0.0)], col, M.get("iron"), n=20, axis='X', at=(0, 0, zb)))
    # Balloon stack, steam dome, sand dome, bell.
    out.append(kit.lathe("stack", [(0.0, 0.22), (0.7, 0.2), (1.0, 0.32), (1.45, 0.6), (1.65, 0.58), (1.7, 0.0)], col, M.get("lacquer"), n=16, axis='Z', at=(X(6.0), 0, zb + rb - 0.1)))
    out.append(kit.lathe("dome", [(0.0, 0.36), (0.45, 0.34), (0.62, 0.22), (0.68, 0.0)], col, M.get("brass"), n=16, axis='Z', at=(X(2.9), 0, zb + rb - 0.08)))
    out.append(kit.lathe("sand", [(0.0, 0.28), (0.3, 0.26), (0.42, 0.0)], col, M.get("lacquer"), n=12, axis='Z', at=(X(1.3), 0, zb + rb - 0.08)))
    out.append(kit.lathe("bell", [(0.0, 0.0), (0.0, 0.17), (0.25, 0.12), (0.3, 0.0)], col, M.get("brass"), n=10, axis='Z', at=(X(4.1), 0, zb + rb)))
    # Headlamp: a boxy oil lamp on the smokebox, its lens forward.
    out.append(kit.box("lamp", X(6.0), X(6.5), -0.25, 0.25, zb + rb - 0.05, zb + rb + 0.5, col, M.get("lacquer")))
    out.append(kit.box("lens", X(6.5), X(6.52), -0.17, 0.17, zb + rb + 0.05, zb + rb + 0.38, col, M.get("head")))
    # Cowcatcher.
    out.append(kit.prism("pilot", [(X(6.4), 1.2), (X(6.4), 0.12), (X(7.3), 0.12)], -hw * 0.8, hw * 0.8, col, M.get("coach_red")))
    # Cab: walls, windows, roof.
    out.append(kit.box("cab", X(-3.0), X(-0.6), -hw * 0.95, hw * 0.95, 1.15, 3.7, col, M.get("coach_red")))
    for sd in (1, -1):
        out.append(kit.box("cab_win", X(-2.6), X(-1.1), sd * hw * 0.95 - 0.02, sd * hw * 0.95 + 0.02, 2.5, 3.3, col, M.get("glass")))
    out.append(kit.box("cab_roof", X(-3.25), X(-0.35), -hw * 1.05, hw * 1.05, 3.7, 3.9, col, M.get("lacquer"), bev=0.05))
    # Tender: tank, coal heaped on it.
    out.append(kit.box("tender", X(-7.3), X(-3.15), -hw * 0.95, hw * 0.95, 1.05, 2.85, col, M.get("lacquer"), bev=0.06))
    out.append(kit.box("coal", X(-6.9), X(-3.5), -hw * 0.8, hw * 0.8, 2.85, 3.25, col, M.get("tyre"), bev=0.2))
    # Wheels: two big red drivers a side with their rod, a leading truck, the tender's trucks.
    _wheels(out, col, (X(0.3), X(2.3)), 0.85, hw * 0.78, "coach_red", n=18)
    out.append(kit.box("rod", X(0.3), X(2.3), hw * 0.78 + 0.05, hw * 0.78 + 0.12, 0.8, 0.92, col, M.get("steel")))
    out.append(kit.box("rod", X(0.3), X(2.3), -hw * 0.78 - 0.12, -hw * 0.78 - 0.05, 0.8, 0.92, col, M.get("steel")))
    _wheels(out, col, (X(4.6), X(5.6)), 0.45, hw * 0.7, "iron")
    _wheels(out, col, (X(-6.6), X(-5.8), X(-4.6), X(-3.8)), 0.45, hw * 0.7, "iron")
    return out


def coach(dims, col):
    L, W, H = dims["length"], dims["width"], dims["height"]
    hl, hw = L / 2, W / 2
    out = []
    out.append(kit.box("underframe", -hl + 0.7, hl - 0.7, -hw * 0.85, hw * 0.85, 0.8, 1.05, col, M.get("iron")))
    out.append(kit.box("body", -hl + 0.7, hl - 0.7, -hw * 0.96, hw * 0.96, 1.05, H * 0.82, col, M.get("paint"), bev=0.04))
    # A row of windows down each side, and the lettering band under the eaves.
    x = -hl + 1.5
    while x < hl - 1.5:
        for sd in (1, -1):
            out.append(kit.box("window", x, x + 0.55, sd * hw * 0.96 - 0.02, sd * hw * 0.96 + 0.02, H * 0.47, H * 0.68, col, M.get("glass")))
        x += 0.95
    # Roof and clerestory with its little windows.
    out.append(kit.box("roof", -hl + 0.4, hl - 0.4, -hw * 1.04, hw * 1.04, H * 0.82, H * 0.86, col, M.get("lacquer")))
    out.append(kit.box("clerestory", -hl + 1.4, hl - 1.4, -hw * 0.48, hw * 0.48, H * 0.86, H * 0.96, col, M.get("lacquer")))
    for sd in (1, -1):
        out.append(kit.box("clere_win", -hl + 1.6, hl - 1.6, sd * hw * 0.48 - 0.015, sd * hw * 0.48 + 0.015, H * 0.875, H * 0.935, col, M.get("glass")))
    # Open platforms at each end, rails round them, steps down.
    for sd in (1, -1):
        x0, x1 = (hl - 0.7, hl) if sd > 0 else (-hl, -hl + 0.7)
        out.append(kit.box("platform", x0, x1, -hw * 0.8, hw * 0.8, 0.95, 1.05, col, M.get("wood_dark")))
        xr = hl - 0.06 if sd > 0 else -hl + 0.06
        out.append(kit.tube("rail", [(xr, -hw * 0.75, 1.05), (xr, -hw * 0.75, 2.0), (xr, -hw * 0.25, 2.0)], 0.03, col, M.get("iron")))
        out.append(kit.tube("rail", [(xr, hw * 0.75, 1.05), (xr, hw * 0.75, 2.0), (xr, hw * 0.25, 2.0)], 0.03, col, M.get("iron")))
        out.append(kit.box("step", x0, x1, -hw * 0.9, hw * 0.9, 0.55, 0.62, col, M.get("iron")))
    _wheels(out, col, (hl - 1.6, hl - 2.6, -hl + 1.6, -hl + 2.6), 0.45, hw * 0.72, "iron")
    return out


def build(vid, st, dims, col):
    return locomotive(dims, col) if st.get("body") == "locomotive" else coach(dims, col)
