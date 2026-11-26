"""Horses in harness (Redrock): the front of a team-drawn wagon, whose wagon is the trailer
(wagon.py). `rig`:
  pair    two horses either side of the wagon's pole, the neck yoke at their chests and the
          doubletree with its singletrees at the hitch; `pole: false` leaves them unhitched (the
          bare team: no pole or doubletree, traces looped up on the back pads).
  shafts  one horse between a buggy's shafts, its traces to the singletree on their crossbar.
`horse` is a horse style (horse.py) and `horse_size` its [length, width, height] in metres; `x` puts
the horses forward of the model's centre, `spread` is each horse's distance off the centre line.
The hitch (where the wagon's front edge is) comes from the game's trailer spec. Each horse's legs are
moving parts (leg_fl...) kept apart per horse."""
import horse
import kit
import materials as M
import tack


def build(vid, st, dims, col):
    hs = st["horse"]
    size = st.get("horse_size", hs["ref"])
    hdims = {"length": size[0], "width": size[1], "height": size[2]}
    hitch = dims.get("trailer", {}).get("hitch", st.get("hitch", 1.2))
    hx = st.get("x", 0.0)
    rig = st.get("rig", "pair")
    pole = st.get("pole", True)
    wood, iron = M.get(st.get("wood", "wood_dark")), M.get("iron")
    out = []
    reins_to = (-hitch, 0.0, st.get("reins_z", 1.15)) if pole else None
    if rig == "pair":
        spread = st.get("spread", 0.42)
        zt = 0.78  # doubletree height
        xd = -hitch + 0.14
        for key, sd in (("l", 1), ("r", -1)):
            h = horse.Horse(hs, hdims, col, at=(hx, sd * spread), key=key)
            out += h.build()
            ends = [(xd + 0.04, sd * spread + 0.3, zt), (xd + 0.04, sd * spread - 0.3, zt)] if pole else None
            out += tack.harness(h, hs.get("harness", {}), ends)
            out += tack.bridle(h, dict(hs.get("bridle", {}), blinkers=True), reins="driven", to=reins_to)
            if pole:  # the strap from the collar's foot down to the neck yoke
                cb = tack.collar_bottom(h, hs.get("harness", {}))
                out.append(kit.tube("yoke_strap", [cb, (cb[0] + 0.05, sd * (spread - 0.12), 0.97)], 0.014, col, M.get("leather_black"), n=4))
        if pole:
            xn = hx + 0.62 * hdims["length"] / hs["ref"][0]
            out.append(kit.tube("pole", [(-hitch, 0, 0.7), (xn - 0.6, 0, 0.88), (xn + 0.1, 0, 0.98)], 0.045, col, wood, n=8))
            out.append(kit.lathe("pole_tip", [(xn + 0.02, 0.0), (xn + 0.02, 0.05), (xn + 0.14, 0.04), (xn + 0.16, 0.0)], col, iron, n=8, axis='X', at=(0, 0, 0.98)))
            out.append(kit.tube("neck_yoke", [(xn, spread - 0.1, 0.97), (xn, 0, 0.99), (xn, -spread + 0.1, 0.97)], 0.03, col, wood, n=6))
            out.append(kit.tube("doubletree", [(xd, spread, zt), (xd, -spread, zt)], 0.035, col, wood, n=6))
            for sd in (1, -1):
                out.append(kit.tube("singletree", [(xd + 0.04, sd * spread + 0.32, zt), (xd + 0.04, sd * spread - 0.32, zt)], 0.025, col, wood, n=6))
            out.append(kit.box("clevis", xd - 0.05, xd + 0.08, -0.05, 0.05, zt - 0.04, zt + 0.04, col, iron))
    else:
        h = horse.Horse(hs, hdims, col, at=(hx, 0.0))
        out += h.build()
        sy = st.get("shaft_y", 0.36)
        xs = -hitch + 0.08
        out += tack.harness(h, hs.get("harness", {}), [(xs + 0.03, 0.3, 0.74), (xs + 0.03, -0.3, 0.74)])
        out += tack.bridle(h, dict(hs.get("bridle", {}), blinkers=True), reins="driven", to=reins_to)
        xt = hx + 0.55 * hdims["length"] / hs["ref"][0]
        sm = M.get(st.get("shafts", "lacquer"))
        for sd in (1, -1):
            out.append(kit.tube("shaft", [(-hitch, sd * sy, 0.7), (hx - 0.2, sd * sy, 0.9), (xt - 0.15, sd * (sy - 0.02), 1.0), (xt + 0.05, sd * (sy - 0.01), 0.97)],
                                0.03, col, sm, n=6))
            # The tug: a loop on the back pad the shaft rides in.
            p = h.on_barrel(hx, sd * 1.55, 0.05)
            out.append(kit.tube("tug", [p, (hx, sd * sy, 0.9)], 0.012, col, M.get("leather_black"), n=4))
        out.append(kit.tube("crossbar", [(xs, sy, 0.72), (xs, -sy, 0.72)], 0.028, col, sm, n=6))
        out.append(kit.tube("singletree", [(xs + 0.03, 0.32, 0.74), (xs + 0.03, -0.32, 0.74)], 0.022, col, wood, n=6))
    return out
