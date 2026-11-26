# Engine: one engine, many universes

Decided with the user on 2026-11-26. GRIDLOCK's engine becomes shared: a player picks a
"universe" at startup (Bayhaven today; later an original western, a sci-fi setting, ...), and the
map, models, vehicles, weapons, people, factions, missions, voices, radio and sounds all come from
that universe's packs. The game feel never changes: top-down, GTA2 movement, camera and controls.
Not a fork: one engine, every universe gets every engine fix.

Universes we build are original settings (genre and mechanics borrowed, never another game's or
film's names, characters, story, map or look).

## Phases

1. **Engine hygiene** (done 2026-11-26, branch `worktree-engine-phase1`). No visible change.
   - Engine code no longer names pack ids: traffic crews come from `ROLE_CREWS` (packs/rules.ts);
     lawful / witness factions are pack flags (`lawful`, `witness`); `RULES.clerk`,
     `RULES.counterGun`; zone flags `warehouses`, `busy`; fallbacks pick by behaviour or role.
   - Service verbs' traits in one table, `src/shared/verbs.ts` (site, pad, garage, automatic,
     driveUp, shop), replacing five scattered sets.
   - Movement kinds' traits in `src/shared/sim/kinds.ts` (`flies`, `skids`, `floats` for boats);
     systems ask `flies(spec)` / `floats(spec)`. `sim/physics.ts` still picks the step per kind (that is the verb).
   - Feature switches: `RULES.cellPhone` (without it, texts are notices and work comes from
     payphones); radio is on when packs/radio.ts lists stations; ATMs where specs say `atm`;
     payphones per `RESPECT.phonesPerGang`.
2. **Universe folders** (done 2026-11-27). `src/universes/<id>/index.ts` exports a `Universe`
   (packs/types.ts): every noun list, rule overrides (engine defaults in packs/defaults.ts), radio,
   looks, call scripts and its `contentDir`; `client.ts` its browser assets (models, voices), a
   chunk of their own. `src/universes/index.ts` / `client.ts` list them. The registry
   (packs/index.ts) keeps the names the engine imports and `installUniverse` fills them in place,
   so call sites didn't change; the default universe is installed until another is. Rule: install
   before importing game code (client/main.ts boots the universe, then imports the lobby). Radio
   routes carry the universe (`/api/radio?u=`, `/radio/<universe>/<station>/<file>`). Bayhaven's
   assets stay where they were (content/, src/client/models, src/client/voice).
3. **Universe per room** (done 2026-11-27). The server (`new Lobby({ universes })`) runs each room
   in a worker thread of its own (server/workerRoom.ts proxy, server/roomWorker.ts entry) that
   installs the room's universe before loading the game; sockets stay on the main thread and the
   room's messages cross as strings. A room's universe is the running room's, else its save's
   (persist.ts savedUniverse), else the creator's; a page from another universe is refused with
   `reject.universe` and switches to it. Characters are fully checked inside the room's thread; the
   lobby only peeks at id/name/universe. Headless scripts keep in-process rooms (roomHost.ts
   LocalRoom). Hello carries `universe`, listings carry it (protocol 17). `scripts/rooms.ts`
   covers both.
4. **Start screen** (done 2026-11-27). The lobby card shows a Universe selector (with its blurb)
   once there's more than one; changing it stores the choice and reloads. Characters and open rooms
   are listed for the current universe only.
5. **Maps as data** (done 2026-11-27). Decided while building it: roads stay axis-aligned. GTA2's
   own world is a tile grid, the feel must stay GTA2's, and keeping the grid means traffic AI,
   routing, GPS and signals work unchanged in every universe. What became data instead:
   `Universe.world` (packs/types.ts WorldSpec; defaults in shared/world/worldSpec.ts = Bayhaven):
   map size, margin, edge (`sea` | `cliffs`: solid rock walls, no coast), a river or none, road
   spacing near the centre / edges, arterial frequency, bare-land colour. MAP_SIZE / LAND0 / LAND1
   are live values from it. Open country: zones with `layout: 'wild'` merge into big blocks between
   arterials; between wild cells there's only a road on arterial lines, drawn as a dirt trail
   (`Segment.trail`, trail-sized crossings, no lights or markings); `ZoneSpec.wild` scatters rock
   formations (`Obstacle.kind 'rock'`, solid: buttes and outcrops) and ponds (`City.ponds`, water
   for isWater / boats) and tints the ground. A hand-made map file and an in-game editor are not
   built; a universe shapes its map with these settings and its districts.
