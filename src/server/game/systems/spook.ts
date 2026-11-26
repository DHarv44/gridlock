// How a mount reacts to the world (the verb; each breed's VehicleSpec.temper is the noun). A gun
// going off or a blast near it may spook it, more likely the closer it is, the worse the noise
// and the less nerve it has: it rears, standing on its hind legs a moment (nobody can make it go),
// and may throw its rider; then, if nobody's riding it, it bolts away from the noise. Hurt below
// its `lame` share of health it limps, no faster than a trot, until it heals (it does, slowly).
import { angleDiff, clamp } from '../../../shared/math';
import { damagePed } from '../combat/damage';
import type { Vehicle } from '../entities';
import { unseatPed } from '../factory';
import type { World } from '../world';

/** Seconds on its hind legs, then (riderless) bolting. */
const REAR_S = 0.9;
const BOLT_S = [3.5, 7] as const;
/** Health a mount gets back each second while it isn't dead. */
const HEAL = 0.8;

/** A noise at (x, y) heard out to `radius`; `lethal` for blasts and deaths (worse than a shot);
 *  `calm`: a mount that doesn't react (the one whose rider fired). */
export function spookMounts(w: World, x: number, y: number, radius: number, lethal: boolean, calm = 0): void {
  w.vehiclesNear(x, y, radius, (v) => {
    const t = v.spec.temper;
    if (!t || v.wrecked || v.rearT > 0 || v.id === calm) return;
    const k = 1 - Math.hypot(v.body.x - x, v.body.y - y) / radius;
    if (k <= 0 || !w.rng.chance((lethal ? 0.9 : 0.55) * k * (1 - t.nerve))) return;
    v.rearT = REAR_S;
    v.boltT = REAR_S + w.rng.range(BOLT_S[0], BOLT_S[1]);
    v.boltX = x; v.boltY = y;
    const rider = v.seats[0] ? w.peds.get(v.seats[0]) : undefined;
    if (rider && !rider.dead && w.rng.chance(t.buck * k)) {
      unseatPed(w, rider, true);
      damagePed(w, rider, 8, 0);
      if (rider.player) w.notify('warn', 'Your horse rears and throws you!', rider.player);
    }
  });
}

/** Whether a mount is limping (hurt below its temper's `lame` share). */
export const isLame = (v: Vehicle): boolean => !!v.spec.temper && !v.wrecked && v.hp < v.spec.hp * v.spec.temper.lame;

/** Holds a player's controls to what a rearing or lame mount will do (before it steps). */
export function reinIn(v: Vehicle): void {
  if (v.rearT > 0) { v.ctl.throttle = 0; v.ctl.steer = 0; v.ctl.sprint = false; return; }
  if (isLame(v)) { v.ctl.throttle = Math.min(v.ctl.throttle, 0.7); v.ctl.sprint = false; }
}

/** Every tick, for each mount: rearing, bolting (nobody riding it), limping, healing. */
export function updateSpook(w: World, v: Vehicle, dt: number): void {
  if (!v.spec.temper || v.wrecked) return;
  if (v.hp < v.spec.hp) v.hp = Math.min(v.spec.hp, v.hp + HEAL * dt);
  const ridden = !!v.seats[0];
  if (v.rearT > 0) {
    v.rearT -= dt;
    v.ctl.throttle = 0; v.ctl.steer = 0; v.ctl.sprint = false;
    v.body.vx *= Math.exp(-6 * dt); v.body.vy *= Math.exp(-6 * dt);
    return;
  }
  if (v.boltT > 0) {
    v.boltT -= dt;
    // A rider gets it back under control; a loose horse runs from the noise.
    if (!ridden) {
      const away = Math.atan2(v.body.y - v.boltY, v.body.x - v.boltX);
      v.ctl.steer = clamp(angleDiff(v.body.angle, away) * 2, -1, 1);
      v.ctl.throttle = 1;
      v.ctl.sprint = !isLame(v) && !v.blown && v.stamina > 0;
      return;
    }
  }
  // A player reins a lame horse in themselves (reinIn, before it steps); anyone else is held here.
  const rider = ridden ? w.peds.get(v.seats[0]) : undefined;
  if (isLame(v) && !rider?.player) { v.ctl.throttle = Math.min(v.ctl.throttle, 0.7); v.ctl.sprint = false; }
}

/** Is it bolting right now (moving on its own)? */
export const bolting = (v: Vehicle): boolean => v.boltT > 0 && v.rearT <= 0 && !v.seats[0];
