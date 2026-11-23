// Headless check that civilian traffic pulls over for sirens: a police car with its siren on comes
// up behind moving traffic cars (and one drives toward them head-on); they ease to the kerb (right
// of travel) and stop, then carry on a few seconds after the siren is switched off. Cars on other
// streets don't react, and nobody pulls over for a siren that's off. `npx tsx scripts/sirens.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/sirens';
const { Room } = await import('../src/server/room');
const { RULES, vehicleIndex } = await import('../src/shared/packs');
const { spawnVehicle } = await import('../src/server/game/factory');
const { forwardSpeed } = await import('../src/shared/sim/physics');
type Vehicle = import('../src/server/game/entities').Vehicle;

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const room = new Room('SIRN', RULES.citySeed);
room.stop();
const pl = room.join('Watcher', { send: () => {}, close: () => {} });
if (typeof pl === 'string') throw new Error(pl);
room.stop();
const w = room.world;
const me = w.peds.get(pl.pid)!;
for (let t = 0; t < 30 * 20; t++) room.tick(); // let traffic get going

const driverOf = (v: Vehicle) => (v.seats[0] ? w.peds.get(v.seats[0]) : undefined);
/** Civilian cars cruising along a straight stretch at speed. */
function cruisers(): Vehicle[] {
  return [...w.vehicles.values()].filter((v) => {
    const d = driverOf(v);
    if (!d || d.player || d.ai?.task !== 'drive' || v.spec.siren || v.spec.movement !== 'wheels') return false;
    if (forwardSpeed(v.body) < 6 || d.ai.drive?.why !== 'free') return false;
    // A straight run ahead: no junction within 40 m (turning would muddle "moved right").
    const c = Math.cos(v.body.angle), s = Math.sin(v.body.angle);
    return !w.city.nodes.some((n) => { const f = (n.x - v.body.x) * c + (n.y - v.body.y) * s; return f > -8 && f < 40 && Math.abs(-(n.x - v.body.x) * s + (n.y - v.body.y) * c) < 8; });
  });
}

function trial(label: string, place: (car: Vehicle) => { x: number; y: number; angle: number; speed: number }): void {
  let pulled = 0, stopped = 0, resumed = 0, tested = 0;
  const used = new Set<number>();
  for (let k = 0; k < 8; k++) {
    // A car cruising right now (picked fresh: one chosen earlier may since have stopped at a light).
    const car = cruisers().find((c) => !used.has(c.id));
    if (!car) { for (let t = 0; t < 30 * 3; t++) room.tick(); continue; }
    used.add(car.id);
    // The watcher stands off to the side, so nothing here is culled as out of sight.
    me.body.x = car.body.x + Math.sin(car.body.angle) * 30; me.body.y = car.body.y - Math.cos(car.body.angle) * 30;
    const a0 = car.body.angle, x0 = car.body.x, y0 = car.body.y;
    const at = place(car);
    const cop = spawnVehicle(w, vehicleIndex('police'), at.x, at.y, at.angle);
    cop.siren = true;
    cop.persistent = true;
    cop.body.vx = Math.cos(at.angle) * at.speed; cop.body.vy = Math.sin(at.angle) * at.speed;
    for (let t = 0; t < 30 * 4; t++) {
      room.tick();
      cop.body.vx = Math.cos(at.angle) * at.speed * 0.2; cop.body.vy = Math.sin(at.angle) * at.speed * 0.2;
      if (process.env.TRACE && k === 0 && t % 6 === 0) {
        const r = (car.body.x - x0) * -Math.sin(a0) + (car.body.y - y0) * Math.cos(a0);
        console.log((t / 30).toFixed(1), driverOf(car)?.ai?.drive?.why, 'v', forwardSpeed(car.body).toFixed(1), 'right', r.toFixed(2),
          'steer', car.ctl.steer.toFixed(2), 'thr', car.ctl.throttle.toFixed(2), 'hdg', (car.body.angle - a0).toFixed(2));
      }
    }
    // Right of the original line of travel: (-sin a, cos a).
    const right = (car.body.x - x0) * -Math.sin(a0) + (car.body.y - y0) * Math.cos(a0);
    const why = driverOf(car)?.ai?.drive?.why;
    if (process.env.DEBUG) console.log(label, car.spec.id, { why, right: right.toFixed(2), v: forwardSpeed(car.body).toFixed(1), turned: Math.abs(Math.sin(car.body.angle - a0)).toFixed(2), d: Math.hypot(cop.body.x - car.body.x, cop.body.y - car.body.y).toFixed(1), yieldT: driverOf(car)?.ai?.drive?.yieldT.toFixed(1), task: driverOf(car)?.ai?.task });
    const stoppedNow = Math.abs(forwardSpeed(car.body)) < 0.8;
    cop.siren = false;
    w.vehicles.delete(cop.id);
    if (!w.vehicles.has(car.id) || !driverOf(car)) continue; // despawned or abandoned: not a result
    tested++;
    if (right > 0.6 && why === 'siren') pulled++;
    if (stoppedNow) stopped++;
    for (let t = 0; t < 30 * 6; t++) room.tick();
    if (forwardSpeed(car.body) > 3 || driverOf(car)?.ai?.drive?.why !== 'siren') resumed++;
  }
  const n = Math.max(1, tested);
  check(tested >= 3, `${label}: ${tested} cars tested`);
  // Cars boxed in behind another (itself pulling over) stop where they are, as queued traffic does.
  check(pulled >= Math.ceil(n * 0.4), `${label}: cars moved over toward the kerb (${pulled}/${tested})`);
  check(stopped >= Math.ceil(n * 0.7), `${label}: and stopped (${stopped}/${tested})`);
  check(resumed >= Math.ceil(n * 0.8), `${label}: drove on after the siren went (${resumed}/${tested})`);
}

// A siren coming up behind, in the same lane.
trial('from behind', (car) => ({ x: car.body.x - Math.cos(car.body.angle) * 22, y: car.body.y - Math.sin(car.body.angle) * 22, angle: car.body.angle, speed: 12 }));
// One coming the other way along the same road.
trial('head-on', (car) => ({ x: car.body.x + Math.cos(car.body.angle) * 35 + Math.sin(car.body.angle) * 3.5, y: car.body.y + Math.sin(car.body.angle) * 35 - Math.cos(car.body.angle) * 3.5, angle: car.body.angle + Math.PI, speed: 12 }));

// A siren that's off, and one on a parallel street 40 m away, change nothing.
{
  const car = cruisers()[0];
  const cop = spawnVehicle(w, vehicleIndex('police'), car.body.x - Math.cos(car.body.angle) * 20, car.body.y - Math.sin(car.body.angle) * 20, car.body.angle);
  for (let t = 0; t < 30 * 2; t++) room.tick();
  check(driverOf(car)?.ai?.drive?.why !== 'siren', 'no siren on: traffic ignores the police car');
  w.vehicles.delete(cop.id);
  const far = spawnVehicle(w, vehicleIndex('police'), car.body.x + Math.sin(car.body.angle) * 40, car.body.y - Math.cos(car.body.angle) * 40, car.body.angle);
  far.siren = true;
  for (let t = 0; t < 30; t++) room.tick();
  check(driverOf(car)?.ai?.drive?.why !== 'siren', 'a siren on another street is ignored');
  w.vehicles.delete(far.id);
}

console.log(failures ? `${failures} check(s) failed` : 'all siren checks passed');
process.exit(failures ? 1 : 0);
