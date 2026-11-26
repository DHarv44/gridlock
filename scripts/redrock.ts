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
const { MISSIONS, RULES, UNIVERSE, VEHICLES, pedIndex, vehicleIndex } = await import('../src/shared/packs');
const { faceTalk } = await import('../src/server/game/systems/faceTalk');
const { stepVehicle } = await import('../src/shared/sim/physics');
const { onLegs } = await import('../src/shared/sim/kinds');
const { materialOf } = await import('../src/shared/materials');
const { removeVehicle, seatPed, spawnPed, spawnVehicle } = await import('../src/server/game/factory');
const { bolting, isLame, reinIn, spookMounts, updateSpook } = await import('../src/server/game/systems/spook');
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
check(VEHICLES.every((v) => !materialOf(v).explodes && !materialOf(v).smokes && (v.gaits ? materialOf(v).bleeds : true)),
  'horses and teams are flesh (they bleed; nothing smokes, burns or blows up), wagons standing alone are wood');

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

// How a horse moves, not a car: it turns on the spot standing, never slides sideways, backs up only
// slowly, and shies to a stop at a wall without hurting itself.
const ctl = (throttle: number, steer: number, sprint = false) => ({ mx: 0, my: 0, throttle, steer, handbrake: false, sprint, up: false, down: false });
const pony = spawnVehicle(w, vehicleIndex('quarter_horse'), straight.x0 + 30, straight.y0, 0);
const p0 = { x: pony.body.x, y: pony.body.y };
for (let t = 0; t < 30; t++) stepVehicle(pony.body, pony.spec, ctl(0, 1), DT, w.statics, true);
check(Math.abs(pony.body.angle) > 1.5 && Math.hypot(pony.body.x - p0.x, pony.body.y - p0.y) < 0.3, `standing, it turns on the spot (${pony.body.angle.toFixed(2)} rad in 1 s)`);
pony.body.angle = 0; pony.body.av = 0;
// Open ground (nothing to bump): only the gait itself.
const open = { resolveObb: () => null } as unknown as typeof w.statics;
for (let t = 0; t < 4 * 30; t++) stepVehicle(pony.body, pony.spec, ctl(1, 0, true), DT, open, true);
let slide = 0;
for (let t = 0; t < 30; t++) {
  stepVehicle(pony.body, pony.spec, ctl(1, 1, true), DT, open, true);
  slide = Math.max(slide, Math.abs(-pony.body.vx * Math.sin(pony.body.angle) + pony.body.vy * Math.cos(pony.body.angle)));
}
check(slide < 0.01, `turning hard at a gallop it doesn't slide sideways (${slide.toFixed(3)} m/s)`);
for (let t = 0; t < 4 * 30; t++) stepVehicle(pony.body, pony.spec, ctl(-1, 0), DT, w.statics, true);
const backing = -(pony.body.vx * Math.cos(pony.body.angle) + pony.body.vy * Math.sin(pony.body.angle));
check(backing > 0 && backing <= pony.spec.gaits!.back + 0.01, `reined back it stops, then backs up slowly (${backing.toFixed(1)} m/s)`);
const rock = city.obstacles.find((o) => o.kind === 'rock' && o.rect.x1 - o.rect.x0 > 8)!;
const rx = (rock.rect.x0 + rock.rect.x1) / 2, ry = (rock.rect.y0 + rock.rect.y1) / 2;
const charger = spawnVehicle(w, vehicleIndex('mustang'), rock.rect.x0 - 25, ry, 0);
let worst = 0;
for (let t = 0; t < 5 * 30; t++) worst = Math.max(worst, stepVehicle(charger.body, charger.spec, ctl(1, 0, true), DT, w.statics, true));
check(worst === 0 && charger.body.x < rx, 'galloped at a rock it pulls up short: no crash damage');

// Temperament: a blast nearby spooks hot horses far more than steady ones; spooked, a loose horse
// bolts from the noise and a ridden one may throw its rider.
const herd = (id: string, ridden: boolean) => Array.from({ length: 24 }, (_, k) => {
  const h = spawnVehicle(w, vehicleIndex(id), straight.x0 + 200 + (k % 6) * 4, straight.y0 + Math.floor(k / 6) * 3 - 4, 0);
  if (ridden) seatPed(w, spawnPed(w, 0, h.body.x, h.body.y, 0, false), h, 0);
  return h;
});
const hot = herd('thoroughbred', true), steady = herd('draft_horse', true);
const bx = straight.x0 + 210, by = straight.y0;
w.rebuildHashes();
spookMounts(w, bx, by, 40, true);
const reared = (hs: typeof hot) => hs.filter((h) => h.rearT > 0).length;
const thrown = (hs: typeof hot) => hs.filter((h) => !h.seats[0]).length;
check(reared(hot) > reared(steady) * 2 && reared(hot) >= 8, `a blast spooks hot thoroughbreds (${reared(hot)}/24 rear) far more than draft horses (${reared(steady)}/24)`);
check(thrown(hot) > thrown(steady) && thrown(hot) > 0, `and throws more riders off them (${thrown(hot)} vs ${thrown(steady)})`);
const loose = hot.filter((h) => h.rearT > 0 && !h.seats[0]);
const d0 = loose.map((h) => Math.hypot(h.body.x - bx, h.body.y - by));
for (let t = 0; t < 4 * 30; t++) { updateMounts(w, DT); for (const h of loose) stepVehicle(h.body, h.spec, h.ctl, DT, open, bolting(h)); }
const fled = loose.filter((h, i) => Math.hypot(h.body.x - bx, h.body.y - by) > d0[i] + 15).length;
check(loose.length > 0 && fled >= loose.length * 0.6, `thrown riders' horses bolt away from the noise (${fled}/${loose.length})`);
for (const h of [...hot, ...steady]) removeVehicle(w, h);

