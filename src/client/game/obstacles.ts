// The other vehicles near you, as boxes where they're drawn, for the prediction of your own car or
// ped to stop at (shared/sim/dynamic.ts blockBy). Aircraft up in the air, and boats against things
// on land (or the other way round), don't meet.
import { VEHICLES } from '../../shared/packs';
import { EK } from '../../shared/protocol';
import type { Obb } from '../../shared/sim/dynamic';
import { flies, floats } from '../../shared/sim/kinds';
import type { EntityStore } from '../net/entities';

/** Only vehicles this close (m) can be in the way within a tick. */
const NEAR = 30;

/** `ownVid`: the vehicle you're in (0 on foot); `afloat`: you're in a boat. */
export function vehicleObstacles(store: EntityStore, x: number, y: number, ownVid: number, afloat: boolean): Obb[] {
  const out: Obb[] = [];
  for (const e of store.all.values()) {
    if (e.kind !== EK.Veh || e.id === ownVid || Math.abs(e.x - x) > NEAR || Math.abs(e.y - y) > NEAR) continue;
    const spec = VEHICLES[e.data[2]];
    if (!spec || (flies(spec) && e.alt > 2) || floats(spec) !== afloat) continue;
    out.push({ x: e.x, y: e.y, angle: e.angle, hl: spec.length / 2, hw: spec.width / 2, id: e.id });
  }
  return out;
}
