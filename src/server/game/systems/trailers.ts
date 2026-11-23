// Articulated trailers: swing behind the tractor, scrape off buildings, shove cars, flatten people.
import { angleDiff, clamp } from '../../../shared/math';
import { PED_RADIUS, stepTrailer, trailerCentre } from '../../../shared/sim/physics';
import { obbVsAabb, obbVsCircle } from '../../../shared/world/collision';
import { damagePed } from '../combat/damage';
import type { Vehicle } from '../entities';
import type { World } from '../world';

export function updateTrailers(w: World, dt: number): void {
  for (const v of w.vehicles.values()) {
    const t = v.spec.trailer;
    if (!t) continue;
    v.trailer = stepTrailer(v.body, v.spec, v.trailer, dt);
    const ctr = trailerCentre(v.body, v.spec, v.trailer);
    const c = Math.cos(v.trailer), s = Math.sin(v.trailer);
    const hl = t.length / 2, hw = t.width / 2;
    // Buildings: the trailer can't pass through them, so it straightens out and drags the rig.
    let scraped = false;
    w.statics.near(ctr.x - hl - 1, ctr.y - hl - 1, ctr.x + hl + 1, ctr.y + hl + 1, (box) => {
      if (!scraped && box.h > 0.5 && obbVsAabb(ctr.x, ctr.y, c, s, hl, hw, box)) scraped = true;
    });
    if (scraped) {
      v.trailer += clamp(angleDiff(v.trailer, v.body.angle), -2 * dt, 2 * dt);
      v.body.vx *= 0.92; v.body.vy *= 0.92;
    }
    shove(w, v, ctr.x, ctr.y, c, s, hl, hw);
  }
}

/** Pushes cars and people out of the trailer's box; a fast-swinging trailer knocks people down. */
function shove(w: World, v: Vehicle, x: number, y: number, c: number, s: number, hl: number, hw: number): void {
  const speed = Math.hypot(v.body.vx, v.body.vy);
  w.vehHash.query(x, y, hl + 6, (o) => {
    if (o === v || (o.spec.movement === 'rotor' && o.body.alt > 2)) return;
    // Treat the other vehicle as a circle of its half-width at a few points along its length.
    const oc = Math.cos(o.body.angle), os = Math.sin(o.body.angle);
    for (const k of [-0.35, 0, 0.35]) {
      const px = o.body.x + oc * o.spec.length * k, py = o.body.y + os * o.spec.length * k;
      const h = obbVsCircle(x, y, c, s, hl, hw, { x: px, y: py, r: o.spec.width / 2 });
      if (!h) continue;
      o.body.x -= h.nx * h.depth; o.body.y -= h.ny * h.depth;
      o.body.vx -= h.nx * Math.min(6, speed * 0.4); o.body.vy -= h.ny * Math.min(6, speed * 0.4);
    }
  });
  w.pedHash.query(x, y, hl + 2, (p) => {
    if (p.vehicle || p.dead || p.jumpT > 0) return;
    const h = obbVsCircle(x, y, c, s, hl, hw, { x: p.body.x, y: p.body.y, r: PED_RADIUS });
    if (!h) return;
    p.body.x -= h.nx * h.depth; p.body.y -= h.ny * h.depth;
    if (speed > (p.player ? 7 : 5)) {
      p.down = Math.max(p.down, 1.2);
      damagePed(w, p, speed * speed * 0.3, v.seats[0], { vehicle: true });
    }
  });
}
