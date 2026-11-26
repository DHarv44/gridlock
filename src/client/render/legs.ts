// A mount's legs, swung by its gait. The gait comes from how fast it's actually going against its
// breed's gait speeds (VehicleSpec.gaits), so every horse, AI or player, near or far, matches its
// motion: a four-beat walk, a two-beat trot (diagonal pairs), a three-beat canter, a gallop.
import type { VehicleSpec } from '../../shared/packs';
import type { VehicleView } from './vehicleMesh';

export interface GaitState { phase: number; x: number; y: number; speed: number; swing: number }

type Leg = 'leg_fl' | 'leg_fr' | 'leg_rl' | 'leg_rr';
interface Pattern { offset: Record<Leg, number>; stride: number; swing: number }

/** Where in the stride each leg is (0..1), how far one stride carries it (m), how far a leg swings (rad). */
const WALK: Pattern = { offset: { leg_rl: 0, leg_fl: 0.25, leg_rr: 0.5, leg_fr: 0.75 }, stride: 1.7, swing: 0.32 };
const TROT: Pattern = { offset: { leg_fl: 0, leg_rr: 0, leg_fr: 0.5, leg_rl: 0.5 }, stride: 2.8, swing: 0.48 };
const CANTER: Pattern = { offset: { leg_rl: 0, leg_rr: 0.33, leg_fl: 0.33, leg_fr: 0.66 }, stride: 3.8, swing: 0.6 };
const GALLOP: Pattern = { offset: { leg_rl: 0, leg_rr: 0.1, leg_fl: 0.5, leg_fr: 0.6 }, stride: 5.6, swing: 0.75 };

function pattern(spec: VehicleSpec, speed: number): Pattern | null {
  const g = spec.gaits;
  if (!g || speed < g.walk * 0.3) return null;
  if (speed < (g.walk + g.trot) / 2) return WALK;
  if (speed < (g.trot + g.canter) / 2) return TROT;
  if (speed < (g.canter + g.gallop) / 2) return CANTER;
  return GALLOP;
}

/** Called every frame with the vehicle's drawn position. */
export function animateLegs(v: VehicleView, spec: VehicleSpec, x: number, y: number, dt: number): void {
  if (!v.legs.length || dt <= 0) return;
  const s = (v.gait ??= { phase: 0, x, y, speed: 0, swing: 0 });
  const moved = Math.hypot(x - s.x, y - s.y);
  s.x = x; s.y = y;
  // Smoothed: interpolated positions arrive unevenly.
  s.speed += (Math.min(moved / dt, 40) - s.speed) * Math.min(1, dt * 6);
  const p = pattern(spec, s.speed);
  // Standing: the legs settle back to straight.
  s.swing += ((p ? p.swing : 0) - s.swing) * Math.min(1, dt * 5);
  if (p) s.phase = (s.phase + (s.speed / p.stride) * dt) % 1;
  for (const m of v.legs) {
    const off = p ? p.offset[m.userData.leg as Leg] ?? 0 : 0;
    m.rotation.z = Math.sin((s.phase + off) * Math.PI * 2) * s.swing;
  }
}
