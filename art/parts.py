"""Shared vehicle parts: wheels, surface decals (lights, grilles, seams, livery projected onto a body),
mirrors, light bars. Fractions follow the specs: x of length (+ = front), y of half-width, z metres
unless a name says otherwise."""
import math

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import kit
import materials as M


def wheel(name, x, y, r, w, col, rim="rim", spokes=5, n=12, side=1):
    """Tyre with a dished rim facing outward (side +1 = left/+y, -1 = right). Kept lean: wheels are
    a third of a car's triangles and barely seen from the street camera."""
    out = []
    s = side
    prof = [(-w / 2, r * 0.72), (-w / 2 + 0.025, r), (w / 2 - 0.025, r), (w / 2, r * 0.72)]
    t = kit.lathe(name + "_tyre", prof, col, M.get("tyre"), n=n, axis='Y', at=(x, y, r), caps=False)
    out.append(t)
    face = y + s * (w / 2 - 0.012)
    rp = [(0.0, 0.0), (0.026, r * 0.18), (0.03, r * 0.6), (-0.01, r * 0.72)]
    rim_ob = kit.lathe(name + "_rim", [(face - s * a, rr) for a, rr in rp], col, M.get(rim), n=n, axis='Y', at=(x, 0, r), caps=False)
    out.append(rim_ob)
    for k in range(spokes):
        a = 2 * math.pi * k / spokes + 0.3
        p0 = Vector((x + math.cos(a) * r * 0.16, face - s * 0.026, r + math.sin(a) * r * 0.16))
        p1 = Vector((x + math.cos(a) * r * 0.6, face - s * 0.01, r + math.sin(a) * r * 0.6))
        sp = kit.tube(name + "_sp%d" % k, [p0, p1], r * 0.055, col, M.get(rim), n=3, caps=False)
        out.append(sp)
    # The inside of the tyre: a dark disc so you can't see through the wheel.
    inner = kit.lathe(name + "_in", [(y - s * (w / 2 - 0.01), r * 0.71), (y - s * (w / 2 - 0.01), 0.0)], col, M.get("underbody"), n=n, axis='Y', at=(x, 0, r), caps=False)
    out.append(inner)
    return out


class Surface:
    """Ray-casts against a finished body so details sit on its skin."""

    def __init__(self, obs):
        dg = bpy.context.evaluated_depsgraph_get()
        verts, polys = [], []
        for ob in obs:
            me = ob.evaluated_get(dg).to_mesh()
            mw = ob.matrix_world
            base = len(verts)
            verts += [mw @ v.co for v in me.vertices]
            polys += [[base + i for i in p.vertices] for p in me.polygons]
            ob.evaluated_get(dg).to_mesh_clear()
        self.bvh = BVHTree.FromPolygons(verts, polys)

    def hit(self, origin, direction):
        loc, nrm, _, _ = self.bvh.ray_cast(Vector(origin), Vector(direction).normalized(), 50.0)
        return (loc, nrm) if loc is not None else (None, None)


def decal(name, surf, centre, right, up, w, h, view, col, mat, nu=4, nv=2, lift=0.004, depth=0.0):
    """A patch w x h laid onto the surface, seen along `view` (the direction the rays travel).
    Corners that miss the body are dropped. `depth` gives it thickness outward (lamp lenses)."""
    c, r, u, d = Vector(centre), Vector(right).normalized(), Vector(up).normalized(), Vector(view).normalized()
    grid = {}
    for i in range(nu + 1):
        for j in range(nv + 1):
            p = c + r * (w * (i / nu - 0.5)) + u * (h * (j / nv - 0.5))
            loc, nrm = surf.hit(p - d * 3.0, d)
            if loc is not None:
                grid[i, j] = loc + nrm * lift
    verts, index, faces = [], {}, []
    for (i, j), p in grid.items():
        index[i, j] = len(verts)
        verts.append(p)
    for i in range(nu):
        for j in range(nv):
            q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
            if all(k in index for k in q):
                faces.append(tuple(index[k] for k in q))
    if not faces:
        return None
    ob = kit.recalc(kit.mesh(name, verts, faces, col, M.get(mat), smooth=True, sharp=60))
    if depth:
        m = ob.modifiers.new("Solid", 'SOLIDIFY')
        m.thickness, m.offset = depth, 1.0
    return ob


def mirror_box(name, x, y, z, col, side=1, size=(0.1, 0.07, 0.11)):
    """A door mirror on a short arm."""
    sx, sy, sz = size
    head = kit.box(name, x - sx / 2, x + sx / 2, y + side * 0.03 - sy / 2, y + side * 0.03 + sy / 2 + side * 0.06, z, z + sz, col, M.get("paint"), bev=0.02, seg=1)
    glass = kit.box(name + "_g", x - sx / 2 - 0.004, x - sx / 2 + 0.002, y + side * 0.04 - sy / 2 + 0.01, y + side * 0.04 + sy / 2 + side * 0.04, z + 0.015, z + sz - 0.015, col, M.get("chrome"))
    return [head, glass]


