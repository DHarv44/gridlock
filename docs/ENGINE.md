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
6. **Second universe: an original western.** A frontier generator (prairie, trails, towns from the
   lot/place builders); horses as a movement kind (gaits, stamina, calling your horse); hitching for
   wagons on the existing trailer physics; era weapons; posses instead of patrol cars. Done when
   Bayhaven is unchanged and the western plays.
