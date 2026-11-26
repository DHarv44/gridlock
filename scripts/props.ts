// Headless checks of street furniture (shared/world/breakables.ts, server systems/breakables.ts):
// a car at speed knocks a lamp post flat, slows a little and takes a dent; creeping into one, it's
// stopped like a wall; players are told what's down; a prop stands again a while later with nobody
// near. `npx tsx scripts/props.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/props';
const { Room } = await import('../src/server/room');
const { RULES, STREET_PROPS, vehicleIndex } = await import('../src/shared/packs');
const { spawnVehicle } = await import('../src/server/game/factory');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const room = new Room('PROP', RULES.citySeed);
room.stop();
const msgs: { t: string; down?: [number, number][] }[] = [];
const pl = room.join('Driver', { send: (d) => msgs.push(JSON.parse(d)), close: () => {} });
if (typeof pl === 'string') throw new Error(pl);
room.stop();
const w = room.world;
const f = room.furniture;
const kinds = new Map<string, number>();
for (const p of f.props.list) kinds.set(STREET_PROPS[p.kind].id, (kinds.get(STREET_PROPS[p.kind].id) ?? 0) + 1);
check((kinds.get('lamp') ?? 0) > 200 && (kinds.get('hydrant') ?? 0) > 50, `the city has its street furniture (${[...kinds].map(([k, n]) => `${n} ${k}`).join(', ')})`);
check(msgs.some((m) => m.t === 'props'), 'joining, you are told what is down');

// A lamp post on a horizontal road, and a car driving along the kerb at it.
const lampKind = STREET_PROPS.findIndex((s) => s.id === 'lamp');
// (in the middle of town: vehicles are only simulated near a player, so the player stands by)
const mid = (p: { x: number; y: number }) => p.x > 600 && p.x < 1400 && p.y > 600 && p.y < 1100;
const li = f.props.list.findIndex((p) => p.kind === lampKind && p.oy !== 0 && mid(p));
const lamp = f.props.list[li];
const me = w.peds.get(pl.pid)!;
me.body.x = lamp.x; me.body.y = lamp.y + 25;
const car = spawnVehicle(w, vehicleIndex('sedan'), lamp.x - 12, lamp.y, 0);
const hp0 = car.hp;
car.body.vx = 18;
const k = msgs.length;
for (let i = 0; i < 30; i++) { car.body.vx = Math.max(car.body.vx, 0); room.tick(); if (car.body.x > lamp.x + 4) break; }
const told = msgs.slice(k).filter((m) => m.t === 'props').at(-1);
check(!!told?.down?.some(([i]) => i === li), 'at speed the car knocks the lamp post down, and everyone is told');
check(car.body.x > lamp.x && car.hp < hp0 && hp0 - car.hp <= STREET_PROPS[lampKind].carDamage + 1, `it carries on past, with a dent (${(hp0 - car.hp).toFixed(0)} damage)`);

// Creeping into another one: stopped, the post still up.
const lj = f.props.list.findIndex((p, i) => i !== li && p.kind === lampKind && p.oy !== 0 && mid(p) && Math.abs(p.x - lamp.x) > 100);
const lamp2 = f.props.list[lj];
me.body.x = lamp2.x; me.body.y = lamp2.y + 25;
const slow = spawnVehicle(w, vehicleIndex('sedan'), lamp2.x - 4, lamp2.y, 0);
for (let i = 0; i < 60; i++) { slow.body.vx = 1.5; slow.body.vy = 0; slow.body.angle = 0; room.tick(); }
const front = slow.body.x + slow.spec.length / 2;
check(front < lamp2.x && !msgs.slice(k).filter((m) => m.t === 'props').at(-1)?.down?.some(([i]) => i === lj), `creeping into one, it's stopped against it (front ${(lamp2.x - front).toFixed(2)} m short), still standing`);

// Later, with nobody near, the knocked one stands again.
me.body.x = lamp.x + 400;
w.time += 200;
for (let i = 0; i < 30 * 6; i++) room.tick();
const last = msgs.filter((m) => m.t === 'props').at(-1);
check(!last?.down?.some(([i]) => i === li), 'a while later, with nobody near, it stands again');

console.log(failures ? `${failures} check(s) failed` : 'all street prop checks passed');
process.exit(failures ? 1 : 0);
