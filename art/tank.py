"""Battle tank: a sloped hull between two track runs, road wheels behind side skirts, and a turret
(a separate part pivoting on the hull) carrying the gun. Metres, x forward."""
import math

import kit
import materials as M


def build(vid, st, dims, col):
    L, W, H = dims["length"], dims["width"], dims["height"]
    tw = st.get("track_w", 0.62)
    hull_h = st.get("hull_h", 1.45)
    out = []
    hl = L * 0.5
    # Hull: side profile with a sloped glacis and a raked rear, between the tracks.
    prof = [(-hl + 0.15, 0.45), (-hl, 0.85), (-hl + 0.1, hull_h), (hl - 1.6, hull_h), (hl - 0.05, 0.95), (hl - 0.25, 0.45)]
    out.append(kit.prism("hull", prof, -W / 2 + tw, W / 2 - tw, col, M.get("paint"), bev=0.04, seg=2))
    # Track guards / sponsons over the tracks, full width.
    deck = [(-hl - 0.05, 1.0), (-hl + 0.1, 1.12), (hl - 0.3, 1.12), (hl + 0.05, 0.98), (hl, 0.9), (-hl, 0.9)]
    for sd in (1, -1):
        y0, y1 = sorted((sd * (W / 2 - tw - 0.02), sd * W / 2))
        out.append(kit.prism("guard", deck, y0, y1, col, M.get("paint"), bev=0.02))
        # Side skirt hiding the upper run of the track.
        sk = [(-hl + 0.2, 0.55), (-hl + 0.15, 0.95), (hl - 0.35, 0.95), (hl - 0.5, 0.55)]
        ys = sd * (W / 2 + 0.01)
        out.append(kit.prism("skirt", sk, min(ys, ys - sd * 0.04), max(ys, ys - sd * 0.04), col, M.get("paint"), bev=0.015))
        # The track: a rounded loop, and road wheels.
        loop = []
        r = 0.36
        cx0, cx1 = -hl + 0.45, hl - 0.6
        for k in range(10):
            a = math.pi / 2 + math.pi * k / 9
            loop.append((cx0 + r * math.cos(a), 0.4 + r * math.sin(a) * 1.05))
        for k in range(10):
            a = -math.pi / 2 + math.pi * k / 9
            loop.append((cx1 + (r - 0.04) * math.cos(a), 0.5 + (r - 0.04) * math.sin(a)))
        y0, y1 = sorted((sd * (W / 2 - tw), sd * (W / 2 - 0.02)))
        out.append(kit.prism("track", loop, y0, y1, col, M.get("tyre"), bev=0.01))
        n = 6
        for i in range(n):
            x = cx0 + 0.25 + (cx1 - cx0 - 0.4) * i / (n - 1)
            out.append(kit.lathe("road", [(-0.05, 0.0), (-0.05, 0.28), (0.05, 0.3), (0.05, 0.0)], col, M.get("rim_dark"), n=12, axis='Y',
                                 at=(x, sd * (W / 2 - 0.05), 0.36)))
    # Exhaust grille and tools on the rear deck, lights on the glacis.
    out.append(kit.box("vents", -hl + 0.3, -hl + 1.4, -0.7, 0.7, hull_h, hull_h + 0.04, col, M.get("grille")))
    for sd in (1, -1):
        out.append(kit.box("lamp", hl - 0.55, hl - 0.45, sd * 0.95 - 0.1, sd * 0.95 + 0.1, 1.05, 1.15, col, M.get("head"), bev=0.02))
        out.append(kit.box("tail", -hl - 0.02, -hl + 0.02, sd * 1.0 - 0.08, sd * 1.0 + 0.08, 0.95, 1.02, col, M.get("tail")))
    # Turret: faceted plan, sloped cheeks; gun and mantlet; commander's cupola.
    tx = st.get("turret_x", -0.2)
    tz = hull_h
    piv = (tx, 0.0, tz)
    plan = [(tx + 1.5, -0.75), (tx + 1.5, 0.75), (tx + 0.6, 1.35), (tx - 1.5, 1.35), (tx - 1.9, 1.0), (tx - 1.9, -1.0), (tx - 1.5, -1.35), (tx + 0.6, -1.35)]
    tur = [kit.plan_prism("turret", plan, tz, tz + 0.75, col, M.get("paint"), bev=0.08, seg=2)]
    top = [(tx + 1.2, -0.6), (tx + 1.2, 0.6), (tx + 0.4, 1.1), (tx - 1.4, 1.1), (tx - 1.7, 0.85), (tx - 1.7, -0.85), (tx - 1.4, -1.1), (tx + 0.4, -1.1)]
    tur.append(kit.plan_prism("turret_top", top, tz + 0.75, tz + 0.95, col, M.get("paint"), bev=0.05, seg=1))
    tur.append(kit.box("mantlet", tx + 1.45, tx + 1.8, -0.4, 0.4, tz + 0.2, tz + 0.75, col, M.get("paint"), bev=0.06, seg=2))
    gl = st.get("gun", 4.2)
    gz = tz + 0.48
    tur.append(kit.lathe("gun", [(1.8, 0.14), (2.6, 0.11), (2.7, 0.15), (3.2, 0.15), (3.3, 0.1), (1.8 + gl, 0.09), (1.82 + gl, 0.06), (1.82 + gl, 0.0)],
                         col, M.get("paint"), n=12, axis='X', at=(tx, 0, gz)))
    tur.append(kit.lathe("cupola", [(tz + 0.95, 0.38), (tz + 1.15, 0.34), (tz + 1.2, 0.0)], col, M.get("paint"), n=12, axis='Z', at=(tx - 0.6, 0.55, 0)))
    tur.append(kit.box("sight", tx + 0.6, tx + 0.95, -0.85, -0.55, tz + 0.95, tz + 1.15, col, M.get("trim"), bev=0.02))
    tur.append(kit.box("bustle", tx - 2.05, tx - 1.9, -0.9, 0.9, tz + 0.15, tz + 0.7, col, M.get("trim")))
    tur.append(kit.tube("mg", [(tx - 0.3, -0.5, tz + 1.25), (tx + 0.6, -0.5, tz + 1.25)], 0.03, col, M.get("trim"), n=6))
    for o in tur:
        o["anim"], o["pivot"] = "turret", piv
    return out + tur
