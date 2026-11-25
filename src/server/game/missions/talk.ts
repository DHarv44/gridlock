// Spoken phone calls (packs/calls.ts, docs/STORY.md). The server decides who speaks and which of
// their exchanges; the client plays the voiced lines as comic bubbles through a payphone or cell
// line. A gang's boss makes its first call (and introduces themselves, once per character); after
// that whoever at the gang has lines for the situation may call.
import { CALLS, type CallSituation, GANG_CALLERS, PLAYER_SAYS, type PlayerSituation, YOU } from '../../../shared/packs';
import type { S2C } from '../../../shared/protocol';
import type { Player } from '../entities';
import type { World } from '../world';

/** Who speaks and in what situation: a caller, or you (`[YOU, PlayerSituation]`). */
export type Part = [string, CallSituation] | [typeof YOU, PlayerSituation];

/** Who at a gang speaks for this situation: the boss until they've introduced themselves, then
 *  anyone at the gang with lines for it. */
export function gangCaller(w: World, pl: Player, gang: string, situation: CallSituation): string | null {
  const crew = GANG_CALLERS[gang] ?? [];
  const boss = crew[0];
  if (!boss) return null;
  if (!pl.met.has(boss)) return boss;
  const able = crew.filter((c) => CALLS[c]?.[situation]?.length);
  return able.length ? able[Math.floor(w.rng.next() * able.length)] : null;
}

/** Picks which of their exchanges each part plays; parts with no lines are dropped. A caller's
 *  `intro` marks them met. */
export function pickParts(w: World, pl: Player, parts: Part[]): [string, string, number][] {
  const out: [string, string, number][] = [];
  for (const [who, situation] of parts) {
    const options = who === YOU ? PLAYER_SAYS[situation as PlayerSituation] : CALLS[who]?.[situation as CallSituation];
    if (!options?.length) continue;
    out.push([who, situation, Math.floor(w.rng.next() * options.length)]);
    if (situation === 'intro') pl.met.add(who);
  }
  return out;
}

/** Plays an exchange (or several in a row) to a player. */
export function talk(w: World, pl: Player, via: 'payphone' | 'cell', parts: Part[]): void {
  const out = pickParts(w, pl, parts);
  if (out.length) pl.send({ t: 'talk', via, parts: out } satisfies S2C);
}

/** A gang hands you a job: the boss's introduction the first time, then the brief for the job.
 *  `lead`: what's said before it (you picking up, or asking for work). */
export function briefCall(w: World, pl: Player, gang: string, kind: CallSituation, via: 'payphone' | 'cell', lead: Part[] = []): void {
  const boss = GANG_CALLERS[gang]?.[0];
  const parts: Part[] = [];
  if (boss && !pl.met.has(boss) && CALLS[boss]?.intro) parts.push([boss, 'intro']);
  // Whoever introduced themselves gives the brief too; otherwise anyone at the gang.
  const who = parts.length ? boss! : gangCaller(w, pl, gang, kind);
  if (who) parts.push([who, kind]);
  if (parts.length) talk(w, pl, via, [...lead, ...parts]);
}
