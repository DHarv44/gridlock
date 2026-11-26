// Missions: payphone offers, kill-frenzy crates, gang respect, per-player job progress.
import { dist } from '../../../shared/math';
import { CALLS, faction, GANGS, MENTOR_CALLER, MISSIONS, RESPECT, RULES, weaponIndex, YOU } from '../../../shared/packs';
import { type MissionInfo, Mode, PK, type S2C } from '../../../shared/protocol';
import { type Booth, type CrateSpot, gangSpots } from '../../../shared/world/gangSpots';
import type { MissionState, Pickup, Ped, Player } from '../entities';
import { giveWeapon } from '../factory';
import type { World } from '../world';
import { factionName, fill, markName, release } from './helpers';
import { KINDS, objectivePoint } from './kinds';
import { briefCall, gangCaller, type Part, talk } from './talk';

const clampR = (v: number) => Math.max(RESPECT.min, Math.min(RESPECT.max, v));

/** A job given in person: who the giver speaks as, and their ped. */
export interface Face { who: string; ped: number }

export class Missions {
  readonly booths: Booth[];
  readonly crates: CrateSpot[];
  private crateState: { pickup: number; readyAt: number }[];

  constructor(private w: World) {
    const s = gangSpots(w.city);
    this.booths = s.booths;
    this.crates = s.crates;
    this.crateState = this.crates.map(() => ({ pickup: 0, readyAt: 0 }));
  }

  respectOf(pl: Player, gang: string): number {
    return pl.respect[gang] ?? 0;
  }

