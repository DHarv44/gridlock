// Moving between the street and the highways' decks: anyone (on foot or in a vehicle, with whoever
// rides in it) past the switch on a ramp is moved onto, or off, the way's strip (world/ways.ts).
import { flies, floats } from '../../../shared/sim/kinds';
import { crossing } from '../../../shared/world/ways';
import type { Player } from '../entities';
import type { World } from '../world';

/** Dev only: puts a player (and the vehicle they drive) at a point, standing still. */
export function devTeleport(w: World, pl: Player, x: number, y: number): void {
  const p = w.peds.get(pl.pid);
  if (!p || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const v = p.vehicle ? w.vehicles.get(p.vehicle) : undefined;
  const b = v && p.seat === 0 ? v.body : p.body;
  b.x = x; b.y = y; b.vx = 0; b.vy = 0;
  p.body.x = x; p.body.y = y;
}

export function wayCrossings(w: World): void {
  const ways = w.city.ways;
  if (!ways.length) return;
  for (const v of w.vehicles.values()) {
    if (floats(v.spec) || (flies(v.spec) && v.body.alt > 1)) continue;
    const t = crossing(ways, v.body.x, v.body.y);
    if (!t) continue;
    v.body.x = t.x; v.body.y = t.y;
    for (const sid of v.seats) {
      const o = sid ? w.peds.get(sid) : undefined;
      if (o) { o.body.x = t.x; o.body.y = t.y; }
    }
  }
  for (const p of w.peds.values()) {
    if (p.vehicle) continue;
    const t = crossing(ways, p.body.x, p.body.y);
    if (t) { p.body.x = t.x; p.body.y = t.y; }
  }
}
