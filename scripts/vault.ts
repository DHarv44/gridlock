// Headless check of the bank job: each bank has a vault whose steel door is solid until blown; an
// explosion opens it (for everyone), puts cash piles on the vault floor, raises the alarm and puts
// the robber on at least RULES.vaultWanted stars with a bank robbery on the record; the cash can be
// picked up; the vault shuts and clears after a while, but not with someone inside. Precincts have
// a desk sergeant. `npx tsx scripts/vault.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/vault';
const { Room } = await import('../src/server/room');
const { RULES } = await import('../src/shared/packs');
const { PK } = await import('../src/shared/protocol');
const { explode } = await import('../src/server/game/combat/damage');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const msgs: { t: string; open?: number[]; kind?: string; text?: string }[] = [];
const room = new Room('VALT', RULES.citySeed); // the city every room plays in
room.stop();
const pl = room.join('Robber', { send: (d) => msgs.push(JSON.parse(d)), close: () => {} });
if (typeof pl === 'string') throw new Error(pl);
room.stop();
const w = room.world, city = w.city, statics = w.statics;
const me = w.peds.get(pl.pid)!;
const banks = city.interiors.map((i, k) => ({ i, k })).filter((x) => x.i.vault);
check(banks.length === 3, `every bank has a vault (${banks.length})`);
check(city.interiors.filter((i) => i.layout === 'precinct').every((i) => i.clerkArch === 'cop'), 'precincts: a desk sergeant at the front desk');

const { i, k } = banks[0], v = i.vault!;
const door = { x: (v.door.x0 + v.door.x1) / 2, y: (v.door.y0 + v.door.y1) / 2 };
const mid = { x: (v.room.x0 + v.room.x1) / 2, y: (v.room.y0 + v.room.y1) / 2 };
check(!!statics.raycast(door.x - (mid.x - door.x), door.y - (mid.y - door.y), mid.x, mid.y, 1), 'the vault door is solid while shut');

// Blow it.
pl.heat = 0;
me.body.x = door.x + (door.x - mid.x) * 2; me.body.y = door.y + (door.y - mid.y) * 2;
msgs.length = 0;
explode(w, door.x + (door.x - mid.x) * 0.3, door.y + (door.y - mid.y) * 0.3, 4, 10, me.id);
check(statics.openGates.has(k), 'an explosion at the door blows it open');
check(!statics.raycast(door.x - (mid.x - door.x), door.y - (mid.y - door.y), mid.x, mid.y, 1), 'and you can get through');
check(msgs.some((m) => m.t === 'gates' && m.open?.includes(k)), 'everyone is told the vault is open');
check(msgs.some((m) => m.t === 'msg' && m.text?.includes('Alarm')), 'the alarm goes off');
check(pl.wanted >= RULES.vaultWanted, `the robber is wanted (${pl.wanted} stars)`);
check((pl.felonies.bankRobbery ?? 0) === 1, 'a bank robbery on the record');
const piles = [...w.pickups.values()].filter((p) => p.type === PK.cash && p.x > v.room.x0 && p.x < v.room.x1 && p.y > v.room.y0 && p.y < v.room.y1);
check(piles.length === v.cash.length, `${piles.length} cash piles on the vault floor ($${piles.reduce((a, p) => a + p.value, 0).toLocaleString('en-US')})`);
check(piles.every((p) => p.life >= RULES.vaultReset - 1), 'the cash waits there');

// Pick one up.
const c0 = pl.cash;
me.body.x = piles[0].x; me.body.y = piles[0].y;
me.dead = false; me.hp = me.spec.hp; pl.mode = 0;
for (let t = 0; t < 4; t++) room.tick();
check(pl.cash > c0, `picked up a pile (+$${pl.cash - c0})`);

// Reset: not with someone inside; then it shuts and clears.
w.time += RULES.vaultReset + 1;
room.vaults.update();
check(statics.openGates.has(k), 'stays open while someone is inside');
me.body.x = door.x + (door.x - mid.x) * 6; me.body.y = door.y + (door.y - mid.y) * 6;
room.vaults.update();
check(!statics.openGates.has(k), 'then it shuts');
check(![...w.pickups.values()].some((p) => p.type === PK.cash && p.x > v.room.x0 && p.x < v.room.x1 && p.y > v.room.y0 && p.y < v.room.y1), 'and the leftover cash goes back');

console.log(failures ? `${failures} check(s) failed` : 'all vault checks passed');
process.exit(failures ? 1 : 0);
