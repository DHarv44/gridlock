// Point-to-drive, the second driving mode, for keyboard and mouse only (the controller always drives
// classic; cars and tanks, helicopters keep the classic controls): W/A/S/D (8-way) point where you
// want to go on screen, like walking, and the car steers itself there and drives. Pointing behind
// you brakes and swings round in a tight arc (a tank turns on its tracks); the car never backs up
// by itself. Reverse is held on purpose (Aim: right mouse), and then you point where the back of
// the car goes. The handbrake is untouched. Only throttle and steer are worked out here: the
// physics, the server and the AI are the same as in the classic mode.
import { angleDiff } from '../../shared/math';
import type { YouState } from '../../shared/protocol';
import type { Input } from './input';

const DEG = Math.PI / 180;
/** Full lock from this many radians off (smooth steering inside it, no weaving). */
const STEER_GAIN = 2.5;
/** Pointing this close to straight ahead counts as straight ahead (lets the road assist line you up). */
const DEAD = 2 * DEG;
/** Further off than this, the way you point is behind you: brake and swing round. */
const BEHIND = 100 * DEG;
/** Coming round, brake down to this speed (m/s) before swinging. */
const SWING_SPEED = 6;
/** Easing off the gas in sharp turns. */
const SHARP = 45 * DEG;

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
const steerTo = (diff: number) => (Math.abs(diff) < DEAD ? 0 : clamp1(diff * STEER_GAIN));

/** The screen direction you're pointing (W up, D right); null when you aren't. */
function pointing(input: Input): { dir: number; push: number } | null {
  const x = input.axis('steerLeft', 'steerRight'), y = -input.axis('brake', 'gas');
  return x || y ? { dir: Math.atan2(y, x), push: 1 } : null;
}

export function pointDrive(input: Input, you: YouState, heading: number, tank: boolean): { throttle: number; steer: number } {
  const p = pointing(input);
  const [, , , vx, vy, av] = you.body;
  const vf = vx * Math.cos(heading) + vy * Math.sin(heading);
  // Reverse, held: point where the back of the car goes.
  if (input.held('aim')) {
    // Still rolling forward: brake straight first.
    if (!p || vf > 0.5) return { throttle: -1, steer: 0 };
    // Backing up, the car turns the other way for the same steering, so steer against the turn.
    return { throttle: -1, steer: -steerTo(angleDiff(heading + Math.PI, p.dir)) };
  }
  if (!p) return { throttle: 0, steer: 0 };
  let diff = angleDiff(heading, p.dir);
  // Straight back: come round the way the car is already turning.
  if (Math.abs(diff) > 170 * DEG && av) diff = Math.sign(av) * Math.abs(diff);
  if (Math.abs(diff) > BEHIND) {
    const steer = Math.sign(diff) || 1;
    if (tank) return { throttle: 0, steer }; // tracks turn on the spot
    return { throttle: vf > SWING_SPEED ? -1 : p.push * 0.6, steer };
  }
  return { throttle: p.push * (Math.abs(diff) > SHARP ? 0.7 : 1), steer: steerTo(diff) };
}
