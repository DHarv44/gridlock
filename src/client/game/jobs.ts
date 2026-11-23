// Client side of jobs: payphone booths, objective markers, the job HUD, respect, room mode.
import * as THREE from 'three';
import { GANGS, RESPECT } from '../../shared/packs';
import { Mode, type PlayerInfo, type S2C, type YouState } from '../../shared/protocol';
import type { City } from '../../shared/world/cityTypes';
import { type Booth, gangColor, gangSpots } from '../../shared/world/gangSpots';
import type { Sound } from '../audio/sound';
import { MissionHud } from '../hud/missionHud';
import { Booths } from '../render/booths';
import { ObjectiveMarker } from '../render/objective';
import type { ParticleLayer } from '../render/particles';

export interface Blip { x: number; y: number; color: string; shape: 'dot' | 'square' | 'star' | 'phone' }

export class Jobs {
  readonly booths: Booth[];
  private boothView: Booths;
  private marker: ObjectiveMarker;
  readonly hud: MissionHud;
  private onJob = false;

  constructor(scene: THREE.Scene, hudRoot: HTMLElement, city: City) {
    this.booths = gangSpots(city).booths;
    this.boothView = new Booths(scene, this.booths);
    this.marker = new ObjectiveMarker(scene);
    this.hud = new MissionHud(hudRoot);
  }

  /** Handles job/mode messages; returns true if consumed. */
  onMessage(m: S2C): boolean {
    switch (m.t) {
      case 'mission': this.onJob = !!m.m; this.pickT = 0; this.hud.setMission(m.m, m.result); return true;
      case 'mode': this.hud.setMode(m.mode, m.round); return true;
      case 'round': this.hud.showRound(m.winner, m.standings); return true;
      default: return false;
    }
  }

  private lastAnswer = 0;
  /** Booths that ring for you: one per gang with work for you (the nearest one), re-picked now and
   *  then so it doesn't hop about as you move. */
  private ringing = new Set<number>();
  private pickT = 0;
  /** Booth id -> when (ms) it may ring again; mirrors the server's phone cooldown. */
  private cooldown = new Map<number, number>();

  /** GTA2: walk into a ringing phone and you've answered it. Returns the booth to answer, if any. */
  touch(you: YouState | null, me: { x: number; y: number } | null): Booth | null {
    if (!you || !me || you.mode !== Mode.Foot || performance.now() - this.lastAnswer < 3000) return null;
    const b = this.booths.find((x) => this.ringing.has(x.id) && Math.hypot(x.x - me.x, x.y - me.y) < 1.6);
    if (b) {
      this.lastAnswer = performance.now();
      this.cooldown.set(b.id, performance.now() + RESPECT.phoneCooldown * 1000);
      this.ringing.delete(b.id);
      this.pickT = 0;
    }
    return b ?? null;
  }

  private pick(you: YouState | null, me: { x: number; y: number } | null): void {
    this.ringing.clear();
    if (!you || !me || this.onJob || you.mode === Mode.Dead) return;
    const now = performance.now();
    for (const [gi, gang] of GANGS.entries()) {
      if ((you.rs[gi] ?? 0) < RESPECT.noWorkBelow) continue;
      let best: Booth | null = null, bd = Infinity;
      for (const b of this.booths) {
        if (b.gang !== gang || (this.cooldown.get(b.id) ?? 0) > now) continue;
        const d = Math.hypot(b.x - me.x, b.y - me.y);
        if (d < bd) { bd = d; best = b; }
      }
      if (best) this.ringing.add(best.id);
    }
  }

  /** The phones ringing for you now. */
  ringingBooths(): Booth[] { return this.booths.filter((b) => this.ringing.has(b.id)); }

  update(dt: number, you: YouState | null, me: { x: number; y: number } | null, glow: ParticleLayer, night: number,
    view: { x0: number; y0: number; x1: number; y1: number }, serverNow: number, mine: PlayerInfo | undefined, sound: Sound): void {
    if ((this.pickT -= dt) <= 0 || (this.onJob && this.ringing.size)) { this.pick(you, me); this.pickT = 12; }
    this.boothView.update(dt, (b) => this.ringing.has(b.id), glow, night);
    if (this.boothView.newRing) for (const b of this.ringingBooths()) sound.play('phone_ring', b.x, b.y);
    this.marker.update(dt, you?.mt ?? null, me, glow, view);
    if (you) this.hud.update(serverNow, you.rs, mine);
  }

  /** Radar blips: ringing phones and the current objective. */
  blips(you: YouState | null): Blip[] {
    const out: Blip[] = this.ringingBooths().map((b) => ({ x: b.x, y: b.y, color: gangColor(b.gang), shape: 'phone' as const }));
    if (you?.mt) out.push({ x: you.mt[0], y: you.mt[1], color: '#ffd21f', shape: 'star' });
    return out;
  }
}
