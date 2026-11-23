// Headless check of driver-aimed turrets on wheeled gun trucks: the Humvee and MRAP gun trucks
// traverse toward the driver's aim (and stop there), their unarmed versions don't have one, and
// the tank still turns its turret more slowly. `npx tsx scripts/turret.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/turret';
const { Room } = await import('../src/server/room');
const { RULES, VEHICLES, vehicleIndex, pedIndex } = await import('../src/shared/packs');
const { spawnPed, spawnVehicle, seatPed } = await import('../src/server/game/factory');
const { angleDiff } = await import('../src/shared/math');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const room = new Room('TURT', RULES.citySeed);
const pl = room.join('Watcher', { send: () => {}, close: () => {} });
if (typeof pl === 'string') throw new Error(pl);
room.stop();
const w = room.world;
const me = w.peds.get(pl.pid)!;

function aimTest(id: string, seconds: number): number {
  // Next to the watching player, so the vehicle isn't culled as out of sight.
  const x = me.body.x + 12, y = me.body.y;
  const v = spawnVehicle(w, vehicleIndex(id), x, y, 0);
  const d = spawnPed(w, pedIndex('soldier'), x, y, 0, false);
  seatPed(w, d, v, 0);
  let off = 0;
  for (let t = 0; t < seconds * 30; t++) {
    d.aim = v.body.angle + 1.5; // the target is off to one side
    room.tick();
    off = Math.abs(angleDiff(v.turret, v.body.angle + 1.5));
  }
  check(w.vehicles.has(v.id), `${id} still in the world`);
  return off;
}

for (const id of ['humvee_gun', 'mrap_gun']) {
  const spec = VEHICLES[vehicleIndex(id)];
  check(!!spec.turret && spec.weapons?.includes('mounted_mg') === true, `${id} has a turret and the .50 cal`);
  const off = aimTest(id, 1.5);
  check(off < 0.1, `${id} turret swings onto the aim (${off.toFixed(2)} rad off)`);
}
for (const id of ['humvee', 'mrap']) check(!VEHICLES[vehicleIndex(id)].turret, `${id} has no gun`);
const slow = aimTest('tank', 0.5);
check(slow > 0.5, `the tank turret traverses slower (${slow.toFixed(2)} rad still to go after 0.5 s)`);

console.log(failures ? `${failures} check(s) failed` : 'all turret checks passed');
process.exit(failures ? 1 : 0);
