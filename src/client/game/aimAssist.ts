// GTA2-style auto-aim: the nearest living person within ±16° of the facing, up to 45 m; with a melee
// weapon in hand only someone within its reach (so a punch never swings round at a stranger down
// the street), and a little wider, since a blow lands across a wide arc anyway.
import { angleDiff } from '../../shared/math';
import { WEAPONS } from '../../shared/packs';
import { EK, PF } from '../../shared/protocol';
import type { EntityStore } from '../net/entities';
import { AUTO_AIM_CONE, type AimAssist } from './steering';

const RANGE = 45;

/** `weapon`: the weapon in your hand now (an index into WEAPONS, or -1). */
export function makeAimAssist(store: EntityStore, selfPid: () => number, weapon: () => number = () => -1): AimAssist {
  return (x, y, facing) => {
    const w = WEAPONS[weapon()];
    const melee = w?.kind === 'melee';
    let best: number | null = null, bd = melee ? w.range + 1 : RANGE;
    const cone = melee ? Math.max(AUTO_AIM_CONE, w.spread) : AUTO_AIM_CONE;
    const me = selfPid();
    for (const e of store.all.values()) {
      if (e.kind !== EK.Ped || e.id === me || (e.data[6] & PF.dead)) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d >= bd || d < 0.5) continue;
      const a = Math.atan2(e.y - y, e.x - x);
      if (Math.abs(angleDiff(facing, a)) > cone) continue;
      bd = d;
      best = a;
    }
    return best;
  };
}
