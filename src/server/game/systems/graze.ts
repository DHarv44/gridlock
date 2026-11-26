// Livestock left to itself (VehicleSpec.grazes): it stands cropping the grass a while, then ambles a
// few steps somewhere else, never far from where it was found. Gunfire still scatters it (spooked
// animals bolt, systems/spook.ts) and anyone driving it (a rider, a whistle) overrides this.
import { angleDiff, clamp } from '../../../shared/math';
import type { Vehicle } from '../entities';
import type { World } from '../world';

/** How far (m) it wanders from where it was found before turning back. */
const RANGE = 24;
/** A walk's throttle: a slow amble. */
const AMBLE = 0.22;

interface Graze { hx: number; hy: number; t: number; walk: boolean; heading: number }
const state = new WeakMap<Vehicle, Graze>();

/** Whether this animal is grazing (left to itself): it moves under its own power. */
export const grazing = (v: Vehicle): boolean => !!v.spec.grazes && !v.wrecked && !v.seats[0] && !v.calledBy;

export function graze(w: World, v: Vehicle, dt: number): void {
  let g = state.get(v);
  if (!g) state.set(v, (g = { hx: v.body.x, hy: v.body.y, t: w.rng.range(0, 6), walk: false, heading: v.body.angle }));
  g.t -= dt;
  if (g.t <= 0) {
    g.walk = !g.walk && w.rng.chance(0.55);
    g.t = g.walk ? w.rng.range(2, 6) : w.rng.range(5, 14);
    // Strayed too far: the next walk heads back toward home ground.
    const away = Math.hypot(v.body.x - g.hx, v.body.y - g.hy);
    g.heading = away > RANGE ? Math.atan2(g.hy - v.body.y, g.hx - v.body.x) + w.rng.range(-0.5, 0.5) : w.rng.range(-Math.PI, Math.PI);
  }
  v.ctl.sprint = false;
  v.ctl.handbrake = false;
  if (!g.walk) { v.ctl.throttle = 0; v.ctl.steer = 0; return; }
  v.ctl.steer = clamp(angleDiff(v.body.angle, g.heading) * 1.5, -1, 1);
  v.ctl.throttle = AMBLE;
}
