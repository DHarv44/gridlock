// Classic top-down control scheme: left/right turn the player, forward/back move along the facing
// direction, and weapons fire straight ahead. In vehicles the same keys drive; a tank's turret has
// its own turn keys. Produces the same input fields the server already understands.
import { VEHICLES } from '../../shared/packs';
import { Mode, type YouState } from '../../shared/protocol';
import type { Input } from './input';

const TURN_RATE = 3.8;      // rad/s on foot
const TURRET_RATE = 1.5;    // rad/s
const BACK_SPEED = 0.55;    // fraction of running speed when walking backwards

export interface ClassicOut { mx: number; my: number; throttle: number; steer: number; aim: number }

export class ClassicControls {
  facing = 0;
  private turret = 0;       // turret offset from the hull
  private lastMode = -1;
  private lastHeading = 0;

  /** One sim tick of controls. `heading` is the current vehicle angle (or ped angle on foot). */
  step(input: Input, you: YouState, heading: number, dt: number): ClassicOut {
    const mode = you.mode;
    const inCar = mode === Mode.Driver || mode === Mode.Passenger;
    if (mode !== this.lastMode) {
      // Leaving a vehicle: face the way it was pointing. First spawn: face the server's angle.
      if (mode === Mode.Foot) this.facing = this.lastMode === Mode.Driver || this.lastMode === Mode.Passenger ? this.lastHeading : you.body[2];
      this.turret = 0;
      this.lastMode = mode;
    }
    const turn = input.axis('left', 'right');
    const fwd = input.axis('back', 'forward');
    if (inCar) {
      this.lastHeading = heading;
      const armed = you.vt >= 0 && VEHICLES[you.vt].movement === 'tracks';
      if (armed) this.turret += input.axis('turretLeft', 'turretRight') * TURRET_RATE * dt;
      const aim = heading + this.turret;
      return mode === Mode.Driver ? { mx: 0, my: 0, throttle: fwd, steer: turn, aim } : { mx: 0, my: 0, throttle: 0, steer: 0, aim };
    }
    this.facing += turn * TURN_RATE * dt;
    const k = fwd > 0 ? 1 : fwd < 0 ? -BACK_SPEED : 0;
    return { mx: Math.cos(this.facing) * k, my: Math.sin(this.facing) * k, throttle: 0, steer: 0, aim: this.facing };
  }
}
