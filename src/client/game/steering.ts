// Turns held actions into the input fields the server understands, for either control style.
//  classic (default, GTA2): left/right turn with GTA2's turn curve, forward/back move along the
//           facing, weapons fire ahead with GTA2-style auto-aim onto the nearest target in a cone.
//  mouse:   WASD moves in screen directions, the character faces the cursor.
import { VEHICLES } from '../../shared/packs';
import { Mode, type YouState } from '../../shared/protocol';
import type { Input } from './input';

const DEG = Math.PI / 180;
// GTA2 (30 Hz ticks): turn speed builds 5°/tick up to 12°/tick, 3°/tick while holding fire still.
const TURN_ACCEL = 5 * DEG * 30 * 30;     // rad/s²
const TURN_ACCEL_AIMING = 3 * DEG * 30 * 30;
const TURN_MAX = 12 * DEG * 30;           // rad/s (a full turn in ~1 s)
const TURRET_RATE = 1.5;
const BACK_SPEED = 0.8;
export const AUTO_AIM_CONE = 16 * DEG;

export interface SteerOut { mx: number; my: number; throttle: number; steer: number; aim: number }

/** Finds an auto-aim target: returns the angle to aim at, or null. */
export type AimAssist = (x: number, y: number, facing: number) => number | null;

export class Steering {
  facing = 0;
  private turnSpeed = 0;
  private turret = 0;
  private lastMode = -1;
  private lastHeading = 0;

  /**
   * One sim tick. `heading` is the current vehicle (or ped) angle; `cursor` is the mouse's ground
   * point and `from` the player's position.
   */
  step(input: Input, you: YouState, heading: number, dt: number, from: { x: number; y: number }, cursor: { x: number; y: number }, assist: AimAssist): SteerOut {
    const mode = you.mode;
    const inCar = mode === Mode.Driver || mode === Mode.Passenger;
    if (mode !== this.lastMode) {
      if (mode === Mode.Foot) this.facing = this.lastMode === Mode.Driver || this.lastMode === Mode.Passenger ? this.lastHeading : you.body[2];
      this.turret = 0;
      this.turnSpeed = 0;
      this.lastMode = mode;
    }
    const turn = input.axis('left', 'right');
    const fwd = input.axis('back', 'forward');
    const firing = input.held('fire');
    const classic = input.bindings.scheme === 'classic';
    const mouseAim = Math.atan2(cursor.y - from.y, cursor.x - from.x);
    if (inCar) {
      this.lastHeading = heading;
      let aim = mouseAim;
      if (classic) {
        const tank = you.vt >= 0 && VEHICLES[you.vt].movement === 'tracks';
        if (tank) this.turret += input.axis('turretLeft', 'turretRight') * TURRET_RATE * dt;
        aim = heading + this.turret;
        if (!tank) aim = assist(from.x, from.y, aim) ?? aim;
      }
      this.facing = aim;
      return mode === Mode.Driver ? { mx: 0, my: 0, throttle: fwd, steer: turn, aim } : { mx: 0, my: 0, throttle: 0, steer: 0, aim };
    }
    if (!classic) {
      // Screen-relative: W is always up the screen, whatever way you face.
      this.facing = mouseAim;
      return { mx: turn, my: -fwd, throttle: 0, steer: 0, aim: mouseAim };
    }
    // GTA2 turning: builds up quickly to a cap, stops dead on release.
    if (turn === 0) this.turnSpeed = 0;
    else {
      const accel = firing && fwd <= 0 ? TURN_ACCEL_AIMING : TURN_ACCEL;
      this.turnSpeed = Math.max(-TURN_MAX, Math.min(TURN_MAX, this.turnSpeed + turn * accel * dt));
      if (Math.sign(this.turnSpeed) !== turn) this.turnSpeed = turn * accel * dt;
    }
    this.facing += this.turnSpeed * dt;
    const k = fwd > 0 ? 1 : fwd < 0 ? -BACK_SPEED : 0;
    const aim = firing ? assist(from.x, from.y, this.facing) ?? this.facing : this.facing;
    return { mx: Math.cos(this.facing) * k, my: Math.sin(this.facing) * k, throttle: 0, steer: 0, aim };
  }
}
