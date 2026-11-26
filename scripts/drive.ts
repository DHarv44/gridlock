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
import type { Effects } from '../src/client/render/effects';
import { Skids } from '../src/client/render/skids';

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
    bindings: { keys: (a: string) => (a === 'aim' || a === 'reverse' ? ['Mouse2'] : []) },
  } as unknown as Input;
}

let car = vehicleIndex('sedan'), spec = VEHICLES[car];
const ctl = (): Controls => ({ mx: 0, my: 0, throttle: 0, steer: 0, handbrake: false, sprint: false, up: false, down: false } as Controls);
/** Drives for `secs` with the given input; returns the body. */
function drive(b: Body, input: Input, secs: number, st = new Steering()): Body {
  const c = ctl();
  for (let t = 0; t < secs; t += DT) {
    const you = { mode: Mode.Driver, vt: car, body: [b.x, b.y, b.angle, b.vx, b.vy, b.av, 0, b.angle] } as unknown as YouState;
    const o = st.step(input, you, b.angle, DT, b, () => null);
    c.throttle = o.throttle; c.steer = o.steer; c.handbrake = !!o.handbrake;
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
o = out(fake(['aim', 'reverse', 'gas'], 'classic'));
check(o.throttle === 1 && !o.handbrake, 'classic: right mouse (Aim / Reverse) changes nothing about driving');

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
// Turning round from speed: how long it takes and how wide it swings, at a few speeds.
const turnaround = (speed: number) => {
  const tb = at(NORTH, speed), st2 = new Steering();
  let t = 0, wide = 0, over = 0;
  // Round = facing south (within 15°) and going that way at 4 m/s.
  while (t < 12 && !(Math.abs(angleDiff(tb.angle, SOUTH)) < 15 * DEG && tb.vy > 4)) {
    drive(tb, fake(['brake'], 'point'), DT, st2);
    t += DT; wide = Math.max(wide, Math.abs(tb.x)); over = Math.min(over, tb.y);
  }
  return { t, wide, over: -over };
};
// Fast, it brakes straight and then handbrake-turns, so the turn itself fits in a road.
const sedan = car;
for (const id of ['compact', 'sedan', 'sports', 'humvee_gun', 'bus', 'ambulance']) {
  car = vehicleIndex(id); spec = VEHICLES[car];
  const r = turnaround(spec.maxSpeed * 0.8);
  const fits = r.wide < (spec.length > 6 ? 9 : 6); // big vans, buses and trucks need more room
  check(fits && r.t < 3, `point: ${id} turns round from ${(spec.maxSpeed * 0.8).toFixed(0)} m/s in ${r.t.toFixed(1)} s, ${r.wide.toFixed(1)} m wide (${r.over.toFixed(1)} m braking past the turn)`);
}
car = sedan; spec = VEHICLES[car];
// Reverse held from a standstill: pointing south while facing north backs straight down the screen.
b = drive(at(NORTH), fake(['reverse', 'brake'], 'point'), 3);
check(b.y > 3 && Math.abs(angleDiff(b.angle, NORTH)) < 10 * DEG, 'point: Reverse + S backs straight down, still facing north');
// Reverse and point east: the back of the car swings round to the east.
b = drive(at(NORTH), fake(['reverse', 'steerRight'], 'point'), 5);
check(Math.abs(angleDiff(b.angle + Math.PI, EAST)) < 15 * DEG, `point: Reverse + D backs round until the rear points east (heading ${(b.angle / DEG).toFixed(0)}°)`);
// E-brake spin: Reverse + the way you came, at speed: whips round on the handbrake and drives off,
// leaving tyre marks and smoke (render/skids.ts, counted with a stand-in for the effects).
let marks = 0, smoke = 0;
const fx = { skid: () => { marks++; }, tyreSmoke: () => { smoke++; } } as unknown as Effects;
for (const speed of [10, 20, 30]) {
  const sb = at(NORTH, speed), ss = new Steering(), sk = new Skids();
  let t = 0, wide = 0, hand = 0, back = false;
  marks = 0; smoke = 0;
  while (t < 4 && !(Math.abs(angleDiff(sb.angle, SOUTH)) < 15 * DEG && sb.vy > 3)) {
    const you = { mode: Mode.Driver, vt: car, body: [sb.x, sb.y, sb.angle, sb.vx, sb.vy, sb.av, 0, sb.angle] } as unknown as YouState;
    const so = ss.step(fake(['reverse', 'brake'], 'point'), you, sb.angle, DT, sb, () => null);
    if (so.handbrake) hand++;
    // After the spin it should drive on forwards, not back up.
    if (Math.abs(angleDiff(sb.angle, SOUTH)) < 25 * DEG && so.throttle < 0) back = true;
    const c = ctl(); c.throttle = so.throttle; c.steer = so.steer; c.handbrake = !!so.handbrake;
    stepVehicle(sb, spec, c, DT, open, true);
    sk.update(fx, 1, spec, sb.x, sb.y, sb.angle, sb.vx, sb.vy, 0, DT);
    t += DT; wide = Math.max(wide, Math.abs(sb.x));
  }
  check(t < 4 && hand > 0 && !back, `point: e-brake spin from ${speed} m/s, round in ${t.toFixed(1)} s, ${wide.toFixed(1)} m wide, then drives on`);
  check(marks > 6 && (speed < 15 || smoke > 0), `  it leaves tyre marks (${marks} stretches) ${speed < 15 ? '' : `and smoke (${smoke} puffs)`}`);
}
// Driving straight leaves no marks.
{
  const sb = at(NORTH, 20), sk = new Skids();
  marks = 0;
  for (let i = 0; i < 60; i++) { stepVehicle(sb, spec, ctl(), DT, open, true); sk.update(fx, 1, spec, sb.x, sb.y, sb.angle, sb.vx, sb.vy, 0, DT); }
  check(marks === 0, 'straight driving leaves no tyre marks');
  // A gentle bend at town speed, or an ordinary slow-down, doesn't either.
  const gb = at(NORTH, 12), gk = new Skids(), gc = ctl();
  gc.steer = 0.25;
  marks = 0;
  for (let i = 0; i < 60; i++) { gc.throttle = i < 40 ? 0.3 : -0.4; stepVehicle(gb, spec, gc, DT, open, true); gk.update(fx, 2, spec, gb.x, gb.y, gb.angle, gb.vx, gb.vy, 0, DT); }
  check(marks === 0, 'a gentle bend or easy braking leaves no tyre marks');
  // Slamming the brakes does.
  const hb = at(NORTH, 25), hk = new Skids(), hc = ctl();
  hc.throttle = -1;
  marks = 0;
  for (let i = 0; i < 30; i++) { stepVehicle(hb, spec, hc, DT, open, true); hk.update(fx, 3, spec, hb.x, hb.y, hb.angle, hb.vx, hb.vy, 0, DT); }
  check(marks > 0, 'slamming the brakes leaves tyre marks');
}
// Slow, Reverse + the way you came just backs up (no spin).
o = out(fake(['reverse', 'brake'], 'point'));
check(o.throttle < 0 && !o.handbrake, 'point: from a standstill Reverse backs up, no spin');
// Keyboard and mouse only: the controller's stick and triggers don't point or reverse.
o = out(fake([], 'point', { lx: 1, lt: 1 }));
check(o.throttle === 0 && o.steer === 0, 'point: the controller plays no part (keyboard and mouse only)');
// Letting go: no throttle, no steer.
o = out(fake([], 'point'));
check(o.throttle === 0 && o.steer === 0, 'point: nothing pointed, coasting');

console.log(failures ? `${failures} check(s) failed` : 'all driving checks passed');
process.exit(failures ? 1 : 0);
