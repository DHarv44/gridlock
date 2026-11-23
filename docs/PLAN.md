# Plan: from sandbox to a city you build a life in

Agreed with the user on 2026-11-23. Killing stays part of the game but isn't the main loop: the main
loop is building an empire (money, property, standing with the gangs). Work goes milestone by milestone;
each ends playable, tested and pushed. Ask the user before starting the next milestone.

## A. Find the work (small)
Jobs existed but nobody could find them: the "booths" were gang-coloured boxes with a blinking lamp.
- A1. (done) Payphones look like payphones: a hooded phone on a pole with a PHONE sign readable from above;
  the gang's colour is a sticker on it, not the whole booth.
- A2. (done) A phone rings only when there's work for you: one phone per gang at a time (the nearest), heard
  from the phone's spot, a pulsing phone icon on the radar and the city map (also from a car).
  Ring sound: CC0 Freesound, fetched after the user's OK.
- A3. (done) Radio: one quiet line at the bottom centre while the radio's on in your vehicle: station,
  title, artist and a small equaliser that moves with the music; brightens on a new song or station,
  then settles dim. Replaces the top-left card.
Done when: a new player finds a ringing phone without being told; the radio line reads well and
doesn't distract.

## B. Money you can keep (medium)
Carried cash is at risk (15% dropped on death, 20% fine when busted); banked money isn't.
- B1. (done) A bank balance on the character (sent and saved like cash, checked by the server).
- B2. (done) ATMs on the walls of banks and of businesses flagged `atm` in the packs (shared/world/atms.ts,
  21 in the city): deposit / withdraw in the slide-in pane.
- B3. (done) Banks (Harbor Trust, 3, downtown / midtown / commercial): the same at the counter;
  business income is paid into the bank.
- B4. (done) Paying: shops, dealers and property take carried cash first, then the bank for the rest.
Done when: money survives death in the bank and purchases draw on it. `npx tsx scripts/bank.ts`.

## C. Cell phone (medium)
- C1. (done) A handset that slides up at the bottom right (P / LB; hud/phone.ts): Contacts, Messages,
  Bank, incoming calls with Answer / Decline; arrows + Enter work it while WASD still walks.
- C2. (done) A gang's first jobs come from its payphones; at RESPECT.cellAt it texts its number, then
  calls every 2-4 min while you're free (answer, decline, or miss it), and you can ring it for work
  (90 s before the same contact has more). Phone work pays x1.25 (server/game/missions/cell.ts).
- C3. (done for income) The bank texts business income. "Trouble" texts come with milestone D.
`npx tsx scripts/cell.ts` checks it.

## Gas stations (asked 2026-11-23; done)
Six "Gas & Go" forecourts (packs service `gas`; layout shared/world/gas.ts; render/gasStations.ts):
the building shrinks to a kiosk at the back (sign + ATM), two solid pump islands under a branded
canopy on pillars, a pole price sign at the street corner, canopy light pooling at night.
Not built (ask first): exploding pumps, a kiosk counter, a fuel gauge.

## D. Businesses that matter (medium)
- D1. (done) Income fills each business's safe (up to RULES.safeHours of it, a text when full); empty
  it at the door as cash, or the midnight armoured car takes it to the bank less RULES.safeSweepFee.
- D2. (done) Each game hour a gang that respects you under RULES.troubleBelow may send a crew to the
  door of a business on its turf (text + red marker): kill them, pay them off at the door (respect
  up), or after RULES.troubleSeconds they empty the safe.
- D3. (done) Perks (packs `perk`): your car wash's bay takes the heat off, your warehouse's bay fences
  stolen cars at RULES.fenceMul x chop price, your nightclub's back room meets any gang that will work
  with you. ("Goods" have no system yet.)
server/game/systems/business.ts; `npx tsx scripts/business.ts`.

## E. Tag (small; done)
A room mode next to free roam, frag race and money race (server/rounds.ts): one player is "it" (red
ring, radar/map marker, "IT ·" off-screen); when "it" kills a player, that player is it; killing "it"
only slows them down. 10-minute rounds (while two or more play); least time "it" wins.
`npx tsx scripts/tag.ts`.

## F. Going into buildings, in place (large)
Walk through a door and the roof fades away: the floor plan shows from the same camera in the same
world, so friends see you inside and the city keeps running around you.
- F0. Design note (before code): docs/INTERIORS.md (written 2026-11-23; waiting on the user's two
  decisions: who sees inside, which buildings open).
- F1. (done) 30 walk-in ground floors (packs `interior`: gun shops, corner stores, gas kiosks, diners,
  clubs, warehouses; shared/world/interiors.ts): a room behind the storefront door, shell walls with a
  1.6 m door gap (people and bikes fit, cars don't), furniture by layout, the rest of the building
  solid; the building hides (render/hideable.ts) when you're at or in it on foot; a clerk behind
  each counter; business happens at the counter. Ground floor only, so no "floor" field yet: the
  walls are ordinary collision (bullets and sight stop at them). `npx tsx scripts/interiors.ts`.
  Not yet: police and gangs pathing in through doors; the dealership office; owners' back-room desk.
- F2. (done) Hand-made plans (packs/interiorPlans.ts) for the bank (lobby, tellers' counter, office,
  vault) and the police precinct (front desk with a desk sergeant, three barred cells, office). The
  bank job: the vault door is a collision gate; an explosion at it blows it open for everyone
  (`gates` message), six cash piles lie inside, the alarm goes out, the robber gets 4+ stars and a
  bank robbery on the record; it shuts and clears after RULES.vaultReset once nobody's inside
  (server/game/systems/vaults.ts). `npx tsx scripts/vault.ts`.
- F3. Multi-storey: stairs and elevators; the camera shows your floor, hides everything above and dims
  the floor below.

## G. Mobile (parked, 2026-11-23)
The user wants the website usable on a phone: not a mobile port (no touch-control scheme, app install
or radio re-encodes unless asked). Parked for now; when it comes back, keep it to that.
