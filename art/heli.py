"""Helicopters: a light utility type (police, news, civil) and the gunship. The pod is a loft of
rounded sections whose front and upper faces are glass; the rotors are separate parts with their
origins on the shaft so the game can spin them. Station x are fractions of length."""
import math

import kit
import materials as M


def pod(name, stations, col, glass_rule, n=16, accent=None):
    """stations: [(xf, half_width, z_low, z_high)] (x already in metres). glass_rule(x, angle) says
    which faces are glass; accent paints a band low on the sides."""
    rings = []
    for x, hw, z0, z1 in stations:
        zc, hz = (z0 + z1) / 2, max((z1 - z0) / 2, 0.01)
        ring = []
        for k in range(n):
            a = 2 * math.pi * k / n
            c, s = math.cos(a), math.sin(a)
            # A squarer section than an ellipse (superellipse), as cabins are.
            e = 0.6
            y = max(hw, 0.01) * math.copysign(abs(c) ** e, c)
            z = zc + hz * math.copysign(abs(s) ** e, s)
            ring.append((x, y, z))
        rings.append(ring)
    v, f = kit.loft(rings)
    mats = ["paint", "glass", "underbody"] + ([accent] if accent else [])
    fm = []
    xs = [s[0] for s in stations]
    for i in range(len(stations) - 1):
        xm = (xs[i] + xs[i + 1]) / 2
        for j in range(n):
            a = 2 * math.pi * (j + 0.5) / n
            if glass_rule(xm, a):
                fm.append(1)
            elif math.sin(a) < -0.75:
                fm.append(2)
            elif accent and -0.75 <= math.sin(a) < -0.25:
                fm.append(3)
            else:
                fm.append(0)
    fm += [0, 0]
    return kit.recalc(kit.mesh(name, v, f, col, [M.get(m) for m in mats], face_mats=fm, smooth=True, sharp=50))


def blade_set(name, centre, radius, chord, n, col, phase=0.0, plane='XY', thick=0.03):
    """Rotor blades as flat tapered slabs around `centre`."""
    out = []
    cx, cy, cz = centre
    for k in range(n):
        a = phase + 2 * math.pi * k / n
        ca, sa = math.cos(a), math.sin(a)
        poly = [(0.15, -chord / 2), (radius, -chord * 0.4), (radius, chord * 0.4), (0.15, chord / 2)]
        pts = []
        for u, w in poly:
            if plane == 'XY':
                pts.append((cx + u * ca - w * sa, cy + u * sa + w * ca))
            else:
                pts.append((cx + u * ca - w * sa, cz + u * sa + w * ca))
        if plane == 'XY':
            ob = kit.plan_prism(name, pts, cz - thick / 2, cz + thick / 2, col, M.get("trim"))
        else:
            ob = kit.prism(name, pts, cy - thick / 2, cy + thick / 2, col, M.get("trim"))
        out.append(ob)
    return out


def tag(obs, anim, pivot):
    for o in obs:
        o["anim"], o["pivot"] = anim, pivot
    return obs


