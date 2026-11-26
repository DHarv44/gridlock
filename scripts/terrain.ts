// Headless check of real ground height (world/terrain.ts) in the western: hills in open country,
// level towns, water and railroad, the same ground on every machine, climbs that slow you and
// ridges that hide you. Bayhaven stays flat. `npx tsx scripts/terrain.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/redrock';
const { installUniverse } = await import('../src/shared/packs');
const { loadUniverse } = await import('../src/universes');
const bayhaven = await loadUniverse('bayhaven');
installUniverse(await loadUniverse('redrock'));
const { RULES, vehicleIndex } = await import('../src/shared/packs');
const { Room } = await import('../src/server/room');
const { generateCity } = await import('../src/shared/world/city');
const { groundZ, slopeFactor, terrainHit } = await import('../src/shared/world/terrain');
const { trackPoint } = await import('../src/shared/world/railgen');
const { stepFoot, stepVehicle } = await import('../src/shared/sim/physics');
const { spawnVehicle } = await import('../src/server/game/factory');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };
const DT = 1 / 30;

check(!bayhaven.world?.terrain, 'Bayhaven has no hills (flat as ever)');
const room = new Room('HILL', RULES.citySeed);
room.stop();
const w = room.world;
const city = w.city;
const t = city.terrain;
check(!!t, 'the western has ground height');
if (!t) process.exit(1);

let lo = Infinity, hi = -Infinity, hilly = 0;
for (const h of t.h) { lo = Math.min(lo, h); hi = Math.max(hi, h); if (h) hilly++; }
check(hi - lo > 8 && hilly / t.h.length > 0.4, `open country rises and falls (${lo.toFixed(1)} to ${hi.toFixed(1)} m, ${Math.round((100 * hilly) / t.h.length)}% of it off the level)`);

const level = (x: number, y: number) => Math.abs(groundZ(t, x, y)) < 0.02;
const tilted = city.buildings.filter((b) => ![[b.rect.x0, b.rect.y0], [b.rect.x1, b.rect.y0], [b.rect.x0, b.rect.y1], [b.rect.x1, b.rect.y1]].every(([x, y]) => level(x, y)));
check(tilted.length === 0, `every building stands on level ground (${city.buildings.length - tilted.length}/${city.buildings.length})`);
check(city.ponds.every((p) => level((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2) && level(p.x0, p.y0) && level(p.x1, p.y1)), `ponds lie level (${city.ponds.length})`);
const rail = city.railway!;
let railLevel = true;
for (let a = rail.a0; a <= rail.a1; a += 5) for (let k = 0; k < rail.tracks.length; k++) { const p = trackPoint(rail, a, k); if (!level(p.x, p.y)) railLevel = false; }
check(railLevel, 'the railroad runs on the level its whole length');

const again = generateCity(RULES.citySeed).terrain!;
check(again.h.length === t.h.length && again.h.every((h, k) => h === t.h[k]), 'the ground comes out the same on every machine (bit for bit)');

// Climbing: the same gallop up, along and down a 10% grade.
const horse = spawnVehicle(w, vehicleIndex('mustang'), 1000, 1000, 0);
const ride = (g: number): number => {
  const slope = { resolveObb: () => null, gradeAt: () => g } as unknown as typeof w.statics;
  Object.assign(horse.body, { x: 1000, y: 1000, angle: 0, vx: 0, vy: 0, av: 0 });
  for (let k = 0; k < 6 * 30; k++) stepVehicle(horse.body, horse.spec, { mx: 0, my: 0, throttle: 1, steer: 0, handbrake: false, sprint: true, up: false, down: false }, DT, slope, true);
  return Math.hypot(horse.body.vx, horse.body.vy);
};
const up = ride(0.1), flat = ride(0), down = ride(-0.1);
check(up < flat * 0.85 && down > flat && down < flat * 1.15, `a horse gallops slower up a 10% climb and a little quicker down it (${up.toFixed(1)} / ${flat.toFixed(1)} / ${down.toFixed(1)} m/s)`);
const walk = (g: number): number => {
  const slope = { resolveCircle: () => null, gradeAt: () => g } as unknown as typeof w.statics;
  const b = { x: 1000, y: 1000, angle: 0, vx: 0, vy: 0, av: 0, alt: 0 };
  stepFoot(b, { mx: 1, my: 0, throttle: 0, steer: 0, handbrake: false, sprint: false, up: false, down: false }, 5, DT, slope);
  return b.vx;
};
check(walk(0.15) < walk(0) && walk(-0.15) > walk(0), `on foot too (${walk(0.15).toFixed(2)} / ${walk(0).toFixed(2)} / ${walk(-0.15).toFixed(2)} m/s)`);
check(slopeFactor(1) >= 0.4 && slopeFactor(-1) <= 1.1, 'however steep, nothing stops dead or runs away');

// Ridges: somewhere out there a rise stands between two people 40-80 m apart, and the sight line
// (the one every shot, lookout and witness uses) is blocked by it; across a town it never is.
let hidden = 0, agree = 0, tries = 0;
for (let k = 0; k < 4000 && hidden < 20; k++) {
  const x = 200 + ((k * 7919) % 2100), y = 200 + ((k * 104729) % 2100), d = 40 + (k % 5) * 10, a = (k % 8) * (Math.PI / 4);
  const x1 = x + Math.cos(a) * d, y1 = y + Math.sin(a) * d;
  tries++;
  const f = terrainHit(t, x, y, x1, y1, 1.4);
  if (f === null) continue;
  hidden++;
  const ray = w.statics.raycast(x, y, x1, y1, 1.4);
  if (ray && ray.t <= f + 1e-9) agree++;
}
check(hidden >= 10 && agree === hidden, `ridges hide people behind them (${hidden} sight lines of ${tries} blocked by the land, all of them blocked for shots and eyes too)`);
const towns = city.buildings.slice(0, 200);
let townBlocked = 0;
for (let k = 1; k < towns.length; k++) {
  const a = towns[k - 1].rect, b = towns[k].rect;
  if (terrainHit(t, a.x0 - 2, a.y0 - 2, b.x0 - 2, b.y0 - 2, 1.4) !== null && level(a.x0 - 2, a.y0 - 2) && level(b.x0 - 2, b.y0 - 2)
    && Math.hypot(a.x0 - b.x0, a.y0 - b.y0) < 120) townBlocked++;
}
check(townBlocked === 0, 'in town the land never gets in the way');

console.log(failures ? `${failures} check(s) failed` : 'all terrain checks passed');
process.exit(failures ? 1 : 0);
