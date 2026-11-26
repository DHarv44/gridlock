"""Modelling kit for GRIDLOCK's vehicles and weapons: scene and collection bookkeeping, meshes from
data (lofts, lathes, side-view prisms), modifier stacks and the joins that keep draw calls low.

Everything the build makes lives under one root collection (ROOT) in its own scene (SCENE), so a
rebuild never touches anything else open in Blender. No bpy.ops except booleans' apply.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

SCENE = "Gridlock"
ROOT = "Gridlock"


def scene():
    """The build's own scene; in the live window it becomes the one on screen."""
    sc = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
    win = bpy.context.window
    if win is not None and win.scene != sc:
        win.scene = sc
    return sc


def reset():
    """Delete everything the last build made (and only that)."""
    root = bpy.data.collections.get(ROOT)
    if root:
        for c in [root] + list(root.children_recursive):
            for ob in list(c.objects):
                bpy.data.objects.remove(ob, do_unlink=True)
        for c in list(root.children_recursive):
            bpy.data.collections.remove(c)
    for blocks in (bpy.data.meshes, bpy.data.curves):
        for b in list(blocks):
            if b.users == 0:
                blocks.remove(b)


def coll(name, parent=None):
    """A collection under the root (or under `parent`)."""
    sc = scene()
    root = bpy.data.collections.get(ROOT)
    if root is None:
        root = bpy.data.collections.new(ROOT)
    if root.name not in sc.collection.children:
        sc.collection.children.link(root)
    if name == ROOT:
        return root
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
        (parent or root).children.link(c)
    return c


def mesh(name, verts, faces, collection, mats, face_mats=None, smooth=False, sharp=40.0):
    """Object from raw verts/faces. `mats` one material or a list; `face_mats` an index per face.
    Smooth meshes get sharp edges above `sharp` degrees, so round things read round and corners
    stay crisp."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.validate(clean_customdata=False)
    for m in (mats if isinstance(mats, (list, tuple)) else [mats]):
        me.materials.append(m)
    if face_mats:
        me.polygons.foreach_set("material_index", face_mats[:len(me.polygons)])
    me.polygons.foreach_set("use_smooth", [smooth] * len(me.polygons))
    if smooth:
        me.set_sharp_from_angle(angle=math.radians(sharp))
    me.update()
    ob = bpy.data.objects.new(name, me)
    collection.objects.link(ob)
    return ob


def recalc(ob):
    """Outward normals (data-built meshes may wind either way)."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    return ob


# ---------------------------------------------------------------- modifiers

def bevel(ob, w=0.01, seg=2, angle=40.0):
    m = ob.modifiers.new("Bevel", 'BEVEL')
    m.width, m.segments = w, seg
    m.limit_method, m.angle_limit = 'ANGLE', math.radians(angle)
    m.use_clamp_overlap = True
    m.harden_normals = False
    return ob


def mirror_y(ob):
    m = ob.modifiers.new("Mirror", 'MIRROR')
    m.use_axis = (False, True, False)
    m.use_clip, m.use_mirror_merge = True, True
    m.merge_threshold = 0.0005
    return ob


def cut(ob, cutter, solver='EXACT'):
    """Boolean difference, applied now; the cutter is deleted. The new faces take the cutter's
    material (wheel-arch liners, bed liners)."""
    m = ob.modifiers.new("Cut", 'BOOLEAN')
    m.operation, m.object, m.solver = 'DIFFERENCE', cutter, solver
    m.material_mode = 'TRANSFER'
    bake(ob)
    bpy.data.objects.remove(cutter, do_unlink=True)
    return ob


