// Tyre marks and tyre smoke from cars working their tyres past grip: handbrake turns and spins,
// cornering hard, braking hard. The car physics keeps the velocity along the car (there's no real
// sideways slide to measure), so the load is read from how the car moves: cornering force (turn
// rate x speed) and braking (speed lost per second), both in m/s². Each car working hard lays an
// unbroken streak from its rear wheels (a mark from where each wheel was to where it is now, every
// so often) that breaks when it eases off; harder still, it smokes. `squeal` is the hardest this
// frame (for the tyre sound).
import { angleDiff } from '../../shared/math';
import type { VehicleSpec } from '../../shared/packs';
import type { Effects } from './effects';

/** Tyre load (m/s²) where tyres start to mark, where they smoke, and as hard as it gets. */
const MARK_LOAD = 9, SMOKE_LOAD = 14, FULL_LOAD = 24;
/** Braking counts for this much of its deceleration (game cars stop hard: only slamming the brakes
 *  should mark). */
const BRAKE_SHARE = 0.6;
/** Below this speed (m/s) nothing marks. */
const MIN_SPEED = 3;
/** How far a wheel travels between marks (m). */
const STEP = 0.35;

interface Track { a: number; speed: number; load: number; wheels: number[] | null }

export class Skids {
  private cars = new Map<number, Track>();
  /** The hardest load this frame (0..1) and where, for the tyre sound. */
  squeal = { k: 0, x: 0, y: 0 };

  /** Call once a frame before the cars. */
  begin(): void { this.squeal.k = 0; }

  /** One car, every frame: position, heading, velocity and height above the road. */
  update(fx: Effects, id: number, spec: VehicleSpec, x: number, y: number, a: number, vx: number, vy: number, alt: number, dt: number): void {
    const speed = Math.hypot(vx, vy);
    let t = this.cars.get(id);
    if (!t) { if (this.cars.size > 400) this.cars.clear(); this.cars.set(id, t = { a, speed, load: 0, wheels: null }); }
    if (dt <= 0) return;
    // Cornering (turn rate x speed) or braking, smoothed so one jumpy frame doesn't mark.
    const raw = spec.movement === 'wheels' && alt < 0.2 && speed > MIN_SPEED
      ? Math.max(Math.abs(angleDiff(t.a, a) / dt) * speed, ((t.speed - speed) / dt) * BRAKE_SHARE) : 0;
    t.load += (raw - t.load) * Math.min(1, dt * 12);
    t.a = a; t.speed = speed;
    if (t.load < MARK_LOAD) { t.wheels = null; return; }
    const k = Math.min(1, (t.load - MARK_LOAD) / (FULL_LOAD - MARK_LOAD));
    if (k > this.squeal.k) this.squeal = { k, x, y };
    // The rear wheels.
    const c = Math.cos(a), s = Math.sin(a);
    const bx = x - c * spec.length * 0.33, by = y - s * spec.length * 0.33;
    const ox = -s * (spec.width / 2 - 0.25), oy = c * (spec.width / 2 - 0.25);
    const now = [bx + ox, by + oy, bx - ox, by - oy];
    const was = t.wheels;
    if (!was) t.wheels = now;
    else if (Math.hypot(now[0] - was[0], now[1] - was[1]) > STEP) {
      fx.skid(was[0], was[1], now[0], now[1], k);
      fx.skid(was[2], was[3], now[2], now[3], k);
      t.wheels = now;
    }
    if (t.load > SMOKE_LOAD && Math.random() < dt * 30 * k) {
      fx.tyreSmoke(now[0], now[1], k);
      fx.tyreSmoke(now[2], now[3], k);
    }
  }
}
