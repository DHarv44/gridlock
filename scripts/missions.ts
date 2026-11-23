// Headless check of the mission loop: answer every gang's phone, complete each job kind by
// script, and verify pay, respect and frenzy crates. `npx tsx scripts/missions.ts`
import { GANGS, MISSIONS } from '../src/shared/packs';
import { PK } from '../src/shared/protocol';
import { damagePed } from '../src/server/game/combat/damage';
import { seatPed, spawnPed } from '../src/server/game/factory';
import { archetypeOf } from '../src/server/game/missions/helpers';
import { Room } from '../src/server/room';

process.env.GRIDLOCK_DATA = 'data-smoke';
const room = new Room('MISN', 4242, 'money');
room.stop();
const msgs: string[] = [];
const pl = room.join('tester', { send: (d) => msgs.push(d), close: () => {} });
if (typeof pl === 'string') throw new Error(pl);
room.stop();
const w = room.world;
const ped = () => w.peds.get(pl.pid)!;
const tick = (n: number) => { for (let k = 0; k < n; k++) room.tick(); };
const teleport = (x: number, y: number) => { const p = ped(); p.body.x = x; p.body.y = y; };
const lastMission = () => [...msgs].reverse().map((m) => JSON.parse(m)).find((m) => m.t === 'mission');
tick(30);

let passed = 0;
const results: string[] = [];
for (const kind of ['hit', 'torch', 'steal', 'courier', 'frenzy']) {
  // Find a booth whose pool includes this kind, and retry the phone until that kind comes up.
  let got = false;
  for (let tries = 0; tries < 60 && !got; tries++) {
    const booth = room.missions.booths[tries % room.missions.booths.length];
    pl.boothCd.clear();
    teleport(booth.x, booth.y);
    tick(1);
    const err = room.missions.answer(pl, booth.id);
    if (err) { results.push(`${kind}: answer failed: ${err}`); break; }
    if (MISSIONS[pl.mission!.spec].kind === kind) got = true;
    else { room.missions.drop(pl); }
  }
  if (!got || !pl.mission) { results.push(`${kind}: never offered`); continue; }
  const st = pl.mission;
  const cash0 = pl.cash, giver = st.giver;
  const r0 = pl.respect[giver] ?? 0;
  if (kind === 'hit') { const mark = w.peds.get(st.focus)!; damagePed(w, mark, 9999, pl.pid); }
  if (kind === 'torch') { const v = w.vehicles.get(st.focus)!; v.hp = 0; v.burning = 4.9; }
  if (kind === 'steal') {
    const v = w.vehicles.get(st.focus)!;
    seatPed(w, ped(), v, 0);
    tick(2);
    v.body.x = st.dest!.x; v.body.y = st.dest!.y; v.body.vx = 0; v.body.vy = 0;
  }
  if (kind === 'courier') { teleport(st.point!.x, st.point!.y); tick(2); teleport(st.dest!.x, st.dest!.y); }
  if (kind === 'frenzy') {
    for (let k = 0; k < 20 && pl.mission; k++) {
      let victim = [...w.peds.values()].find((p) => !p.player && !p.dead && (!st.rival || p.faction === st.rival));
      if (!victim) victim = spawnPed(w, archetypeOf(st.rival || 'civ'), ped().body.x + 5, ped().body.y);
      damagePed(w, victim, 9999, pl.pid);
      tick(1);
    }
  }
  tick(10);
  const ok = !pl.mission && pl.cash > cash0;
  if (ok) passed++;
  results.push(`${kind}: ${ok ? 'PASSED' : 'not passed'} cash +${pl.cash - cash0}, respect ${giver || '-'} ${r0} -> ${pl.respect[giver] ?? 0}, last msg ${JSON.stringify(lastMission()?.result ?? lastMission()?.m?.objective)}`);
  if (pl.mission) room.missions.drop(pl);
}

// Frenzy crate pickup.
tick(60);
const crate = [...w.pickups.values()].find((p) => p.type === PK.frenzy);
if (crate) {
  teleport(crate.x, crate.y);
  tick(3);
  results.push(`crate: mission started = ${!!pl.mission}, weapon given = ${ped().weapons.some((h) => h.w === pl.mission?.weapon)}`);
} else results.push('crate: none spawned');
results.push(`respect now: ${GANGS.map((g) => `${g} ${pl.respect[g] ?? 0}`).join(', ')}; earned this round ${pl.earned}`);
console.log(results.join('\n'));
console.log(`${passed}/5 job kinds passed`);