def utility(vid, st, dims, col):
    L, H = dims["length"], dims["height"]
    acc = st.get("accent")
    S = [(0.40, 0.08, 1.15, 1.35), (0.37, 0.55, 0.62, 1.75), (0.3, 0.78, 0.48, 2.05), (0.18, 0.85, 0.45, 2.2),
         (0.05, 0.84, 0.48, 2.22), (-0.04, 0.7, 0.62, 2.18), (-0.1, 0.42, 1.05, 2.05), (-0.13, 0.24, 1.45, 1.95)]
    st_m = [(x * L, w, z0, z1) for x, w, z0, z1 in S]

    def glass(x, a):
        front = x > 0.24 * L and math.sin(a) > -0.55
        side = 0.06 * L < x <= 0.24 * L and -0.2 < math.sin(a) < 0.75 and abs(math.cos(a)) > 0.35
        return front or side
    out = [pod("pod", st_m, col, glass, accent=acc)]
    # Tail boom, fins and the tail rotor.
    bz = 1.72
    out.append(kit.lathe("boom", [(-0.12 * L, 0.24), (-0.3 * L, 0.17), (-0.46 * L, 0.11), (-0.48 * L, 0.0)], col, M.get("paint"), n=12, axis='X', at=(0, 0, bz)))
    out.append(kit.prism("fin", [(-0.44 * L, bz), (-0.47 * L, bz + 1.1), (-0.5 * L, bz + 1.15), (-0.49 * L, bz - 0.5), (-0.46 * L, bz - 0.45)], -0.03, 0.03, col, M.get(acc or "paint"), bev=0.01))
    out.append(kit.plan_prism("stab", [(-0.38 * L, -0.85), (-0.35 * L, -0.85), (-0.35 * L, 0.85), (-0.38 * L, 0.85)], bz - 0.02, bz + 0.03, col, M.get("paint"), bev=0.01))
    tc = (-0.485 * L, 0.16, bz + 0.6)
    out += tag(blade_set("tail_rotor", tc, 0.75, 0.12, 2, col, plane='XZ', thick=0.02), "tailrotor", tc)
    # Skids.
    for sd in (1, -1):
        y = sd * 1.05
        out.append(kit.tube("skid", [(0.33 * L, y, 0.2), (0.3 * L, y, 0.07), (-0.08 * L, y, 0.07)], 0.045, col, M.get("trim"), n=8))
        for x in (0.2 * L, 0.0):
            out.append(kit.tube("strut", [(x, y, 0.07), (x, sd * 0.7, 0.55)], 0.04, col, M.get("trim"), n=6))
    # Mast, hub and the main rotor.
    mx = 0.08 * L
    out.append(kit.lathe("cowl", [(2.1, 0.65), (2.45, 0.45), (2.55, 0.0)], col, M.get("paint"), n=14, axis='Z', at=(mx - 0.4, 0, 0)))
    out.append(kit.lathe("mast", [(2.4, 0.08), (2.85, 0.07)], col, M.get("steel"), n=10, axis='Z', at=(mx, 0, 0)))
    hub = (mx, 0, 2.9)
    rot = blade_set("rotor", hub, L * 0.45, 0.32, st.get("blades", 2), col)
    rot.append(kit.lathe("hub", [(2.82, 0.0), (2.82, 0.18), (2.98, 0.18), (3.0, 0.0)], col, M.get("steel"), n=12, axis='Z', at=(mx, 0, 0)))
    out += tag(rot, "rotor", hub)
    if st.get("searchlight"):
        out.append(kit.lathe("search", [(0.0, 0.0), (0.0, 0.14), (0.25, 0.14), (0.26, 0.0)], col, M.get("trim"), n=10, axis='X', at=(0.33 * L, -0.55, 0.42)))
    if dims.get("siren"):
        out.append(kit.box("strobe_r", -0.1 * L, -0.08 * L, 0.2, 0.3, 2.2, 2.3, col, M.get("siren_red")))
        out.append(kit.box("strobe_b", -0.1 * L, -0.08 * L, -0.3, -0.2, 2.2, 2.3, col, M.get("siren_blue")))
    return out


