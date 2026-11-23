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

## Known gaps / next
- Detail pass requested by the user: richer buildings (facades, roof detail), car models, peds, props.
- No missions/jobs yet; sandbox only.
- Gamepad not supported.
- Hosting for internet play: see README (port-forward, or deploy; ask the user before deploying).
