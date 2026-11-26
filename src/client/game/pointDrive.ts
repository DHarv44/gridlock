// Point-to-drive, the second driving mode, for keyboard and mouse only (the controller always drives
// classic; cars and tanks, helicopters keep the classic controls): W/A/S/D (8-way) point where you
// want to go on screen, like walking, and the car steers itself there and drives. Pointing behind
// you turns round as tight as the speed allows: a handbrake turn when fast, braking into a swing
// when slower, a tight arc from a crawl (a tank turns on its tracks); the car never backs up by
// itself. Reverse (a button of its own, right mouse by default) backs up, pointing where the back
// of the car goes; held while moving and pointing back the way you came, it's an e-brake spin
// instead: the car whips round on the handbrake and drives off the way you point. Only throttle,
// steer and the handbrake are worked out here: physics, server and AI are as in the classic mode.
import { angleDiff } from '../../shared/math';
import type { YouState } from '../../shared/protocol';
import type { Input } from './input';

const DEG = Math.PI / 180;
/** Full lock from this many radians off (smooth steering inside it, no weaving). */
const STEER_GAIN = 2.5;
/** Pointing this close to straight ahead counts as straight ahead (lets the road assist line you up). */
const DEAD = 2 * DEG;
/** Further off than this, the way you point is behind you: turn round. */
const BEHIND = 100 * DEG;
/** Turning round faster than this (m/s): brake hard in a straight line first. */
const STRAIGHT_SPEED = 18;
/** Turning round faster than this (m/s): a handbrake turn. */
const HANDBRAKE_SPEED = 9;
/** Turning round faster than this: brake while swinging. */
const SWING_SPEED = 5;
/** Easing off the gas in sharp turns. */
const SHARP = 45 * DEG;
/** An e-brake spin needs at least this much speed (m/s); slower, Reverse just backs up. */
const SPIN_SPEED = 6;
/** A spin is done once you face within this of where you point. */
const SPIN_DONE = 25 * DEG;

export interface DriveOut { throttle: number; steer: number; handbrake?: boolean }

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
const steerTo = (diff: number) => (Math.abs(diff) < DEAD ? 0 : clamp1(diff * STEER_GAIN));

/** The screen direction you're pointing (W up, D right); null when you aren't. */
function pointing(input: Input): number | null {
  const x = input.axis('steerLeft', 'steerRight'), y = -input.axis('brake', 'gas');
  return x || y ? Math.atan2(y, x) : null;
}

export class PointDrive {
  /** Mid e-brake spin: which way it's turning (1 or -1), else 0. */
  private spin = 0;
  /** Came out of a spin with Reverse still held: drive on the way you point until you let go. */
  private spun = false;

  step(input: Input, you: YouState, heading: number, tracks: boolean): DriveOut {
    const dir = pointing(input);
    const [, , , vx, vy, av] = you.body;
    const vf = vx * Math.cos(heading) + vy * Math.sin(heading);
    const reverse = input.held('reverse');
    if (!reverse || dir === null) { this.spin = 0; this.spun = false; }
    if (dir === null) return reverse ? { throttle: -1, steer: 0 } : { throttle: 0, steer: 0 };
    let diff = angleDiff(heading, dir);
    // Straight back: come round the way the car is already turning.
    if (Math.abs(diff) > 170 * DEG && av) diff = Math.sign(av) * Math.abs(diff);
    if (reverse && !tracks && !this.spun) {
      // E-brake spin: moving, pointing back the way you came.
      if (!this.spin && vf > SPIN_SPEED && Math.abs(diff) > BEHIND) this.spin = Math.sign(diff) || 1;
      if (this.spin) {
        // Round far enough, or out of speed to slide any further (then it drives round the rest).
        if (Math.abs(diff) > SPIN_DONE && Math.hypot(vx, vy) > 2) return { throttle: 0, steer: this.spin * (vf < 0 ? -1 : 1), handbrake: true };
        this.spin = 0;
        this.spun = true;
      } else {
        // Backing up: point where the back of the car goes. Still rolling forward: brake straight.
        if (vf > 0.5) return { throttle: -1, steer: 0 };
        // In reverse the car turns the other way for the same steering, so steer against the turn.
        return { throttle: -1, steer: -steerTo(angleDiff(heading + Math.PI, dir)) };
      }
    }
    if (Math.abs(diff) > BEHIND) {
      // Turning round, as tight as the speed allows. The physics turns the other way while the car
      // rolls backwards (sliding round in a handbrake turn, it can), so the steer follows that.
      const way = Math.sign(diff) || 1;
      if (tracks) return { throttle: 0, steer: way * (vf < -0.5 ? -1 : 1) }; // on the spot
      const steer = way * (vf < 0 ? -1 : 1);
      if (vf > STRAIGHT_SPEED) return { throttle: -1, steer: 0 };
      if (vf > HANDBRAKE_SPEED) return { throttle: -1, steer, handbrake: true };
      if (vf > SWING_SPEED) return { throttle: -1, steer };
      return { throttle: 0.5, steer };
    }
    return { throttle: Math.abs(diff) > SHARP ? 0.7 : 1, steer: steerTo(diff) };
  }
}
