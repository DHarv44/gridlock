// Level crossings (a railway at grade, world/railgen.ts): a computer-driven rider or wagon coming up to
// the track waits while a train is near the crossing, then goes on. (An elevated railway has none.)
import type { Vehicle } from '../entities';
import type { World } from '../world';

/** Stop this far (m) short of the track's centre, and look this far along it for a train. */
const STOP: [number, number] = [3, 16];
const LOOK = 70;
/** A street counts as this crossing within this many metres of it. */
const WIDTH = 9;

/** Whether this vehicle should hold short of a crossing now. */
export function waitForTrain(w: World, v: Vehicle): boolean {
  const r = w.city.railway;
  if (!r || r.strip || !r.crossings.length || v.spec.movement === 'rail') return false;
  const h = r.axis === 'h';
  // Along: the vehicle's place along the line; across: its distance from the track's centre line.
  const along = h ? v.body.x : v.body.y, across = (h ? v.body.y : v.body.x) - r.pos;
  const a = r.crossings.find((c) => Math.abs(c - along) < WIDTH);
  if (a === undefined) return false;
  const d = Math.abs(across);
  if (d < STOP[0] || d > STOP[1]) return false;
  // Heading for the track, not away from it.
  const vel = h ? v.body.vy : v.body.vx, facing = h ? Math.sin(v.body.angle) : Math.cos(v.body.angle);
  if ((vel || facing) * across > 0) return false;
  for (const o of w.vehicles.values()) {
    if (o.spec.movement !== 'rail') continue;
    if (Math.abs((h ? o.body.x : o.body.y) - a) < LOOK) return true;
  }
  return false;
}
