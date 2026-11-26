// Steering: on foot W/A/S/D move north/west/south/east on screen and you face your movement,
// or, while Aim (right mouse) is held, the way the mouse turns you; in vehicles W/S are gas/brake
// and A/D steer. A controller is fully analog and twin-stick: the left stick moves or steers, the
// right stick points where you aim (on foot, out of a car window, or a turret), triggers for fire
// or gas and brake. Weapons fire the way you aim, with auto-aim onto the nearest target in a cone.
import { VEHICLES } from '../../shared/packs';
import { flies } from '../../shared/sim/kinds';
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
    const air = inCar && you.vt >= 0 && flies(VEHICLES[you.vt]);
    const turn = !inCar ? input.axis('footLeft', 'footRight') : air ? input.axis('heliLeft', 'heliRight') : input.axis('steerLeft', 'steerRight');
    const fwd = !inCar ? input.axis('footDown', 'footUp') : air ? input.axis('heliBack', 'heliForward') : input.axis('brake', 'gas');
    const firing = input.held('fire');
    // Twin-stick: the right stick (or the mouse while Aim is held) points where you aim, in screen
    // directions, wherever you're moving or facing.
    const mouse = input.mouseAim();
    const pointed = mouse ?? (pad.rx || pad.ry ? Math.atan2(pad.ry, pad.rx) : null);
    input.aimingNow = pointed !== null;
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
    // On foot the keys are screen directions: W north, D east, S south, A west (diagonals too).
    // The left stick moves any direction, its push setting the pace; the right stick aims.
    // You face the way you're moving (or aiming) and keep that facing when you stop.
    let mx = turn, my = -fwd;
    const len = Math.hypot(mx, my);
    if (len > 0) { mx /= len; my /= len; } else { mx = pad.lx; my = pad.ly; }
    // Aiming (right mouse or right stick) turns you freely while you move any way.
    if (pointed !== null) this.facing = pointed;
    else if (mx || my) this.facing = Math.atan2(my, mx);
    input.facingHint = this.facing;
    const aim = firing ? assist(from.x, from.y, this.facing) ?? this.facing : this.facing;
    return { mx, my, throttle: 0, steer: 0, aim };
  }
}