6. **Second universe: Redrock Territory** (first slice done 2026-11-27; `src/universes/redrock/`).
   An original 1870s territory on the same engine and feel: three timber towns (Sulphur Springs,
   Copper Gulch, Calloway) on dirt streets, homesteads, prairie with ponds and outcrops, red
   badlands of buttes, a river with crossings, cliffs all round (2.5 km map). Horses (mustang,
   quarter horse, draft, thoroughbred) and wagons (buckboard, covered wagon, stagecoach; a team in
   harness pulling the wagon on the trailer physics). Six-shooter, double-barrel, lever rifle,
   buffalo rifle, dynamite, lamp oil; gatling wagon at the fort. Three outlaw outfits posting work
   on job posts; deputies, marshals and a posse on horseback, the cavalry at the top. Gunsmith,
   livery stable, doctor, sheriff's office (cells), bank (vault), fire hall; homesteads, saloons,
   general stores, hotels, barns to own. Money in frontier dollars.
   Engine verbs it added: movement kind `legs` (no wheels, rider astride), `VehicleSpec.wrecks:
   'fall'` (goes down, riders thrown, no fire), `WorldSpec.modern` (off: dirt streets, no
   markings/lights/street furniture/rooftop machinery, earthen yards), `RULES.jobPost: 'post'`
   (timber post with a bell, no ring), `RULES.graffiti`, map legend from the universe's place names.
   Checks: `npx tsx scripts/redrock.ts`; any script in a universe: `npx tsx scripts/universe.ts
   redrock smoke 60`.
   Horses (2026-11-27): gaits and wind (`VehicleSpec.stamina`: a canter without Sprint, a gallop
   with it until blown, back to a gallop at 30% wind; AI riders gallop to chase or flee; the wind is
   sent as `YouState.st` so prediction matches; a wind bar on the HUD), the whistle (H on foot /
   L3: `comesWhenCalled`; the last horse you rode comes, round a corner if it's far or stuck;
   server/game/systems/mounts.ts), hitching (G while stopped / X: `VehicleSpec.hitch` and
   `hitchAs`; a wagon unhitches into a team and a seatless standing wagon, and a team backed onto
   a pole hitches on; systems/hitching.ts). Protocol 20.
   Horse movement is its own verb (2026-11-27): sim/mount.ts `stepMount`, chosen by
   `VehicleSpec.gaits` (walk/trot/canter/gallop speeds, pick-up and let-go, turn rate standing and
   at a gallop, backing up): it goes where it points (no slide), eases down through its gaits,
   turns on the spot standing, shies at walls without damage. Breeds differ only in those numbers.
   Legs swing by gait (render/legs.ts): parts tagged `leg_fl/fr/rl/rr` (box or Blender), the gait
   read from the speed it's really going. Blender models (art/horse.py, tack.py, team.py,
   wagon*.py; `build.py --universe redrock` → src/universes/redrock/models/*.glb): six breeds in
   saddle, teams in harness, buckboard, covered wagon, stagecoach, buggy, water and gatling wagons,
   standing wagons, and the period guns.
   What a vehicle is made of is a noun too (`VehicleSpec.material`; shared/materials.ts says what
   each does): metal sparks, dents, smokes and blows up; flesh (horses, teams) bleeds where it's
   hit, never smokes or burns, and dead lies on its side in its own colours; wood (standing
   wagons) kicks up dust and goes down. (Replaced the earlier `wrecks: 'fall'`.)
   Temperament is a noun (`VehicleSpec.temper`: nerve, buck, lame); systems/spook.ts is the verb.
   Gunfire, blasts and deaths nearby (ai/reactions.ts onNoise) can spook a horse: it rears (no
   control for a moment), may throw its rider (hurt, thrown clear), and loose it bolts from the
   noise before settling. A rider's own shots don't spook their own horse. Hurt below `lame`
   (a share of hp) it limps: no gallop, no faster than a trot, the near foreleg favoured; it heals
   slowly. Hot thoroughbreds spook far more than drafts or army horses. Sent as `VF.rearing`,
   `VF.lame` and `YouState.ml` so prediction holds the reins too. Protocol 21.
   Not yet: its own cast and voiced calls (job posts give briefs only), era sounds (a bell,
   hooves, whinnies); the gatling gun doesn't traverse (trailer parts don't animate).
