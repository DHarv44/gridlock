// Headless check of helicopters: cruising speed, setting down on a roof (the drawn one: a tower's
// shaft, not its podium), getting out down the roof stairs to the top floor where there are floors,
// back in from the lift's Roof stop, and staying put on a roof with no way down.
// `npx tsx scripts/heli.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/heli';
const { Room } = await import('../src/server/room');
const { RULES, vehicleIndex } = await import('../src/shared/packs');
const { BTN } = await import('../src/shared/protocol');
const { spawnVehicle, seatPed } = await import('../src/server/game/factory');
const { massesFor } = await import('../src/shared/world/massing');
const { floorOf } = await import('../src/shared/world/levels');
type Vehicle = import('../src/server/game/entities').Vehicle;

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const room = new Room('HELI', RULES.citySeed);
room.stop();
const joined = room.join('Pilot', { send: () => {}, close: () => {} });
if (typeof joined === 'string') throw new Error(joined);
const pl = joined;
room.stop();
const w = room.world;
const me = w.peds.get(pl.pid)!;
const city = w.city;

/** Ticks with the given buttons held (and throttle), keeping the pilot alive. Input goes through the
 *  queue like a client's: [seq, mx, my, throttle, steer, aim, buttons, weapon wish]. */
let seq = 1;
function fly(seconds: number, btn: number, throttle = 0): void {
  for (let t = 0; t < Math.max(1, Math.round(seconds * 30)); t++) {
    me.hp = me.spec.hp; pl.bustT = 0; pl.heat = 0; pl.wanted = 0;
    pl.queue.push([seq++, 0, 0, throttle, 0, 0, btn, pl.last[7]]);
    room.tick();
  }
}
function press(btn: number): void { fly(1 / 30, btn); fly(0.2, 0); }
function board(x: number, y: number, alt: number): Vehicle {
  if (me.vehicle) { const v = w.vehicles.get(me.vehicle); if (v) w.vehicles.delete(v.id); me.vehicle = 0; }
  const v = spawnVehicle(w, vehicleIndex('heli_police'), x, y, 0);
  v.body.alt = alt;
  seatPed(w, me, v, 0);
  return v;
}

// 1. Cruising speed: a good deal faster than the old ~16 m/s.
const open = city.nodes.find((n) => n.segs.length === 4)!;
let h = board(open.x, open.y, 40);
fly(8, 0, 1);
const sp = Math.hypot(h.body.vx, h.body.vy);
check(sp > 22, `cruises at ${sp.toFixed(1)} m/s (${Math.round(sp * 3.6)} km/h)`);

// 2. A tower with floors: set down on its top roof, get out, come back up.
const tower = city.interiors.find((i) => i.lift && i.floors.length >= 2)!;
const masses = massesFor(city.buildings[tower.building], city.seed, tower.building);
const top = masses.reduce((a, m) => (m.h > a.h ? m : a));
const cx = (top.r.x0 + top.r.x1) / 2, cy = (top.r.y0 + top.r.y1) / 2;
h = board(cx, cy, top.h + 15);
fly(4, BTN.down);
check(Math.abs(h.body.alt - top.h) < 0.05, `sets down on the roof at ${top.h.toFixed(1)} m (alt ${h.body.alt.toFixed(2)})`);
fly(1, 0);
check(Math.abs(h.body.alt - top.h) < 0.05 && Math.hypot(h.body.vx, h.body.vy) < 0.5, 'stays parked on the roof');
press(BTN.enter);
check(!me.vehicle && floorOf(me.body.x) === tower.floors.length, `getting out: down the roof stairs to the top floor (floor ${floorOf(me.body.x)} of ${tower.floors.length})`);
const err = room.econ.buy(pl, 'floor', 'roof', city.interiors.indexOf(tower));
check(err === null && me.vehicle === h.id && h.seats[0] === me.id, `the lift's Roof stop puts you back in the pilot's seat (${err ?? 'ok'})`);
fly(3, BTN.up);
check(h.body.alt > top.h + 10, `and it takes off again (alt ${h.body.alt.toFixed(1)})`);

// 3. A plain building: you can land, but there's no way down from the roof.
const walkIn = new Set(city.interiors.map((i) => i.building));
const bi = city.buildings.findIndex((b, k) => !walkIn.has(k) && b.kind === 'block' && b.h > 10 && b.rect.x1 - b.rect.x0 > 14 && b.rect.y1 - b.rect.y0 > 14);
const plain = massesFor(city.buildings[bi], city.seed, bi).reduce((a, m) => (m.h > a.h ? m : a));
h = board((plain.r.x0 + plain.r.x1) / 2, (plain.r.y0 + plain.r.y1) / 2, plain.h + 12);
fly(4, BTN.down);
check(Math.abs(h.body.alt - plain.h) < 0.05, `lands on a plain roof too (${plain.h.toFixed(1)} m)`);
press(BTN.enter);
check(me.vehicle === h.id, "but you can't get out where there's no way down");

console.log(failures ? `${failures} check(s) failed` : 'all heli checks passed');
process.exit(failures ? 1 : 0);
