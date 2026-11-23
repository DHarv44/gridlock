// Lifts (elevators and stairwells) between a tower's or apartment block's floors (world/levels.ts,
// world/floors.ts). A player stands at the lift and picks a floor; AI chasing someone on another
// floor of the same building walks to the lift and comes up after them (`route`).
import { dist } from '../../../shared/math';
import type { Interior } from '../../../shared/world/interiors';
import { floorOf, groundOf } from '../../../shared/world/levels';
import { doorway } from '../ai/doors';
import type { Ped, Player } from '../entities';
import type { World } from '../world';

/** The lift spot of interior `i` on floor f (0 = the lobby). */
export const liftOn = (i: Interior, f: number): { x: number; y: number } | null =>
  f === 0 ? i.lift ?? null : i.floors[f - 1]?.lift ?? null;

const inRoom = (i: Interior, x: number, y: number, m = 0.4) => x > i.room.x0 - m && x < i.room.x1 + m && y > i.room.y0 - m && y < i.room.y1 + m;

/** The building with lifts a point (on any floor) is in. */
export function liftBuilding(w: World, x: number, y: number): Interior | undefined {
  const g = groundOf(x, y);
  return w.city.interiors.find((i) => i.lift && inRoom(i, g.x, g.y));
}

function moveTo(p: Ped, at: { x: number; y: number }): void {
  p.body.x = at.x; p.body.y = at.y; p.body.vx = 0; p.body.vy = 0;
}

/** A player at a lift rides it to floor `to` (interior index `k`). */
export function ride(w: World, pl: Player, k: number, to: number): string | null {
  const p = w.peds.get(pl.pid), i = w.city.interiors[k];
  if (!p || p.dead || p.vehicle || !i?.lift) return 'Not now.';
  const here = liftOn(i, floorOf(p.body.x)), there = liftOn(i, to);
  if (!here || !there) return 'No such floor.';
  if (dist(p.body.x, p.body.y, here.x, here.y) > 2.5) return 'Stand at the lift.';
  moveTo(p, there);
  return null;
}

/** AI heading for a point: where to walk now when the way isn't straight. On the same floor, through
 *  a walk-in place's doorway (ai/doors.ts); on another floor, in through the door, to the lift, and
 *  arriving at the lift takes them up or down. Null when they can head straight there. */
export function route(w: World, p: Ped, tx: number, ty: number): { x: number; y: number } | null {
  const tf = floorOf(tx), mf = floorOf(p.body.x);
  if (tf === mf) return mf === 0 ? doorway(w, p, tx, ty) : null;
  const i = liftBuilding(w, tf > 0 ? tx : p.body.x, tf > 0 ? ty : p.body.y);
  if (!i) return null;
  const here = liftOn(i, mf), there = liftOn(i, tf);
  if (!here || !there) return null;
  // On the ground floor (in the street, or in another shop): through the doors to the lobby lift.
  if (mf === 0) { const via = doorway(w, p, here.x, here.y); if (via) return via; }
  if (dist(p.body.x, p.body.y, here.x, here.y) < 1.3) { moveTo(p, there); return there; }
  return here;
}
