// Small synthesized sound set: gunfire, explosions, impacts, horns, sirens. Distance-attenuated.

type Voice = 'pistol' | 'revolver' | 'smg' | 'shotgun' | 'rifle' | 'sniper' | 'minigun' | 'flame' | 'launcher' | 'rocket'
  | 'cannon' | 'punch' | 'swing' | 'slash' | 'throw' | 'boom' | 'crash' | 'splash' | 'horn' | 'siren' | 'cash';

const GUN: Record<string, { freq: number; dur: number; body: number; gain: number }> = {
  pistol: { freq: 1800, dur: 0.12, body: 140, gain: 0.5 },
  revolver: { freq: 1300, dur: 0.22, body: 110, gain: 0.7 },
  smg: { freq: 2200, dur: 0.07, body: 170, gain: 0.35 },
  shotgun: { freq: 900, dur: 0.3, body: 90, gain: 0.8 },
  rifle: { freq: 1600, dur: 0.11, body: 120, gain: 0.5 },
  sniper: { freq: 1100, dur: 0.4, body: 80, gain: 0.85 },
  minigun: { freq: 2400, dur: 0.05, body: 160, gain: 0.25 },
  launcher: { freq: 500, dur: 0.25, body: 70, gain: 0.5 },
  rocket: { freq: 400, dur: 0.5, body: 60, gain: 0.5 },
  cannon: { freq: 300, dur: 0.7, body: 45, gain: 1 },
};

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private volume: number;
  private muted: boolean;
  listenerX = 0;
  listenerY = 0;
  private lastSiren = 0;

  /** Music (radio) volume, 1–100, separate from the game's sounds. */
  private music: number;

  constructor() {
    this.volume = percent(safeGet('gridlock.volume.game'), 50) / 100;
    this.music = percent(safeGet('gridlock.volume.music'), 70);
    this.muted = new URLSearchParams(location.search).has('mute');
    const unlock = () => { this.ensure(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  /** Game sounds, 0–1. */
  get level(): number { return this.volume; }
  /** Game and music volume as the sliders show them (1–100). */
  get gamePercent(): number { return Math.round(this.volume * 100); }
  get musicPercent(): number { return this.music; }
  /** Music volume, 0–1. */
  get musicLevel(): number { return this.music / 100; }

  setGame(p: number): void {
    this.volume = percent(p, 50) / 100;
    safeSet('gridlock.volume.game', String(this.gamePercent));
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume * 0.6;
  }

  setMusic(p: number): void {
    this.music = percent(p, 70);
    safeSet('gridlock.volume.music', String(this.music));
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume * 0.6;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch { this.ctx = null; }
    return this.ctx;
  }

  /** Plays a voice at a world position (null = at the listener). */
  play(voice: Voice | string, x: number | null = null, y: number | null = null): void {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted || this.volume <= 0) return;
    let g = 1;
    if (x !== null && y !== null) {
      const d = Math.hypot(x - this.listenerX, y - this.listenerY);
      g = 1 / (1 + (d / 30) ** 2);
      if (g < 0.02) return;
    }
    const t = ctx.currentTime;
    const gun = GUN[voice];
    if (gun) { this.burst(t, gun.freq, gun.dur, gun.gain * g); this.thump(t, gun.body, gun.dur * 0.8, gun.gain * 0.8 * g); return; }
    switch (voice) {
      case 'boom': this.burst(t, 600, 1.4, 1.2 * g); this.thump(t, 55, 0.9, 1.3 * g); break;
      case 'crash': this.burst(t, 2500, 0.18, 0.4 * g); this.thump(t, 90, 0.2, 0.5 * g); break;
      case 'punch': this.thump(t, 120, 0.08, 0.4 * g); break;
      case 'swing': case 'slash': case 'throw': this.burst(t, 3000, 0.09, 0.12 * g); break;
      case 'flame': this.burst(t, 700, 0.12, 0.1 * g); break;
      case 'splash': this.burst(t, 1200, 0.5, 0.35 * g); break;
      case 'horn': this.tone(t, 392, 0.35, 0.12 * g, 'square'); this.tone(t, 494, 0.35, 0.1 * g, 'square'); break;
      case 'cash': this.tone(t, 1320, 0.05, 0.05, 'sine'); break;
      case 'siren': this.sweep(t, 650, 1300, 1.1, 0.08 * g); break;
    }
  }

  /** Sirens: one sweep at a time from the nearest siren. */
  siren(x: number, y: number): void {
    const now = performance.now();
    if (now - this.lastSiren < 1100) return;
    this.lastSiren = now;
    this.play('siren', x, y);
  }

  private burst(t: number, freq: number, dur: number, gain: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 0.15), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }

  private thump(t: number, freq: number, dur: number, gain: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.4, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private tone(t: number, freq: number, dur: number, gain: number, type: OscillatorType): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.setValueAtTime(gain, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur);
  }

  private sweep(t: number, f0: number, f1: number, dur: number, gain: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f1, t + dur * 0.5);
    o.frequency.linearRampToValueAtTime(f0, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.setValueAtTime(gain, t + dur * 0.9);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur);
  }
}

function safeGet(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeSet(k: string, v: string): void {
  try { localStorage.setItem(k, v); } catch { /* storage unavailable */ }
}
/** A volume setting as a whole number 1–100 (anything unreadable gets the default). */
function percent(v: unknown, dflt: number): number {
  const n = Math.round(Number(v ?? dflt));
  return Number.isFinite(n) ? Math.max(1, Math.min(100, n)) : dflt;
}
