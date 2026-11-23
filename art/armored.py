"""Armoured trucks: the MRAP and the police SWAT truck. A crew box and a bonnet, each a chamfered
section run along the length (the crew box's front leaning back as the windscreen), wheel wells cut
in, a V-hull underneath on the MRAP; glass, doors and lamps laid onto the armour as decals.
Lengths are fractions of the vehicle length (+ = front), heights metres."""
import math

import kit
import materials as M
import parts


def section(name, x0, x1, hw, z0, z1, chamfer, col, mat, lean=0.0, lean_from=None, nose=0.0):
    """A chamfered box section from x0 (rear) to x1 (front). The front face leans back by `lean`
    metres at the top (from height `lean_from`); `nose` pulls the bottom of the front back."""
    c = chamfer
    pts = [(-hw, z0), (hw, z0), (hw, z1 - c), (hw - c * 0.8, z1), (-hw + c * 0.8, z1), (-hw, z1 - c)]
    lf = z0 if lean_from is None else lean_from
    rear = [(x0, y, z) for y, z in pts]
    front = []
    for y, z in pts:
        t = max(0.0, (z - lf) / max(z1 - lf, 0.01))
        front.append((x1 - lean * t - (nose if z == z0 else 0.0), y, z))
    v, f = kit.loft([rear, front])
    ob = kit.recalc(kit.mesh(name, v, f, col, M.get(mat), smooth=True, sharp=30))
    kit.bevel(ob, 0.025, 1, 30)
    return ob


