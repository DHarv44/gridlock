// Mission helpers: picking places, spawning marks and rides, briefs, cleanup.
import { DISTRICTS, FACTIONS, MARK_NAMES, MISSIONS, PEDS, VEHICLES, pedWith, vehicleIndex } from '../../../shared/packs';
import type { MissionState, Ped, Vehicle } from '../entities';
import { setTask } from '../ai/tasks';
import { spawnPed, spawnVehicle } from '../factory';
import { sidewalkPoint } from '../systems/spawnPoints';
import type { World } from '../world';

export interface Spot { x: number; y: number; angle: number }

/** A sidewalk point roughly [min, max] metres from (x, y). */
export function findSpot(w: World, x: number, y: number, min: number, max: number): Spot {
  for (let k = 0; k < 30; k++) {
    const a = w.rng.next() * Math.PI * 2, d = w.rng.range(min, max);
    const b = w.map.blockAt(x + Math.cos(a) * d, y + Math.sin(a) * d);
    if (!b) continue;
    const s = sidewalkPoint(w, b);
    if (!w.map.isWater(s.x, s.y)) return s;
  }
  const b = w.city.blocks[Math.floor(w.rng.next() * w.city.blocks.length)];
  return sidewalkPoint(w, b);
}

/** A curb parking spot near a point roughly [min, max] metres away (for parked targets). */
export function findCurb(w: World, x: number, y: number, min: number, max: number): Spot {
  const want = findSpot(w, x, y, min, max);
  let best: Spot = want, bd = Infinity;
  for (const p of w.city.parking) {
    if (p.lot !== undefined) continue;
    const d = (p.x - want.x) ** 2 + (p.y - want.y) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

export const placeName = (w: World, x: number, y: number): string => DISTRICTS[w.map.districtAt(x, y)]?.name ?? 'town';
export const factionName = (id: string): string => FACTIONS.find((f) => f.id === id)?.name ?? 'somebody';

/** A gang member archetype for a faction. */
export const archetypeOf = (faction: string): number => {
  const i = PEDS.findIndex((p) => p.faction === faction && p.behaviour === 'gang');
  return i >= 0 ? i : Math.max(0, pedWith('gang'));
};

/** The faction's street car: a vehicle with the 'gang' role (else any traffic car). */
export const gangCar = (): number => {
  const i = VEHICLES.findIndex((v) => v.roles.includes('gang'));
  return i >= 0 ? i : Math.max(0, VEHICLES.findIndex((v) => v.roles.includes('traffic')));
};

export function spawnMark(w: World, st: MissionState, faction: string, s: Spot, hpMul: number): Ped {
  const p = spawnPed(w, archetypeOf(faction), s.x, s.y, s.angle);
  p.persistent = true;
  p.hp *= hpMul;
  p.ai!.post = { x: s.x, y: s.y, angle: s.angle };
  setTask(p, 'stand');
  st.targets.push(p.id);
  return p;
}

export function spawnEscorts(w: World, st: MissionState, faction: string, s: Spot, n: number): void {
  for (let k = 0; k < n; k++) {
    const a = (k / Math.max(1, n)) * Math.PI * 2;
    spawnMark(w, st, faction, { x: s.x + Math.cos(a) * 2.2, y: s.y + Math.sin(a) * 2.2, angle: a }, 1);
  }
}

export function spawnRide(w: World, st: MissionState, type: number, s: Spot): Vehicle {
  const v = spawnVehicle(w, type, s.x, s.y, s.angle);
  v.persistent = true;
  st.targets.push(v.id);
  return v;
}

/** Fills the brief/objective tokens. */
export function fill(text: string, st: MissionState, extra: Record<string, string> = {}): string {
  const spec = MISSIONS[st.spec];
  const vehicle = spec.target?.vehicle ? VEHICLES[vehicleIndex(spec.target.vehicle)].name : 'ride';
  const map: Record<string, string> = {
    target: st.name, rival: factionName(st.rival), place: st.place, vehicle,
    count: String(spec.target?.count ?? 0), reward: st.reward.toLocaleString('en-US'),
    time: spec.time ? `${Math.floor(spec.time / 60)}:${String(spec.time % 60).padStart(2, '0')}` : 'whenever', ...extra,
  };
  return text.replace(/\{(\w+)\}/g, (_, k: string) => map[k] ?? k);
}

export const markName = (w: World): string => MARK_NAMES[Math.floor(w.rng.next() * MARK_NAMES.length)];

/** Releases everything a job spawned back to normal population rules. */
export function release(w: World, st: MissionState): void {
  for (const id of st.targets) {
    const p = w.peds.get(id);
    if (p) { p.persistent = false; continue; }
    const v = w.vehicles.get(id);
    if (v) v.persistent = false;
  }
}
