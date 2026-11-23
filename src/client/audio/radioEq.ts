// The radio line's waveform: a smooth, glowing line drawn from the music actually playing. The radio's
// two decks are routed through an AnalyserNode once an AudioContext is running (routing them earlier
// would silence them), then on to the speakers as before. Routed, an element's own volume no longer
// counts (Chrome ignores it), so each deck gets a GainNode and the radio sets its level there
// (`gains`); the elements stay at full volume.

/** Points along the line, how quickly a spike falls back (higher = quicker), and the bands shown. */
const POINTS = 72;
const FOLLOW = 6;
const LO_HZ = 50, HI_HZ = 12000;

export class RadioEq {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private wave = new Float32Array(POINTS);
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
    const fall = Math.min(1, dt * FOLLOW);
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
        this.wave[i] = v > this.wave[i] ? v : this.wave[i] + (v - this.wave[i]) * fall;
      }
    } else for (let i = 0; i < POINTS; i++) this.wave[i] *= 1 - fall;
    const g = this.canvas.getContext('2d')!;
    const w = this.canvas.width, h = this.canvas.height, mid = h / 2;
    g.clearRect(0, 0, w, h);
    g.lineJoin = 'round'; g.lineCap = 'round';
    // Fade the ends so the line grows out of nothing at either side.
    const path = () => {
      g.beginPath();
      for (let i = 0; i < POINTS; i++) {
        const x = (i / (POINTS - 1)) * w;
        const taper = Math.sin((i / (POINTS - 1)) * Math.PI);
        // Alternate up and down: a waveform whose swing is the band's loudness.
        const y = mid - (i % 2 ? 1 : -1) * this.wave[i] * (0.3 + 0.7 * taper) * (mid - 4);
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
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
