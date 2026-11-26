// Headless checks of aiming and on-foot movement (client/game/steering.ts): you face the mouse,
// W/S/A/D go by that facing, the right stick wins over the mouse, a turret and drive-by follow
// where you point. `npx tsx scripts/steering.ts`
import { Steering } from '../src/client/game/steering';
import type { Input } from '../src/client/game/input';
import { VEHICLES } from '../src/shared/packs';
import { Mode, type YouState } from '../src/shared/protocol';

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };
const near = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-6;

/** A stand-in for the real input: which keys are held, where the mouse points, the pad's sticks. */
function fake(keys: string[], mouse: number | null, pad: Partial<Input['pad']> = {}, scoped = false): Input {
  return {
    pad: { lx: 0, ly: 0, rx: 0, ry: 0, lt: 0, rt: 0, ...pad },
    scoped, triggerFires: true, aimingNow: false,
    held: (a: string) => keys.includes(a),
    axis: (neg: string, pos: string) => (keys.includes(pos) ? 1 : 0) - (keys.includes(neg) ? 1 : 0),
    mouseAim: () => mouse,
  } as unknown as Input;
}
const you = (mode: number, vt = -1) => ({ mode, vt, body: [0, 0, 0] } as unknown as YouState);
const none = () => null;
const at = { x: 0, y: 0 };

const s = new Steering();
// Mouse to the east: W walks east, D strafes south (screen y is down), S backs west.
let o = s.step(fake(['footUp'], 0), you(Mode.Foot), 0, 0.03, at, none);
check(near(o.aim, 0) && Math.abs(o.mx - 1) < 1e-6 && Math.abs(o.my) < 1e-6, 'mouse east, W: walk toward the mouse');
o = s.step(fake(['footRight'], 0), you(Mode.Foot), 0, 0.03, at, none);
check(Math.abs(o.mx) < 1e-6 && Math.abs(o.my - 1) < 1e-6, 'D strafes to your right');
o = s.step(fake(['footDown'], 0), you(Mode.Foot), 0, 0.03, at, none);
check(Math.abs(o.mx + 1) < 1e-6 && near(o.aim, 0), 'S backs away, still facing the mouse');
// Mouse to the north: W goes north.
o = s.step(fake(['footUp'], -Math.PI / 2), you(Mode.Foot), 0, 0.03, at, none);
check(Math.abs(o.my + 1) < 1e-6 && near(o.aim, -Math.PI / 2), 'mouse north, W: walk north');
// Diagonal keys are not faster.
o = s.step(fake(['footUp', 'footLeft'], 0), you(Mode.Foot), 0, 0.03, at, none);
check(Math.abs(Math.hypot(o.mx, o.my) - 1) < 1e-6, 'W+A is the same pace');
// Holding Aim is aiming on purpose (a hold-up); the mouse alone is not.
const i1 = fake([], 0, {}, true); s.step(i1, you(Mode.Foot), 0, 0.03, at, none);
const i2 = fake([], 0); s.step(i2, you(Mode.Foot), 0, 0.03, at, none);
check(i1.aimingNow && !i2.aimingNow, 'Aim held is aiming on purpose, the mouse alone is not');
// Pad: the right stick wins over the mouse; with no aim, you face the left stick's way.
o = s.step(fake([], 0, { rx: 0, ry: 1 }), you(Mode.Foot), 0, 0.03, at, none);
check(near(o.aim, Math.PI / 2), 'the right stick wins over the mouse');
o = s.step(fake([], null, { lx: -1, ly: 0 }), you(Mode.Foot), 0, 0.03, at, none);
check(near(o.aim, Math.PI) && o.mx === -1, 'left stick alone: move and face that way');
// A car: the mouse aims out of the window; a turret is pointed where the mouse is.
const car = new Steering();
car.step(fake([], null), you(Mode.Driver, VEHICLES.findIndex((v) => !v.turret)), 0, 0.03, at, none);
o = car.step(fake([], Math.PI / 2), you(Mode.Driver, VEHICLES.findIndex((v) => !v.turret)), 0, 0.03, at, none);
check(near(o.aim, Math.PI / 2), 'in a car the mouse aims the drive-by');
const tank = VEHICLES.findIndex((v) => (v.turret ?? 0) > 0);
if (tank >= 0) {
  const t = new Steering();
  t.step(fake([], null), you(Mode.Driver, tank), 0.3, 0.03, at, none);
  o = t.step(fake([], Math.PI), you(Mode.Driver, tank), 0.3, 0.03, at, none);
  check(near(o.aim, Math.PI), 'a turret is pointed where the mouse is');
}

console.log(failures ? `${failures} check(s) failed` : 'all steering checks passed');
process.exit(failures ? 1 : 0);