def build(vid, st, dims, col):
    L, W, H = dims["length"], dims["width"], dims["height"]
    hw = W / 2 * st.get("body_w", 0.96)
    wh = st["wheel"]
    r = wh["r"]
    z0 = st.get("floor", r * 1.55)
    xb = st["box_front"] * L          # where the crew box's front meets the bonnet
    lean = st.get("lean", 0.45)
    belt = st.get("belt", H - 0.85)
    box = section("crew", -L / 2, xb, hw, z0, H, st.get("chamfer", 0.2), col, "paint", lean=lean, lean_from=belt)
    hood_top = st.get("hood_top", belt - 0.05)
    hood = section("bonnet", xb - 0.3, L / 2, hw * st.get("hood_w", 0.86), z0 + 0.05, hood_top, 0.12, col, "paint",
                   lean=st.get("hood_lean", 0.3), lean_from=z0 + 0.3)
    # Wheel wells.
    for x in wh["x"]:
        for sd in (1, -1):
            for ob in (box, hood):
                c = kit.lathe("well", [(sd * (hw - wh["w"] - 0.15), r * 1.12), (sd * (hw + 0.6), r * 1.12)], col, M.get("underbody"),
                              n=18, axis='Y', at=(x * L, 0, r + 0.03), smooth=False)
                kit.cut(ob, c)
    out = [box, hood]
    if st.get("vhull"):
        xa, xc = wh["x"][-1] * L - r, wh["x"][0] * L + r * 0.3
        rings = [[(x, -hw * 0.92, z0 + 0.02), (x, hw * 0.92, z0 + 0.02), (x, 0.0, z0 - st["vhull"])] for x in (xa, xc)]
        v, f = kit.loft(rings)
        out.append(kit.recalc(kit.mesh("vhull", v, f, col, M.get("underbody"))))
    # Chassis, wheels, axles.
    out.append(kit.box("frame", -L / 2 + 0.3, L / 2 - 0.3, -0.45, 0.45, r * 0.75, z0, col, M.get("underbody")))
    for x in wh["x"]:
        for sd in (1, -1):
            y = sd * (W / 2 - wh["w"] / 2 - 0.02)
            out += parts.wheel("wheel", x * L, y, r, wh["w"], col, rim="rim_dark", spokes=0, side=sd)
    # Bumper, steps, mirrors on arms, lamps in cages.
    out.append(kit.box("bumper", L / 2 - 0.05, L / 2 + 0.18, -hw, hw, z0 - 0.1, z0 + 0.22, col, M.get("trim"), bev=0.03))
    if st.get("pushbar"):
        for sd in (1, -1):
            out.append(kit.tube("ram", [(L / 2 + 0.18, sd * hw * 0.45, z0 + 0.15), (L / 2 + 0.3, sd * hw * 0.45, z0 + 0.25), (L / 2 + 0.3, sd * hw * 0.45, hood_top + 0.05), (L / 2 + 0.1, sd * hw * 0.45, hood_top + 0.12)], 0.035, col, M.get("trim"), n=8))
        out.append(kit.tube("ram_x", [(L / 2 + 0.3, -hw * 0.45, z0 + 0.6), (L / 2 + 0.3, hw * 0.45, z0 + 0.6)], 0.03, col, M.get("trim"), n=8))
    out.append(kit.box("rbumper", -L / 2 - 0.12, -L / 2 + 0.05, -hw, hw, z0 - 0.1, z0 + 0.12, col, M.get("trim"), bev=0.02))
    for sd in (1, -1):
        y = sd * (hw + 0.04)
        out.append(kit.box("step", st["door"][1] * L - 0.55, st["door"][1] * L - 0.05, min(y, y - sd * 0.25), max(y, y - sd * 0.25), z0 - 0.45, z0 - 0.4, col, M.get("steel")))
        ma = (xb - lean * 0.3, sd * (hw + 0.02), belt + 0.15)
        out.append(kit.tube("mirror_arm", [ma, (ma[0] + 0.05, sd * (hw + 0.35), ma[2] + 0.05)], 0.02, col, M.get("trim"), n=6))
        out.append(kit.box("mirror", ma[0] - 0.02, ma[0] + 0.1, sd * (hw + 0.3) - 0.08, sd * (hw + 0.3) + 0.08, ma[2] - 0.15, ma[2] + 0.2, col, M.get("trim"), bev=0.015))
    skin = parts.Surface([box, hood])
    # Windscreen (two panes), side windows, doors, lamps, grille.
    wz = (belt + H - 0.12) / 2
    for sd in (1, -1):
        out.append(parts.decal("screen", skin, (L / 2 + 2, sd * hw * 0.45, wz), (0, 1, 0), (0, 0, 1), hw * 0.82, H - belt - 0.3, (-1, 0, 0), col, "glass", nu=2, nv=2, depth=0.02))
        for wx in st.get("windows", []):
            out.append(parts.decal("window", skin, (wx * L, sd * (hw + 2), wz), (1, 0, 0), (0, 0, 1), 0.36, H - belt - 0.35, (0, -sd, 0), col, "glass", nu=1, nv=1, depth=0.02))
        d0, d1 = st["door"]
        for x in (d0, d1):
            out.append(parts.decal("seam", skin, (x * L, sd * (hw + 2), (z0 + H) / 2 - 0.1), (1, 0, 0), (0, 0, 1), 0.015, H - z0 - 0.4, (0, -sd, 0), col, "grille", nu=1, nv=3))
        out.append(parts.decal("handle", skin, ((d0 + 0.02) * L, sd * (hw + 2), belt - 0.15), (1, 0, 0), (0, 0, 1), 0.14, 0.04, (0, -sd, 0), col, "trim", nu=1, nv=1, depth=0.02))
        out.append(parts.decal("head", skin, (L / 2 + 2, sd * hw * 0.62, hood_top - 0.22), (0, 1, 0), (0, 0, 1), 0.22, 0.14, (-1, 0, 0), col, "head", nu=1, nv=1, depth=0.03))
        out.append(kit.box("cage", L / 2 - 0.02, L / 2 + 0.06, sd * hw * 0.62 - 0.14, sd * hw * 0.62 + 0.14, hood_top - 0.33, hood_top - 0.1, col, M.get("trim")))
        out.append(parts.decal("tail", skin, (-L / 2 - 2, sd * hw * 0.8, z0 + 0.35), (0, 1, 0), (0, 0, 1), 0.12, 0.25, (1, 0, 0), col, "tail", nu=1, nv=1, depth=0.02))
    out.append(parts.decal("grille", skin, (L / 2 + 2, 0, hood_top - 0.25), (0, 1, 0), (0, 0, 1), hw * 0.7, 0.3, (-1, 0, 0), col, "grille", nu=4, nv=1, depth=0.01))
    out.append(parts.decal("rear_door", skin, (-L / 2 - 2, 0, (z0 + H) / 2), (0, 1, 0), (0, 0, 1), hw * 0.9, H - z0 - 0.35, (1, 0, 0), col, "trim", nu=2, nv=2, lift=0.006))
    out.append(parts.decal("rear_win", skin, (-L / 2 - 2, 0, belt + 0.2), (0, 1, 0), (0, 0, 1), 0.3, 0.25, (1, 0, 0), col, "glass", nu=1, nv=1, depth=0.02))
    # Roof: gun ring or hatch, antennas, light bar, lettering.
    roof_x = st.get("roof_x", -0.1) * L
    if st.get("gun"):
        out += parts.gun_turret(roof_x, H, col)
    else:
        out.append(kit.lathe("hatch", [(H, 0.38), (H + 0.08, 0.36), (H + 0.1, 0.0)], col, M.get("paint"), n=14, axis='Z', at=(roof_x, 0, 0)))
    for sd in (1, -1):
        out.append(kit.tube("antenna", [(-L / 2 + 0.3, sd * (hw - 0.15), H), (-L / 2 + 0.25, sd * (hw - 0.15), H + 1.2)], 0.008, col, M.get("trim"), n=4))
    if dims.get("siren"):
        base, lamps = parts.lightbar("bar", xb - lean - 0.2, H, hw * 0.8, col)
        out += base + lamps
    for t in st.get("lettering", []):
        for sd in (1, -1):
            out.append(parts.text("letters", t["text"], t["size"], (t["x"] * L, sd * (hw + 0.004), t["z"]), (math.pi / 2, 0, 0 if sd < 0 else math.pi),
                                  col, t.get("mat", "white"), depth=0.004))
    return [o for o in out if o]
