// The five job types. Each sets up its targets, reports the current objective and decides
// pass/fail every tick. What each job is called, pays and targets comes from the mission pack.
import { dist } from '../../../shared/math';
import { type MissionKind, MISSIONS, vehicleIndex } from '../../../shared/packs';
import { turfGang } from '../../../shared/world/gangTurf';
import type { MissionState, Ped, Player } from '../entities';
import { removeVehicle, unseatPed } from '../factory';
import type { World } from '../world';
import { findCurb, findSpot, gangCar, placeName, spawnEscorts, spawnMark, spawnRide } from './helpers';

export type Outcome = 'run' | 'pass' | 'fail';

export interface KindDef {
  start(w: World, pl: Player, st: MissionState, from: { x: number; y: number }): void;
  tick(w: World, pl: Player, st: MissionState): Outcome;
  objective(st: MissionState): string;
  progress?(st: MissionState): string;
  onKill?(st: MissionState, victim: Ped): void;
}

const spec = (st: MissionState) => MISSIONS[st.spec];
const me = (w: World, pl: Player) => { const p = w.peds.get(pl.pid); return p ? w.pedPos(p) : null; };

const hit: KindDef = {
  start(w, _pl, st, from) {
    const s = spec(st);
    const at = findSpot(w, from.x, from.y, s.distance[0], s.distance[1]);
    st.place = placeName(w, at.x, at.y);
    const mark = spawnMark(w, st, st.rival, at, s.target?.hpMul ?? 1);
    spawnEscorts(w, st, st.rival, at, s.target?.escorts ?? 0);
    st.focus = mark.id;
  },
  tick(w, _pl, st) {
    const mark = w.peds.get(st.focus);
    return !mark || mark.dead ? 'pass' : 'run';
  },
  objective: (st) => `Kill ${st.name} in ${st.place}`,
};

const torch: KindDef = {
  start(w, _pl, st, from) {
    const s = spec(st);
    const at = findCurb(w, from.x, from.y, s.distance[0], s.distance[1]);
    st.place = placeName(w, at.x, at.y);
    const v = spawnRide(w, st, s.target?.vehicle ? vehicleIndex(s.target.vehicle) : gangCar(), at);
    const side = { x: at.x - Math.sin(at.angle) * 3, y: at.y + Math.cos(at.angle) * 3, angle: at.angle };
    if (!s.target?.vehicle) spawnEscorts(w, st, st.rival, side, s.target?.escorts ?? 0);
    st.focus = v.id;
  },
  tick(w, _pl, st) {
    const v = w.vehicles.get(st.focus);
    return !v || v.wrecked ? 'pass' : 'run';
  },
  objective: (st) => `Destroy the car in ${st.place}`,
};

const steal: KindDef = {
  start(w, _pl, st, from) {
    const s = spec(st);
    const at = findCurb(w, from.x, from.y, s.distance[0], s.distance[1]);
    st.place = placeName(w, at.x, at.y);
    const v = spawnRide(w, st, vehicleIndex(s.target!.vehicle!), at);
    st.focus = v.id;
    st.dest = findCurb(w, from.x, from.y, 20, 70);
  },
  tick(w, pl, st) {
    const v = w.vehicles.get(st.focus);
    if (!v || v.wrecked || v.burning >= 0) return 'fail';
    const driving = w.peds.get(pl.pid)?.vehicle === v.id;
    st.stage = driving ? 1 : 0;
    if (driving && st.dest && dist(v.body.x, v.body.y, st.dest.x, st.dest.y) < 7 && Math.hypot(v.body.vx, v.body.vy) < 4) {
      const p = w.peds.get(pl.pid);
      if (p) unseatPed(w, p, true);
      removeVehicle(w, v);
      return 'pass';
    }
    return 'run';
  },
  objective: (st) => (st.stage === 0 ? `Steal the car in ${st.place}` : 'Deliver it to the drop'),
};

const courier: KindDef = {
  start(w, _pl, st, from) {
    const s = spec(st);
    const a = findSpot(w, from.x, from.y, s.distance[0], s.distance[1]);
    st.place = placeName(w, a.x, a.y);
    st.point = { x: a.x, y: a.y };
    st.dest = findSpot(w, a.x, a.y, s.distance[0], s.distance[1]);
  },
  tick(w, pl, st) {
    const pos = me(w, pl);
    if (!pos) return 'run';
    const goal = st.stage === 0 ? st.point! : st.dest!;
    if (dist(pos.x, pos.y, goal.x, goal.y) > 5) return 'run';
    if (st.stage === 1) return 'pass';
    st.stage = 1;
    return 'run';
  },
  objective: (st) => (st.stage === 0 ? `Pick up the package in ${st.place}` : 'Deliver the package'),
};

const frenzy: KindDef = {
  start(w, _pl, st, from) {
    if (!st.rival) return;
    // Point the player at the nearest block of the rival gang's turf.
    let best: { x: number; y: number } | null = null, bd = Infinity;
    for (const b of w.city.blocks) {
      if (turfGang(b.district) !== st.rival) continue;
      const c = { x: (b.rect.x0 + b.rect.x1) / 2, y: (b.rect.y0 + b.rect.y1) / 2 };
      const d = dist(from.x, from.y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    st.point = best;
    if (best) st.place = placeName(w, best.x, best.y);
  },
  tick(_w, _pl, st) {
    return st.kills >= (spec(st).target?.count ?? 1) ? 'pass' : 'run';
  },
  onKill(st, victim) {
    if (victim.player) return;
    if (!st.rival || victim.faction === st.rival) st.kills++;
  },
  objective: (st) => (st.rival ? `Kill ${spec(st).target?.count} rivals in ${st.place}` : `Kill ${spec(st).target?.count} people`),
  progress: (st) => `${st.kills} / ${spec(st).target?.count}`,
};

export const KINDS: Record<MissionKind, KindDef> = { hit, torch, steal, courier, frenzy };

/** Where the HUD arrow and radar point right now (null = nowhere in particular). */
export function objectivePoint(w: World, st: MissionState): { x: number; y: number } | null {
  if (spec(st).kind === 'steal' && st.stage === 1) return st.dest;
  if (spec(st).kind === 'courier') return st.stage === 0 ? st.point : st.dest;
  if (st.focus) {
    const p = w.peds.get(st.focus);
    if (p) return w.pedPos(p);
    const v = w.vehicles.get(st.focus);
    if (v) return v.body;
  }
  return st.point;
}
