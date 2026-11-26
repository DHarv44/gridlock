// Headless checks of the highways (world/waygen.ts, world/ways.ts): Bayhaven gets two, with
// interchanges, one stretch sunk; ramps carry you between street and deck; AI traffic drives on and
// off them. `npx tsx scripts/highways.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/highways';
const { RULES } = await import('../src/shared/packs');
const { generateCity } = await import('../src/shared/world/city');
const { DECK_H, profileZ, wayPoint, RAMP_LEN, SWITCH_S } = await import('../src/shared/world/wayTypes');
const { crossing, surfaceZ } = await import('../src/shared/world/ways');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const city = generateCity(RULES.citySeed);
const ways = city.ways.filter((w) => w.kind === 'highway');
check(ways.length === 2, `two highways (${ways.map((w) => `${w.axis === 'h' ? 'east-west' : 'north-south'} ${w.a0.toFixed(0)}..${w.a1.toFixed(0)}, ${w.ramps.length} ramps`).join('; ')})`);
const sunk = ways.flatMap((w) => w.sunk);
check(sunk.length === 1, `one stretch sunk in a trench (${sunk.map(([a, b]) => `${a.toFixed(0)}..${b.toFixed(0)}`).join(', ')})`);
for (const w of ways) {
  const lows = w.profile.filter(([, z]) => z < 0).length, highs = w.profile.filter(([, z]) => z > DECK_H).length;
  console.log(`     ${w.axis}: profile ${w.profile.map(([a, z]) => `${a.toFixed(0)}:${z}`).join(' ')}  (${lows} low, ${highs} over the other)`);
}
const decks = city.segs.filter((s) => s.level !== undefined), ramps = city.segs.filter((s) => s.path);
check(ramps.length === ways.reduce((n, w) => n + w.ramps.length, 0) && decks.length > 0, `${decks.length} deck segments and ${ramps.length} ramps in the road graph`);

// Up a ramp: on the street below the switch, lifted onto the strip past it; down again.
const w0 = ways[0], r = w0.ramps.find((q) => q.travel === q.up)!;
const at = (s: number) => wayPoint(w0, r.foot + r.up * s, r.lat);
const lo = at(SWITCH_S - 3), hi = at(SWITCH_S + 3);
check(crossing(ways, lo.x, lo.y) === null, 'below the switch on a ramp you stay on the street');
const up = crossing(ways, hi.x, hi.y);
check(!!up && up.x > hi.x + 1000, 'past it you are lifted onto the deck strip');
check(!!up && crossing(ways, up.x, up.y) === null, '...and stay there');
const back = { x: lo.x + w0.strip * 2560, y: lo.y };
check(Math.abs((crossing(ways, back.x, back.y)?.x ?? 0) - lo.x) < 0.01, 'coming back down below it, you are on the street again');
if (process.env.DEBUG) {
  const v = ways[1];
  const ln = city.nodes.filter((n) => n.level === undefined && n.i === v.line).sort((a, b) => a.y - b.y);
  console.log(ln.map((n, k) => (k ? `${(n.y - ln[k - 1].y).toFixed(0)}` : '')).join(' '));
}
const zFoot = surfaceZ(ways, at(1).x, at(1).y), zTop = surfaceZ(ways, at(RAMP_LEN).x + w0.strip * 2560, at(RAMP_LEN).y);
check(zFoot < 0.3 && Math.abs(zTop - DECK_H) < 0.2, `a ramp climbs from the street (${zFoot.toFixed(2)} m) to the deck (${zTop.toFixed(2)} m)`);
check(Math.abs(profileZ(w0, (w0.a0 + w0.a1) / 2) - DECK_H) < 3 * DECK_H, 'the deck stands at its height');

