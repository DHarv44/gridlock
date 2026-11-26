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
- Models (2026-11-23): all 43 vehicles (incl. the semi's trailer) and 21 weapons are built in Blender
  by art/build.py from art/specs/*.json (sizes from the packs via `npx tsx scripts/model-specs.ts`),
  reviewed as contact sheets (art/review.py), exported Draco-compressed to src/client/models/*.glb
  (~1.1 MB). render/models.ts loads them at startup; vehicleMesh/weaponMesh build from them (the
  packs' box models stay as a fallback). See art/README.md for the commands.
- Hold-ups (2026-11-23): see docs/PLAN.md "Shop robberies". Aim is now sent to the server
  (BTN.aim) and clerks raise their hands (PF.hands); protocol 12. `npx tsx scripts/robbery.ts`.
- Indoor chases (2026-11-23): AI on foot reaches people inside walk-in places through the door gap
  (and follows them out), and up to tower/apartment floors by the lift; pursuing drivers park at the
  door and their crew goes in. Distances to someone on another floor are measured through the
  building. server/game/ai/doors.ts; `npx tsx scripts/indoors.ts`.
- Stairwells (2026-11-26): towers and apartment blocks have a walled stairwell on every floor; walk
  up or down the flights a floor at a time (top floor: onto the roof if a helicopter is there).
  Apartment blocks lost their stairs menu (walked now); towers keep the elevator. Inside a
  stairwell everything else is greyed out. docs/INTERIORS.md; `npx tsx scripts/floors.ts`.
- Sirens (2026-11-23): civilian traffic pulls over for any siren coming up behind or head-on in
  its road (player or AI driving it): eases to the kerb, stops, and moves off a few seconds after
  it's gone (ai/driving.ts sirenApproaching, cruise). AI emergency drivers pass yielding traffic on
  the left when it's clear. `npx tsx scripts/sirens.ts`.
- Voiced calls (2026-11-23): docs/STORY.md (Bayhaven, the three crews, Harlan Price) and its cast in
  packs/calls.ts; 61 lines voiced with Chatterbox (one reference voice per person, made from Kokoro
  by the workbench `voice_ref` tool, rendered three takes a line and checked back with faster-whisper:
  `npx tsx scripts/voice-calls.ts`) to src/client/voice/*.ogg (~1 MB, loaded per call). Server picks
  who speaks (missions/talk.ts; `met` saved with the character), the client plays them as comic
  bubbles beside you (hud/talk.ts) down a payphone or cell line (audio/phoneVoice.ts). A ringing
  phone no longer takes the controls (P / LB answers, Backspace declines). Protocol 14.
  Your character talks back: two player voices, male and female (packs/calls.ts PLAYER_VOICES),
  picked with a sample in the character creator and saved on the character (`voice`); your turns
  are voiced in it, clean (not down the line). 2026-11-25: you also speak on your own in calls the
  server puts together (player.json "says", `[YOU, situation]` parts): picking up your cell or a
  payphone, asking for work when you ring someone, "on my way" after a payphone tip.
  2026-11-24: every call rewritten as a natural conversation (caller and you, line breaks kept and
  shown, no explaining the game); the three crews are three communities (Varrio 22 Chicano, Local 9
  Irish-American union, Argo 7 Greek-American shipping family). Content moved to content/ (see
  content/README.md): one JSON per character in content/characters/<folder>/ with voice/
  (recordings) and model/ (Chatterbox reference clips), the player's lines in content/player/,
  the radio in content/radio/. packs/calls.ts only loads it; the welcome call comes from the
  character marked "welcome". `npm run voices` masters recordings into src/client/voice/,
  `npm run scripts` writes content/SCRIPTS.md. The user records the lines (Benny's are in); the
  rest are silent bubbles until recorded (or filled by scripts/voice-calls.ts).
- Driving modes (2026-11-26): classic (unchanged: gas, brake, steer) or point to drive
  (client/game/pointDrive.ts, cars and tanks; helicopters stay classic): W/A/S/D (8-way) or the
  left stick point where to go and the car steers there (stick push = speed); pointing behind
  brakes and swings round, never backing up by itself; reverse is Aim held (right mouse, or LT),
  pointing where the back goes, and the mouse drive-by falls back to auto-aim. Chosen separately
  for keyboard and controller (pause menu, or V / R3 to toggle; saved in the browser).
  `npx tsx scripts/drive.ts`. Also: twin-stick aiming in vehicles (right stick: drive-by, heli
  guns, turret) and a shared car radio (protocol 16).
- Company (2026-11-23): waypoints go to the server and show, in each player's colour, to everyone in
  the same vehicle; players riding inside a car have their names over it; a passed job's pay is split
  with the players riding with you or within RULES.shareRange; you can bail out of a moving vehicle
  (thrown down and hurt over RULES.bailFall, killed from RULES.bailDie). `npx tsx scripts/coop.ts`.
- Helicopters (2026-11-23): cruise ~24 m/s (air drag sets it: accel / HELI_DRAG). They set down on
  roofs: StaticWorld.floorAt from the drawn massing (world/massing.ts, shared so server and client
  agree; per-building RNG). Getting out on a tower or apartment roof takes the roof stairs to its
  top floor; the lift's Roof stop puts you back in. On a roof with no way down you stay aboard.
  `npx tsx scripts/heli.ts`.
- Vehicle damage per side (2026-11-23): every hit dents the side it came from (shots: the shooter;
  blasts; car-on-car; wall crashes, which now do damage above 7 m/s); levels 0-3 per side packed into
  the snapshot (protocol 13). The model crumples that side in a vertex shader (render/vehicleDamage.ts:
  deeper and further in per level, broken-up shading, scrape streaks and grime, glass going dark),
  lamps on a smashed end go out (one at 2, both at 3), a smashed front smokes. Respray fixes it.
  `npx tsx scripts/damage.ts`.
- Riders on bikes and everyone in an open-top car (Army Jeep, Spyder) are drawn, seated in their
  seats (spec `saddles`, protocol 11); gun trucks (Humvee, MRAP) traverse a roof
  gun like the tank (spec `turret`). `npx tsx scripts/riders.ts`, `npx tsx scripts/turret.ts`.

## Known gaps / next
- **The plan: docs/PLAN.md** (milestones A–G, agreed 2026-11-23). Work milestone by milestone.
- Body armour on the gun shop turntable is still a box model (packs/weaponModels.ts ARMOR_MODEL).
- Hosting for internet play: see README (port-forward, or deploy; ask the user before deploying).
