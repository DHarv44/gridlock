// Engine sounds: your own vehicle's, and the few nearest moving vehicles around you. Each engine runs
// through its gears: within a gear the pitch (playback rate) climbs from `low` to `high`, then drops
// at the shift; stopped, it idles at the recording's own pitch. `gain` is the idle level, and on the
// throttle it rises by `push`. A diesel truck stays low and narrow; a V8 or a bike revs high.

export const ENGINES: Record<string, { gears: number; low: number; high: number; gain: number; push: number }> = {
  engine_car: { gears: 5, low: 1.05, high: 1.85, gain: 0.1, push: 0.6 },
  engine_suv: { gears: 5, low: 1.0, high: 1.7, gain: 0.1, push: 0.55 },
  engine_sport: { gears: 6, low: 1.1, high: 2.2, gain: 0.11, push: 0.8 },
  engine_muscle: { gears: 4, low: 1.05, high: 1.95, gain: 0.12, push: 0.8 },
  engine_diesel: { gears: 8, low: 1.0, high: 1.38, gain: 0.11, push: 0.5 },
  engine_bike: { gears: 5, low: 1.1, high: 2.3, gain: 0.1, push: 0.7 },
};
/** Traffic engines: how many at once, how far they carry, and how loud against your own. */
export const TRAFFIC = { max: 3, range: 25, gain: 0.6 };

/** Playback rate for an engine at `speed` (fraction of its top speed). */
function revs(e: (typeof ENGINES)[string], speed: number): number {
  if (speed <= 0.02) return 1;
  const g = Math.min(e.gears - 1, Math.floor(speed * e.gears));
  return e.low + (e.high - e.low) * (speed * e.gears - g);
}

/** One looping engine. */
export class EngineVoice {
  private src: AudioBufferSourceNode;
  private gain: GainNode;

  constructor(private ctx: AudioContext, out: AudioNode, buf: AudioBuffer, readonly name: string) {
    this.src = ctx.createBufferSource();
    this.src.buffer = buf;
    this.src.loop = true;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.src.connect(this.gain).connect(out);
    this.src.start(ctx.currentTime, Math.random() * buf.duration);
  }

  /** speed: fraction of top speed; throttle 0..1; level: extra gain (distance, traffic share). */
  set(speed: number, throttle: number, level = 1): void {
    const e = ENGINES[this.name];
    const s = Math.max(0, Math.min(1, speed)), th = Math.max(0, Math.min(1, throttle));
    const t = this.ctx.currentTime;
    // Revs climb quickly on the throttle and sag slowly off it.
    this.src.playbackRate.setTargetAtTime(revs(e, s), t, th > 0.1 ? 0.06 : 0.18);
    this.gain.gain.setTargetAtTime(e.gain * (1 + e.push * th) * (0.85 + 0.3 * s) * level, t, 0.1);
  }

  /** Fades out over a moment, then stops. */
  stop(): void {
    const t = this.ctx.currentTime;
    this.gain.gain.setTargetAtTime(0, t, 0.08);
    this.src.stop(t + 0.4);
    this.src.onended = () => { this.src.disconnect(); this.gain.disconnect(); };
  }
}
