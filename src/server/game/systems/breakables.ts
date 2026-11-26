// Street furniture knocked over by vehicles (shared/world/breakables.ts): which props are down, and
// what knocking one does: the vehicle takes a little damage on the side that hit it (packs
// carDamage), sparks or a burst of water, and every player is told. A prop stands again once it's
// been down a while with nobody near (a crew came by), so the streets don't empty out.
import { STREET_PROPS } from '../../../shared/packs';
import { FX, type S2C } from '../../../shared/protocol';
import { flies, floats } from '../../../shared/sim/kinds';
import { Breakables } from '../../../shared/world/breakables';
import { damageVehicle } from '../combat/damage';
import type { Player } from '../entities';
import type { World } from '../world';

/** A knocked prop stands again after this long (s), once no player is within REPAIR_CLEAR (m). */
const REPAIR_AFTER = 150, REPAIR_CLEAR = 80;

export class StreetFurniture {
  readonly props: Breakables;
  /** Knocked props: index → when (world time) and the way it fell. */
  private down = new Map<number, { t: number; angle: number }>();
  private changed = false;
  private checkT = 0;

  constructor(private w: World) {
    this.props = new Breakables(w.city);
  }

  /** Every tick, after everything has moved: vehicles on the street meet the props they touch. */
  update(dt: number): void {
    const w = this.w;
    for (const v of w.vehicles.values()) {
      if (v.wrecked || floats(v.spec) || (flies(v.spec) && v.body.alt > 1)) continue;
      if (Math.abs(v.body.vx) + Math.abs(v.body.vy) < 0.3) continue;
      this.props.meet(v.body, v.spec.length / 2, v.spec.width / 2, (i) => !this.down.has(i), (i, angle) => {
        const p = this.props.list[i], spec = STREET_PROPS[p.kind];
        this.down.set(i, { t: w.time, angle });
        this.changed = true;
        damageVehicle(w, v, spec.carDamage, v.seats[0], { x: p.x, y: p.y });
        if (spec.fx === 'spark') w.emit(FX.Spark, Math.round(p.x), Math.round(p.y));
        else if (spec.fx === 'water') w.emit(FX.Splash, Math.round(p.x), Math.round(p.y));
      });
    }
    if ((this.checkT -= dt) <= 0) {
      this.checkT = 5;
      for (const [i, d] of this.down) {
        const p = this.props.list[i];
        if (w.time - d.t > REPAIR_AFTER && w.nearestPlayerDist2(p.x, p.y) > REPAIR_CLEAR * REPAIR_CLEAR) { this.down.delete(i); this.changed = true; }
      }
    }
    if (this.changed) { this.changed = false; w.broadcast(this.message()); }
  }

  /** What's down, for a player joining. */
  sendTo(pl: Player): void { pl.send(this.message()); }

  private message(): S2C {
    return { t: 'props', down: [...this.down].map(([i, d]) => [i, Math.round(d.angle * 100)]) };
  }
}
