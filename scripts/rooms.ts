// Headless check that games persist on the server with nobody hosting: a room is saved as it's
// played; after everyone leaves and the server lets it go (or restarts), any member can open it
// again by its code, alone, and finds it as it was (property, the clock). Saves from an older
// version or another universe are left alone. `npx tsx scripts/rooms.ts`
export {};
import { rmSync } from 'node:fs';
process.env.GRIDLOCK_DATA = 'data-smoke/rooms';
rmSync('data-smoke/rooms', { recursive: true, force: true });
const { Lobby } = await import('../src/server/lobby');
const { loadRoom, saveRoom, SAVE_VERSION } = await import('../src/server/persist');
const { PROTOCOL_VERSION } = await import('../src/shared/protocol');
const { RULES, UNIVERSE } = await import('../src/shared/packs');
const UNIVERSE_ID = UNIVERSE.id;

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

/** A stand-in browser socket: what the server sends, and a way to say hello and hang up. */
function socket() {
  const handlers: Record<string, (d?: unknown) => void> = {};
  const got: { t: string; [k: string]: unknown }[] = [];
  const ws = { OPEN: 1, readyState: 1, bufferedAmount: 0, send: (d: string) => got.push(JSON.parse(d)), close: () => handlers.close?.(), on: (e: string, f: (d?: unknown) => void) => { handlers[e] = f; } };
  return { ws, got, say: (m: unknown) => handlers.message?.(JSON.stringify(m)), hangUp: () => handlers.close?.() };
}
const character = (id: string, name: string) => ({ id, universe: UNIVERSE_ID, name, look: {}, created: 1, lastPlayed: 1, cash: 50_000, bank: 0, garage: [], felonies: {}, deaths: 0, respect: {} });

const lobby = new Lobby();
const rooms = (lobby as unknown as { rooms: Map<string, { econ: { owners: Map<number, string> }; world: { gameMinutes: number }; persist(): void; stop(): void; emptySince: number }> }).rooms;

// Ana creates a game; Bo joins it; Ana owns a property; both leave.
const ana = socket();
lobby.attach(ana.ws as never);
ana.say({ t: 'hello', v: PROTOCOL_VERSION, name: 'Ana', room: '', create: true, char: character('ana1', 'Ana') });
const code = [...rooms.keys()][0];
check(!!code && !ana.got.some((m) => m.t === 'reject'), `Ana creates game ${code}`);
const bo = socket();
lobby.attach(bo.ws as never);
bo.say({ t: 'hello', v: PROTOCOL_VERSION, name: 'Bo', room: code, create: false, char: character('bo1', 'Bo') });
check(!bo.got.some((m) => m.t === 'reject'), 'Bo joins it by its code');
const room = rooms.get(code)!;
room.econ.owners.set(3, 'ana');
room.world.gameMinutes = 777;
ana.hangUp(); bo.hangUp();
room.stop();
check(loadRoom(code)?.owners.some(([id, who]) => id === 3 && who === 'ana') === true, 'leaving saves the room: who owns what');

// The server lets the empty room go (as it does after ten idle minutes, or a restart).
room.emptySince = 0;
(lobby as unknown as { reap(): void }).reap();
check(!rooms.has(code), 'the empty room is unloaded from the server');

// Next day Bo comes back alone, Ana offline: the room opens again from its save.
const bo2 = socket();
lobby.attach(bo2.ws as never);
bo2.say({ t: 'hello', v: PROTOCOL_VERSION, name: 'Bo', room: code, create: false, resume: true, char: character('bo1', 'Bo') });
const again = rooms.get(code);
check(!!again && !bo2.got.some((m) => m.t === 'reject'), 'Bo reopens it alone; nobody hosts it');
check(again?.econ.owners.get(3) === 'ana' && Math.floor(again.world.gameMinutes) === 777, "and finds it as it was: Ana's property, the clock");
bo2.hangUp(); again?.stop();
// Joining by its code (not Continue) opens it too.
const bo3 = socket();
lobby.attach(bo3.ws as never);
rooms.delete(code);
bo3.say({ t: 'hello', v: PROTOCOL_VERSION, name: 'Bo', room: code, create: false, char: character('bo1', 'Bo') });
check(rooms.has(code) && !bo3.got.some((m) => m.t === 'reject'), 'joining by its code opens a saved room too');
bo3.hangUp(); rooms.get(code)?.stop();
// A code that was never played is still refused.
const eve = socket();
lobby.attach(eve.ws as never);
eve.say({ t: 'hello', v: PROTOCOL_VERSION, name: 'Eve', room: 'ZZZZ', create: false, char: character('eve1', 'Eve') });
check(eve.got.some((m) => m.t === 'reject'), 'an unknown code is refused');

// Saves from an older version or another universe aren't loaded.
const base = loadRoom(code)!;
saveRoom('OLDV', { ...base, version: 1 as never });
saveRoom('WEST', { ...base, universe: 'dustwater' });
check(loadRoom('OLDV') === null && loadRoom('WEST') === null && base.version === SAVE_VERSION, 'older-version and other-universe saves are left alone');
// Another universe's character isn't let in.
const tex = socket();
lobby.attach(tex.ws as never);
tex.say({ t: 'hello', v: PROTOCOL_VERSION, name: 'Tex', room: code, create: false, char: { ...character('tex1', 'Tex'), universe: 'dustwater' } });
check(tex.got.some((m) => m.t === 'reject'), "a character from another universe can't join");
void RULES;

console.log(failures ? `${failures} check(s) failed` : 'all room persistence checks passed');
process.exit(failures ? 1 : 0);
