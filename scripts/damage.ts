// Headless check of per-side vehicle damage: shots, blasts, car-on-car hits and wall crashes dent the
// side that took them, levels rise with the damage, and the snapshot carries them.
// `npx tsx scripts/damage.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/damage';
const { Room } = await import('../src/server/room');
const { RULES, vehicleIndex, weaponIndex } = await import('../src/shared/packs');
const { spawnVehicle } = await import('../src/server/game/factory');
const { damageVehicle, damageLevels, explode, sideFacing, wallCrash } = await import('../src/server/game/combat/damage');
const { buildSnapshot } = await import('../src/server/game/systems/snapshot');
const { EK } = await import('../src/shared/protocol');
type Vehicle = import('../src/server/game/entities').Vehicle;

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const room = new Room('DENT', RULES.citySeed);
room.stop();
const pl = room.join('Watcher', { send: () => {}, close: () => {} });
if (typeof pl === 'string') throw new Error(pl);
room.stop();
const w = room.world;
const me = w.peds.get(pl.pid)!;
void weaponIndex;

const car = (angle = 0): Vehicle => spawnVehicle(w, vehicleIndex('sedan'), me.body.x + 10, me.body.y, angle);

// Which side faces a point, for a car pointing east and one pointing north.
const a = car(0);
check(sideFacing(a, a.body.x + 20, a.body.y) === 0 && sideFacing(a, a.body.x - 20, a.body.y) === 1, 'east-facing: ahead is the front, behind the rear');
check(sideFacing(a, a.body.x, a.body.y - 20) === 2 && sideFacing(a, a.body.x, a.body.y + 20) === 3, 'east-facing: -y is its left, +y its right');
const n = car(-Math.PI / 2);
check(sideFacing(n, n.body.x, n.body.y - 20) === 0 && sideFacing(n, n.body.x - 20, n.body.y) === 2, 'north-facing: north is the front, west its left');

// Shots from in front dent the front only, rising through the levels.
const b = car(0);
const levels: number[] = [];
for (let i = 0; i < 8; i++) { damageVehicle(w, b, b.spec.hp * 0.05, me.id, { x: b.body.x + 15, y: b.body.y }); levels.push(damageLevels(b)[0]); }
check(levels[0] === 0 && levels.includes(1) && levels.includes(2) && levels[levels.length - 1] === 3, `front levels rise with damage (${levels.join(' ')})`);
check(damageLevels(b).slice(1).every((l) => l === 0), 'the other sides stay clean');

// A blast off its right side.
const c = car(0);
room.tick(); // enters it in the spatial index the blast searches
c.dents = [0, 0, 0, 0];
explode(w, c.body.x, c.body.y + 4, 7, 60, 0);
const cl = damageLevels(c);
check(cl[3] >= 2 && cl[3] > cl[2], `a blast on the right dents the right side (${cl.join(' ')})`);

// Driving into a wall: the side it was heading with.
const d = car(0);
wallCrash(w, d, 18, 0, 20);
const dl = damageLevels(d);
check(dl[3] >= 1 && dl[0] === 0, `crashing while moving +y (sideways) dents the right side (${dl.join(' ')})`);
const e = car(0);
wallCrash(w, e, 5, 5, 0);
check(e.dents.every((x) => x === 0), 'a gentle bump does nothing');

// Fire spreads it round.
const f = car(0);
damageVehicle(w, f, f.spec.hp * 0.4, 0);
check(new Set(damageLevels(f)).size === 1 && damageLevels(f)[0] >= 1, `fire damage is spread round (${damageLevels(f).join(' ')})`);

// The snapshot carries the levels after the overall state.
pl.sent = new Map();
const snap = buildSnapshot(w, pl);
if (snap.t !== 's') throw new Error('no snapshot');
const row = snap.e.find((r) => r[0] === b.id && r[1] === EK.Veh);
const packed = row ? row[10] : -1;
check(packed >= 0 && ((packed >> 2) & 3) === 3 && ((packed >> 4) & 3) === 0, `the snapshot sends the front at 3 (packed ${packed})`);

console.log(failures ? `${failures} check(s) failed` : 'all damage checks passed');
process.exit(failures ? 1 : 0);
