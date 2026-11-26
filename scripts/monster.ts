// Headless check of the monster truck: it's in the packs, sold at the dealer, and it flattens a sedan
// it drives into while taking little itself. `npx tsx scripts/monster.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/monster';
const { Room } = await import('../src/server/room');
const { RULES, VEHICLES, vehicleIndex } = await import('../src/shared/packs');
const { spawnVehicle } = await import('../src/server/game/factory');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const mi = vehicleIndex('monster');
const spec = VEHICLES[mi];
check(mi >= 0 && !!spec.crushes && spec.price > 0, `the Earthshaker is a vehicle that crushes and is for sale ($${spec.price})`);

const room = new Room('MNST', RULES.citySeed);
room.stop();
const pl = room.join('Driver', { send: () => {}, close: () => {} });
if (typeof pl === 'string') throw new Error(pl);
room.stop();
const w = room.world;
const me = w.peds.get(pl.pid)!;
// A clear stretch of road in town (vehicles are only simulated near a player).
const seg = w.city.segs.find((s) => s.axis === 'h' && s.x1 - s.x0 > 90 && s.x0 > 600 && s.x1 < 1400 && s.y0 > 600 && s.y0 < 1100)!;
const y = seg.y0 + 1.8;
me.body.x = seg.x0 + 40; me.body.y = y + 20;
const sedan = spawnVehicle(w, vehicleIndex('sedan'), seg.x0 + 55, y, Math.PI / 2);
const truck = spawnVehicle(w, mi, seg.x0 + 30, y, 0);
const s0 = sedan.hp, t0 = truck.hp;
for (let i = 0; i < 90; i++) { if (truck.body.x < sedan.body.x) { truck.body.vx = 16; truck.body.vy = 0; truck.body.angle = 0; } room.tick(); }
const sDmg = s0 - sedan.hp, tDmg = t0 - truck.hp;check(sDmg > tDmg * 4, `into a sedan at 16 m/s: the sedan takes ${sDmg.toFixed(0)}, the truck ${tDmg.toFixed(0)}`);
check(sedan.hp / sedan.spec.hp < truck.hp / truck.spec.hp, `the truck is in better shape after (${(truck.hp / truck.spec.hp * 100).toFixed(0)}% vs ${(Math.max(0, sedan.hp) / sedan.spec.hp * 100).toFixed(0)}%)`);

console.log(failures ? `${failures} failed` : 'all ok');
process.exit(failures ? 1 : 0);
