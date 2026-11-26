"""Monster truck: a pickup shell (a car style, car.py, without its own wheels) bolted high on a tube
frame over four huge tyres, with solid axles, a pair of chrome shocks at each corner and a roll cage
showing through the bed. Sizes: dims are the whole truck; `shell` sizes are metres; wheel x are
fractions of the whole length (+ = front)."""
import math

import car
import kit
import materials as M
import parts


class Shell(car.Car):
    def wheels(self):
        return []


def lugs(x, y, r, w, col, side, n=18):
    """Chunky tread blocks round a tyre, alternating left and right of centre (a paddle pattern)."""
    out = []
    for k in range(n):
        a = 2 * math.pi * k / n
        c, s = math.cos(a), math.sin(a)
        y0 = y - w / 2 + 0.04 if k % 2 else y - 0.03
        y1 = y + 0.03 if k % 2 else y + w / 2 - 0.04
        lug = kit.box("lug", -0.07, 0.07, y0, y1, r - 0.05, r + 0.06, col, M.get("tyre"))
        # Built on top of the tyre relative to the hub, then turned by a round the hub (x, r).
        lug.location = (x, 0, r)
        lug.rotation_euler = (0, -a, 0)
        out.append(lug)
    return out


def build(vid, st, dims, col):
    L, W = dims["length"], dims["width"]
    sh = st["shell"]
    wh = st["wheel"]
    r, tw = wh["r"], wh["w"]
    # The shell's floor sits just clear of the tyre tops; a pickup's sills are a fifth of its height up.
    floor = 2 * r + 0.1
    lift = floor - sh["h"] * 0.2
    shell = Shell(vid + "_shell", sh, {"length": sh["len"], "width": sh["w"], "height": sh["h"]}, col).build()
    for o in shell:
        o.location.z += lift
    out = list(shell)
    track = W / 2 - tw / 2 - 0.02
    frame_y = sh["w"] * 0.3
    rail_z = floor - 0.3
    for xf in wh["x"]:
        x = xf * L
        for sd in (1, -1):
            out += parts.wheel("tyre", x, sd * track, r, tw, col, rim=wh.get("rim", "rim"), spokes=0, n=20, side=sd)
            out += lugs(x, sd * track, r, tw, col, sd)
        # A solid axle with its differential.
        inner = track - tw / 2
        out.append(kit.tube("axle", [(x, -inner, r), (x, inner, r)], 0.1, col, M.get("underbody"), n=8))
        out.append(kit.lathe("diff", [(-0.22, 0.05), (-0.12, 0.26), (0.12, 0.26), (0.22, 0.05)], col, M.get("underbody"), n=12, axis='X', at=(x, 0.2, r)))
        for sd in (1, -1):
            # Two big chrome coil-overs per corner, from the axle end up to the frame.
            for dx in (-0.2, 0.2):
                out.append(kit.tube("shock", [(x + dx, sd * (inner - 0.12), r + 0.1), (x + dx * 1.4, sd * (frame_y + 0.1), rail_z + 0.1)], 0.075, col, M.get("chrome"), n=8))
                out.append(kit.tube("spring", [(x + dx * 1.05, sd * (inner - 0.14), r + 0.3), (x + dx * 1.3, sd * (frame_y + 0.14), rail_z - 0.15)], 0.13, col, M.get("paint"), n=8))
            # A trailing link from the axle back toward the middle of the truck.
            out.append(kit.tube("link", [(x, sd * 0.4, r - 0.12), (x * 0.45, sd * frame_y, rail_z)], 0.05, col, M.get("underbody"), n=6))
    # Frame rails and cross members under the shell's floor.
    for sd in (1, -1):
        out.append(kit.box("rail", -L * 0.42, L * 0.44, sd * frame_y - 0.07, sd * frame_y + 0.07, rail_z, rail_z + 0.26, col, M.get("underbody")))
    for xf in (-0.4, -0.1, 0.12, 0.42):
        out.append(kit.box("cross", xf * L - 0.06, xf * L + 0.06, -frame_y, frame_y, rail_z + 0.05, rail_z + 0.21, col, M.get("underbody")))
    # A roll bar standing in the bed just behind the cab, braced back to the tailgate corners.
    bed_x = -sh["len"] * 0.08
    bed_z = lift + sh["h"] * 0.62
    top = lift + sh["h"] * 0.98
    hoop = []
    for sd in (1, -1):
        y = sd * sh["w"] * 0.4
        hoop.append(kit.tube("cage", [(bed_x, y, bed_z), (bed_x, y, top)], 0.05, col, M.get("chrome"), n=6))
        hoop.append(kit.tube("brace", [(bed_x, y, top - 0.05), (-sh["len"] * 0.44, y, bed_z)], 0.04, col, M.get("chrome"), n=6))
    hoop.append(kit.tube("cage_top", [(bed_x, -sh["w"] * 0.4, top), (bed_x, sh["w"] * 0.4, top)], 0.05, col, M.get("chrome"), n=6))
    out += hoop
    # Nerf bars: tube steps along the sides between the tyres, under the doors.
    for sd in (1, -1):
        y = sd * (sh["w"] / 2 + 0.1)
        out.append(kit.tube("step", [(wh["x"][0] * L - r - 0.05, y, floor - 0.05), (wh["x"][-1] * L + r + 0.05, y, floor - 0.05)], 0.05, col, M.get("chrome"), n=6))
    return out
