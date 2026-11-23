# Status

## Working (verified)
- Lobby: create room (4-letter code), join by code / invite link `/#CODE`, open-room list. Max 6 per room
  (`RULES.maxPlayers`). Rooms persist property ownership + player cash/garage by name in `data/room-CODE.json`.
- City: ~2 km island, 11 zone types over 25 named districts, river with bridges, ~2,600 buildings, docks
  containers, military base compound, parks, suburbs with driveways, parking lots, curb parking.
- Server sim at 30 Hz, ~2 ms/tick with 6 players (smoke test). Snapshots 15 Hz with interest radius,
  permessage-deflate on the socket.
- Client prediction for walking and driving with reconciliation; interpolation for everything else.
- 33 vehicles (cars, bikes, trucks, bus, emergency, army jeep/truck, tank, 4 helicopters), 21 hand weapons
  + 3 vehicle weapons. NPCs carry archetype-appropriate weapons and cash and drop them.
- AI: sidewalk pedestrians, lane-following traffic with lights, gangs that fight rivals, dealers,
  police patrols, 5-star wanted escalation (cops → SWAT/heli → feds → army, tanks, gunship),
  ambulances that revive bodies, fire trucks that put out fires.
- Economy: gun shops, armor, hospital heals, car dealers (garage), respray (clears wanted), chop shop,
  homes (respawn + garage) and businesses (hourly income).

- Detail pass (2026-11-22): podium/setback towers and split-height blocks, parapets, rooftop gear
  (stairwells, AC units, vents, water tanks, solar, skylights, helipads, antennas), gable-roof houses with
  chimneys, backyards with pools/patios/hedges, awnings, procedural facades (frames, floor bands,
  storefronts, lit windows at night). Cars use extruded side profiles with bevels, reflective paint/glass,
  mirrors, plates, rims. Street lamps with arms, live traffic signals (shared timing with the AI), hydrants,
  bins, mailboxes, bus shelters, benches, fountains. Animated water, bridge decks with railings and piers.
  Peds with hair, hands, shoes, belts. ~125 fps / ~100 draw calls at max zoom on the dev machine.

- Performance pass (2026-11-22): instanced city split into 160 m tiles so camera + shadow pass cull
  (street zoom ~1.05M → ~32k triangles, 83 → 48 draw calls); shadow frustum fitted to the view;
  ground chunks built within a 3 ms/frame budget; HUD writes only on change, radar at half rate;
  Esc → Graphics High/Medium/Low (saved) with automatic step-down when the median frame > 24 ms;
  delta snapshots (protocol v2: unchanged entities sent as ids, full refresh every 2 s): ~6 KB → ~2.4 KB
  raw, ~1.1 KB deflated (≈17 KB/s per player). Server steady state ~1.6 ms/tick with 6 players.
- Live: https://gridlock-production-8d9b4188.up.railway.app/ (Railway, deploys from GitHub `main`).

- Jobs (2026-11-22): gang payphones (shared/world/gangSpots.ts), five job kinds (server/game/missions:
  hit, torch, steal, courier, frenzy) with content in packs/missions.ts, gang respect (saved per player,
  drives gang hostility), kill-frenzy crates, room modes (free / frag race / money race) in
  server/rounds.ts. `npx tsx scripts/missions.ts` runs every job kind headlessly.
- Controls (2026-11-23): gamepad via the browser Gamepad API (client/game/gamepad.ts): analog stick
  movement/steer, progressive triggers, right-stick aim, rebindable buttons, pad-driven menus
  (Pane.nav). Controls editor has Keyboard / Mouse (2 slots per action) and Controller tabs.
- Semi trailer: articulated (shared/sim/physics stepTrailer, server/systems/trailers.ts), angle at
  vehicle entity index 11 (0 for vehicles without a trailer).
- Characters (2026-11-23): stored in the browser (client/lobby/characterStore.ts, local storage
  `gridlock.characters.v1`), sent in `hello`, cleaned by server/characters.ts sanitizeCharacter,
  progress returned in `save` messages (every 4 s, on purchases, on leave). One game at a time per
  character id. `?play=Name` still joins as an unsaved guest. `npx tsx scripts/characters.ts`.
- Traffic signals (2026-11-23): AI obeys red and stops on amber when it comfortably can (driving.ts
  mustStop); stop lines aren't dropped while the light says stop, and distances are measured along
  the heading. `npx tsx scripts/signals.ts` measures stop-line crossings by light state (0.3% on red,
  was ~50%).
- Map (M) with waypoints and road routes; radio (R) with stations from packs/radio.ts.

## Known gaps / next
- Trucks, bus, tank and aircraft still use box models. Cars have per-style models (packs/carModels.ts)
  plus a plan-view `shape` (rounded nose/tail, cabin tumblehome, hips) applied by render/bodyShape.ts.
- Hosting for internet play: see README (port-forward, or deploy; ask the user before deploying).
