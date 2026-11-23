// Steering: on foot W/A/S/D move north/west/south/east on screen and you face your movement;
// in vehicles W/S are gas/brake and A/D steer. Weapons fire the way you face, with auto-aim onto
// the nearest target in a cone. The mouse plays no part.
import { VEHICLES } from '../../shared/packs';
import { Mode, type YouState } from '../../shared/protocol';
import type { Input } from './input';

const DEG = Math.PI / 180;
const TURRET_RATE = 1.5;
export const AUTO_AIM_CONE = 16 * DEG;

export interface SteerOut { mx: number; my: number; throttle: number; steer: number; aim: number }

/** Finds an auto-aim target: returns the angle to aim at, or null. */
export type AimAssist = (x: number, y: number, facing: number) => number | null;

export class Steering {
  facing = 0;
  private turret = 0;
  private lastMode = -1;
  private lastHeading = 0;

  /** One sim tick. `heading` is the current vehicle (or ped) angle, `from` the player's position. */
  step(input: Input, you: YouState, heading: number, dt: number, from: { x: number; y: number }, assist: AimAssist): SteerOut {
    const mode = you.mode;
    const inCar = mode === Mode.Driver || mode === Mode.Passenger;
    if (mode !== this.lastMode) {
      if (mode === Mode.Foot) this.facing = this.lastMode === Mode.Driver || this.lastMode === Mode.Passenger ? this.lastHeading : you.body[2];
      this.turret = 0;
      this.lastMode = mode;
    }
    const turn = input.axis('left', 'right');
    const fwd = input.axis('back', 'forward');
    const firing = input.held('fire');
    if (inCar) {
      this.lastHeading = heading;
      const tank = you.vt >= 0 && VEHICLES[you.vt].movement === 'tracks';
      if (tank) this.turret += input.axis('turretLeft', 'turretRight') * TURRET_RATE * dt;
      let aim = heading + this.turret;
      if (!tank) aim = assist(from.x, from.y, aim) ?? aim;
      this.facing = aim;
      return mode === Mode.Driver ? { mx: 0, my: 0, throttle: fwd, steer: turn, aim } : { mx: 0, my: 0, throttle: 0, steer: 0, aim };
    }
    // On foot the keys are screen directions: W north, D east, S south, A west (diagonals too).
    // You face the way you're moving and keep that facing when you stop.
    const mx = turn, my = -fwd;
    if (mx !== 0 || my !== 0) this.facing = Math.atan2(my, mx);
    const len = Math.hypot(mx, my) || 1;
    const aim = firing ? assist(from.x, from.y, this.facing) ?? this.facing : this.facing;
    return { mx: mx / len, my: my / len, throttle: 0, steer: 0, aim };
  }
}
