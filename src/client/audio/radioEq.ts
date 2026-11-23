// The radio line's waveform: a smooth, glowing line drawn from the music actually playing. The radio's
// two decks are routed through an AnalyserNode once an AudioContext is running (routing them earlier
// would silence them), then on to the speakers as before. Routed, an element's own volume no longer
// counts (Chrome ignores it), so each deck gets a GainNode and the radio sets its level there
// (`gains`); the elements stay at full volume.

/** Points along the line, and how quickly it follows the music (higher = twitchier). */
const POINTS = 96;
const FOLLOW = 14;

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
    const an = this.analyser;
    const k = Math.min(1, dt * FOLLOW);
    if (an) {
      an.getByteTimeDomainData(this.data);
      const step = Math.floor(this.data.length / POINTS);
      for (let i = 0; i < POINTS; i++) {
        // Average each stretch of samples: a calm line, not hiss.
        let s = 0;
        for (let j = 0; j < step; j++) s += this.data[i * step + j] - 128;
        const v = Math.max(-1, Math.min(1, (s / step / 128) * gain * 2.4));
        this.wave[i] += (v - this.wave[i]) * k;
      }
    } else for (let i = 0; i < POINTS; i++) this.wave[i] *= 1 - k;
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
        const y = mid - this.wave[i] * taper * (mid - 6);
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
