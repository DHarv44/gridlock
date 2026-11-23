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


def lightbar(name, x, z, half_w, col, length=0.26):
    """Police/ambulance light bar: red on the left half, blue on the right, on a dark base."""
    base = kit.box(name + "_base", x - length / 2, x + length / 2, -half_w, half_w, z, z + 0.05, col, M.get("trim"), bev=0.015)
    red = kit.box(name + "_r", x - length / 2 + 0.02, x + length / 2 - 0.02, 0.03, half_w - 0.03, z + 0.05, z + 0.13, col, M.get("siren_red"), bev=0.02)
    blue = kit.box(name + "_b", x - length / 2 + 0.02, x + length / 2 - 0.02, -half_w + 0.03, -0.03, z + 0.05, z + 0.13, col, M.get("siren_blue"), bev=0.02)
    return [base], [red, blue]
