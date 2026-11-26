// Headless checks of the two driving modes (client/game/steering.ts, pointDrive.ts), driving a real
// car through the shared physics on open ground: classic is gas/brake/steer exactly as before; point
// to drive (keyboard and mouse only) steers to where you point, comes round when you point behind
// you, never backs up by itself, and reverses only while Aim is held (pointing where the back goes).
// `npx tsx scripts/drive.ts`
import { Steering } from '../src/client/game/steering';
import type { DriveMode, Input } from '../src/client/game/input';
import { angleDiff } from '../src/shared/math';
import { VEHICLES, vehicleIndex } from '../src/shared/packs';
import { Mode, type YouState } from '../src/shared/protocol';
import { type Body, type Controls, stepVehicle } from '../src/shared/sim/physics';
import type { StaticWorld } from '../src/shared/world/collision';

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };
const DT = 1 / 30, DEG = Math.PI / 180;
const open = { resolveObb: () => null } as unknown as StaticWorld; // open ground, nothing to hit

/** A stand-in for the real input: held actions (by id), the pad's sticks and triggers, the mode. */
function fake(keys: string[], mode: DriveMode, pad: Partial<Input['pad']> = {}): Input {
  return {
    pad: { lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, ...pad },
    triggerFires: false, aimingNow: false, facingHint: 0,
    held: (a: string) => keys.includes(a),
    axis: (neg: string, pos: string) => (keys.includes(pos) ? 1 : 0) - (keys.includes(neg) ? 1 : 0),
    mouseAim: () => null,
    driveMode: () => mode,
  } as unknown as Input;
}

const car = vehicleIndex('sedan'), spec = VEHICLES[car];
const ctl = (): Controls => ({ mx: 0, my: 0, throttle: 0, steer: 0, handbrake: false, sprint: false, up: false, down: false } as Controls);
/** Drives for `secs` with the given input; returns the body. */
function drive(b: Body, input: Input, secs: number, st = new Steering()): Body {
  const c = ctl();
  for (let t = 0; t < secs; t += DT) {
    const you = { mode: Mode.Driver, vt: car, body: [b.x, b.y, b.angle, b.vx, b.vy, b.av, 0, b.angle] } as unknown as YouState;
    const o = st.step(input, you, b.angle, DT, b, () => null);
    c.throttle = o.throttle; c.steer = o.steer;
    stepVehicle(b, spec, c, DT, open, true);
  }
  return b;
}
const at = (angle: number, speed = 0): Body => ({ x: 0, y: 0, angle, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, av: 0, alt: 0 });
const NORTH = -Math.PI / 2, EAST = 0, SOUTH = Math.PI / 2;

// Classic: exactly the old mapping (W gas, S brake, A/D steer; pad RT/LT and left stick).
const st = new Steering();
const out = (input: Input) => st.step(input, { mode: Mode.Driver, vt: car, body: [0, 0, 0, 0, 0, 0, 0, 0] } as unknown as YouState, 0, DT, { x: 0, y: 0 }, () => null);
let o = out(fake(['gas', 'steerRight'], 'classic'));
check(o.throttle === 1 && o.steer === 1, 'classic: W is gas, D steers right');
o = out(fake(['brake', 'steerLeft'], 'classic'));
check(o.throttle === -1 && o.steer === -1, 'classic: S brakes / reverses, A steers left');
o = out(fake([], 'classic', { rt: 0.6, lt: 0.2, lx: -0.4 }));
check(Math.abs(o.throttle - 0.4) < 1e-9 && Math.abs(o.steer + 0.4) < 1e-9, 'classic: pad RT - LT, left stick steers');
o = out(fake(['aim', 'gas'], 'classic'));
check(o.throttle === 1, 'classic: Aim held changes nothing about driving');

// Point to drive: pointing east from facing north, the car turns east and drives that way.
let b = drive(at(NORTH), fake(['steerRight'], 'point'), 4);
check(Math.abs(angleDiff(b.angle, EAST)) < 5 * DEG && b.x > 10, `point: D, the car comes round to the east and goes (heading ${(b.angle / DEG).toFixed(0)}°)`);
// Pointing straight back at speed: brakes, comes round in an arc and heads back, never reversing.
b = at(NORTH, 20);
let minVf = Infinity;
for (let i = 0; i < 8 / DT; i++) {
  drive(b, fake(['brake'], 'point'), DT);
  minVf = Math.min(minVf, b.vx * Math.cos(b.angle) + b.vy * Math.sin(b.angle));
}
check(Math.abs(angleDiff(b.angle, SOUTH)) < 10 * DEG && minVf > -0.5, `point: S at speed, it turns round to the south without backing up (heading ${(b.angle / DEG).toFixed(0)}°)`);
// Reverse, Aim held: pointing south while facing north backs straight down the screen.
b = drive(at(NORTH), fake(['aim', 'brake'], 'point'), 3);
check(b.y > 3 && Math.abs(angleDiff(b.angle, NORTH)) < 10 * DEG, 'point: Aim + S backs straight down, still facing north');
// Reverse and point east: the back of the car swings round to the east.
b = drive(at(NORTH), fake(['aim', 'steerRight'], 'point'), 5);
check(Math.abs(angleDiff(b.angle + Math.PI, EAST)) < 15 * DEG, `point: Aim + D backs round until the rear points east (heading ${(b.angle / DEG).toFixed(0)}°)`);
// Keyboard and mouse only: the controller's stick and triggers don't point or reverse.
o = out(fake([], 'point', { lx: 1, lt: 1 }));
check(o.throttle === 0 && o.steer === 0, 'point: the controller plays no part (keyboard and mouse only)');
// Letting go: no throttle, no steer.
o = out(fake([], 'point'));
check(o.throttle === 0 && o.steer === 0, 'point: nothing pointed, coasting');

console.log(failures ? `${failures} check(s) failed` : 'all driving checks passed');
process.exit(failures ? 1 : 0);
