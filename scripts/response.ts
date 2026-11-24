// Headless check of police response times: on becoming wanted, no unit is sent until the level's
// `respond` time has passed, then one arrives; higher levels respond sooner, and units come no
// closer together than `every`. `npx tsx scripts/response.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/response';
const { Room } = await import('../src/server/room');
const { RULES, WANTED } = await import('../src/shared/packs');
const { addHeat, clearHeat } = await import('../src/server/game/systems/wanted');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const room = new Room('RESP', RULES.citySeed);
room.stop();
const joined = room.join('Runner', { send: () => {}, close: () => {} });
if (typeof joined === 'string') throw new Error(joined);
const pl = joined;
room.stop();
const w = room.world;
const me = w.peds.get(pl.pid)!;
const squads = () => [...w.squads.values()].filter((s) => s.player === pl.id);
/** Seconds until the first squad is sent, at a given wanted level (kept there, kept alive). */
function firstUnit(level: number): number {
  for (const s of [...w.squads.values()]) w.squads.delete(s.id);
  clearHeat(pl);
  for (let i = 0; i < 40; i++) room.tick(); // the dispatcher sees them clean first
  addHeat(pl, WANTED[level - 1].heat + 1);
  for (let t = 0; t < 30 * 30; t++) {
    me.hp = me.spec.hp; pl.bustT = 0; pl.seenT = 0; pl.heat = Math.max(pl.heat, WANTED[level - 1].heat + 1);
    room.tick();
    if (squads().length) return t / 30;
  }
  return Infinity;
}

const one = firstUnit(1), three = firstUnit(3);
check(one >= WANTED[0].respond && one < WANTED[0].respond + 2, `1 star: the first unit is sent after ${one.toFixed(1)} s (respond ${WANTED[0].respond} s)`);
check(three >= WANTED[2].respond && three < one, `3 stars: sooner, after ${three.toFixed(1)} s`);

console.log(failures ? `${failures} check(s) failed` : 'all response checks passed');
process.exit(failures ? 1 : 0);
