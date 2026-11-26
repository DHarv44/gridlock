// Headless checks of calls and company: a gang's boss introduces themselves once then briefs, the
// job's end gets a call; Benny rings a newcomer; waypoints are shared with whoever rides with you;
// a job's pay is split with the players in on it; bailing out of a moving car hurts or kills.
// `npx tsx scripts/coop.ts`
export {};
process.env.GRIDLOCK_DATA = 'data-smoke/coop';
const { Room } = await import('../src/server/room');
const { RULES, MISSIONS, vehicleIndex } = await import('../src/shared/packs');
const { BTN, Mode } = await import('../src/shared/protocol');
const { spawnVehicle, seatPed } = await import('../src/server/game/factory');
const { playerList } = await import('../src/server/game/systems/snapshot');
const { progressOf } = await import('../src/server/characters');
type Msg = { t: string; [k: string]: unknown };

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const room = new Room('COOP', RULES.citySeed);
room.stop();
const inbox = new Map<string, Msg[]>();
const join = (name: string) => {
  const box: Msg[] = [];
  inbox.set(name, box);
  const p = room.join(name, { send: (s: string) => box.push(JSON.parse(s)), close: () => {} });
  if (typeof p === 'string') throw new Error(p);
  return p;
};
const a = join('Ana'), b = join('Bo');
room.stop();
const w = room.world;
const pa = w.peds.get(a.pid)!, pb = w.peds.get(b.pid)!;
/** Calls played to a player: `parts` the callers' (your own lines left out), `all` everything said. */
const talks = (name: string) => (inbox.get(name)!.filter((m) => m.t === 'talk') as unknown as { via: string; parts: [string, string, number][] }[])
  .map((m) => ({ ...m, all: m.parts, parts: m.parts.filter(([who]) => who !== 'you') }));
let seq = 1;
const tick = (n = 1, btnA = 0) => { for (let i = 0; i < n; i++) { a.queue.push([seq++, 0, 0, 0, 0, 0, btnA, -1]); pa.hp = Math.max(pa.hp, 1); room.tick(); } };

// 1. Benny rings a newcomer, and answering plays his welcome.
tick(30 * 17);
check(inbox.get('Ana')!.some((m) => m.t === 'call' && m.gang === 'benny' && m.state === 'ring'), "Benny rings a newcomer's cell");
room.cell.answer(a, true);
const welcome = talks('Ana').at(-1);
check(!!welcome && welcome.via === 'cell' && welcome.parts[0][0] === 'benny' && welcome.parts[0][1] === 'intro', 'answering plays his welcome down a cell line');
check(a.met.has('benny') && (progressOf(a).met ?? []).includes('benny'), "and he's remembered as met (saved with the character)");

// 2. A gang's first job: the boss introduces themselves, then briefs; the second job skips the intro.
const booth = room.missions.booths.find((x) => x.gang === 'v22')!;
const answerBooth = () => { a.boothCd.clear(); pa.body.x = booth.x; pa.body.y = booth.y; tick(1); return room.missions.answer(a, booth.id); };
check(answerBooth() === null, 'payphone answered');
const first = talks('Ana').at(-1)!;
const kind = MISSIONS[a.mission!.spec].kind;
check(first.via === 'payphone' && first.parts[0][0] === 'nico' && first.parts[0][1] === 'intro' && first.parts[1]?.[1] === kind, `first call: Nico's intro then the ${kind} brief, on a payphone line`);
check(first.all[0][0] === 'you' && first.all[0][1] === 'payphone', 'you pick up the payphone first');
room.missions.drop(a);
answerBooth();
const second = talks('Ana').at(-1)!;
check(second.parts.length === 1 && second.parts[0][1] === MISSIONS[a.mission!.spec].kind && ['nico', 'lupe'].includes(second.parts[0][0]), `the next job is just a brief (from ${second.parts[0][0]})`);

// 3. Shared waypoints: the player list says who's in which vehicle and where their waypoint is.
const car = spawnVehicle(w, vehicleIndex('sedan'), pa.body.x + 5, pa.body.y, 0);
seatPed(w, pa, car, 0); a.mode = Mode.Driver;
seatPed(w, pb, car, 1); b.mode = Mode.Passenger;
room.onMessage(b, { t: 'waypoint', at: [500, 600] } as never);
const list = playerList(w);
const ib = list.find((p) => p.id === b.id)!, ia = list.find((p) => p.id === a.id)!;
check(ia.vid === car.id && ib.vid === car.id && ib.wp?.[0] === 500 && ib.wp?.[1] === 600, "riders' vehicle and Bo's waypoint go out in the player list");
room.onMessage(b, { t: 'waypoint', at: null } as never);
check(!playerList(w).find((p) => p.id === b.id)!.wp, 'clearing it clears it');
// The car's radio is shared: the passenger retunes it and the driver hears the change.
const radioTo = (name: string) => inbox.get(name)!.filter((m) => m.t === 'radio') as unknown as { vid: number; station: number }[];
room.onMessage(b, { t: 'radio', station: 2 } as never);
check(car.radio === 2 && radioTo('Ana').at(-1)?.station === 2 && radioTo('Ana').at(-1)?.vid === car.id, 'a passenger retunes the radio and the driver hears it');
room.onMessage(a, { t: 'radio', station: -1 } as never);
check(car.radio === -1 && radioTo('Bo').at(-1)?.station === -1, 'the driver turns it off and the passenger hears that');

// 4. The job passes with Bo in the car: the pay is split.
const st = a.mission!;
const cashA = a.cash, cashB = b.cash;
(room.missions as unknown as { end(pl: unknown, passed: boolean): void }).end(a, true);
const half = Math.floor(st.reward / 2);
check(a.cash - cashA === half && b.cash - cashB === half, `the $${st.reward} pay is split: Ana +$${a.cash - cashA}, Bo +$${b.cash - cashB}`);
check(talks('Ana').at(-1)!.parts[0][1] === 'pass', 'and the gang rings to say well done');

// 5. Bailing out: a crawl is fine, faster floors and hurts you, at speed it kills.
const bail = (speed: number) => {
  if (!pa.vehicle) seatPed(w, pa, car, 0);
  pa.hp = pa.spec.hp; pa.dead = false; pa.down = 0; a.mode = Mode.Driver;
  car.body.vx = speed; car.body.vy = 0;
  a.queue.push([seq++, 0, 0, 0, 0, 0, BTN.enter, -1]);
  room.tick();
  return { out: !pa.vehicle, down: pa.down > 0, hurt: pa.spec.hp - pa.hp, dead: pa.dead };
};
const slow = bail(3), town = bail(RULES.bailFall - 0.5), mid = bail(15), fast = bail(RULES.bailDie + 2);
check(slow.out && !slow.down && slow.hurt === 0, 'at 3 m/s you just step out');
check(town.out && !town.down && town.hurt === 0, `at ${RULES.bailFall - 0.5} m/s (town speed) you still land on your feet`);
check(mid.out && mid.down && mid.hurt > 0 && !mid.dead, `at 15 m/s you're thrown down and hurt (-${Math.round(mid.hurt)} hp)`);
check(fast.out && fast.dead, `at ${RULES.bailDie + 2} m/s it kills you`);

console.log(failures ? `${failures} check(s) failed` : 'all coop checks passed');
process.exit(failures ? 1 : 0);
