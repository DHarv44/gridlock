// Stairwells in towers and apartment blocks: the same walled room on the lobby and on every floor
// above (world/floors.ts), just left of the lift at the back, its door onto the corridor. Inside, a
// landing by the door and two flights side by side running to the back wall: walk to the top of the
// left one and you come out on the landing of the floor above (from the top floor, onto the roof),
// to the bottom of the right one and you're on the floor below. The lobby's right-hand flight is the
// solid space under the stairs. Worked out from the city alone (no trig), like the rest of the world.
import type { Rect } from '../math';
import type { City } from './cityTypes';
import type { Interior, PropKind, Spot } from './interiors';

export interface Stairwell {
  f: number;
  /** Inside the stairwell's walls (on its floor's strip, world/levels.ts). */
  rect: Rect;
  /** The top of the flight up (to f + 1, or onto the roof from the top floor). */
  up: Rect;
  /** The bottom of the flight down (to f - 1); none in the lobby. */
  down: Rect | null;
  /** The top floor: the flight up comes out on the roof. */
  roof: boolean;
  /** Where you come out arriving from another floor. */
  landing: Spot;
  /** Out through the door, onto the corridor (a unit vector). */
  out: { x: number; y: number };
}

/** Where the stairwell sits in the room's local frame (`a` across, `d` in from the front), and which
 *  side its door is on: +1 the a1 side (it stands left of the corridor), -1 the a0 side (right of it). */
export interface StairPlan { a0: number; a1: number; d0: number; d1: number; door: 1 | -1 }

const T = 0.3, WALL_H = 2.8, SW = 2.4, SD = 4.4, DOOR = 1.2, LANDING = 1.6, RAIL = 0.08, TOP = 0.7, STEPS = 7;
/** How high the top tread of a flight up stands (the flight reads as climbing from above). */
const RISE = 1.4;

/** The stairwell for a room with inside faces ia0..ia1 across and iD deep, beside the corridor
 *  (c0..c1, the lines the units' corridor walls stand on), at the back. Left of the corridor with
 *  the lobby's front 4.6 m clear when there's room; in a small block, a compact one on whichever side
 *  fits. Null only when the room can't take a stairwell at all. */
export function stairPlan(ia0: number, ia1: number, iD: number, c0: number, c1: number): StairPlan | null {
  const d1 = iD, d0 = iD - SD;
  const left = { a0: c0 - T - SW, a1: c0 - T, d0, d1, door: 1 as const };
  if (left.a0 - T >= ia0 + 0.6 && d0 - T >= 4.8) return left;
  // Compact: just room in front of it for the door and the landing.
  if (d0 - T < 1.4) return null;
  if (left.a0 - T >= ia0 + 0.2) return left;
  const right = { a0: c1 + T, a1: c1 + T + SW, d0, d1, door: -1 as const };
  if (right.a1 + T <= ia1 - 0.2) return right;
  // A narrow block: against its side wall, the door onto the middle of the floor.
  const side = { a0: ia0, a1: ia0 + SW, d0, d1, door: 1 as const };
  if (side.a1 + T + 1.0 <= ia1) return side;
  return null;
}

type Local = (a0: number, a1: number, d0: number, d1: number) => Rect;

/** Builds floor f's stairwell (n = the floors above the lobby): its walls and fittings through
 *  `wall` / `prop` (local frame), and the stairwell itself through `rect` / `point` (already on
 *  that floor's strip). */
