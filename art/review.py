"""Contact sheet: renders built models from fixed views into one PNG (rows = models, columns = views).

Renders in its own scene (GridlockReview, Workbench engine) so the user's viewport and render
settings are never touched.
  blender_run art/review.py -- --models sedan,gt [--views front34,rear34,side,top] [--clay] [--name cars]
Views are multiples of each model's bounding size around its centre.
"""
import os
import sys

import bpy
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ART = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ART, "out")

VIEWS = {
    "front34": (0.62, -0.95, 0.42),
    "rear34": (-0.7, 0.9, 0.48),
    "side": (0.0, -1.5, 0.12),
    "top": (0.0, -0.02, 1.7),
    "front": (1.5, 0.0, 0.25),
    "low34": (0.75, -0.9, 0.12),
    "wside": (0.0, -1.0, 0.0),   # weapons: flat side view
    "w34": (0.45, -0.8, 0.45),
}


def model_objs(mid):
    for c in bpy.data.collections:
        if c.name.endswith(":" + mid):
            return c, [o for o in c.all_objects if o.type == 'MESH']
    raise KeyError(mid)


def bounds(obs):
    pts = [o.matrix_world @ Vector(c) for o in obs for c in o.bound_box]
    lo = Vector([min(p[k] for p in pts) for k in range(3)])
    hi = Vector([max(p[k] for p in pts) for k in range(3)])
    return lo, hi


def setup(w, h):
    sc = bpy.data.scenes.get("GridlockReview") or bpy.data.scenes.new("GridlockReview")
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
    sc.render.film_transparent = False
    sh = sc.display.shading
    sh.light, sh.show_cavity, sh.cavity_type = 'STUDIO', True, 'BOTH'
    sh.cavity_ridge_factor, sh.cavity_valley_factor = 0.6, 1.0
    sh.show_shadows, sh.shadow_intensity = True, 0.35
    sh.show_specular_highlight = True
    sh.background_type = 'VIEWPORT'
    sh.background_color = (0.42, 0.44, 0.46)
    sc.display.light_direction = (0.35, -0.45, 0.82)
    sc.view_settings.view_transform = 'Standard'
    cam = bpy.data.objects.get("gl_rv_cam") or bpy.data.objects.new("gl_rv_cam", bpy.data.cameras.new("gl_rv_cam"))
    if cam.name not in sc.collection.objects:
        sc.collection.objects.link(cam)
    sc.camera = cam
    return sc, cam


def render(models, views, clay, name, w=520, h=330, dist=1.3, grid=0):
    sc, cam = setup(w, h)
    sc.display.shading.color_type = 'SINGLE' if clay else 'MATERIAL'
    sc.display.shading.single_color = (0.75, 0.75, 0.75)
    os.makedirs(OUT, exist_ok=True)
    rows = []
    # Vehicles with a fixed colour (police, army...) show in it; the rest keep the review red.
    import json
    with open(os.path.join(ART, "specs", "game.json")) as f:
        paints = {k: v.get("paint") for k, v in json.load(f)["vehicles"].items()}
    paint = bpy.data.materials.get("paint")
    base = tuple(paint.diffuse_color) if paint else None
    for mid in models:
        if paint:
            hexc = paints.get(mid)
            rgb = tuple((int(hexc[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5)) + (1.0,) if hexc else base
            paint.diffuse_color = rgb
            paint.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = rgb
        c, obs = model_objs(mid)
        sc.collection.children.link(c)
        lo, hi = bounds(obs)
        centre, size = (lo + hi) / 2, (hi - lo).length
        tiles = []
        corners = [Vector((x, y, z)) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
        for v in views:
            d = Vector(VIEWS[v]).normalized()
            cam.data.lens = 50
            cam.data.clip_start = size * 0.01
            # Back off until the model's box fills about 85% of the frame (dist scales that).
            D = size * 1.5
            for _ in range(4):
                cam.location = centre + d * D
                cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
                sc.view_layers[0].update()
                pts = [world_to_camera_view(sc, cam, p) for p in corners]
                spread = max(max(abs(p.x - 0.5), abs(p.y - 0.5)) for p in pts)
                D *= spread / (0.425 / dist * 1.3)
            path = os.path.join(OUT, "_tile.png")
            sc.render.filepath = path
            bpy.ops.render.render(write_still=True, scene=sc.name)
            img = bpy.data.images.load(path, check_existing=False)
            tiles.append(np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4))
            bpy.data.images.remove(img)
        sc.collection.children.unlink(c)
        rows.append(tiles)
    if paint:
        paint.diffuse_color = base
        paint.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = base
    if grid:  # every tile in reading order, `grid` to a row
        flat = [t for r in rows for t in r]
        while len(flat) % grid:
            flat.append(np.full_like(flat[0], flat[0][0, 0]))
        rows = [flat[i:i + grid] for i in range(0, len(flat), grid)]
    sheet = np.concatenate([np.concatenate(r, axis=1) for r in rows][::-1], axis=0)
    out = bpy.data.images.new("gl_rv_sheet", sheet.shape[1], sheet.shape[0])
    out.pixels = sheet.ravel()
    path = os.path.join(OUT, "sheet_%s.png" % name)
    out.filepath_raw, out.file_format = path, 'PNG'
    out.save()
    bpy.data.images.remove(out)
    print("IMAGE:", path)


args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
models = args[args.index("--models") + 1].split(",")
views = args[args.index("--views") + 1].split(",") if "--views" in args else ["front34", "rear34", "side", "top"]
name = args[args.index("--name") + 1] if "--name" in args else "review"
size = [int(v) for v in args[args.index("--size") + 1].split("x")] if "--size" in args else [520, 330]
dist = float(args[args.index("--dist") + 1]) if "--dist" in args else 1.3
grid = int(args[args.index("--grid") + 1]) if "--grid" in args else 0
render(models, views, "--clay" in args, name, *size, dist=dist, grid=grid)
