// Headless checks of the railway (world/railgen.ts, server systems/trains.ts): Bayhaven's L has
// stations, its trains run and stop at them, you board by a stair tower's door (waiting for the next
// train if none is in), ride, and get off at the next station. `npx tsx scripts/trains.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/trains';
const { Room } = await import('../src/server/room');
const { RULES, VEHICLES } = await import('../src/shared/packs');
const { BTN } = await import('../src/shared/protocol');
const { LEVEL_BAND, floorOf } = await import('../src/shared/world/levels');
const { heightAt, installWays } = await import('../src/shared/world/ways');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const room = new Room('RAIL', RULES.citySeed);
room.stop();
const msgs: { t: string; kind?: string; text?: string }[] = [];
const pl = room.join('Rider', { send: (d) => msgs.push(JSON.parse(d)), close: () => {} });
if (typeof pl === 'string') throw new Error(pl);
room.stop();
const w = room.world;
installWays(w.city.ways);
const rail = w.city.railway!;
check(!!rail, 'Bayhaven has a railway');
check(new Set(rail.stations.map((s) => s.name)).size === rail.stations.length, 'every station has its own name');
check(rail.spec.style === 'elevated' && rail.stations.length >= 3, `the L: ${rail.stations.length} stations (${rail.stations.map((s) => s.name).join(', ')})`);
const me = w.peds.get(pl.pid)!;
const s0 = rail.stations[1];
const exit = s0.exits[0];
me.body.x = exit.x; me.body.y = exit.y;
for (let i = 0; i < 30; i++) room.tick();
const cars = [...w.vehicles.values()].filter((v) => VEHICLES[v.type].id === rail.spec.car);
check(cars.length === rail.spec.trains * rail.spec.cars, `${cars.length} cars running (${rail.spec.trains} trains of ${rail.spec.cars})`);
check(cars.every((v) => floorOf(v.body.x) === rail.strip), 'up on the viaduct\'s strip');
check(Math.abs(heightAt(cars[0].body.x, cars[0].body.y) - rail.z) < 3, `drawn at the viaduct's height (${heightAt(cars[0].body.x, cars[0].body.y).toFixed(1)} m)`);

// Press Enter at the stair tower's door: on the next train in.
const press = () => { pl.queue.push([0, 0, 0, 0, 0, 0, BTN.enter, -1]); room.tick(); pl.queue.push([0, 0, 0, 0, 0, 0, 0, -1]); };
press();
check(msgs.some((m) => m.text?.includes('Waiting for the next train') || m.text?.includes('On the train')), `at the station you wait for the train (${msgs.filter((m) => m.kind === 'info').map((m) => m.text).at(-1)})`);
let boarded = -1;
for (let i = 0; i < 30 * 150 && boarded < 0; i++) { room.tick(); if (me.vehicle) boarded = i; }
check(boarded >= 0, `a train stops and you're on it (${(boarded / 30).toFixed(0)} s)`);
// Ride to the next station: off by Enter while it stands there.
const startA = rail.axis === 'v' ? me.body.y : me.body.x;
let off = false;
for (let i = 0; i < 30 * 120 && !off; i++) {
  room.tick();
  const v = w.vehicles.get(me.vehicle);
  const moved = Math.abs((rail.axis === 'v' ? me.body.y : me.body.x) - startA);
  if (v && moved > 40 && Math.hypot(v.body.vx, v.body.vy) < 0.01) { press(); off = !me.vehicle; }
}
const at = rail.stations.find((s) => s.exits.some((e) => Math.hypot(e.x - me.body.x, e.y - me.body.y) < 1));
check(off && !!at && at !== s0 && me.body.x < LEVEL_BAND, `off at ${at?.name ?? '(nowhere)'}, by its stair tower on the street`);

console.log(failures ? `${failures} failed` : 'all ok');
process.exit(failures ? 1 : 0);