def gun_turret(x, z, col, shield=True):
    """A roof gun ring with a .50 cal and (optionally) a gunner's shield, as one traversing part
    (anim 'turret', pivot on the ring)."""
    out = [kit.lathe("ring", [(z, 0.5), (z + 0.1, 0.48), (z + 0.12, 0.38), (z + 0.12, 0.0)], col, M.get("paint"), n=18, axis='Z', at=(x, 0, 0))]
    gz = z + 0.42
    if shield:
        # A curved front plate with side wings, a window slot left of the gun.
        n, rad = 7, 0.52
        rings = []
        for zz in (z + 0.1, z + 0.62):
            rings.append([(x + rad * math.cos(a), rad * math.sin(a), zz) for a in [-1.0 + 2.0 * k / (n - 1) for k in range(n)]])
        v, f = kit.loft(rings, cap0=False, cap1=False, closed=False)
        sh = kit.recalc(kit.mesh("shield", v, f, col, M.get("paint"), smooth=True, sharp=40))
        sh.modifiers.new("Solid", 'SOLIDIFY').thickness = 0.03
        out.append(sh)
        for sd in (1, -1):
            a = sd * 1.0
            out.append(kit.box("wing", x + rad * math.cos(a) - 0.25, x + rad * math.cos(a), sd * rad * math.sin(a) - 0.015, sd * rad * math.sin(a) + 0.015,
                               z + 0.1, z + 0.5, col, M.get("paint")))
        out.append(kit.box("slot", x + rad - 0.01, x + rad + 0.02, 0.12, 0.3, z + 0.5, z + 0.58, col, M.get("glass")))
    # The gun: receiver, barrel with its perforated jacket, spade grips, ammo can.
    out.append(kit.box("receiver", x - 0.05, x + 0.32, -0.06, 0.06, gz - 0.06, gz + 0.06, col, M.get("trim"), bev=0.01))
    out.append(kit.lathe("barrel", [(x + 0.3, 0.032), (x + 0.62, 0.032), (x + 0.64, 0.018), (x + 1.25, 0.016), (x + 1.25, 0.024), (x + 1.31, 0.024), (x + 1.31, 0.0)],
                         col, M.get("trim"), n=10, axis='X', at=(0, 0, gz)))
    for sd in (1, -1):
        out.append(kit.tube("grip", [(x - 0.05, sd * 0.05, gz), (x - 0.16, sd * 0.05, gz - 0.02), (x - 0.16, sd * 0.05, gz - 0.12)], 0.014, col, M.get("trim"), n=6))
    out.append(kit.box("ammo", x + 0.0, x + 0.2, -0.22, -0.07, gz - 0.12, gz + 0.02, col, M.get("olive"), bev=0.01))
    out.append(kit.box("cradle", x - 0.02, x + 0.1, -0.03, 0.03, z + 0.12, gz - 0.06, col, M.get("trim")))
    for o in out:
        o["anim"], o["pivot"] = "turret", (x, 0.0, z)
    return out


def text(name, body, size, loc, rot, col, mat, depth=0.006):
    """Raised lettering (livery like SWAT, POLICE) as real geometry."""
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body, cu.size, cu.extrude = body, size, depth
    cu.align_x, cu.align_y = 'CENTER', 'CENTER'
    cu.resolution_u = 1  # straight-edged glyphs: a font's curves cost thousands of triangles
    ob = bpy.data.objects.new(name, cu)
    col.objects.link(ob)
    ob.location, ob.rotation_euler = loc, rot
    ob.data.materials.append(M.get(mat))
    return ob


def lightbar(name, x, z, half_w, col, length=0.26):
    """Police/ambulance light bar: red on the left half, blue on the right, on a dark base."""
    base = kit.box(name + "_base", x - length / 2, x + length / 2, -half_w, half_w, z, z + 0.05, col, M.get("trim"), bev=0.015)
    red = kit.box(name + "_r", x - length / 2 + 0.02, x + length / 2 - 0.02, 0.03, half_w - 0.03, z + 0.05, z + 0.13, col, M.get("siren_red"), bev=0.02)
    blue = kit.box(name + "_b", x - length / 2 + 0.02, x + length / 2 - 0.02, -half_w + 0.03, -0.03, z + 0.05, z + 0.13, col, M.get("siren_blue"), bev=0.02)
    return [base], [red, blue]
