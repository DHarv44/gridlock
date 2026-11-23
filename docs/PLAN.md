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
- B1. A bank balance on the character (sent and saved like cash, checked by the server).
- B2. ATMs on street corners: deposit / withdraw in a slide-in pane.
- B3. Banks (a service place in commercial districts and downtown): same, plus business income lands
  there.
- B4. Paying: shops, dealers and property take carried cash first, then the bank for the rest.
Done when: money survives death in the bank and purchases draw on it.

## C. Cell phone (medium)
- C1. A phone that slides up in your character's hand, styled like the game (not a web pop-up):
  contacts, texts, bank balance.
- C2. A gang's first jobs always come from its payphones; once it respects you enough it gives you its
  number and calls your cell with follow-up work.
- C3. Texts from your businesses (income, trouble).

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
