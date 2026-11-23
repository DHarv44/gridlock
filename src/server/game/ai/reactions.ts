// Event entry points from combat into the AI.
import type { Ped } from '../entities';
import type { World } from '../world';
import { BEHAVIOURS } from './behaviours';

export function onAttacked(w: World, victim: Ped, attacker: Ped): void {
  if (!victim.ai || victim.dead || victim === attacker) return;
  victim.ai.enemy = attacker.id;
  victim.ai.enemyT = w.time;
  BEHAVIOURS[victim.spec.behaviour].attacked(w, victim, attacker);
}

/** Gunfire, explosions and deaths make nearby NPCs react. */
export function onNoise(w: World, x: number, y: number, radius: number, sourceId: number, lethal: boolean): void {
  const source = sourceId ? w.peds.get(sourceId) ?? null : null;
  w.pedsNear(x, y, radius, (p) => {
    if (!p.ai || p.dead || p === source) return;
    BEHAVIOURS[p.spec.behaviour].noise(w, p, x, y, source, lethal);
  });
  // Drivers react too (peds inside vehicles are not in the ped hash).
  w.vehiclesNear(x, y, radius * 0.6, (v) => {
    const d = v.seats[0] ? w.peds.get(v.seats[0]) : undefined;
    if (d?.ai && d !== source) BEHAVIOURS[d.spec.behaviour].noise(w, d, x, y, source, lethal);
  });
}
