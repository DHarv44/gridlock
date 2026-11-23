// Headless check that people on motorbikes are sent to clients as riders (with the bike and seat),
// while people inside closed vehicles still aren't. `npx tsx scripts/riders.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/riders';
const { Room } = await import('../src/server/room');
const { EK } = await import('../src/shared/protocol');
const { RULES, VEHICLES, vehicleIndex, pedIndex } = await import('../src/shared/packs');
const { spawnPed, spawnVehicle, seatPed } = await import('../src/server/game/factory');
const { buildSnapshot } = await import('../src/server/game/systems/snapshot');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const room = new Room('RIDE', RULES.citySeed);
room.stop();
const pl = room.join('Watcher', { send: () => {}, close: () => {} });
if (typeof pl === 'string') throw new Error(pl);
room.stop();
const w = room.world;
const me = w.peds.get(pl.pid)!;

check(['streetbike', 'dirtbike', 'chopper', 'police_bike'].every((id) => (VEHICLES[vehicleIndex(id)].saddles?.length ?? 0) >= 1), 'every bike has a saddle');
const bike = spawnVehicle(w, vehicleIndex('chopper'), me.body.x + 6, me.body.y, 0);
const rider = spawnPed(w, pedIndex('cop'), bike.body.x, bike.body.y, 0, false);
const pillion = spawnPed(w, pedIndex('cop'), bike.body.x, bike.body.y, 0, false);
seatPed(w, rider, bike, 0);
seatPed(w, pillion, bike, 1);
const car = spawnVehicle(w, vehicleIndex('sedan'), me.body.x - 8, me.body.y, 0);
const driver = spawnPed(w, pedIndex('cop'), car.body.x, car.body.y, 0, false);
seatPed(w, driver, car, 0);

const snap = buildSnapshot(w, pl);
if (snap.t !== 's') throw new Error('no snapshot');
const sent = (id: number) => snap.e.find((d) => d[0] === id && d[1] === EK.Ped);
const r = sent(rider.id), p = sent(pillion.id);
check(!!r && r[8] === bike.id && r[9] === 0, 'the rider is sent on the bike, seat 0');
check(!!p && p[8] === bike.id && p[9] === 1, 'the pillion passenger is sent, seat 1');
check(!sent(driver.id), 'a driver inside a car is not sent');

console.log(failures ? `${failures} check(s) failed` : 'all rider checks passed');
process.exit(failures ? 1 : 0);
