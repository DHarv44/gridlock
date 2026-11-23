// Game sounds: CC0 recordings from Freesound (ASSETS.md), prepared by tools/blender/prep_audio.py
// into src/client/sfx/ and all levelled alike, so the mix lives in VOICES below. Distance-attenuated.
// The siren is one looping voice that follows the nearest siren.

/** Every voice the game plays: its recording, gain, pitch wobble (random ± fraction) and the least
 *  time between two plays (rapid-fire weapons would otherwise stack dozens of copies). */
const VOICES: Record<string, { file: string; gain: number; vary?: number; gap?: number }> = {
  pistol: { file: 'pistol', gain: 0.55, vary: 0.05 },
  revolver: { file: 'revolver', gain: 0.6, vary: 0.04 },
  smg: { file: 'smg', gain: 0.45, vary: 0.06 },
  shotgun: { file: 'shotgun', gain: 0.65, vary: 0.04 },
  rifle: { file: 'rifle', gain: 0.55, vary: 0.05 },
  sniper: { file: 'sniper', gain: 0.7, vary: 0.03 },
  minigun: { file: 'minigun', gain: 0.38, vary: 0.05 },
  flame: { file: 'flame', gain: 0.4, vary: 0.08, gap: 0.3 },
  launcher: { file: 'launcher', gain: 0.55, vary: 0.04 },
  rocket: { file: 'rocket', gain: 0.55, vary: 0.04 },
  cannon: { file: 'cannon', gain: 0.85, vary: 0.03 },
  punch: { file: 'punch', gain: 0.45, vary: 0.1 },
  swing: { file: 'swing', gain: 0.3, vary: 0.1 },
  throw: { file: 'swing', gain: 0.3, vary: 0.12 },
  slash: { file: 'slash', gain: 0.35, vary: 0.08 },
  boom: { file: 'boom', gain: 1, vary: 0.06 },
  crash: { file: 'crash', gain: 0.4, vary: 0.1, gap: 0.08 },
  splash: { file: 'splash', gain: 0.5, vary: 0.08 },
  horn: { file: 'horn', gain: 0.35, vary: 0.03 },
  horn_small: { file: 'horn_small', gain: 0.32, vary: 0.03 },
  horn_deep: { file: 'horn_deep', gain: 0.38, vary: 0.03 },
  horn_air: { file: 'horn_air', gain: 0.42, vary: 0.02 },
  horn_bus: { file: 'horn_bus', gain: 0.4, vary: 0.02 },
  horn_icecream: { file: 'horn_icecream', gain: 0.3, gap: 4.5 },
  cash: { file: 'cash', gain: 0.22 },
};
const SIREN_GAIN = 0.3;
/** Your own vehicle's engine: kept under the guns and the radio. Idle level, and how far pitch and
 *  level rise at top speed. */
const ENGINE = { gain: 0.11, rise: 0.6, rate: 0.85, pitch: 0.85 };
const ENGINES = ['engine_car', 'engine_diesel', 'engine_bike'];
/** Most sounds playing at once; past this, new ones are dropped. */
const MAX_VOICES = 28;

