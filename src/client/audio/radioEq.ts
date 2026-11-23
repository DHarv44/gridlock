// The radio line's equaliser: a dozen thin bars that move with the music actually playing. The
// radio's two decks are routed through an AnalyserNode once an AudioContext is running (routing them
// earlier would silence them), then on to the speakers as before. Routed, an element's own volume
// no longer counts (Chrome ignores it), so each deck gets a GainNode and the radio sets its level
// there (`gains`); the elements stay at full volume.

const BARS = 12;
const LO_HZ = 60, HI_HZ = 9000;

export class RadioEq {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private levels = new Float32Array(BARS);
  private attached = false;
  private trying = false;
  /** Per-deck level once routed (null until then: the radio sets the elements' volume instead). */
  gains: GainNode[] | null = null;
  readonly canvas = document.createElement('canvas');

  constructor() {
    this.canvas.className = 'rl-eq';
    this.canvas.width = 96; this.canvas.height = 28; // drawn at 2x, shown at 48 x 14
  }

  /** Routes the decks through the analyser (once; only when sound is allowed to run). */
  attach(decks: HTMLAudioElement[]): void {
    if (this.attached || this.trying) return;
    try {
      const ctx = this.ctx ?? (this.ctx = new AudioContext());
      const go = () => {
        if (this.attached || ctx.state !== 'running') return;
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        an.smoothingTimeConstant = 0.75;
        this.gains = decks.map((d) => {
          const g = ctx.createGain();
          g.gain.value = d.volume; // carry the level over, then the element plays flat out
          d.volume = 1;
          ctx.createMediaElementSource(d).connect(g).connect(an);
          return g;
        });
        an.connect(ctx.destination);
        this.analyser = an;
        this.data = new Uint8Array(an.frequencyBinCount);
        this.attached = true;
      };
      if (ctx.state === 'running') go();
      else { this.trying = true; void ctx.resume().then(go).finally(() => { this.trying = false; }); }
    } catch { /* no Web Audio: the bars stay still */ }
  }

  /** Draws the bars in `color`; `gain` undoes the music volume so quiet settings still move them. */
  draw(dt: number, color: string, gain: number): void {
    const an = this.analyser, ctx = this.ctx;
    if (an && ctx) {
      an.getByteFrequencyData(this.data);
      const nyq = ctx.sampleRate / 2, n = this.data.length;
      for (let i = 0; i < BARS; i++) {
        // Log-spaced bands, so the bass doesn't get one bar and the cymbals eight.
        const f0 = LO_HZ * (HI_HZ / LO_HZ) ** (i / BARS), f1 = LO_HZ * (HI_HZ / LO_HZ) ** ((i + 1) / BARS);
        const a = Math.floor((f0 / nyq) * n), b = Math.max(a + 1, Math.ceil((f1 / nyq) * n));
        let s = 0;
        for (let k = a; k < b; k++) s += this.data[k];
        const v = Math.min(1, (s / (b - a) / 255) * gain * (1 + i * 0.06));
        // Quick to rise, slow to fall: reads as music, not flicker.
        this.levels[i] = v > this.levels[i] ? v : this.levels[i] + (v - this.levels[i]) * Math.min(1, dt * 7);
      }
    } else this.levels.fill(0);
    const g = this.canvas.getContext('2d')!;
    const w = this.canvas.width, h = this.canvas.height, bw = w / BARS;
    g.clearRect(0, 0, w, h);
    g.fillStyle = color;
    for (let i = 0; i < BARS; i++) {
      const bh = Math.max(2, this.levels[i] ** 1.4 * h);
      g.fillRect(i * bw + 1, h - bh, bw - 3, bh);
    }
  }
}