  /** The nearest payphone ringing for this player (a gang that will work with them, off its
   *  cooldown), or null; none while they're on a job. */
  ringingBooth(pl: Player): Booth | null {
    const p = this.w.peds.get(pl.pid);
    if (!p || pl.mission) return null;
    const at = this.w.pedPos(p);
    let best: Booth | null = null, bd = Infinity;
    for (const b of this.booths) {
      if (this.respectOf(pl, b.gang) < RESPECT.noWorkBelow || (pl.boothCd.get(b.id) ?? 0) > this.w.time) continue;
      const d = dist(at.x, at.y, b.x, b.y);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  /** The mentor has had enough of this player's blown jobs. */
  fedUp(pl: Player): boolean {
    return pl.blownRun >= RESPECT.mentorFedUpAfter;
  }

  /** A player answers a payphone. Returns an error to show, or null when a job started. */
  answer(pl: Player, boothId: number): string | null {
    const w = this.w;
    const booth = this.booths[boothId];
    const p = w.peds.get(pl.pid);
    if (!booth || !p || p.dead || p.vehicle || pl.mode !== Mode.Foot) return 'Not now.';
    if (dist(p.body.x, p.body.y, booth.x, booth.y) > 4) return 'Too far from the phone.';
    if (pl.mission) return 'Finish the job you have first.';
    if (this.respectOf(pl, booth.gang) < RESPECT.noWorkBelow) return `The ${factionName(booth.gang)} won't work with you.`;
    if ((pl.boothCd.get(boothId) ?? 0) > w.time) return 'Nobody on the line. Try again later.';
    const pool = MISSIONS.map((m, i) => ({ m, i })).filter(({ m }) => m.giver === booth.gang || m.giver === 'gang');
    const { i } = pool[Math.floor(w.rng.next() * pool.length)];
    const rivals = faction(booth.gang).hostile.filter((f) => GANGS.includes(f));
    pl.boothCd.set(boothId, w.time + RESPECT.phoneCooldown);
    this.begin(pl, i, booth.gang, rivals[Math.floor(w.rng.next() * rivals.length)] ?? '', booth, 1, 'payphone', [[YOU, 'payphone']]);
    return null;
  }

  /** A gang gives the player a job over the phone (missions/cell.ts), from where they stand.
   *  `lead`: what's said before the brief (you picking up, or asking for work). `face`: one of
   *  theirs gives it in person instead (systems/faceTalk.ts): who they speak as, and their ped. */
  offer(pl: Player, gang: string, payMul: number, lead: Part[] = [], face?: Face): void {
    const w = this.w;
    const p = w.peds.get(pl.pid);
    if (!p || pl.mission) return;
    const pool = MISSIONS.map((m, i) => ({ m, i })).filter(({ m }) => m.giver === gang || m.giver === 'gang');
    const { i } = pool[Math.floor(w.rng.next() * pool.length)];
    const rivals = faction(gang).hostile.filter((f) => GANGS.includes(f));
    this.begin(pl, i, gang, rivals[Math.floor(w.rng.next() * rivals.length)] ?? '', w.pedPos(p), payMul, 'cell', lead, face);
  }

  /** `via`: how the job was given, if by phone: the giver's voice briefs you down that line
   *  (after `lead`); `face`: in person, by whoever gave it. */
  private begin(pl: Player, specIndex: number, giver: string, rival: string, from: { x: number; y: number }, payMul = 1, via?: 'payphone' | 'cell', lead: Part[] = [], face?: Face): void {
    const w = this.w;
    const spec = MISSIONS[specIndex];
    const r = (spec.reward[0] + w.rng.next() * (spec.reward[1] - spec.reward[0])) * payMul;
    const st: MissionState = {
      spec: specIndex, giver, rival, stage: 0, ends: spec.time ? w.time + spec.time : 0, targets: [], focus: 0,
      point: null, dest: null, kills: 0, reward: Math.round(r / 50) * 50, place: '', name: markName(w), weapon: -1, sentKey: '',
    };
    KINDS[spec.kind].start(w, pl, st, from);
    if (spec.target?.weapon) {
      const p = w.peds.get(pl.pid)!;
      const wi = weaponIndex(spec.target.weapon);
      const had = p.weapons.some((h) => h.w === wi);
      p.wi = giveWeapon(p, wi, 9999);
      if (!had) st.weapon = wi;
    }
    pl.mission = st;
    this.send(pl, true);
    if (face) talk(w, pl, 'face', [...lead, [face.who, spec.kind]], face.ped);
    else if (via && GANGS.includes(giver)) briefCall(w, pl, giver, spec.kind, via, lead);
  }

  private info(st: MissionState): MissionInfo {
    const spec = MISSIONS[st.spec];
    const kind = KINDS[spec.kind];
    return {
      title: spec.title, giver: st.giver, brief: fill(spec.brief, st), objective: kind.objective(st),
      ends: st.ends ? Math.round(st.ends * 1000) : 0, progress: kind.progress?.(st),
    };
  }

  private send(pl: Player, force = false): void {
    const st = pl.mission;
    if (!st) return;
    const m = this.info(st);
    const key = `${m.objective}|${m.progress ?? ''}`;
    if (!force && key === st.sentKey) return;
    st.sentKey = key;
    pl.send({ t: 'mission', m } satisfies S2C);
  }

  private end(pl: Player, passed: boolean): void {
    const st = pl.mission;
    if (!st) return;
    const w = this.w;
    const spec = MISSIONS[st.spec];
    pl.mission = null;
    release(w, st);
    if (st.weapon >= 0) {
      const p = w.peds.get(pl.pid);
      if (p) { p.weapons = p.weapons.filter((h) => h.w !== st.weapon); p.wi = Math.min(p.wi, p.weapons.length - 1); }
    }
    if (passed) {
      // Done with company: whoever rode with you or was close by splits the pay with you evenly
      // (the gang's respect is yours: it was your job).
      const crew = this.crewOf(pl);
      const share = Math.floor(st.reward / (crew.length + 1));
      w.earn(pl, share);
      for (const c of crew) {
        w.earn(c, share);
        w.notify('money', `+$${share.toLocaleString('en-US')} · your share of ${pl.name}'s ${spec.title}`, c);
      }
      if (st.giver) this.adjust(pl, st.giver, spec.respect);
      if (st.rival && spec.rivalRespect) this.adjust(pl, st.rival, -spec.rivalRespect);
      w.notify('money', crew.length
        ? `+$${share.toLocaleString('en-US')} · ${spec.title} passed (split ${crew.length + 1} ways)`
        : `+$${st.reward.toLocaleString('en-US')} · ${spec.title} passed`, pl);
    } else {
      if (st.giver) this.adjust(pl, st.giver, -Math.ceil(spec.respect / 3));
    }
    pl.send({ t: 'mission', m: null, result: passed ? 'passed' : 'failed' } satisfies S2C);
    pl.blownRun = passed ? 0 : pl.blownRun + 1;
    // Somebody rings to say so: the gang, or, while it doesn't trust you with its number yet, the
    // mentor (packs MENTOR_CALLER) if they have something to say about it, ending on a nudge
    // about the next job when a payphone is waiting for you.
    if (RULES.cellPhone && GANGS.includes(st.giver)) {
      const s = passed ? 'pass' : 'fail';
      const stranger = this.respectOf(pl, st.giver) < RESPECT.cellAt;
      const mentor = stranger && MENTOR_CALLER && CALLS[MENTOR_CALLER]?.[s]?.length ? MENTOR_CALLER : null;
      const who = mentor ?? gangCaller(w, pl, st.giver, s);
      const parts: Part[] = mentor ? [[mentor, 'hello'], [mentor, s]] : who ? [[who, s]] : [];
      if (mentor && !this.fedUp(pl) && this.ringingBooth(pl)) parts.push([mentor, 'nudge']);
      if (parts.length) talk(w, pl, 'cell', [[YOU, 'pickup'], ...parts]);
    }
  }

  /** The other players in on a job when it's done: riding in your vehicle, or alive within
   *  RULES.shareRange of you on the same floor. */
  private crewOf(pl: Player): Player[] {
    const w = this.w, me = w.peds.get(pl.pid);
    if (!me) return [];
    const at = w.pedPos(me);
    return [...w.players.values()].filter((o) => {
      if (o === pl) return false;
      const p = w.peds.get(o.pid);
      if (!p || p.dead) return false;
      if (me.vehicle && p.vehicle === me.vehicle) return true;
      const q = w.pedPos(p);
      return dist(at.x, at.y, q.x, q.y) <= RULES.shareRange;
    });
  }

  private adjust(pl: Player, gang: string, delta: number): void {
    pl.respect[gang] = clampR((pl.respect[gang] ?? 0) + delta);
  }

  /** Kills feed frenzies and move respect. */
  onKill(killer: Ped | null, victim: Ped): void {
    if (victim.player?.mission) this.end(victim.player, false);
    const pl = killer?.player;
    if (!pl || killer === victim) return;
    if (pl.mission) KINDS[MISSIONS[pl.mission.spec].kind].onKill?.(pl.mission, victim);
    if (!GANGS.includes(victim.faction)) return;
    this.adjust(pl, victim.faction, RESPECT.killMember);
    for (const g of GANGS) if (faction(g).hostile.includes(victim.faction)) this.adjust(pl, g, RESPECT.killRival);
  }

  /** A player walked over a kill-frenzy crate. */
  onCrate(pl: Player, pk: Pickup): void {
    const i = pk.value;
    if (this.crateState[i]) { this.crateState[i].pickup = 0; this.crateState[i].readyAt = this.w.time + RESPECT.frenzyRespawn; }
    const pool = MISSIONS.map((m, k) => ({ m, k })).filter(({ m }) => m.giver === 'crate');
    const { k } = pool[Math.floor(this.w.rng.next() * pool.length)];
    this.begin(pl, k, '', '', pk);
  }

  update(): void {
    const w = this.w;
    for (const pl of w.players.values()) {
      const st = pl.mission;
      if (!st) continue;
      if ((st.ends && w.time > st.ends) || pl.mode === Mode.Busted) { this.end(pl, false); continue; }
      const out = KINDS[MISSIONS[st.spec].kind].tick(w, pl, st);
      if (out !== 'run') { this.end(pl, out === 'pass'); continue; }
      this.send(pl);
    }
    this.crateState.forEach((c, i) => {
      if (c.pickup && w.pickups.has(c.pickup)) return;
      if (w.time < c.readyAt) return;
      const spot = this.crates[i];
      const id = w.id();
      w.pickups.set(id, { id, kind: 'pickup', type: PK.frenzy, x: spot.x, y: spot.y, value: i, weapon: -1, life: 1e9 });
      c.pickup = id;
    });
  }

  objective(pl: Player): number[] | null {
    if (!pl.mission) return null;
    const p = objectivePoint(this.w, pl.mission);
    return p ? [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10] : null;
  }

  /** Cancels a job (player left the room). */
  drop(pl: Player): void {
    if (pl.mission) release(this.w, pl.mission);
    pl.mission = null;
  }
}
