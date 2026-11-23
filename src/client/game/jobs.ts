// Client side of jobs: payphone booths, objective markers, the job HUD, respect, room mode.
import * as THREE from 'three';
import { GANGS, RESPECT } from '../../shared/packs';
import { Mode, type PlayerInfo, type S2C, type YouState } from '../../shared/protocol';
import type { City } from '../../shared/world/cityTypes';
import { type Booth, gangColor, gangSpots } from '../../shared/world/gangSpots';
import { MissionHud } from '../hud/missionHud';
import { Booths } from '../render/booths';
import { ObjectiveMarker } from '../render/objective';
import type { ParticleLayer } from '../render/particles';

export interface Blip { x: number; y: number; color: string; shape: 'dot' | 'square' | 'star' }

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
      case 'mission': this.onJob = !!m.m; this.hud.setMission(m.m, m.result); return true;
      case 'mode': this.hud.setMode(m.mode, m.round); return true;
      case 'round': this.hud.showRound(m.winner, m.standings); return true;
      default: return false;
    }
  }

  private lastAnswer = 0;

  /** GTA2: walk into a ringing phone and you've answered it. Returns the booth to answer, if any. */
  touch(you: YouState | null, me: { x: number; y: number } | null): Booth | null {
    if (!you || !me || performance.now() - this.lastAnswer < 3000) return null;
    const rings = this.ringsFor(you);
    const b = this.booths.find((x) => rings(x) && Math.hypot(x.x - me.x, x.y - me.y) < 1.6);
    if (b) this.lastAnswer = performance.now();
    return b ?? null;
  }

  private ringsFor(you: YouState | null): (b: Booth) => boolean {
    return (b) => !!you && !this.onJob && you.mode === Mode.Foot && (you.rs[GANGS.indexOf(b.gang)] ?? 0) >= RESPECT.noWorkBelow;
  }

  update(dt: number, you: YouState | null, me: { x: number; y: number } | null, glow: ParticleLayer, night: number,
    view: { x0: number; y0: number; x1: number; y1: number }, serverNow: number, mine: PlayerInfo | undefined): void {
    this.boothView.update(dt, this.ringsFor(you), glow, night);
    this.marker.update(dt, you?.mt ?? null, me, glow, view);
    if (you) this.hud.update(serverNow, you.rs, mine);
  }

  /** Radar blips: ringing booths and the current objective. */
  blips(you: YouState | null): Blip[] {
    const rings = this.ringsFor(you);
    const out: Blip[] = this.booths.filter(rings).map((b) => ({ x: b.x, y: b.y, color: gangColor(b.gang), shape: 'dot' as const }));
    if (you?.mt) out.push({ x: you.mt[0], y: you.mt[1], color: '#ffd21f', shape: 'star' });
    return out;
  }
}
