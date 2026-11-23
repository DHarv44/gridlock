// GTA2-style auto-aim: the nearest living person within ±16° of the facing, up to 45 m.
import { angleDiff } from '../../shared/math';
import { EK, PF } from '../../shared/protocol';
import type { EntityStore } from '../net/entities';
import { AUTO_AIM_CONE, type AimAssist } from './steering';

const RANGE = 45;

export function makeAimAssist(store: EntityStore, selfPid: () => number): AimAssist {
  return (x, y, facing) => {
    let best: number | null = null, bd = RANGE;
    const me = selfPid();
    for (const e of store.all.values()) {
      if (e.kind !== EK.Ped || e.id === me || (e.data[6] & PF.dead)) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d >= bd || d < 0.5) continue;
      const a = Math.atan2(e.y - y, e.x - x);
      if (Math.abs(angleDiff(facing, a)) > AUTO_AIM_CONE) continue;
      bd = d;
      best = a;
    }
    return best;
  };
}
