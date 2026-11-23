// The radio line's waveform: one smooth, flowing, glowing wave whose height follows the music actually
// playing, band by band (bass left, treble right). The radio's
// two decks are routed through an AnalyserNode once an AudioContext is running (routing them earlier
// would silence them), then on to the speakers as before. Routed, an element's own volume no longer
// counts (Chrome ignores it), so each deck gets a GainNode and the radio sets its level there
// (`gains`); the elements stay at full volume.

/** Bands across the line, how quickly they swell and settle (per second), the bands' range, and
 *  how finely the curve is drawn. */
const POINTS = 48;
const RISE = 16, FOLLOW = 4;
const LO_HZ = 50, HI_HZ = 12000;
const SAMPLES = 170;

export class RadioEq {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private wave = new Float32Array(POINTS);
  private smooth = new Float32Array(POINTS);
  private phase = 0;
  private attached = false;
  private trying = false;
  /** Per-deck level once routed (null until then: the radio sets the elements' volume instead). */
  gains: GainNode[] | null = null;
  readonly canvas = document.createElement('canvas');

  constructor() {
    this.canvas.className = 'rl-wave';
    this.canvas.width = 680; this.canvas.height = 76; // drawn at 2x, shown at 340 x 38
  }

  /** Routes the decks through the analyser (once; only when sound is allowed to run). */
  attach(decks: HTMLAudioElement[]): void {
    if (this.attached || this.trying) return;
    try {
      const ctx = this.ctx ?? (this.ctx = new AudioContext());
      const go = () => {
        if (this.attached || ctx.state !== 'running') return;
        const an = ctx.createAnalyser();
        an.fftSize = 2048;
        an.smoothingTimeConstant = 0.45;
        this.gains = decks.map((d) => {
          const g = ctx.createGain();
          g.gain.value = d.volume; // carry the level over, then the element plays flat out
          d.volume = 1;
          ctx.createMediaElementSource(d).connect(g).connect(an);
          return g;
        });
        an.connect(ctx.destination);
        this.analyser = an;
        this.data = new Uint8Array(an.fftSize);
        this.attached = true;
      };
      if (ctx.state === 'running') go();
      else { this.trying = true; void ctx.resume().then(go).finally(() => { this.trying = false; }); }
    } catch { /* no Web Audio: the line stays flat */ }
  }

  /** Draws the line in `color`; `gain` undoes the music volume so quiet settings still move it. */
  draw(dt: number, color: string, gain: number): void {
    const an = this.analyser, ctx = this.ctx;
    const fall = Math.min(1, dt * FOLLOW), rise = Math.min(1, dt * RISE);
    if (an && ctx) {
      // Each point's height is the loudness of its own band (bass on the left, treble on the
      // right): up at once on a hit, back down slowly, so beats spike instead of averaging away.
      an.getByteFrequencyData(this.data);
      const nyq = ctx.sampleRate / 2, n = an.frequencyBinCount;
      const lift = Math.min(1.6, Math.max(0.7, gain * 0.7)); // quiet music settings still move it
      for (let i = 0; i < POINTS; i++) {
        const f0 = LO_HZ * (HI_HZ / LO_HZ) ** (i / POINTS), f1 = LO_HZ * (HI_HZ / LO_HZ) ** ((i + 1) / POINTS);
        const a = Math.floor((f0 / nyq) * n), b = Math.max(a + 1, Math.ceil((f1 / nyq) * n));
        let m = 0;
        for (let j = a; j < b; j++) m = Math.max(m, this.data[j]);
        // Spread the loud end (0.38..0.88 of the dB scale) over the full height; treble gets a lift.
        const v = Math.min(1, Math.max(0, (m / 255 - 0.38) / 0.5) ** 1.15 * lift * (1 + i / POINTS * 0.6));
        // Swells quickly on a hit and settles slowly: lively, never twitchy.
        this.wave[i] += (v - this.wave[i]) * (v > this.wave[i] ? rise : fall);
      }
    } else for (let i = 0; i < POINTS; i++) this.wave[i] *= 1 - fall;
    // Blur across neighbouring bands so the shape rolls rather than steps.
    for (let i = 0; i < POINTS; i++) {
      let s = 0, n = 0;
      for (let j = -3; j <= 3; j++) { const k = i + j; if (k < 0 || k >= POINTS) continue; const wt = 4 - Math.abs(j); s += this.wave[k] * wt; n += wt; }
      this.smooth[i] = s / n;
    }
    const loud = this.smooth.reduce((a, b) => a + b, 0) / POINTS;
    this.phase += dt * (2.2 + loud * 5); // the wave flows faster when the music is busier
    const g = this.canvas.getContext('2d')!;
    const w = this.canvas.width, h = this.canvas.height, mid = h / 2;
    g.clearRect(0, 0, w, h);
    g.lineJoin = 'round'; g.lineCap = 'round';
    // One flowing wave whose height follows the music band by band, fading out at both ends.
    const path = () => {
      g.beginPath();
      for (let s = 0; s <= SAMPLES; s++) {
        const t = s / SAMPLES, x = t * w;
        const f = t * (POINTS - 1), i = Math.floor(f), env = this.smooth[i] + (this.smooth[Math.min(POINTS - 1, i + 1)] - this.smooth[i]) * (f - i);
        const taper = Math.sin(t * Math.PI);
        const osc = 0.7 * Math.sin(t * 30 + this.phase) + 0.3 * Math.sin(t * 57 - this.phase * 1.6);
        const y = mid - osc * (0.06 + env) * taper * (mid - 4);
        if (s) g.lineTo(x, y); else g.moveTo(x, y);
      }
    };
    path();
    g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 9; g.stroke();
    path();
    g.shadowColor = color; g.shadowBlur = 14;
    g.strokeStyle = color; g.lineWidth = 4; g.stroke();
    g.shadowBlur = 0;
  }
}
