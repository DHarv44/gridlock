// Headless check that a semi rig can take an ordinary street corner: it comes up to a junction
// of two local streets at a given speed, turns right at full lock, and has to be heading down the
// cross street, still rolling, a few seconds later (trailer and all). Each speed tries every
// turn-in point, as a player would pick one. `npx tsx scripts/semi.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/semi';
const { Room } = await import('../src/server/room');
const { RULES, vehicleIndex } = await import('../src/shared/packs');
const { stepVehicle } = await import('../src/shared/sim/physics');
const { spawnVehicle } = await import('../src/server/game/factory');
const { updateTrailers } = await import('../src/server/game/systems/trailers');
const { LANE_W } = await import('../src/shared/world/cityTypes');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const room = new Room('SEMI', RULES.citySeed);
room.stop();
const w = room.world;
const city = w.city;
const DT = 1 / 30;

// Junctions of two local (non-arterial) streets with road running on all four sides.
const nodes = city.nodes.filter((n) => n.segs.length === 4 && n.wv < 14 && n.wh < 14).slice(0, 6);
if (!nodes.length) throw new Error('no local junctions');

/** One attempt: eastbound in the right lane at `speed`, full right lock from `turnAt` metres before
 *  the junction centre. Passes if it ends up heading south down the cross street, still moving. */
function attempt(n: typeof nodes[number], speed: number, turnAt: number): { ok: boolean; minSpeed: number } {
  for (const v of [...w.vehicles.values()]) w.vehicles.delete(v.id);
  const v = spawnVehicle(w, vehicleIndex('semi'), n.x - 45, n.y + LANE_W / 2, 0);
  v.trailer = 0;
  v.body.vx = speed;
  let minSpeed = speed, turned = false;
  for (let t = 0; t < 14 * 30; t++) {
    // A real turn stays on the tarmac: the tractor's centre never crosses onto the pavement.
    if (Math.abs(v.body.y - n.y) > n.wh / 2 && Math.abs(v.body.x - n.x) > n.wv / 2) return { ok: false, minSpeed };
    const vf = v.body.vx * Math.cos(v.body.angle) + v.body.vy * Math.sin(v.body.angle);
    const steering = !turned && v.body.x >= n.x - turnAt;
    if (v.body.angle >= Math.PI / 2 - 0.05) turned = true;
    const ctl = { throttle: vf < speed ? 1 : vf > speed + 0.5 ? -0.3 : 0, steer: steering ? 1 : 0, handbrake: false, up: false, down: false };
    stepVehicle(v.body, v.spec, ctl as never, DT, w.statics, true);
    updateTrailers(w, DT);
    if (turned) minSpeed = Math.min(minSpeed, Math.hypot(v.body.vx, v.body.vy));
    if (turned && v.body.y > n.y + 25) {
      // ...and comes out on its own side of the cross street, not across in the oncoming lane.
      const inStreet = Math.abs(v.body.x - (n.x - LANE_W / 2)) < 2.6;
      return { ok: inStreet && minSpeed > 1, minSpeed };
    }
  }
  return { ok: false, minSpeed: 0 };
}

for (const speed of [5, 8, 10, 12]) {
  let made = 0;
  for (const n of nodes) {
    let best = false;
    for (let turnAt = 20; turnAt >= -4 && !best; turnAt -= 1) best = attempt(n, speed, turnAt).ok;
    if (best) made++;
  }
  check(made === nodes.length, `at ${speed} m/s (${Math.round(speed * 3.6)} km/h) the rig turns right at ${made}/${nodes.length} street corners`);
}

// Still a truck: taken at speed a corner is out of reach (a car makes it).
let fast = 0;
for (const n of nodes) {
  let best = false;
  for (let turnAt = 20; turnAt >= -4 && !best; turnAt -= 1) best = attempt(n, 17, turnAt).ok;
  if (best) fast++;
}
check(fast === 0, `at 17 m/s (61 km/h) it can't make the corner (${fast}/${nodes.length})`);

console.log(failures ? `${failures} check(s) failed` : 'all semi checks passed');
process.exit(failures ? 1 : 0);
