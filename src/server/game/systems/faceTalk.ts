// Talking to people face to face: walk up to someone and press E. Who they speak as is a noun
// (PedArchetype.talker, a cast member's lines); what happens is here. They stop and face you and
// say their piece: a greeting, sometimes what they've heard, or fright if you're wanted or have a
// gun out. One of a gang's people gives you its work in person, as its phone would.
import { CALLS, type CallSituation, GANGS, RESPECT } from '../../../shared/packs';
import { Mode } from '../../../shared/protocol';
import { setTask } from '../ai/tasks';
import type { Ped, Player, TaskName } from '../entities';
import type { Face, Missions } from '../missions/engine';
import { type Part, talk } from '../missions/talk';
import type { World } from '../world';

/** How close you have to be (m). */
export const TALK_REACH = 3;
/** Seconds between conversations, so E held down doesn't stack them. */
const GAP = 2;
/** How long someone stands talking with you (s), unless you walk off. */
const CHAT_S = 9;
/** A greeting is followed by what they've heard this often. */
const RUMOUR = 0.4;
/** What someone can be busy with and still stop for you. */
const IDLE = new Set<TaskName>(['wander', 'stand', 'guard', 'chat', 'none']);

const has = (who: string, s: CallSituation) => !!CALLS[who]?.[s]?.length;

/** Whether a ped is someone you can talk to (the client asks the same of the archetype). */
export const talkative = (o: Ped): boolean => !!o.spec.talker && !!CALLS[o.spec.talker];

/** The player talks to a ped they're standing next to. Returns an error to show, or null. */
export function faceTalk(w: World, missions: Missions, pl: Player, pedId: number): string | null {
  const p = w.peds.get(pl.pid);
  const o = w.peds.get(pedId);
  if (!p || p.dead || p.vehicle || pl.mode !== Mode.Foot || w.time < (pl.talkT ?? 0)) return null;
  if (!o || o.dead || o.player || !o.ai || o.vehicle || !talkative(o)) return null;
  if (Math.hypot(o.body.x - p.body.x, o.body.y - p.body.y) > TALK_REACH) return null;
  if (!IDLE.has(o.ai.task)) return "They're in no mood to talk.";
  pl.talkT = w.time + GAP;
  const who = o.spec.talker!;
  const say = (parts: Part[]) => talk(w, pl, 'face', parts, o.id);
  // Wanted, or a gun in their face: frightened folk say so and run.
  if ((pl.wanted > 0 || p.aimHeld) && has(who, 'scared')) {
    say([[who, 'scared']]);
    setTask(o, 'flee', 0, p.body.x, p.body.y);
    return null;
  }
  setTask(o, 'chat', p.id, CHAT_S);
  const gang = o.spec.faction;
  if (GANGS.includes(gang)) { work(w, missions, pl, gang, { who, ped: o.id }); return null; }
  const parts: Part[] = [[who, 'greet']];
  if (has(who, 'rumour') && w.rng.chance(RUMOUR)) parts.push([who, 'rumour']);
  say(parts);
  return null;
}

/** One of a gang's people: they won't deal with you, you're already on a job, they've nothing
 *  yet, or they give you the job themselves. */
function work(w: World, missions: Missions, pl: Player, gang: string, face: Face): void {
  const say = (s: CallSituation) => talk(w, pl, 'face', [[face.who, has(face.who, s) ? s : 'greet']], face.ped);
  const cd = (pl.talkCd ??= new Map());
  if (missions.respectOf(pl, gang) < RESPECT.noWorkBelow) { say('refuse'); return; }
  if (pl.mission) { say('busy'); return; }
  if ((cd.get(gang) ?? 0) > w.time) { say('nothing'); return; }
  cd.set(gang, w.time + RESPECT.phoneCooldown);
  missions.offer(pl, gang, 1, [], face);
}