def bake(ob):
    """Apply all modifiers into the mesh."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)
    return ob


# ---------------------------------------------------------------- shapes

def loft(rings, cap0=True, cap1=True, closed=True):
    """Rings of equal length -> (verts, faces). Face (i, j) joins ring i to i+1 at point j."""
    m, k = len(rings), len(rings[0])
    verts = [v for r in rings for v in r]
    faces = []
    jn = k if closed else k - 1
    for i in range(m - 1):
        for j in range(jn):
            j2 = (j + 1) % k
            faces.append((i * k + j, (i + 1) * k + j, (i + 1) * k + j2, i * k + j2))
    if cap0:
        faces.append(tuple(reversed(range(k))))
    if cap1:
        faces.append(tuple((m - 1) * k + j for j in range(k)))
    return verts, faces


def lathe(name, prof, collection, mat, n=16, axis='X', at=(0, 0, 0), caps=True, smooth=True):
    """Surface of revolution: prof = [(along, radius)] around `axis` through `at`."""
    ax, ay, az = at
    rings = []
    for a, r in prof:
        ring = []
        for k in range(n):
            t = 2 * math.pi * k / n
            u, v = r * math.cos(t), r * math.sin(t)
            if axis == 'X':
                ring.append((ax + a, ay + u, az + v))
            elif axis == 'Y':
                ring.append((ax + v, ay + a, az + u))
            else:
                ring.append((ax + u, ay + v, az + a))
        rings.append(ring)
    v, f = loft(rings, cap0=caps and prof[0][1] > 0, cap1=caps and prof[-1][1] > 0)
    return recalc(mesh(name, v, f, collection, mat, smooth=smooth))


def prism(name, poly, y0, y1, collection, mat, bev=0.0, seg=2, smooth=False):
    """A side-view polygon [(x, z)] extruded across the width from y0 to y1 (gun receivers, stocks,
    blades, truck panels)."""
    k = len(poly)
    v = [(x, y0, z) for x, z in poly] + [(x, y1, z) for x, z in poly]
    f = [tuple(range(k)), tuple(range(k, 2 * k))]
    f += [(i, (i + 1) % k, k + (i + 1) % k, k + i) for i in range(k)]
    ob = recalc(mesh(name, v, f, collection, mat, smooth=smooth))
    if bev:
        bevel(ob, bev, seg)
    return ob


def plan_prism(name, poly, z0, z1, collection, mat, bev=0.0, seg=1):
    """A top-view polygon [(x, y)] extruded up from z0 to z1 (rotor blades, hull plates)."""
    k = len(poly)
    v = [(x, y, z0) for x, y in poly] + [(x, y, z1) for x, y in poly]
    f = [tuple(range(k)), tuple(range(k, 2 * k))]
    f += [(i, (i + 1) % k, k + (i + 1) % k, k + i) for i in range(k)]
    ob = recalc(mesh(name, v, f, collection, mat))
    if bev:
        bevel(ob, bev, seg)
    return ob


def box(name, x0, x1, y0, y1, z0, z1, collection, mat, bev=0.0, seg=1):
    v = [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    ob = recalc(mesh(name, v, f, collection, mat))
    if bev:
        bevel(ob, min(bev, (x1 - x0) / 2.1, (y1 - y0) / 2.1, (z1 - z0) / 2.1), seg)
    return ob


def tube(name, pts, r, collection, mat, n=8, caps=True):
    """A round tube along a polyline (frames, rails, exhausts)."""
    pts = [Vector(p) for p in pts]
    rings = []
    for i, p in enumerate(pts):
        a = pts[max(0, i - 1)]
        b = pts[min(len(pts) - 1, i + 1)]
        t = (b - a).normalized()
        up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        s = t.cross(up).normalized()
        u = s.cross(t).normalized()
        rings.append([p + s * (r * math.cos(2 * math.pi * k / n)) + u * (r * math.sin(2 * math.pi * k / n)) for k in range(n)])
    v, f = loft(rings, cap0=caps, cap1=caps)
    return recalc(mesh(name, v, f, collection, mat, smooth=True))


def sweep(name, pts, profile, collection, mat, smooth=True, caps=True):
    """A profile [(out, up)] swept along a level polyline (bumpers, rubbing strips, trim):
    `out` is measured to the path's right-hand side, `up` along +Z."""
    pts = [Vector(p) for p in pts]
    rings = []
    for i, p in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        t = Vector((b.x - a.x, b.y - a.y, 0)).normalized()
        side = Vector((t.y, -t.x, 0))
        rings.append([p + side * o + Vector((0, 0, u)) for o, u in profile])
    v, f = loft(rings, cap0=caps, cap1=caps)
    return recalc(mesh(name, v, f, collection, mat, smooth=smooth, sharp=50))


def place(ob, loc=(0, 0, 0), rot=(0, 0, 0)):
    ob.location, ob.rotation_euler = loc, rot
    return ob


def origin_to(ob, point):
    """Move the origin to a world point without moving the geometry (rotors, turrets)."""
    p = Vector(point)
    ob.data.transform(Matrix.Translation(-p))
    ob.location = p
    return ob


def join(name, obs, collection):
    """Bake modifiers and transforms and merge parts into one mesh (one draw per material)."""
    dg = bpy.context.evaluated_depsgraph_get()
    mats, bm = [], bmesh.new()
    for ob in obs:
        ev = ob.evaluated_get(dg)
        me = ev.to_mesh()
        me.transform(ob.matrix_world)
        slots = [s.material for s in ob.material_slots] or [None]
        for m in slots:
            if m not in mats:
                mats.append(m)
        remap = [mats.index(m) for m in slots]
        for p in me.polygons:
            p.material_index = remap[min(p.material_index, len(remap) - 1)]
        bm.from_mesh(me)
        ev.to_mesh_clear()
    for ob in obs:
        bpy.data.objects.remove(ob, do_unlink=True)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    collection.objects.link(ob)
    return ob


def fuse(name, obs, collection, voxel=0.02, tris_to=2000, smooth=2):
    """Overlapping parts of one material become one seamless skin (a horse's barrel, neck and head):
    joined, voxel-remeshed so the joins flow into each other, relaxed a little, then decimated to
    about `tris_to` triangles and shaded smooth. Takes the first part's material."""
    ob = join(name, obs, collection)
    r = ob.modifiers.new("Remesh", 'REMESH')
    r.mode, r.voxel_size, r.use_smooth_shade = 'VOXEL', voxel, True
    if smooth:
        # Laplacian with volume kept: a plain smooth shrinks the skin away from what sits on it
        # (saddle, saddlebags, harness).
        s = ob.modifiers.new("Smooth", 'LAPLACIANSMOOTH')
        s.iterations, s.lambda_factor, s.use_volume_preserve = smooth, 0.5, True
    bake(ob)
    n = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    if n > tris_to:
        d = ob.modifiers.new("Decimate", 'DECIMATE')
        d.ratio = tris_to / n
        bake(ob)
    ob.data.polygons.foreach_set("use_smooth", [True] * len(ob.data.polygons))
    ob.data.update()
    return ob


def tris(obs):
    """Triangle count after modifiers."""
    dg = bpy.context.evaluated_depsgraph_get()
    n = 0
    for ob in obs:
        if ob.type != 'MESH':
            continue
        me = ob.evaluated_get(dg).to_mesh()
        n += sum(len(p.vertices) - 2 for p in me.polygons)
        ob.evaluated_get(dg).to_mesh_clear()
    return n
