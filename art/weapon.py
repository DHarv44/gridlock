"""Weapons from part lists (art/specs/weapons.json), at real size in metres: x along the barrel
(+ = muzzle) with the firing hand's grip at 0, z up, y across. Guns are mostly side silhouettes, so
most parts are side-view polygons given a thickness; barrels, scopes and drums are lathed.

Part types ("t"):
  prism  p=[[x, z]...]  w=half-width or [y0, y1]   (receivers, stocks, grips, blades, magazines)
  lathe  p=[[x, r]...]  z=axis height, y=axis offset   (barrels, scopes, tubes along the gun)
  latz   p=[[z, r]...]  at=[x, y]   (upright bodies: grenades, bottles)
  laty   p=[[y, r]...]  at=[x, z]   (drums, wheels across the gun)
  tube   pts=[[x, y, z]...]  r   (trigger guards, wire stocks, bipods, hoses)
  box    x=[x0, x1] z=[z0, z1] w=half-width or [y0, y1]
  ring   n, R, r, x=[x0, x1], z   (a cluster of barrels around the x axis)
  mirror_y: true on any part also builds its copy on the other side.
Every part has m (material: steel, black, polymer, wood, chrome, olive, brass, red, glass, cloth),
optional b (bevel width) and n (lathe segments).
"""
import math

import kit
import materials as M


def _ys(w):
    return (-w, w) if isinstance(w, (int, float)) else tuple(w)


def part(p, col):
    t, m = p["t"], M.get("w_" + p["m"])
    b = p.get("b", 0.0)
    n = p.get("n", 12)
    if t == "prism":
        y0, y1 = _ys(p["w"])
        return [kit.prism("prism", [tuple(q) for q in p["p"]], y0, y1, col, m, bev=b, seg=2 if b else 1)]
    if t == "box":
        y0, y1 = _ys(p["w"])
        return [kit.box("box", p["x"][0], p["x"][1], y0, y1, p["z"][0], p["z"][1], col, m, bev=b, seg=2 if b else 1)]
    if t == "lathe":
        ob = kit.lathe("lathe", [tuple(q) for q in p["p"]], col, m, n=n, axis='X', at=(0, p.get("y", 0.0), p["z"]))
        return [ob]
    if t == "latz":
        x, y = p["at"]
        return [kit.lathe("latz", [tuple(q) for q in p["p"]], col, m, n=n, axis='Z', at=(x, y, 0))]
    if t == "laty":
        x, z = p["at"]
        return [kit.lathe("laty", [tuple(q) for q in p["p"]], col, m, n=n, axis='Y', at=(x, 0, z))]
    if t == "tube":
        return [kit.tube("tube", [tuple(q) for q in p["pts"]], p["r"], col, m, n=p.get("n", 6))]
    if t == "ring":
        out = []
        for k in range(p["n"]):
            a = 2 * math.pi * k / p["n"]
            out.append(kit.lathe("barrel", [(p["x"][0], p["r"]), (p["x"][1], p["r"])], col, m, n=8, axis='X',
                                 at=(0, p["R"] * math.cos(a), p["z"] + p["R"] * math.sin(a))))
        return out
    raise ValueError("unknown part type " + t)


def mirrored(p):
    q = dict(p)
    q.pop("mirror_y", None)
    if "w" in q and not isinstance(q["w"], (int, float)):
        q["w"] = [-q["w"][1], -q["w"][0]]
    if "y" in q:
        q["y"] = -q["y"]
    if "pts" in q:
        q["pts"] = [[x, -y, z] for x, y, z in q["pts"]]
    if "at" in q and q["t"] == "latz":
        q["at"] = [q["at"][0], -q["at"][1]]
    return q


def build(wid, look, dims, col):
    out = []
    for p in look["parts"]:
        out += part(p, col)
        if p.get("mirror_y"):
            out += part(mirrored(p), col)
    return out