def gunship(vid, st, dims, col):
    L = dims["length"]
    S = [(0.43, 0.06, 0.9, 1.1), (0.38, 0.38, 0.55, 1.5), (0.3, 0.52, 0.45, 2.05), (0.18, 0.56, 0.45, 2.3),
         (0.06, 0.62, 0.45, 2.35), (-0.04, 0.6, 0.5, 2.25), (-0.12, 0.38, 0.9, 2.05), (-0.16, 0.24, 1.3, 1.9)]
    st_m = [(x * L, w, z0, z1) for x, w, z0, z1 in S]

    def glass(x, a):
        return 0.14 * L < x < 0.36 * L and math.sin(a) > 0.2
    out = [pod("pod", st_m, col, glass)]
    bz = 1.6
    out.append(kit.lathe("boom", [(-0.15 * L, 0.26), (-0.32 * L, 0.18), (-0.46 * L, 0.12), (-0.48 * L, 0.0)], col, M.get("paint"), n=12, axis='X', at=(0, 0, bz)))
    out.append(kit.prism("fin", [(-0.43 * L, bz), (-0.46 * L, bz + 1.3), (-0.5 * L, bz + 1.35), (-0.49 * L, bz - 0.3), (-0.45 * L, bz - 0.25)], -0.04, 0.04, col, M.get("paint"), bev=0.01))
    out.append(kit.plan_prism("stab", [(-0.42 * L, -1.0), (-0.39 * L, -1.0), (-0.39 * L, 1.0), (-0.42 * L, 1.0)], bz + 0.2, bz + 0.26, col, M.get("paint"), bev=0.01))
    tc = (-0.485 * L, -0.2, bz + 0.85)
    out += tag(blade_set("tail_rotor", tc, 0.85, 0.14, 4, col, plane='XZ', thick=0.02), "tailrotor", tc)
    # Stub wings with rocket pods, chin gun, fixed wheels.
    out.append(kit.plan_prism("wings", [(0.06 * L, -1.55), (-0.04 * L, -1.55), (-0.06 * L, 1.55), (0.04 * L, 1.55)], 1.25, 1.35, col, M.get("paint"), bev=0.02))
    for sd in (1, -1):
        y = sd * 1.25
        out.append(kit.lathe("pod_r", [(-0.07 * L, 0.0), (-0.07 * L, 0.2), (0.07 * L, 0.2), (0.08 * L, 0.12), (0.085 * L, 0.0)], col, M.get("olive"), n=12, axis='X', at=(0, y, 1.05)))
        out.append(kit.tube("wheel_leg", [(0.22 * L, sd * 0.5, 0.75), (0.24 * L, sd * 0.95, 0.3)], 0.05, col, M.get("trim"), n=6))
        out.append(kit.lathe("wheel", [(-0.07, 0.0), (-0.07, 0.25), (0.07, 0.25), (0.07, 0.0)], col, M.get("tyre"), n=12, axis='Y', at=(0.24 * L, sd * 1.0, 0.27)))
    out.append(kit.lathe("tailwheel", [(-0.05, 0.0), (-0.05, 0.16), (0.05, 0.16), (0.05, 0.0)], col, M.get("tyre"), n=10, axis='Y', at=(-0.45 * L, 0, 0.18)))
    out.append(kit.tube("tailstrut", [(-0.45 * L, 0, 0.18), (-0.43 * L, 0, bz - 0.1)], 0.04, col, M.get("trim"), n=6))
    out.append(kit.lathe("turret", [(0.3, 0.0), (0.3, 0.22), (0.55, 0.2), (0.6, 0.0)], col, M.get("trim"), n=12, axis='Z', at=(0.36 * L, 0, 0)))
    for k in (-1, 0, 1):
        out.append(kit.tube("gun", [(0.36 * L, k * 0.04, 0.38), (0.36 * L + 1.3, k * 0.04, 0.38)], 0.025, col, M.get("steel"), n=6))
    mx = 0.06 * L
    out.append(kit.lathe("cowl", [(2.2, 0.7), (2.6, 0.5), (2.7, 0.0)], col, M.get("paint"), n=14, axis='Z', at=(mx - 0.3, 0, 0)))
    out.append(kit.lathe("mast", [(2.55, 0.09), (3.05, 0.08)], col, M.get("steel"), n=10, axis='Z', at=(mx, 0, 0)))
    hub = (mx, 0, 3.1)
    rot = blade_set("rotor", hub, L * 0.42, 0.42, 4, col, phase=math.pi / 4)
    rot.append(kit.lathe("hub", [(3.0, 0.0), (3.0, 0.24), (3.18, 0.24), (3.2, 0.0)], col, M.get("steel"), n=12, axis='Z', at=(mx, 0, 0)))
    out += tag(rot, "rotor", hub)
    return out


def build(vid, st, dims, col):
    return gunship(vid, st, dims, col) if st.get("type") == "gunship" else utility(vid, st, dims, col)
