"""Rapid-transit car (the L): a stainless body with a rounded roof, a window band between two pairs
of doors each side, end windows, a livery stripe, roof equipment, and two bogies with their wheels
and gear underneath. Symmetric end to end (it runs both ways). dims: the game's length/width/height."""
import kit
import materials as M
import parts


def build(vid, st, dims, col):
    L, W, H = dims["length"], dims["width"], dims["height"]
    floor = st.get("floor", 1.05)
    hw = W / 2
    # The body's cross-section, lofted end to end.
    sec = [(-hw, floor), (-hw, H - 0.5), (-hw + 0.22, H - 0.15), (-0.7, H), (0.7, H), (hw - 0.22, H - 0.15), (hw, H - 0.5), (hw, floor)]
    rings = [[(x, y, z) for y, z in sec] for x in (-L / 2, L / 2)]
    v, f = kit.loft(rings, cap0=True, cap1=True, closed=True)
    out = [kit.recalc(kit.mesh("body", v, f, col, M.get("stainless"), smooth=True, sharp=35))]
    win0, win1 = floor + 1.0, H - 0.75
    doors = [-L * 0.28, L * 0.28]
    dw = 0.7
    for sd in (1, -1):
        y0, y1 = sorted((sd * (hw + 0.005), sd * (hw + 0.02)))
        # Window band between and beyond the doors.
        edges = [-L / 2 + 0.6] + [x for d in doors for x in (d - dw - 0.15, d + dw + 0.15)] + [L / 2 - 0.6]
        for a, b in zip(edges[0::2], edges[1::2]):
            out.append(kit.box("win", a, b, y0, y1, win0, win1, col, M.get("glass")))
        for d in doors:
            out.append(kit.box("door", d - dw, d + dw, y0, y1, floor + 0.08, H - 0.55, col, M.get("grille")))
            out.append(kit.box("door_win", d - dw + 0.12, d + dw - 0.12, y1 - 0.004, y1 + 0.004, win0 + 0.1, win1, col, M.get("glass")))
            out.append(kit.box("seam", d - 0.015, d + 0.015, y1, y1 + 0.006, floor + 0.08, H - 0.55, col, M.get("trim")))
        # The livery stripe below the windows, and the sill.
        out.append(kit.box("stripe", -L / 2, L / 2, y0, y1 + 0.004, floor + 0.55, floor + 0.78, col, M.get("navy")))
        out.append(kit.box("sill", -L / 2, L / 2, y0, y1, floor - 0.05, floor + 0.12, col, M.get("trim")))
    for e in (1, -1):
        x0, x1 = sorted((e * (L / 2 + 0.005), e * (L / 2 + 0.02)))
        out.append(kit.box("end_win", x0, x1, -hw + 0.35, hw - 0.35, win0 + 0.15, win1, col, M.get("glass")))
        out.append(kit.box("end_door", x0, x1, -0.4, 0.4, floor + 0.1, H - 0.6, col, M.get("grille")))
        for sd in (1, -1):
            out.append(kit.box("head", x0, x1 + 0.01, sd * (hw - 0.55) - 0.15, sd * (hw - 0.55) + 0.15, floor + 0.35, floor + 0.55, col, M.get("head")))
        out.append(kit.box("coupler", e * L / 2 - (0.3 if e < 0 else 0), e * L / 2 + (0.3 if e > 0 else 0), -0.15, 0.15, floor - 0.45, floor - 0.2, col, M.get("underbody")))
        out.append(kit.box("anticlimber", x0 - e * 0.02, x1 + e * 0.06, -hw + 0.2, hw - 0.2, floor - 0.15, floor + 0.05, col, M.get("steel")))
    # Roof: air conditioning pods along the middle.
    for x in (-L * 0.3, 0.0, L * 0.3):
        out.append(kit.box("ac", x - 1.1, x + 1.1, -0.7, 0.7, H - 0.02, H + 0.3, col, M.get("steel"), bev=0.06))
    # Underneath: two bogies (frame, four wheels), and the equipment boxes between them.
    r = 0.42
    for bx in (-L / 2 + 2.6, L / 2 - 2.6):
        out.append(kit.box("bogie", bx - 1.4, bx + 1.4, -hw + 0.55, hw - 0.55, r - 0.15, r + 0.25, col, M.get("underbody")))
        for wx in (bx - 1.05, bx + 1.05):
            for sd in (1, -1):
                out += parts.wheel("wheel", wx, sd * 0.72, r, 0.14, col, rim="rim_dark", spokes=0, side=sd)
    out.append(kit.box("frame", -L / 2 + 0.2, L / 2 - 0.2, -hw + 0.3, hw - 0.3, floor - 0.3, floor, col, M.get("underbody")))
    for x in (-L * 0.15, L * 0.15):
        out.append(kit.box("gear", x - 1.2, x + 1.2, -hw + 0.6, hw - 0.6, floor - 0.75, floor - 0.3, col, M.get("trim")))
    return out
