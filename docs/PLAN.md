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

## Gas stations (asked 2026-11-23; right after C)
Forecourts in the city: a canopy over pump islands, a kiosk shop, a tall price sign. Pumps go up when
shot or rammed hard (the GTA way). No fuel gauge unless the user asks for one.

## D. Businesses that matter (medium)
- D1. Income collects in the business's safe; collect it in person or have it paid into the bank.
- D2. Gangs that don't respect you lean on your businesses; you get a text and go deal with it.
- D3. A perk per type: the warehouse buys stolen cars and goods above chop-shop prices, the car wash
  clears your wanted level, the nightclub is where gang contacts reach you.

## E. Tag (small)
A room mode next to free roam, frag race and money race: one player is "it", marked on everyone's map;
"it" passes to whoever kills them; whoever has spent the least time "it" when the round ends wins.

## F. Going into buildings, in place (large)
Walk through a door and the roof fades away: the floor plan shows from the same camera in the same
world, so friends see you inside and the city keeps running around you.
- F0. Design note (before code): interior data (floors, rooms, walls, doors, stairs), how the server
  collides on the right floor, how the client cuts the building away, what's generated and what's
  hand-made.
- F1. Single-floor businesses and shops: plans generated from the footprint by room layouts per type;
  a clerk inside.
- F2. Banks with a vault (hand-made layout); the bank job.
- F3. Multi-storey: stairs and elevators; the camera shows your floor, hides everything above and dims
  the floor below.

## G. Mobile (to discuss)
The user wants it mobile-friendly; discuss after milestone A.
