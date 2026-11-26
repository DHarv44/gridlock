# Vehicle and weapon models (Blender)

Every vehicle and weapon model is built by script, never by hand, so it can always be rebuilt.

- **Sizes** come from the game's packs: `npx tsx scripts/model-specs.ts` writes `specs/game.json`
  (vehicle length/width/height, fixed paint colours, weapon sizes). Rerun it after changing the packs.
- **Looks** are data: `specs/vehicles.json` (car styles: side silhouette, plan shape, cabin, wheels,
  details; trucks, bikes, helicopters, armoured, tank) and `specs/weapons.json` (part lists).
- **Builders** (verbs): `car.py`, `truck.py`, `armored.py`, `bike.py`, `heli.py`, `tank.py`,
  `weapon.py`, sharing `kit.py` (lofts, lathes, prisms, joins), `parts.py` (wheels, decals, light
  bars, gun turret, lettering) and `materials.py` (named materials; the game reads their role/name).

## Commands
Live, in the workbench Blender (the user watches it rebuild):
- `blender_run T:/Dev/gridlock/art/build.py` builds everything; args `--set vehicles|weapons`,
  `--only id1,id2`, `--export`.
- `blender_run T:/Dev/gridlock/art/review.py` with `--models a,b --views front34,rear34,side,top`
  (weapons: `wside,w34`), `--grid N`, `--size WxH`, `--name sheet` → `art/out/sheet_<name>.png`.

Headless (same script):
`"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup -P art/build.py -- --export`

## Output
`src/client/models/vehicles.glb` and `weapons.glb`, Draco-compressed. Each model is a node named
after its game id with a static mesh and moving parts (`anim`: rotor, tailrotor, turret) whose
origins are their pivots. A truck's trailer is `<id>_trailer`; a weapon's back pack `<id>_pack`.
The client (render/models.ts) splits them by material role: paint (tinted per car), fixed, shiny,
head, tail, siren_red, siren_blue; weapons by material name (`w_steel` → the `steel` look).

## Other universes
`--universe <id>` (build.py and review.py) reads `specs/<id>/` and exports to
`src/universes/<id>/models/`; Bayhaven, the default, keeps `specs/*.json` and `src/client/models/`.
`npx tsx scripts/universe.ts redrock model-specs` writes `specs/redrock/game.json`.
Redrock's builders: `horse.py` (lofted horses, each leg a moving part: anim `leg_fl/leg_fr/leg_rl/
leg_rr` pivoting at shoulder/hip), `tack.py` (saddles, bridles, harness), `team.py` (horses in
harness with pole or shafts), `wagon.py` (running gear) with `wagon_bodies.py` / `wagon_special.py`.
A part's optional `part` property keeps same-tagged pieces apart (a team's two horses' legs).
Headless: `blender -b --factory-startup -P art/build.py -- --universe redrock --export`.

The build runs in its own scene (`Gridlock`) and root collection, so other projects open in the
same Blender are never touched or exported.