export function stairwell(
  s: StairPlan, f: number, n: number, rect: Local, point: (a: number, d: number) => { x: number; y: number }, face: number,
  wall: (a0: number, a1: number, d0: number, d1: number, h: number) => void,
  prop: (kind: PropKind, a0: number, a1: number, d0: number, d1: number, h: number) => void,
): Stairwell {
  const { a0, a1, d0, d1 } = s, am = (a0 + a1) / 2, f0 = d0 + LANDING;
  // Walls: the front, the far side, and the corridor side with the door onto the landing. The back
  // is the building's back wall.
  wall(a0 - T, a1 + T, d0 - T, d0, WALL_H);
  const [blind0, blind1, door0, door1] = s.door > 0 ? [a0 - T, a0, a1, a1 + T] : [a1, a1 + T, a0 - T, a0];
  wall(blind0, blind1, d0, d1, WALL_H);
  wall(door0, door1, d0, d0 + 0.25, WALL_H);
  wall(door0, door1, d0 + 0.25 + DOOR, d1, WALL_H);
  // The rail between the flights.
  prop('rail', am - RAIL, am + RAIL, f0, d1, 1.0);
  // The flights swap sides floor to floor, the way a stair turns back on itself: the flight you came
  // up is the one down from here, and the next flight up is beside it. The lobby's goes up on the
  // side away from the door.
  const far: [number, number] = s.door > 0 ? [a0, am - RAIL] : [am + RAIL, a1];
  const near: [number, number] = s.door > 0 ? [am + RAIL, a1] : [a0, am - RAIL];
  const [u0, u1] = f % 2 === 0 ? far : near, [w0, w1] = f % 2 === 0 ? near : far;
  // Up: treads climbing toward the back, a pale nosing on each. Down: treads sinking away into the
  // dark (the lobby has nothing below: the space under the stairs is solid, fenced off).
  const step = (d1 - f0) / STEPS;
  for (let k = 0; k < STEPS; k++) {
    const e0 = f0 + k * step, e1 = e0 + step - 0.03;
    const up = 0.08 + (k + 1) * (RISE / STEPS);
    prop('step', u0, u1, e0, e1, up);
    prop('nosing', u0, u1, e0, e0 + 0.07, up + 0.02);
    if (f > 0) {
      prop('stepDown', w0, w1, e0, e1, 0.05 + (STEPS - k) * 0.004);
      prop('nosingDown', w0, w1, e0, e0 + 0.05, 0.06 + (STEPS - k) * 0.004);
    }
  }
  if (f === 0) prop('rail', w0, w1, f0, d1, 1.2);
  const land = point(am, d0 + 0.8), toward = point(am + s.door, d0 + 0.8);
  const ol = Math.hypot(toward.x - land.x, toward.y - land.y) || 1;
  return {
    out: { x: (toward.x - land.x) / ol, y: (toward.y - land.y) / ol },
    f, rect: rect(a0, a1, d0, d1),
    up: rect(u0, u1, d1 - TOP, d1),
    down: f > 0 ? rect(w0, w1, d1 - TOP, d1) : null,
    roof: f === n,
    landing: { x: land.x, y: land.y, angle: face },
  };
}

/** Interior i's stairwell on floor f (0 = the lobby), if it has one. */
export const stairwellOn = (i: Interior, f: number): Stairwell | undefined => (f === 0 ? i.stairs : i.floors[f - 1]?.stairs);

const inRect = (r: Rect, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/** Finds the stairwell a point is in (on any floor), by a coarse grid over the world. */
export class StairIndex {
  private cells = new Map<number, { k: number; s: Stairwell }[]>();
  private static readonly CELL = 32;

  constructor(city: City) {
    city.interiors.forEach((i, k) => {
      for (let f = 0; f <= i.floors.length; f++) {
        const s = stairwellOn(i, f);
        if (!s) continue;
        const C = StairIndex.CELL;
        for (let cy = Math.floor(s.rect.y0 / C); cy <= Math.floor(s.rect.y1 / C); cy++) {
          for (let cx = Math.floor(s.rect.x0 / C); cx <= Math.floor(s.rect.x1 / C); cx++) {
            const key = cy * 100000 + cx;
            const list = this.cells.get(key) ?? [];
            list.push({ k, s });
            this.cells.set(key, list);
          }
        }
      }
    });
  }

  /** The stairwell (and its interior's index) a point stands in, or null. */
  at(x: number, y: number): { k: number; s: Stairwell } | null {
    const C = StairIndex.CELL;
    for (const hit of this.cells.get(Math.floor(y / C) * 100000 + Math.floor(x / C)) ?? []) if (inRect(hit.s.rect, x, y)) return hit;
    return null;
  }

  /** Which way a point at the top or bottom of a flight takes you: 1 up, -1 down, 0 neither. */
  static way(s: Stairwell, x: number, y: number): 1 | -1 | 0 {
    if (inRect(s.up, x, y)) return 1;
    if (s.down && inRect(s.down, x, y)) return -1;
    return 0;
  }
}
