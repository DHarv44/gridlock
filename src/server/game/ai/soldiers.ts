// When soldiers go after a player. Not for driving past their base or for a small wanted level:
// only for being on their property (inside a fenced compound, not the street or sidewalk around
// it), for being wanted badly enough that the army has been called in, or for attacking them.
import { insetRect } from '../../../shared/math';
import { RULES, ZONES } from '../../../shared/packs';
import { SIDEWALK_W } from '../../../shared/world/cityTypes';
import type { Ped } from '../entities';
import type { World } from '../world';

/** Inside a fenced compound (a base): past the sidewalk, within the fence. */
export function onBase(w: World, x: number, y: number): boolean {
  const b = w.map.blockAt(x, y);
  if (!b || !ZONES[b.zone]?.fenced) return false;
  const r = insetRect(b.rect, SIDEWALK_W);
  return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

/** Whether soldier `p` should fight player-or-NPC `t`. NPCs: always (as before). */
export function soldierHostile(w: World, p: Ped, t: Ped): boolean {
  const pl = t.player;
  if (!pl) return true;
  if (pl.wanted >= RULES.militaryWanted) return true;
  if (p.ai && p.ai.enemy === t.id && w.time - p.ai.enemyT < RULES.militaryGrudgeS) return true;
  const pos = w.pedPos(t);
  return onBase(w, pos.x, pos.y);
}