// Lame: hurt badly, a horse can't gallop and holds to a trot; it heals out of it in time.
const hurt = spawnVehicle(w, vehicleIndex('quarter_horse'), straight.x0 + 30, straight.y0, 0);
hurt.hp = hurt.spec.hp * 0.25;
check(isLame(hurt) && !canGallop(hurt), 'badly hurt, a horse is lame and can\'t gallop');
let fastest = 0;
for (let t = 0; t < 4 * 30; t++) {
  hurt.ctl.throttle = 1; hurt.ctl.steer = 0; hurt.ctl.sprint = true;
  reinIn(hurt);
  stepVehicle(hurt.body, hurt.spec, hurt.ctl, DT, open, true);
  fastest = Math.max(fastest, Math.hypot(hurt.body.vx, hurt.body.vy));
}
check(fastest <= hurt.spec.gaits!.trot + 0.05, `ridden flat out lame, it only trots (${fastest.toFixed(1)} m/s)`);
for (let t = 0; t < 90 * 30; t++) updateSpook(w, hurt, DT);
check(!isLame(hurt), 'given time it heals out of its limp');
removeVehicle(w, hurt);

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

// Breeds differ like cars do: the pony small and nimble, the thoroughbred tall and fastest, the
// mule slow with the longest wind; a rider sits at the height of what they're on.
const spec = (id: string) => VEHICLES[vehicleIndex(id)];
const indian = spec('indian_pony'), tb = spec('thoroughbred'), mule = spec('mule');
check(indian.length < tb.length && indian.height < tb.height && indian.saddles![0].z < tb.saddles![0].z, `a pony is smaller than a thoroughbred, its rider lower (${indian.saddles![0].z.toFixed(2)} m vs ${tb.saddles![0].z.toFixed(2)} m)`);
check(tb.gaits!.gallop > indian.gaits!.gallop && indian.gaits!.turnSlow > tb.gaits!.turnSlow && mule.stamina!.gallop > tb.stamina!.gallop && mule.gaits!.gallop < indian.gaits!.gallop,
  'the thoroughbred gallops fastest, the pony turns tightest, the mule is slowest but goes longest');

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
// The quarter horse is a sprinter: blown within ~5 s more, it canters a few seconds before it can go again.
const blown = run(8, true);
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

// Face to face: walk up to someone and they talk; frightened if you're wanted; an outfit's rider
// gives you its work in person.
const heard: { t: string; via?: string; ped?: number; parts?: [string, string, number][] }[] = [];
pl.send = (m) => { heard.push(m as (typeof heard)[number]); };
const missions = (room as unknown as { missions: Parameters<typeof faceTalk>[1] }).missions;
const said = (ped: number) => {
  pl.talkT = 0; heard.length = 0;
  const err = faceTalk(w, missions, pl, ped);
  const m = heard.find((h) => h.t === 'talk');
  const parts = m?.parts ?? [];
  const them = parts.filter((p) => p[0] !== 'you');
  return { err, via: m?.via, ped: m?.ped, who: them[0]?.[0], s: them.map((p) => p[1]), mine: parts.filter((p) => p[0] === 'you').map((p) => p[1]), all: parts.map((p) => `${p[0]}:${p[1]}`) };
};
const beside = (arch: string, dx = 1.5) => spawnPed(w, pedIndex(arch), tex.body.x + dx, tex.body.y);
const folk = beside('townsfolk');
const hi = said(folk.id);
check(hi.via === 'face' && hi.ped === folk.id && hi.who === 'townsfolk' && hi.s[0] === 'greet' && folk.ai!.task === 'chat', `a stranger stops to talk (${hi.all.join(', ')}; ${folk.ai!.task})`);
check(hi.mine[0] === 'greet', 'you open with a greeting of your own');
const far = beside('townsfolk', 9);
check(!said(far.id).who, 'someone across the street is too far to talk to');
pl.wanted = 2;
const fright = said(beside('homesteader', -1.5).id);
pl.wanted = 0;
check(fright.s[0] === 'scared', `wanted, folk are frightened of you (${fright.s.join(', ')})`);
const rider = beside('dry_creek_rider', 0.5);
const job = said(rider.id);
check(!!pl.mission && job.who === 'dry_creek_hand' && job.s[0] === MISSIONS[pl.mission.spec].kind, `a Dry Creek rider gives you a job in person (${job.all.join(', ')})`);
check(job.mine.join() === 'work,take', 'you ask for work and take the job');
check(said(rider.id).s[0] === 'busy', 'ask again while on it and he says finish it');
pl.mission = null;
pl.respect.lantern = -30;
check(said(beside('lantern_man', -0.5).id).s[0] === 'refuse', 'an outfit you\'ve crossed won\'t deal with you');
for (const p of [folk, far, rider]) p.dead = true;

addHeat(pl, 45);
for (let t = 0; t < 30 * 30; t++) room.tick();
const lawRides = [...w.vehicles.values()].filter((v) => v.spec.roles.includes('police'));
check(lawRides.length > 0 && lawRides.every((v) => onLegs(v.spec)), `deputies ride out (${lawRides.length} on horseback)`);

console.log(failures ? `${failures} check(s) failed` : 'all Redrock checks passed');
process.exit(failures ? 1 : 0);
