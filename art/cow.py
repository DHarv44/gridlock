"""A Longhorn (Redrock's cattle): the horse body (horse.py) with a cow's proportions from its spec
(a deep, flat-backed barrel, a short neck carried low, a blocky head, a rope tail with a tuft), no
mane or tack, and the long horns curving out from the poll and turning up at the tips.
"""
import kit
import materials as M
from horse import Horse


def build(vid, st, dims, col):
    h = Horse(st, dims, col)
    out = h.build()
    spread = st.get("horns", 0.9) * h.su
    for sd in (1, -1):
        # From the poll (the top of the head, behind the ears), out nearly level, the tips turning up.
        x, y, z = h.head_point(0.02, 1.0, sd * 0.45)
        pts = [(x, y, z), (x - 0.03, y + sd * spread * 0.45, z + 0.03), (x + 0.02, y + sd * spread * 0.85, z + 0.06), (x + 0.08, y + sd * spread, z + 0.16)]
        out.append(kit.tube("horn", pts, 0.035 * h.su, col, M.get("canvas_white"), n=8))
        out.append(kit.tube("horn_tip", [pts[-2], pts[-1]], 0.02 * h.su, col, M.get("hoof"), n=6))
    return out