const FILES = import.meta.glob('../sfx/*.ogg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const urlOf = (name: string) => FILES[`../sfx/${name}.ogg`];

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private lastPlay = new Map<string, number>();
  private playing = 0;
  private sirenSrc: AudioBufferSourceNode | null = null;
  private sirenGain: GainNode | null = null;
  private engineSrc: AudioBufferSourceNode | null = null;
  private engineGain: GainNode | null = null;
  private engineName = '';
  private volume: number;
  private muted: boolean;
  listenerX = 0;
  listenerY = 0;

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
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume * 0.6;
      const comp = ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(ctx.destination);
      const names = new Set([...Object.values(VOICES).map((v) => v.file), 'siren', ...ENGINES]);
      for (const name of names) {
        const url = urlOf(name);
        if (!url) continue;
        fetch(url).then((r) => r.arrayBuffer()).then((a) => ctx.decodeAudioData(a))
          .then((b) => this.buffers.set(name, b)).catch(() => { /* that sound stays silent */ });
      }
    } catch { this.ctx = null; }
    return this.ctx;
  }

  /** Distance gain for a world position (null = at the listener). */
  private falloff(x: number | null, y: number | null): number {
    if (x === null || y === null) return 1;
    const d = Math.hypot(x - this.listenerX, y - this.listenerY);
    return 1 / (1 + (d / 30) ** 2);
  }

  /** Plays a voice at a world position (null = at the listener). */
  play(voice: string, x: number | null = null, y: number | null = null): void {
    const ctx = this.ensure();
    const v = VOICES[voice];
    if (!ctx || !this.master || !v || this.muted || this.volume <= 0) return;
    const g = this.falloff(x, y);
    const buf = this.buffers.get(v.file);
    if (g < 0.02 || !buf || this.playing >= MAX_VOICES) return;
    const t = ctx.currentTime;
    if (v.gap && t - (this.lastPlay.get(voice) ?? -1) < v.gap) return;
    this.lastPlay.set(voice, t);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (v.vary) src.playbackRate.value = 1 + (Math.random() * 2 - 1) * v.vary;
    const gain = ctx.createGain();
    gain.gain.value = v.gain * g;
    src.connect(gain).connect(this.master);
    this.playing++;
    src.onended = () => { this.playing--; src.disconnect(); gain.disconnect(); };
    src.start(t);
  }

  /** Call every frame with your vehicle's engine voice (or null on foot) and how hard it's working
   *  (0 idle .. 1 flat out): one loop whose pitch and level follow it. Traffic has no engine sound. */
  engine(name: string | null, load: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (this.engineSrc && name !== this.engineName) this.stopEngine();
    const buf = name ? this.buffers.get(name) : undefined;
    if (!name || !buf || this.muted) return;
    if (!this.engineSrc) {
      this.engineName = name;
      this.engineSrc = ctx.createBufferSource();
      this.engineSrc.buffer = buf;
      this.engineSrc.loop = true;
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineSrc.connect(this.engineGain).connect(this.master);
      this.engineSrc.start(ctx.currentTime, Math.random() * buf.duration);
    }
    const k = Math.max(0, Math.min(1, load));
    this.engineSrc.playbackRate.setTargetAtTime(ENGINE.rate + ENGINE.pitch * k, ctx.currentTime, 0.12);
    this.engineGain!.gain.setTargetAtTime(ENGINE.gain * (1 + ENGINE.rise * k), ctx.currentTime, 0.12);
  }

  private stopEngine(): void {
    this.engineSrc?.stop();
    this.engineSrc?.disconnect(); this.engineGain?.disconnect();
    this.engineSrc = null; this.engineGain = null; this.engineName = '';
  }

  /** Call every frame with the nearest siren (or null): one looping wail that follows it. */
  siren(at: { x: number; y: number } | null): void {
    const ctx = this.ctx;
    const buf = this.buffers.get('siren');
    if (!ctx || !this.master || !buf) return;
    const want = at && !this.muted ? SIREN_GAIN * this.falloff(at.x, at.y) : 0;
    if (want > 0 && !this.sirenSrc) {
      this.sirenSrc = ctx.createBufferSource();
      this.sirenSrc.buffer = buf;
      this.sirenSrc.loop = true;
      this.sirenGain = ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenSrc.connect(this.sirenGain).connect(this.master);
      this.sirenSrc.start(ctx.currentTime, Math.random() * buf.duration);
    }
    if (!this.sirenSrc || !this.sirenGain) return;
    this.sirenGain.gain.setTargetAtTime(want, ctx.currentTime, 0.15);
    if (want === 0 && this.sirenGain.gain.value < 0.003) {
      this.sirenSrc.stop();
      this.sirenSrc.disconnect(); this.sirenGain.disconnect();
      this.sirenSrc = null; this.sirenGain = null;
    }
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
