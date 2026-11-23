// Graphics quality: the player's saved choice, or an automatic step-down when frames run slow.
import type { Quality, Stage } from '../render/scene';

const KEY = 'gridlock.quality';
const SAMPLE_S = 5;

const load = (): Quality | null => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'high' || v === 'medium' || v === 'low' ? v : null;
  } catch { return null; }
};

export class QualityGovernor {
  private chosen: Quality | null = load();
  private frames: number[] = [];
  private elapsed = 0;
  private settle = 3; // ignore the first seconds (chunk streaming, shader compiles)
  onAuto: (q: Quality) => void = () => {};

  constructor(private stage: Stage) {
    if (this.chosen) stage.setQuality(this.chosen);
  }

  get current(): Quality {
    return this.stage.quality;
  }

  choose(q: Quality): void {
    this.chosen = q;
    try { localStorage.setItem(KEY, q); } catch { /* storage unavailable */ }
    this.stage.setQuality(q);
  }

  /** Feed real frame times; steps down one level if the median frame is slow. */
  sample(dt: number): void {
    if (this.chosen || this.current === 'low') return;
    if (this.settle > 0) { this.settle -= dt; return; }
    this.frames.push(dt);
    this.elapsed += dt;
    if (this.elapsed < SAMPLE_S) return;
    const sorted = [...this.frames].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    this.frames = [];
    this.elapsed = 0;
    if (median > 1 / 42) {
      const next: Quality = this.current === 'high' ? 'medium' : 'low';
      this.stage.setQuality(next);
      this.settle = 2;
      this.onAuto(next);
    }
  }
}
