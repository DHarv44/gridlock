// Headless check: soldiers leave you alone driving past their base, even with a low wanted level,
// and fight you on the base, at the army's wanted level, or once you've attacked them.
// `npx tsx scripts/military.ts`
import { insetRect } from '../src/shared/math';
import { RULES, ZONES, pedIndex, vehicleIndex, weaponIndex } from '../src/shared/packs';
import { SIDEWALK_W } from '../src/shared/world/cityTypes';
import { onAttacked } from '../src/server/game/ai/reactions';
import { onBase } from '../src/server/game/ai/soldiers';
import { giveWeapon, removePed, removeVehicle, seatPed, spawnPed, spawnVehicle, unseatPed } from '../src/server/game/factory';
import type { Ped } from '../src/server/game/entities';
import { addHeat } from '../src/server/game/systems/wanted';
import { Room } from '../src/server/room';
import { type InputMsg, Mode } from '../src/shared/protocol';

process.env.GRIDLOCK_DATA = 'data-smoke';
const room = new Room('ARMY', 991);
room.stop();
const joined = room.join('tester', { send: () => {}, close: () => {} });
if (typeof joined === 'string') throw new Error(joined);
const pl = joined;
room.stop();
const w = room.world;
const me = () => w.peds.get(pl.pid)!;
let seq = 0;
const tick = (n: number) => { for (let k = 0; k < n; k++) { pl.queue.push([++seq, 0, 0, 0, 0, 0, 0, -1] as InputMsg); room.tick(); } };
tick(5);

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

// A base block, its gate on the west side, and the road in front of it.
const block = w.city.blocks.find((b) => ZONES[b.zone]?.fenced)!;
const area = insetRect(block.rect, SIDEWALK_W);
const midY = (area.y0 + area.y1) / 2;
const road = { x: block.rect.x0 - 4, y: midY };
const yard = { x: area.x0 + 3, y: midY + 3 };
check(w.map.onRoad(road.x, road.y) && !onBase(w, road.x, road.y), 'the road outside the gate is not the base');
check(onBase(w, yard.x, yard.y), 'inside the fence is the base');

const soldier = pedIndex('soldier');
let squad: Ped[] = [];
const hostile = () => squad.filter((s) => !s.dead && (s.ai!.task === 'attack' || s.ai!.task === 'pursue') && s.ai!.target === pl.pid).length;

function scenario(wanted: number, where: 'driving past' | 'on foot in the yard', setup?: () => void, secs = 5): { hostile: number; hp: number; wanted: number } {
  // Fresh soldiers just inside the gate, a fresh player (back from the hospital if the last
  // scenario got them killed).
  for (const s of squad) removePed(w, s);
  squad = [];
  for (let k = 0; k < 40 && pl.mode >= Mode.Dead; k++) tick(30);
  squad = [0, 1, 2].map((k) => { const s = spawnPed(w, soldier, area.x0 + 5, midY - 3 + k * 3, Math.PI); giveWeapon(s, weaponIndex('smg'), 300); return s; });
  const p = me();
  if (p.vehicle) { const v = w.vehicles.get(p.vehicle)!; unseatPed(w, p, false); removeVehicle(w, v); }
  p.hp = 100; p.armor = 0;
  pl.heat = 0; addHeat(pl, 0);
  if (wanted) addHeat(pl, [0, 10, 40, 100, 200, 350][wanted] + 1);
  if (where === 'driving past') {
    const car = spawnVehicle(w, vehicleIndex('sedan'), road.x, road.y, Math.PI / 2);
    seatPed(w, p, car, 0);
  } else { p.body.x = yard.x; p.body.y = yard.y; }
  setup?.();
  let peak = 0;
  for (let k = 0; k < 30 * secs; k++) { tick(1); peak = Math.max(peak, hostile()); }
  return { hostile: peak, hp: me().vehicle ? w.vehicles.get(me().vehicle)!.hp : me().hp, wanted: pl.wanted };
}

const past0 = scenario(0, 'driving past');
check(past0.hostile === 0 && past0.wanted === 0, `driving past, not wanted: ignored (soldiers after you: ${past0.hostile}, wanted ${past0.wanted})`);
const past2 = scenario(2, 'driving past');
check(past2.hostile === 0, `driving past at wanted 2: ignored (soldiers after you: ${past2.hostile})`);
const pastArmy = scenario(RULES.militaryWanted, 'driving past');
check(pastArmy.hostile > 0, `driving past at wanted ${RULES.militaryWanted} (army level): they fight (${pastArmy.hostile} after you)`);
const yard0 = scenario(0, 'on foot in the yard');
check(yard0.hostile > 0 && yard0.wanted > 0, `in the yard: trespassing, they fight (${yard0.hostile} after you, wanted ${yard0.wanted})`);
// A short visit, then back out to the street.
const visit = scenario(0, 'on foot in the yard', () => { me().hp = 5000; }, 1.5);
me().body.x = road.x - 6; me().body.y = road.y; me().body.vx = 0; me().body.vy = 0;
tick(30 * 2);
check(visit.hostile > 0 && pl.mode < Mode.Dead && hostile() === 0, `trespass then back out on the street (wanted ${pl.wanted}): they stand down (${visit.hostile} came after you, ${hostile()} still are, alive ${pl.mode < Mode.Dead})`);
const shot = scenario(0, 'driving past', () => onAttacked(w, squad[0], me()));
check(shot.hostile > 0, `driving past after shooting at one: they fight back (${shot.hostile} after you)`);

console.log(failures ? `${failures} check(s) failed` : 'all military checks passed');
process.exit(failures ? 1 : 0);
