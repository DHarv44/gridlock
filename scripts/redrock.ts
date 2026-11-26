// Headless check of the Redrock Territory universe (the western) on the shared engine: its map
// (towns, trails, rock and ponds, cliffs, no traffic lights), horses (speed, no wheels, riders),
// wagons on trailer physics, a horse going down without fire, and deputies coming on horseback.
// `npx tsx scripts/redrock.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/redrock';
const { installUniverse } = await import('../src/shared/packs');
const { loadUniverse } = await import('../src/universes');
installUniverse(await loadUniverse('redrock'));
const { Room } = await import('../src/server/room');
const { RULES, UNIVERSE, VEHICLES, vehicleIndex } = await import('../src/shared/packs');
const { stepVehicle } = await import('../src/shared/sim/physics');
const { onLegs } = await import('../src/shared/sim/kinds');
const { spawnVehicle } = await import('../src/server/game/factory');
const { damageVehicle } = await import('../src/server/game/combat/damage');
const { updateTrailers } = await import('../src/server/game/systems/trailers');
const { addHeat } = await import('../src/server/game/systems/wanted');
const { callMount, canGallop, updateMounts } = await import('../src/server/game/systems/mounts');
const { laneSpawn } = await import('../src/server/game/systems/spawnPoints');
const { toggleHitch } = await import('../src/server/game/systems/hitching');
const { LAND0, MAP_SIZE } = await import('../src/shared/world/cityTypes');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };
const DT = 1 / 30;

check(UNIVERSE.id === 'redrock', `installed ${UNIVERSE.name}`);
const room = new Room('RDRK', RULES.citySeed);
room.stop();
const w = room.world;
const city = w.city;

// The map.
const trails = city.segs.filter((s) => s.trail).length;
check(trails > 20, `open country is crossed by trails (${trails} trail segments of ${city.segs.length})`);
check(!city.nodes.some((n) => n.lights), 'no traffic lights anywhere');
const rocks = city.obstacles.filter((o) => o.kind === 'rock').length;
check(rocks > 50 && city.ponds.length > 2, `rock formations (${rocks}) and ponds (${city.ponds.length}) in open country`);
check(city.edge === 'cliffs' && !w.map.isWater(LAND0 / 2, MAP_SIZE / 2) && !!w.statics.raycast(LAND0 + 5, MAP_SIZE / 2, 2, MAP_SIZE / 2, 1),
  'the territory ends in solid cliffs, not sea');
check(w.map.isWater((city.ponds[0].x0 + city.ponds[0].x1) / 2, (city.ponds[0].y0 + city.ponds[0].y1) / 2), 'a pond is water');
check(VEHICLES.every((v) => onLegs(v)), 'every ride is on legs (horses and teams)');

// A horse on the longest straight trail: gets up to a gallop, and turns.
const straight = city.segs.filter((s) => s.axis === 'h').sort((a, b) => (b.x1 - b.x0) - (a.x1 - a.x0))[0];
const horse = spawnVehicle(w, vehicleIndex('mustang'), straight.x0 + 10, straight.y0, 0);
let top = 0;
for (let t = 0; t < 6 * 30; t++) {
  stepVehicle(horse.body, horse.spec, { mx: 0, my: 0, throttle: 1, steer: 0, handbrake: false, sprint: true, up: false, down: false }, DT, w.statics, true);
  top = Math.max(top, Math.hypot(horse.body.vx, horse.body.vy));
}
check(top > horse.spec.maxSpeed * 0.85, `a mustang gallops at ${top.toFixed(1)} m/s (${Math.round(top * 3.6)} km/h)`);
const a0 = horse.body.angle;
for (let t = 0; t < 30; t++) stepVehicle(horse.body, horse.spec, { mx: 0, my: 0, throttle: 0.5, steer: 1, handbrake: false, sprint: false, up: false, down: false }, DT, w.statics, true);
check(Math.abs(horse.body.angle - a0) > 1, 'and wheels round sharply');

// A stagecoach: the coach swings round behind the team through a turn.
const coach = spawnVehicle(w, vehicleIndex('stagecoach'), straight.x0 + 40, straight.y0, 0);
coach.trailer = 0;
coach.body.vx = 6;
let swung = 0;
for (let t = 0; t < 4 * 30; t++) {
  stepVehicle(coach.body, coach.spec, { mx: 0, my: 0, throttle: 0.4, steer: t < 60 ? 1 : 0, handbrake: false, sprint: false, up: false, down: false }, DT, w.statics, true);
  updateTrailers(w, DT);
  swung = Math.max(swung, Math.abs(coach.trailer));
}
check(swung > 0.5 && swung <= Math.abs(coach.body.angle) + 0.05,
  `the coach follows the team round on its hitch (team ${coach.body.angle.toFixed(2)} rad, coach ${swung.toFixed(2)} rad)`);

