// Headless check of upper floors (F3): office towers and apartment blocks have floors above the
// lobby, the lift takes you up and back down, each floor's walls hold, and someone chasing you
// upstairs walks to the lift and comes up after you. `npx tsx scripts/floors.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/floors';
const { Room } = await import('../src/server/room');
const { RULES } = await import('../src/shared/packs');
const { stepFoot } = await import('../src/shared/sim/physics');
const { floorOf, groundOf } = await import('../src/shared/world/levels');
const { route } = await import('../src/server/game/systems/lifts');
const { spawnPed } = await import('../src/server/game/factory');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const room = new Room('FLRS', RULES.citySeed);
room.stop();
const pl = room.join('Climber', { send: () => {}, close: () => {} });
if (typeof pl === 'string') throw new Error(pl);
room.stop();
const w = room.world, city = w.city, statics = w.statics;
const me = w.peds.get(pl.pid)!;

const tall = city.interiors.map((i, k) => ({ i, k })).filter(({ i }) => i.lift);
const towers = tall.filter(({ i }) => i.layout === 'tower'), flats = tall.filter(({ i }) => i.layout === 'apartments');
check(towers.length > 0 && flats.length > 0, `towers ${towers.length}, apartment blocks ${flats.length}`);
check(tall.every(({ i }) => i.floors.length >= 1), 'each has at least one upper floor');

// Every floor lies over its own building and is walled in on all four sides.
const inRect = (p: { x: number; y: number }, r: { x0: number; y0: number; x1: number; y1: number }, m = 0.01) =>
  p.x > r.x0 - m && p.x < r.x1 + m && p.y > r.y0 - m && p.y < r.y1 + m;
let over = 0, walled = 0, floors = 0;
for (const { i } of tall) {
  for (const fl of i.floors) {
    floors++;
    const a = groundOf(fl.rect.x0, fl.rect.y0), b = groundOf(fl.rect.x1, fl.rect.y1);
    if (a.f === fl.f && inRect(a, i.room, 0.5) && inRect(b, i.room, 0.5)) over++;
    const m = { x: (fl.rect.x0 + fl.rect.x1) / 2, y: (fl.rect.y0 + fl.rect.y1) / 2 };
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].every(([x, y]) => statics.raycast(m.x, m.y, m.x + x * 40, m.y + y * 40, 1.0))) walled++;
  }
}
check(over === floors, `floors sit over their buildings (${over}/${floors})`);
check(walled === floors, `floors walled in (${walled}/${floors})`);

/** Walks a person body from a to b in small steps; returns where they end up. */
function walk(from: { x: number; y: number }, to: { x: number; y: number }, seconds = 10): { x: number; y: number } {
  const b = { x: from.x, y: from.y, angle: 0, vx: 0, vy: 0, av: 0, alt: 0 };
  for (let t = 0; t < seconds * 30; t++) {
    const dx = to.x - b.x, dy = to.y - b.y, d = Math.hypot(dx, dy);
    if (d < 0.3) break;
    stepFoot(b, { mx: dx / d, my: dy / d, throttle: 0, steer: 0, handbrake: false, sprint: false, aimAngle: null } as never, 4, 1 / 30, statics);
  }
  return { x: b.x, y: b.y };
}

// The tallest tower: from its lobby lift up to the top floor and back.
const { i: tw, k } = towers.reduce((a, b) => (b.i.floors.length > a.i.floors.length ? b : a));
const top = tw.floors.length;
me.body.x = tw.place.x; me.body.y = tw.place.y;
check(room.econ.buy(pl, 'floor', String(top), k) !== null, 'the lift needs you standing at it');
me.body.x = tw.lift!.x; me.body.y = tw.lift!.y;
check(room.econ.buy(pl, 'floor', String(top), k) === null && floorOf(me.body.x) === top, `ride the elevator to floor ${top}`);
// Walking down the corridor upstairs stays on the floor (the shell holds).
const fl = tw.floors[top - 1];
const end = walk(me.body, { x: (fl.rect.x0 + fl.rect.x1) / 2, y: (fl.rect.y0 + fl.rect.y1) / 2 });
check(inRect(end, fl.rect) && floorOf(end.x) === top, 'walk around upstairs');
const out = walk(end, { x: end.x + 60, y: end.y });
check(inRect(out, fl.rect), 'the walls keep you on the floor');
check(room.econ.buy(pl, 'floor', String(top + 1), k) !== null, 'no floor above the top');
me.body.x = fl.lift.x; me.body.y = fl.lift.y;
check(room.econ.buy(pl, 'floor', '0', k) === null && floorOf(me.body.x) === 0 && Math.hypot(me.body.x - tw.lift!.x, me.body.y - tw.lift!.y) < 0.1, 'ride back down to the lobby');

// The world keeps running around you upstairs (traffic and peds spawn around the building, not the strip).
me.body.x = fl.lift.x; me.body.y = fl.lift.y;
for (let t = 0; t < 30 * 4; t++) room.tick();
const g = groundOf(me.body.x, me.body.y);
const nearby = [...w.peds.values()].filter((p) => !p.player && Math.hypot(w.pedPos(p).x - g.x, w.pedPos(p).y - g.y) < 120).length;
check(nearby > 0, `street life around the building while upstairs (${nearby} peds)`);

// Someone chasing you upstairs: to the door, then the lift, then up.
const chaser = spawnPed(w, 0, tw.place.x + 6, tw.place.y + 6);
const target = fl.lift;
const v1 = route(w, chaser, target.x, target.y);
check(!!v1 && Math.hypot(v1.x - tw.place.x, v1.y - tw.place.y) < 0.1, 'a chaser outside heads for the door');
chaser.body.x = tw.lift!.x + 0.5; chaser.body.y = tw.lift!.y;
route(w, chaser, target.x, target.y);
check(floorOf(chaser.body.x) === top, 'a chaser at the lift comes up after you');

console.log(failures ? `${failures} check(s) failed` : 'all floor checks passed');
process.exit(failures ? 1 : 0);
