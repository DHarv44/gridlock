// Headless checks of street furniture (shared/world/breakables.ts, server systems/breakables.ts):
// a car at speed knocks a lamp post flat, slows a little and takes a dent; creeping into one, it's
// stopped like a wall; players are told what's down; a prop stands again a while later with nobody
// near. `npx tsx scripts/props.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/props';
const { Room } = await import('../src/server/room');
const { RULES, STREET_PROPS, vehicleIndex } = await import('../src/shared/packs');
const { seatPed, spawnVehicle, unseatPed } = await import('../src/server/game/factory');

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
const k = msgs.length;
// Held at 18 m/s up to the post (as if driven), then left to roll on.
for (let i = 0; i < 40; i++) { if (car.body.x < lamp.x) { car.body.vx = 18; car.body.vy = 0; } room.tick(); if (car.body.x > lamp.x + 4) break; }
const told = msgs.slice(k).filter((m) => m.t === 'props').at(-1);
check(!!told?.down?.some(([i]) => i === li), 'at speed the car knocks the lamp post down, and everyone is told');
check(car.body.x > lamp.x && car.hp < hp0, `it carries on past, with a dent (${(hp0 - car.hp).toFixed(0)} damage, whatever else it hit on the way)`);

// Creeping into another one: stopped, the post still up.
const lj = f.props.list.findIndex((p, i) => i !== li && p.kind === lampKind && p.oy !== 0 && mid(p) && Math.abs(p.x - lamp.x) > 100);
const lamp2 = f.props.list[lj];
me.body.x = lamp2.x; me.body.y = lamp2.y + 25;
const slow = spawnVehicle(w, vehicleIndex('sedan'), lamp2.x - 4, lamp2.y, 0);
seatPed(w, me, slow, 0); // a player's car (traffic only knocks things over, it isn't held up)
for (let i = 0; i < 60; i++) { slow.body.vx = 1.5; slow.body.vy = 0; slow.body.angle = 0; room.tick(); }
const front = slow.body.x + slow.spec.length / 2;
unseatPed(w, me, true);
check(front < lamp2.x && !msgs.slice(k).filter((m) => m.t === 'props').at(-1)?.down?.some(([i]) => i === lj), `creeping into one, it's stopped against it (front ${(lamp2.x - front).toFixed(2)} m short), still standing`);

// Traffic lights: a heavier knock (a slower car is stopped by one), a bigger dent.
const sigKind = STREET_PROPS.findIndex((s) => s.id === 'signal');
check((kinds.get('signal') ?? 0) > 100, `traffic lights at the lit junctions (${kinds.get('signal')})`);
const sig = (ix: number) => f.props.list[ix];
const sx = f.props.list.findIndex((p, i) => p.kind === sigKind && mid(p) && p.ox !== 0 && i !== li);
const s0 = sig(sx);
me.body.x = s0.x; me.body.y = s0.y + 25;
const along = -s0.ox; // drive at it from the far side of the arm (out of the road it hangs over)
const crawl = spawnVehicle(w, vehicleIndex('sedan'), s0.x - along * 5, s0.y, along > 0 ? 0 : Math.PI);
seatPed(w, me, crawl, 0);
for (let i = 0; i < 45; i++) { crawl.body.vx = along * 4.5; crawl.body.vy = 0; room.tick(); }
const short = (s0.x - crawl.body.x) * along - crawl.spec.length / 2;
unseatPed(w, me, true);
check(!msgs.filter((m) => m.t === 'props').at(-1)?.down?.some(([i]) => i === sx) && short > 0, `a traffic light stops a car at 4.5 m/s (${short.toFixed(2)} m short)`);
const ram = spawnVehicle(w, vehicleIndex('sedan'), s0.x - along * 10, s0.y + 3, along > 0 ? 0 : Math.PI);
crawl.body.x -= along * 40;
const hpR = ram.hp;
ram.body.y = s0.y;
for (let i = 0; i < 30; i++) { if (i < 3) ram.body.vx = along * 16; room.tick(); }
check(!!msgs.filter((m) => m.t === 'props').at(-1)?.down?.some(([i]) => i === sx) && ram.hp < hpR, `at 16 m/s it goes down (and the car takes ${(hpR - ram.hp).toFixed(0)})`);

// Payphones are solid: a car runs into one and stops; it never goes over.
const { gangSpots } = await import('../src/shared/world/gangSpots');
const booth = gangSpots(w.city).booths.find((b) => b.x > 300 && b.x < 1700 && b.y > 300 && b.y < 1700)!;
me.body.x = booth.x; me.body.y = booth.y + 25;
const bc = Math.round(Math.cos(booth.angle)), bs = Math.round(Math.sin(booth.angle));
const into = spawnVehicle(w, vehicleIndex('sedan'), booth.x + bs * 6, booth.y - bc * 6, Math.atan2(bc, -bs));
for (let i = 0; i < 40; i++) { into.body.vx = -bs * 8; into.body.vy = bc * 8; room.tick(); }
const past = (into.body.x - booth.x) * -bs + (into.body.y - booth.y) * bc;
check(past < 0, `a car driven at a payphone stops against it (${past.toFixed(2)} m short of its middle)`);

// Later, with nobody near, the knocked one stands again.
me.body.x = lamp.x + 400;
w.time += 200;
for (let i = 0; i < 30 * 6; i++) room.tick();
const last = msgs.filter((m) => m.t === 'props').at(-1);
check(!last?.down?.some(([i]) => i === li), 'a while later, with nobody near, it stands again');

console.log(failures ? `${failures} check(s) failed` : 'all street prop checks passed');
process.exit(failures ? 1 : 0);
