// Turns held actions into the input fields the server understands, for either control style.
//  mouse:   WASD moves in screen directions, the character faces the cursor, drive-bys and turrets
//           aim at the cursor.
//  classic: left/right turn, forward/back move along the facing, weapons fire straight ahead.
import { VEHICLES } from '../../shared/packs';
import { Mode, type YouState } from '../../shared/protocol';
import type { Input } from './input';

const TURN_RATE = 4.2;      // rad/s on foot (classic)
const TURRET_RATE = 1.5;    // rad/s (classic tank turret keys)
const BACK_SPEED = 0.55;    // classic: fraction of running speed when backing up

export interface SteerOut { mx: number; my: number; throttle: number; steer: number; aim: number }

export class Steering {
  facing = 0;
  private turret = 0;
  private lastMode = -1;
  private lastHeading = 0;

  /**
   * One sim tick. `heading` is the current vehicle (or ped) angle; `cursor` is the mouse's ground
   * point and `from` the player's position (used by the mouse style).
   */
  step(input: Input, you: YouState, heading: number, dt: number, from: { x: number; y: number }, cursor: { x: number; y: number }): SteerOut {
    const mode = you.mode;
    const inCar = mode === Mode.Driver || mode === Mode.Passenger;
    if (mode !== this.lastMode) {
      if (mode === Mode.Foot) this.facing = this.lastMode === Mode.Driver || this.lastMode === Mode.Passenger ? this.lastHeading : you.body[2];
      this.turret = 0;
      this.lastMode = mode;
    }
    const turn = input.axis('left', 'right');
    const fwd = input.axis('back', 'forward');
    const mouseAim = Math.atan2(cursor.y - from.y, cursor.x - from.x);
    const classic = input.bindings.scheme === 'classic';
    if (inCar) {
      this.lastHeading = heading;
      let aim = mouseAim;
      if (classic) {
        const tank = you.vt >= 0 && VEHICLES[you.vt].movement === 'tracks';
        if (tank) this.turret += input.axis('turretLeft', 'turretRight') * TURRET_RATE * dt;
        aim = heading + this.turret;
      }
      this.facing = aim;
      return mode === Mode.Driver ? { mx: 0, my: 0, throttle: fwd, steer: turn, aim } : { mx: 0, my: 0, throttle: 0, steer: 0, aim };
    }
    if (!classic) {
      // Screen-relative: W is always up the screen (north), whatever way you face.
      this.facing = mouseAim;
      return { mx: turn, my: -fwd, throttle: 0, steer: 0, aim: mouseAim };
    }
    this.facing += turn * TURN_RATE * dt;
    const k = fwd > 0 ? 1 : fwd < 0 ? -BACK_SPEED : 0;
    return { mx: Math.cos(this.facing) * k, my: Math.sin(this.facing) * k, throttle: 0, steer: 0, aim: this.facing };
  }
}
