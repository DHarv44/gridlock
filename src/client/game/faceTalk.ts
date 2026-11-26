// Talking to people face to face (server: systems/faceTalk.ts): on foot, the nearest person who has
// something to say (their archetype's `talker`), when they're nearer than any vehicle, is who E
// talks to. Their bubbles are drawn over them (hud/talk.ts).
import { CALLERS, CALLS, FACTIONS, PEDS } from '../../shared/packs';
import { EK, PF } from '../../shared/protocol';
import type { Talk } from '../hud/talk';
import type { EntityStore, ViewEntity } from '../net/entities';

/** A little inside the server's reach (TALK_REACH), so a press it accepts. */
const REACH = 2.6;

const talkerOf = (e: ViewEntity): string | undefined => {
  const t = PEDS[e.data[2]]?.talker;
  return t && CALLS[t] ? t : undefined;
};

export class FaceTalk {
  /** Who E would talk to now, or null. */
  private target: ViewEntity | null = null;
  /** Your head's height (bubbles over whoever you're talking with sit at it). */
  private h = 2.9;

  constructor(private store: EntityStore, talk: Talk) {
    talk.locate = (id) => {
      const e = this.store.all.get(id);
      return e ? { x: e.x, h: this.h, y: e.y } : null;
    };
    talk.pedColor = (id) => {
      const e = this.store.all.get(id);
      const f = e && FACTIONS.find((x) => x.id === PEDS[e.data[2]]?.faction);
      return f?.color ?? '#5a6470';
    };
  }

  /** Every HUD tick: who's near enough to talk to. Returns the prompt, or null. `h`: your head. */
  find(own: { pid: number; vid: number; x: number; y: number }, h: number): string | null {
    this.h = h;
    this.target = null;
    if (own.vid) return null;
    let best: ViewEntity | null = null, bd = REACH, car = Infinity;
    for (const e of this.store.all.values()) {
      const d = Math.hypot(e.x - own.x, e.y - own.y);
      if (e.kind === EK.Veh) { car = Math.min(car, d); continue; }
      if (e.kind !== EK.Ped || e.id === own.pid || d >= bd || e.data[8] || e.data[6] & (PF.dead | PF.player | PF.down)) continue;
      if (talkerOf(e)) { best = e; bd = d; }
    }
    if (!best || car < bd) return null;
    this.target = best;
    const who = CALLERS.find((c) => c.id === talkerOf(best));
    return who ? `Talk · ${who.name}` : 'Talk';
  }

  /** E pressed: the ped to talk to, if there is one. */
  get ped(): number { return this.target?.id ?? 0; }
}
