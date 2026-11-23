// Headless check of characters: they come from the player's browser, the server cleans them up,
// plays them, records felonies, and sends progress back in `save` messages.
// `npx tsx scripts/characters.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/characters';
const { sanitizeCharacter } = await import('../src/server/characters');
const { Room } = await import('../src/server/room');
const { crime } = await import('../src/server/game/systems/wanted');
const { VEHICLES } = await import('../src/shared/packs');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

// What a browser might send, including junk the server must not trust.
const sent = {
  id: 'abc123', name: 'Rook', look: { top: 2, hat: 99 }, created: 1, lastPlayed: 1,
  cash: 4200.7, garage: [3, 9999, -1, 'x'], felonies: { murder: 2, notACrime: 5 }, deaths: 1, respect: { v22: 250, nope: 3 },
};
const c = sanitizeCharacter(sent)!;
check(!!c, 'a character from the browser is accepted');
check(c.cash === 4201 && c.garage.length === 1 && c.garage[0] === 3, 'cash rounded, unknown cars dropped');
check(c.felonies.murder === 2 && !('notACrime' in c.felonies), 'only real crimes kept');
check(c.respect.v22 === 100 && !('nope' in c.respect), 'respect clamped, unknown gangs dropped');
check(c.look.hat === 0 && c.look.top === 2, 'look indices kept in range');
check(sanitizeCharacter({ id: 'x', name: '' }) === null && sanitizeCharacter('junk') === null, 'nonsense is refused');
void VEHICLES;

// Play it: progress comes back to the browser.
const msgs: { t: string; id?: string; p?: { cash: number; garage: number[]; felonies: Record<string, number> } }[] = [];
const room = new Room('CHRA', 101);
room.stop();
const pl = room.join('ignored', { send: (d) => msgs.push(JSON.parse(d)), close: () => {} }, c);
if (typeof pl === 'string') throw new Error(pl);
room.stop();
check(pl.name === 'Rook' && pl.cash === 4201 && pl.look?.top === 2, 'joins as the character with its money and look');
pl.cash = 7777; pl.garage.push(5);
const me = room.world.peds.get(pl.pid)!;
crime(room.world, me, 'vehicleTheft', 0, 0);
crime(room.world, me, 'trespass', 0, 0);
crime(room.world, me, 'trespass', 0, 0);
crime(room.world, me, 'gunfire', 0, 0);
for (let i = 0; i < 30 * 5; i++) room.tick();
const save = [...msgs].reverse().find((m) => m.t === 'save');
check(!!save && save.id === 'abc123', 'the server sends saves for the character');
check(!!save && save.p!.cash === 7777 && save.p!.garage.includes(5), 'saves carry the latest cash and cars');
check(!!save && save.p!.felonies.vehicleTheft === 1 && save.p!.felonies.trespass === 1 && !save.p!.felonies.gunfire, 'felonies by type (cooldowns hold, gunfire is not one)');
const before = msgs.filter((m) => m.t === 'save').length;
room.leave(pl);
check(msgs.filter((m) => m.t === 'save').length > before, 'a final save goes out on leaving');

console.log(failures ? `${failures} check(s) failed` : 'all character checks passed');
process.exit(failures ? 1 : 0);
