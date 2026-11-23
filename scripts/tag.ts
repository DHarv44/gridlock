// Headless check of tag: nobody's it alone (the clock waits); with two or more someone is; "it" piles
// up time; a kill by "it" passes it on, a kill of "it" doesn't; "it" leaving picks someone new; the
// round ends on time and the least time it wins. `npx tsx scripts/tag.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/tag';
const { Room } = await import('../src/server/room');
const { MODES } = await import('../src/shared/packs');
const { killPed } = await import('../src/server/game/combat/damage');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const msgs: { t: string; it?: number; winner?: string; standings?: [string, number][] }[] = [];
const room = new Room('TAGG', 505, 'tag');
room.stop();
const conn = () => ({ send: (d: string) => msgs.push(JSON.parse(d)), close: () => {} });
const join = (name: string) => { const pl = room.join(name, conn()); if (typeof pl === 'string') throw new Error(pl); room.stop(); return pl; };
const w = room.world, r = room.rounds;
const secs = (s: number) => { for (let i = 0; i < Math.round(s * 30); i++) room.tick(); };

const a = join('Alpha');
secs(2);
check(r.it === 0, 'alone: nobody is it');
const b = join('Bravo');
secs(1);
check(r.it === a.id || r.it === b.id, 'two players: someone is it');
check(msgs.some((m) => m.t === 'mode' && m.it === r.it), 'everyone is told who');
const it = r.it === a.id ? a : b, other = it === a ? b : a;
const t0 = it.itTime;
secs(3);
check(it.itTime - t0 > 2.5 && other.itTime === 0, '"it" piles up time; the other doesn\'t');

// Killing "it" doesn't pass it on.
killPed(w, w.peds.get(it.pid)!, w.peds.get(other.pid)!);
check(r.it === it.id, 'killing "it" only slows them down');
secs(12); // respawn
// "It" kills the other: they're it now.
killPed(w, w.peds.get(other.pid)!, w.peds.get(it.pid)!);
check(r.it === other.id, 'a kill by "it" passes it on');

// "It" leaves: someone else is.
const c = join('Charlie');
room.leave(other);
secs(1);
check(r.it === it.id || r.it === c.id, '"it" left: a new it');

// The round ends on time; least time wins.
const mode = MODES.find((m) => m.id === 'tag')!;
it.itTime = 100; c.itTime = 30;
(r as unknown as { ends: number }).ends = w.time + 0.5;
msgs.length = 0;
secs(1);
const round = msgs.find((m) => m.t === 'round');
check(!!round && round.winner === 'Charlie', `round over: least time it wins (${round?.winner})`);
check(!!round && round.standings![0][0] === 'Charlie' && it.itTime < 2 && c.itTime < 2, 'standings least first; times reset');
check(mode.target === 600, 'a round is 10 minutes');

console.log(failures ? `${failures} check(s) failed` : 'all tag checks passed');
process.exit(failures ? 1 : 0);
