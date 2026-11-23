"""Build GRIDLOCK's vehicle and weapon models in Blender from art/specs/*.json.

Live:     workbench blender_run T:/Dev/gridlock/art/build.py  [-- --set vehicles --only sedan,gt --export]
Headless: blender -b --factory-startup -P art/build.py -- --set vehicles --export

Sizes come from art/specs/game.json (written from the packs by scripts/model-specs.ts); looks come
from art/specs/vehicles.json and art/specs/weapons.json. Each model is one collection holding an
empty named after the game id, its static mesh, and any moving parts (rotor, tailrotor, turret)
with their origins at their pivots. Export: public/models/<set>.glb.
"""
import importlib
import json
import os
import sys

ART = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(ART)
if ART in sys.path:
    sys.path.remove(ART)
sys.path.insert(0, ART)
# Other projects built in the same Blender leave modules with the same names (kit, materials...).
for _name, _mod in list(sys.modules.items()):
    _f = getattr(_mod, "__file__", None) or ""
    if os.path.exists(os.path.join(ART, _name + ".py")) and not os.path.abspath(_f).startswith(ART):
        del sys.modules[_name]

import bpy  # noqa: E402

import kit  # noqa: E402

GRID = {"vehicles": 14.0, "weapons": 1.6}
COLS = {"vehicles": 6, "weapons": 5}


def spec(name):
    with open(os.path.join(ART, "specs", name + ".json")) as f:
        return json.load(f)


def merged(base, over):
    out = dict(base)
    for k, v in over.items():
        out[k] = merged(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def assemble(set_name, mid, objs, slot):
    """Join a model's static parts, hang everything off an empty named `mid`, move it to its slot."""
    col = kit.coll("%s:%s" % (set_name, mid), kit.coll(set_name))
    anim = [o for o in objs if o.get("anim")]
    static = [o for o in objs if not o.get("anim")]
    body = kit.join(mid + ".body", static, col)
    root = bpy.data.objects.new(mid, None)
    root.empty_display_size = 0.3
    col.objects.link(root)
    root["model"] = mid
    body.parent = root
    parts = [body]
    groups = {}
    for o in anim:
        groups.setdefault(o["anim"], []).append(o)
    for tag, obs in groups.items():
        pivot = obs[0].get("pivot", (0, 0, 0))
        j = kit.join("%s.%s" % (mid, tag), obs, col)
        kit.origin_to(j, pivot)
        j["anim"] = tag
        j.parent = root
        parts.append(j)
    cols = COLS[set_name]
    root.location = ((slot % cols) * GRID[set_name], -(slot // cols) * GRID[set_name] * (0.55 if set_name == "vehicles" else 0.5), 0)
    return root, kit.tris(parts)


def build_vehicles(only):
    game, looks = spec("game")["vehicles"], spec("vehicles")
    styles = looks["styles"]
    total = 0
    for slot, (vid, look) in enumerate(looks["vehicles"].items()):
        if only and vid not in only:
            continue
        st = merged(styles[look["style"]], look.get("over", {})) if "style" in look else look
        if isinstance(st.get("cab"), dict) and "style" in st["cab"]:  # trucks: the cab is a car style
            st["cab"] = merged(styles[st["cab"]["style"]], st["cab"])
        kind = st.get("kind", "car")
        dims = game[vid] if vid in game else game[look["dims"]]["trailer"] if "dims" in look else None
        mod = importlib.import_module(kind)
        col = kit.coll("vehicles:%s" % vid, kit.coll("vehicles"))
        objs = mod.build(vid, st, dims, col)
        _, n = assemble("vehicles", vid, objs, slot)
        total += n
        print("%-14s %6d tris" % (vid, n))
    print("vehicles: %d tris in all" % total)


def build_weapons(only):
    game, looks = spec("game")["weapons"], spec("weapons")
    import weapon
    total = 0
    for slot, (wid, look) in enumerate(looks["weapons"].items()):
        if only and wid not in only:
            continue
        col = kit.coll("weapons:%s" % wid, kit.coll("weapons"))
        objs = weapon.build(wid, look, game.get(wid), col)
        _, n = assemble("weapons", wid, objs, slot)
        total += n
        print("%-16s %6d tris" % (wid, n))
    print("weapons: %d tris in all" % total)


def export(set_name):
    path = os.path.join(ROOT, "public", "models", set_name + ".glb")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    c = bpy.data.collections[set_name]
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    moved = []
    for o in c.all_objects:
        o.select_set(True)
        if o.get("model"):
            moved.append((o, tuple(o.location)))
            o.location = (0, 0, 0)  # every model at the origin in the file
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_extras=True, export_lights=False, export_cameras=False,
                              export_animations=False, export_texcoords=False, export_tangents=False)
    for o, loc in moved:
        o.location = loc
    print("exported %s (%d KB)" % (path, os.path.getsize(path) // 1024))


def main(argv):
    sets = [argv[argv.index("--set") + 1]] if "--set" in argv else ["vehicles", "weapons"]
    only = set(argv[argv.index("--only") + 1].split(",")) if "--only" in argv else None
    kit.scene()
    if only is None and "--set" not in argv:
        kit.reset()
    elif only is None:  # one whole set: leave the other alone
        for s in sets:
            c = bpy.data.collections.get(s)
            if c:
                for sub in [c] + list(c.children_recursive):
                    for o in list(sub.objects):
                        bpy.data.objects.remove(o, do_unlink=True)
                for sub in list(c.children_recursive):
                    bpy.data.collections.remove(sub)
    else:
        for s in sets:  # rebuild just these models
            for mid in only:
                c = bpy.data.collections.get("%s:%s" % (s, mid))
                if c:
                    for o in list(c.objects):
                        bpy.data.objects.remove(o, do_unlink=True)
                    bpy.data.collections.remove(c)
    for s in sets:
        (build_vehicles if s == "vehicles" else build_weapons)(only)
        if "--export" in argv:
            export(s)


argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
main(argv)