// A horse shot dead goes down where it is: no fire, no blast, the rider thrown and alive.
const fires = w.fires.size;
const mount = spawnVehicle(w, vehicleIndex('quarter_horse'), straight.x0 + 80, straight.y0, 0);
damageVehicle(w, mount, 10_000, 0);
check(mount.wrecked && mount.burning < 0 && w.fires.size === fires, 'a horse killed falls at once: no fire, no explosion');

// Gaits: a canter without Sprint, a gallop with it until the horse is blown, then a canter again.
const gait = spawnVehicle(w, vehicleIndex('quarter_horse'), straight.x0 + 10, straight.y0, 0);
const run = (secs: number, sprint: boolean) => {
  let top = 0;
  for (let t = 0; t < secs * 30; t++) {
    gait.ctl.throttle = 1; gait.ctl.steer = 0;
    gait.ctl.sprint = sprint && canGallop(gait);
    updateMounts(w, DT);
    stepVehicle(gait.body, gait.spec, gait.ctl, DT, w.statics, true);
    if (gait.body.x > straight.x0 + 70) gait.body.x -= 60; // keep it on the straight, at speed
    top = Math.max(top, Math.hypot(gait.body.vx, gait.body.vy));
  }
  return { top, now: Math.hypot(gait.body.vx, gait.body.vy) };
};
const canterTop = run(5, false).top;
const gallop = run(4, true);
check(gallop.top > canterTop * 1.4, `a canter tops out at ${canterTop.toFixed(1)} m/s, a gallop at ${gallop.top.toFixed(1)} m/s`);
const blown = run(12, true);
check(gait.blown && blown.now < gallop.top * 0.7, `held to a gallop it's blown and drops back to a canter (${blown.now.toFixed(1)} m/s)`);
const rested = run(6, false);
check(gait.stamina > 2, `cantering it gets its wind back (${gait.stamina.toFixed(1)} s of gallop after 6 s)`);
void rested;

// Wanted: the law comes on horseback.
const pl = room.join('Tex', { send: () => {}, close: () => {} });
if (typeof pl === 'string') throw new Error(pl);

// Hitching: a stopped buckboard unhitches (the wagon stands, you're on the team), and hitches on again.
const rig = spawnVehicle(w, vehicleIndex('buckboard'), straight.x0 + 140, straight.y0, 0);
const rigId = rig.id;
toggleHitch(w, pl, rig);
const left = [...w.vehicles.values()].find((o) => o.spec.id === 'buckboard_standing' && Math.hypot(o.body.x - rig.body.x, o.body.y - rig.body.y) < 8);
check(rig.spec.id === 'team' && !!left && left.spec.seats === 0, 'unhitched: the team is free and the wagon stands where it was');
toggleHitch(w, pl, rig);
check(rig.id === rigId && rig.spec.id === 'buckboard' && !w.vehicles.has(left!.id), 'backed onto its pole, the team hitches on again');

// The whistle: the player's last horse comes to them.
const tex = w.peds.get(pl.pid)!;
const tied = laneSpawn(w, tex.body.x, tex.body.y, 70, 110)!;
const mine = spawnVehicle(w, vehicleIndex('mustang'), tied.x, tied.y, tied.angle);
pl.mount = mine.id;
callMount(w, pl);
let close = Infinity;
for (let t = 0; t < 40 * 30 && mine.calledBy; t++) {
  room.tick();
  const at = w.pedPos(tex);
  close = Math.hypot(mine.body.x - at.x, mine.body.y - at.y);
}
check(close <= 5 && mine.calledBy === 0, `whistled for, the horse comes to its rider (${close.toFixed(1)} m away)`);
if (close > 5) console.log('  horse:', { calledBy: mine.calledBy, seats: mine.seats, wrecked: mine.wrecked, idleT: mine.idleT, hp: mine.hp, texDead: tex.dead, texVeh: tex.vehicle });
addHeat(pl, 45);
for (let t = 0; t < 30 * 30; t++) room.tick();
const lawRides = [...w.vehicles.values()].filter((v) => v.spec.roles.includes('police'));
check(lawRides.length > 0 && lawRides.every((v) => onLegs(v.spec)), `deputies ride out (${lawRides.length} on horseback)`);

console.log(failures ? `${failures} check(s) failed` : 'all Redrock checks passed');
process.exit(failures ? 1 : 0);