// In a room: AI traffic takes an on-ramp up onto the deck and drives along it.
const { Room } = await import('../src/server/room');
const { seatPed, spawnPed, spawnVehicle } = await import('../src/server/game/factory');
const { setTask } = await import('../src/server/game/ai/tasks');
const { vehicleIndex, pedWith } = await import('../src/shared/packs');
const { floorOf } = await import('../src/shared/world/levels');
const room = new Room('HWAY', RULES.citySeed);
room.stop();
const pl = room.join('Watcher', { send: () => {}, close: () => {} });
if (typeof pl === 'string') throw new Error(pl);
room.stop();
const w = room.world;
const me = w.peds.get(pl.pid)!;
const onr = w0.ramps.find((q) => q.travel === q.up && q.travel === 1)!;
const start = wayPoint(w0, onr.foot - 30, 1.5 * 3.6 * onr.side);
me.body.x = start.x; me.body.y = start.y + 30;
// A driver routed to a point up on the deck (as the police chase you): along the avenue, up the
// on-ramp, onto the deck.
const car = spawnVehicle(w, vehicleIndex('sedan'), start.x, start.y, onr.travel === 1 ? 0 : Math.PI);
const drv = spawnPed(w, pedWith('civilian'), start.x, start.y);
seatPed(w, drv, car, 0);
const goal = wayPoint(w0, onr.foot + onr.up * (RAMP_LEN + 150), 1.5 * 3.6 * onr.side);
const goalX = goal.x + w0.strip * 2560;
setTask(drv, 'respond', 0, goalX, goal.y);
let wentUp = false, maxZ = 0, best = Infinity;
for (let i = 0; i < 30 * 30; i++) {
  me.body.x = car.body.x < 2560 ? car.body.x : car.body.x - w0.strip * 2560; me.body.y = car.body.y + 25;
  room.tick();
  if (floorOf(car.body.x) === w0.strip) wentUp = true;
  maxZ = Math.max(maxZ, surfaceZ(ways, car.body.x, car.body.y));
  best = Math.min(best, Math.hypot(car.body.x - goalX, car.body.y - goal.y));
  if (process.env.DEBUG && i % 60 === 0) { const d = drv.ai!.drive!; console.log(i, car.body.x.toFixed(1), car.body.y.toFixed(1), d.route.slice(0, 4).map((k) => { const q = w.city.nodes[k]; return `${k}${q.level ? 'D' : ''}(${q.x.toFixed(0)},${q.y.toFixed(0)})`; }).join(' '), d.via?.length ?? 0, d.via?.[0] ? `${d.via[0].x.toFixed(0)},${d.via[0].y.toFixed(0)}` : '', (car.body.angle * 57.3).toFixed(0), car.ctl.steer.toFixed(2), car.ctl.throttle.toFixed(2)); }
  if (best < 10) break;
}
console.log(`     routed: at ${car.body.x.toFixed(0)},${car.body.y.toFixed(0)} (${best.toFixed(0)} m from the goal at best), hp ${car.hp}`);
check(wentUp && maxZ > DECK_H - 0.3 && best < 15, `a driver routed onto the highway goes up the on-ramp and along the deck (highest ${maxZ.toFixed(1)} m)`);

// And down again: a driver on the deck routed to a street beyond the next exit takes the off-ramp.
const off = w0.ramps.find((q) => q.travel !== q.up && q.travel === 1 && q.foot > onr.foot + 200)!;
const offNode = w.city.nodes[off.node];
const from = wayPoint(w0, off.foot + off.up * (RAMP_LEN + 120), 1.5 * 3.6 * off.side);
const car2 = spawnVehicle(w, vehicleIndex('sedan'), from.x + w0.strip * 2560, from.y, 0);
const drv2 = spawnPed(w, pedWith('civilian'), car2.body.x, car2.body.y);
seatPed(w, drv2, car2, 0);
const street = { x: offNode.x - 1.8, y: offNode.y + 70 };
setTask(drv2, 'respond', 0, street.x, street.y);
let cameDown = false, best2 = Infinity;
for (let i = 0; i < 30 * 40; i++) {
  me.body.x = car2.body.x < 2560 ? car2.body.x : car2.body.x - w0.strip * 2560; me.body.y = car2.body.y + 25;
  room.tick();
  if (floorOf(car2.body.x) === 0) cameDown = true;
  best2 = Math.min(best2, Math.hypot(car2.body.x - street.x, car2.body.y - street.y));
  if (process.env.DEBUG && i % 60 === 0) console.log('exit', i, car2.body.x.toFixed(1), car2.body.y.toFixed(1), drv2.ai!.drive?.route.slice(0, 3).join(','), drv2.ai!.drive?.via?.length ?? 0, `target ${street.x.toFixed(0)},${street.y.toFixed(0)}`);
  if (best2 < 18) break;
}
check(cameDown && best2 < 20, `a driver on the deck heading for a side street takes the exit down to it (${best2.toFixed(0)} m away at best)`);

// Traffic is spawned up on the decks too, near someone standing under one.
const mid = wayPoint(w0, (w0.a0 + w0.a1) / 2, 0);
me.body.x = mid.x; me.body.y = mid.y + 20;
for (let i = 0; i < 30 * 15; i++) room.tick();
const onDeck = [...w.vehicles.values()].filter((v) => floorOf(v.body.x) >= w0.strip && v.seats[0]).length;
check(onDeck > 0, `traffic up on the highways (${onDeck} cars on decks)`);

console.log(failures ? `${failures} failed` : 'all ok');
process.exit(failures ? 1 : 0);
