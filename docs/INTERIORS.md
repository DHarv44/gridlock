# Going into buildings (milestone F): design note

Status: proposal for the user to review before any code. Decisions marked **Decide** need an answer;
each has a recommendation.

## What it should feel like
Walk through a shop's door and keep walking: the roof fades away and you're inside, seen from the same
camera, in the same world. Traffic keeps going outside, friends can follow you in, a clerk is behind the
counter. No loading screen, no separate scene, no pop-up.

## How it works today (what changes)
- Every building is one solid box (`City.buildings[].rect`, height `h`) in the shared collision world
  (`shared/world/collision.ts` `StaticWorld`), used by the server and by the client's prediction alike.
- The client draws buildings as instanced boxes per 160 m tile (`render/cityMeshes.ts`), with rooftop
  gear batched on top (`render/buildingDetail.ts`). There's no per-building object to hide.
- People and vehicles have `x, y` and `alt` (helicopters). Nothing knows "inside" or "which floor".
- Shop doors are points (`Place.x/y`); E at the door opens a pane or a shop counter.

## Data: an interior is shared, generated data
Generated from the city seed by shared code (server and clients get the same thing), stored beside the
building:

```
Interior {
  building: number;            // index into City.buildings
  floors: Floor[];             // floor 0 = street level
}
Floor {
  h: number;                   // floor height above ground (0, 3.2, 6.4 ...)
  walls: Rect[];               // thin wall boxes (outer shell with door gaps, inner partitions)
  rooms: { rect: Rect; kind: RoomKind }[];  // 'shop' | 'back' | 'counter' | 'office' | 'vault' ...
  props: { rect: Rect; h: number; kind: PropKind }[];  // counters, shelves, tables, desks (solid)
  doors: { x: number; y: number; outside: boolean }[];
  stairs: { rect: Rect; to: number }[];     // stand in it to go to floor `to` (F3)
  spots: { x: number; y: number; use: 'clerk' | 'customer' | 'guard' }[];   // where NPCs stand
}
```

## Collision: by floor
- Each person gets a `floor` (-1 = outside; otherwise floor index) and `inside` (building index).
- An enterable building's exterior stops being one solid box: its outer **walls** go into the collision
  world instead, with a gap at each door (1.4 m: people fit, cars don't).
- Inside, you collide with that floor's walls and props only. Outside, you collide with the city as now.
  Passing through a door gap flips `inside`/`floor` (a trigger line across the gap).
- Bullets and thrown things only hit people on the same floor of the same building (or both outside).
  Explosions outside don't reach inside, except through the door.
- Vehicles never go inside (the gaps are too narrow).
- Both server physics and client prediction use it, like `StaticWorld` today.

## Drawing: the cutaway
- Enterable buildings get their own meshes (not the tile instancing), so one can fade: roof and upper
  floors, then the walls cut down to waist height, so you see the floor plan from above.
- Interior meshes (floor texture, low walls, counters, shelves) are built only for nearby buildings and
  thrown away when far.

**Decide (who sees inside).** Options:
- (a) **Recommended:** the roof fades for anyone whose camera is over that building on foot. Walk past a
  shop and you see in, so friends see you inside, like the "in place" idea.
- (b) Only for people who are inside it themselves. Others see the roof.

## Upper floors (F3, as built)
- Each upper floor sits on its own strip east of the map: floor f of a building is at
  `x + f * LEVEL_BAND` (shared/world/levels.ts). Collision, the server's spatial hash, bullets and
  sight work unchanged, because two floors are thousands of metres apart; nothing needed a `floor`
  field, and the snapshot format didn't change (protocol 9 is for the new city layout).
- Stand at the elevator and press E: a list of floors; picking one moves you there.
- Stairwells (2026-11-26, shared/world/stairs.ts): a walled stairwell left of the elevator at the
  back, the same on the lobby and every floor, its door onto the landing from the corridor. Two
  flights side by side: walk to the top of the left one and you come out on the next floor's
  landing (from the top floor, into a helicopter on the roof, else the roof door is locked), to the
  bottom of the right one and you're a floor down. The lobby's right side is the solid space under
  the stairs. Apartment blocks have no elevator: their stairs are walked (their `lift` is the
  stairwell landing, for chasers and roof drop-offs); a building too small for a stairwell (2 of 15)
  keeps the old floor menu. Standing in a stairwell greys out everything else: a grey veil over the
  view with a hole at the stairwell (client/render/stairShade.ts). `npx tsx scripts/floors.ts`.
- The client maps strip positions back over the building (`groundOf`), lifted by `FLOOR_H` per floor.
  The camera follows your floor; the building hides and only your floor is drawn; people on other
  upper floors aren't drawn; effects and sounds land where they happen, sounds muffled per floor.
- Upstairs, the server's interest also covers the street around your building, and ambient people and
  traffic keep spawning around it.

## Floor plans: generated, with a few hand-made
- **Generated** from the footprint and the place's type, by room layouts per type:
  - Shop / corner store / gun shop: sales floor at the front, counter across it, stock room behind.
  - Diner: booths along the windows, counter and kitchen behind.
  - Nightclub: dance floor, bar, back room (the club's meetings happen there).
  - Office tower: lobby with a desk and elevators; offices off a corridor on upper floors (F3).
  - Apartment block (F3): stairwell, corridor, flats.
- **Hand-made** (data files, like a level): the bank (lobby, counters, vault), the police precinct (front
  desk, cells), the hospital front.
- **Furniture** is solid boxes, drawn simply (counters, shelves, tables) in the house style.

## What moves inside
- **Shops:** the counter screens (gun shop, dealership office) open at the counter inside, not the front
  door. Business owners' screens (safe, pay-off, club) open at the back-room desk.
- **People:** a clerk behind each counter (stands, flees or fights per the gang/guard rules). Customers
  wander between shelves now and then. Robbery (point a gun at the clerk) is a natural follow-on, but
  not part of this.
- **Police and gangs** can follow you in (they path through doors). In F1 they only use the street door.

**Decide (which buildings open).** Options:
- (a) **Recommended:** only places with a purpose: shops, services and businesses. Plain city blocks stay
  solid, so the city still reads as streets, and there's less to build.
- (b) Every building, with generic layouts. Much more work for empty rooms.

## Networking
- Each person's snapshot gains `floor` (and the client works out the building from where they stand).
  Protocol version bump.
- Interest: a viewer only gets full detail for people on their own floor of their own building, plus
  everyone outside.

## Slices
- **F1** Single-floor shops and businesses: generated plans, door gaps, by-floor collision, cutaway,
  counters and clerks; the counter screens move inside. Headless test: walk in through the door, can't
  walk through walls, bullets don't cross floors, cars stay out.
- **F2** Bank (hand-made, with the vault) and police precinct; the bank job uses the vault.
- **F3** Upper floors: stairs and elevators, floor-by-floor drawing, office towers and apartments.

## Risks
- Collision and visibility now depend on floors everywhere (AI, bullets, explosions, pickups): the
  biggest change in F1, and where bugs will hide. The headless tests cover it.
- Draw calls: enterable buildings leave the instancing. Few of them (around 90 places), and only nearby
  ones get interiors, so it should hold; measured in F1.
- Saves: none needed (interiors come from the seed). Room saves are unaffected.
