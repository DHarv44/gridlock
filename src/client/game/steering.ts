// Steering: on foot you face the mouse (from your character toward it) and W/S/A/D move forward,
// back and strafe from that facing; in vehicles W/S are gas/brake and A/D steer, and the mouse
// aims out of the window or points a turret. A controller is fully analog and twin-stick: the left
// stick moves or steers, the right stick points where you aim (on foot, out of a car window, or a
// turret), triggers for fire or gas and brake. Weapons fire the way you aim, with auto-aim onto the
// nearest target in a cone.
import { VEHICLES } from '../../shared/packs';
import { Mode, type YouState } from '../../shared/protocol';
import type { Input } from './input';

const DEG = Math.PI / 180;
const TURRET_RATE = 1.5;
export const AUTO_AIM_CONE = 16 * DEG;
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

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
    const pad = input.pad;
    input.triggerFires = !inCar;
    // Each kind of moving has its own keys: on foot, driving, flying.
    const air = inCar && you.vt >= 0 && VEHICLES[you.vt].movement === 'rotor';
    const turn = !inCar ? input.axis('footLeft', 'footRight') : air ? input.axis('heliLeft', 'heliRight') : input.axis('steerLeft', 'steerRight');
    const fwd = !inCar ? input.axis('footDown', 'footUp') : air ? input.axis('heliBack', 'heliForward') : input.axis('brake', 'gas');
    const firing = input.held('fire');
    // Twin-stick: the right stick, or the mouse, points where you aim (screen directions), whichever
    // way you're moving. Aiming on purpose (a hold-up) is the stick pushed or Aim held.
    const stick = pad.rx || pad.ry ? Math.atan2(pad.ry, pad.rx) : null;
    const pointed = stick ?? input.mouseAim();
    input.aimingNow = stick !== null || input.scoped;
    if (inCar) {
      this.lastHeading = heading;
      const rate = you.vt >= 0 ? VEHICLES[you.vt].turret ?? 0 : 0;
      const tank = rate > 0; // any vehicle with a turret aims it (tanks, gun trucks)
      // A turret swings toward where you point (at its own speed, on the server) and holds that
      // angle to the hull when you let go; the turret keys turn it bit by bit.
      if (tank && pointed !== null) this.turret = pointed - heading;
      else if (tank) this.turret += input.axis('turretLeft', 'turretRight') * Math.max(TURRET_RATE, rate) * dt;
      // Otherwise you shoot out of the window: where you point, or ahead when you don't.
      let aim = tank ? heading + this.turret : pointed ?? heading;
      if (!tank && firing) aim = assist(from.x, from.y, aim) ?? aim;
      this.facing = aim;
      if (mode !== Mode.Driver) return { mx: 0, my: 0, throttle: 0, steer: 0, aim };
      // Pad: left stick steers in proportion, RT/LT are progressive gas and brake.
      return { mx: 0, my: 0, throttle: clamp1(fwd + pad.rt - pad.lt), steer: clamp1(turn + pad.lx), aim };
    }
    // On foot you face the mouse (or the right stick). The keys go by that facing: W forward, S back,
    // A and D strafe. The left stick moves in any screen direction, its push setting the pace, and
    // with nothing aiming you face the way it moves; you keep your facing when you stop.
    if (pointed !== null) this.facing = pointed;
    let mx = 0, my = 0;
    if (turn || fwd) {
      const c = Math.cos(this.facing), s = Math.sin(this.facing);
      // Screen y points down, so your right-hand side is (-sin, cos) of where you face.
      mx = c * fwd - s * turn;
      my = s * fwd + c * turn;
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
    } else {
      mx = pad.lx; my = pad.ly;
      if (pointed === null && (mx || my)) this.facing = Math.atan2(my, mx);
    }
    const aim = firing ? assist(from.x, from.y, this.facing) ?? this.facing : this.facing;
    return { mx, my, throttle: 0, steer: 0, aim };
  }
}
