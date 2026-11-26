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
2. **Universe folders.** `universes/<id>/` holds packs, `content/`, models, sounds, radio, plus a
   manifest (id, name, blurb, rules, world generator + settings, features). The pack lists that
   84 files import stay where they are and are filled when a universe is installed, so call sites
   don't change. Vite splits assets per universe.
3. **Universe per room.** Each room's sim runs in a worker thread with its universe installed
   (module state is per worker; rooms also spread over CPU cores). Rooms, saves and characters
   belong to one universe; the lobby lists rooms with theirs.
4. **Start screen.** Pick a universe, then a character in it, then a room. A plain list/selector in
   the house style.
5. **Maps as data.** The engine reads a general world: ground surfaces (road, grass, sand, rock,
   water), collision, a road/trail network at any angle, places and zones. Bayhaven's grid city
   becomes one generator; a universe picks a generator + settings or supplies a hand-made map file.
   Traffic AI, routing, spawning, ground paint, street props and the map screen move onto the
   general network. Mountains keep GTA2 movement: impassable rock with passes; height is drawn only.
6. **Second universe: an original western.** A frontier generator (prairie, trails, towns from the
   lot/place builders); horses as a movement kind (gaits, stamina, calling your horse); hitching for
   wagons on the existing trailer physics; era weapons; posses instead of patrol cars. Done when
   Bayhaven is unchanged and the western plays.
