// Rock in open country, placed at world generation (shared: Rng and arithmetic only). A formation
// is a cluster of round columns: a core, lower shoulders round it, and talus at its foot, so from
// above it has a ragged natural outline, not a box; tall ones are buttes and mesas (sheer sides,
// flat tops). They stand on the high ground of the height map (world/relief.ts). Loose boulders lie
// scattered between. All of it is solid, as circles.
import type { Rect } from '../math';
import type { WildSpec } from '../packs/types';
import type { Rng } from '../rng';
import type { Rock } from './cityTypes';
import { relief } from './relief';

/** Tries per formation for the highest ground. */
const TRIES = 4;

/** Rock formations and boulders in one open-country area. `fits` says whether a footprint is
 *  clear (of ponds, other formations, the trail margin); taken footprints go in `clear`. */
export function landforms(rng: Rng, seed: number, area: Rect, spec: WildSpec, fits: (r: Rect) => boolean, clear: Rect[], out: Rock[]): void {
  const per = ((area.x1 - area.x0) * (area.y1 - area.y0)) / 10_000;
  const n = Math.floor(per * spec.rocks + rng.next());
  for (let k = 0; k < n; k++) {
    const s = rng.range(spec.rockSize[0], spec.rockSize[1]);
    const R = s / 2;
    // A few spots tried; the one highest on the land wins.
    let cx = 0, cy = 0, best = -1;
    for (let t = 0; t < TRIES; t++) {
      const x = rng.range(area.x0 + R + 4, area.x1 - R - 4), y = rng.range(area.y0 + R + 4, area.y1 - R - 4);
      const h = relief(seed, x, y);
      if (h > best) { best = h; cx = x; cy = y; }
    }
    const foot = { x0: cx - R - 5, y0: cy - R - 5, x1: cx + R + 5, y1: cy + R + 5 };
    if (best < 0 || !fits(foot)) continue;
    clear.push(foot);
    const H = rng.range(spec.rockHeight[0], spec.rockHeight[1]);
    const color = rng.pick(spec.rockColor);
    // Tall for its width: a butte or mesa, sheer and flat-topped; else a weathered lump.
    const mesa = H > R * 0.7 || rng.chance(0.35);
    out.push({ x: cx, y: cy, r: R * 0.62, h: H, color, mesa, v: rng.int(0, 3) });
    const lobes = rng.int(3, 5);
    for (let p = 0; p < lobes; p++) {
      out.push({ x: cx + rng.range(-1, 1) * R * 0.55, y: cy + rng.range(-1, 1) * R * 0.55, r: R * rng.range(0.3, 0.5),
        h: H * rng.range(mesa ? 0.6 : 0.45, mesa ? 0.95 : 0.85), color, mesa, v: rng.int(0, 3) });
    }
    // Talus: fallen blocks round the foot.
    const talus = rng.int(4, 9);
    for (let p = 0; p < talus; p++) {
      const ox = rng.range(-1, 1) * (R + 3), oy = rng.range(-1, 1) * (R + 3);
      if (ox * ox + oy * oy < R * R * 0.5) continue;
      out.push({ x: cx + ox, y: cy + oy, r: rng.range(0.5, 1.5), h: rng.range(0.5, 1.8), color, mesa: false, v: rng.int(0, 3) });
    }
  }
  // Loose boulders across the open ground.
  const nb = Math.floor(per * (spec.boulders ?? 0) + rng.next());
  for (let k = 0; k < nb; k++) {
    const r = rng.range(0.5, 1.7);
    const x = rng.range(area.x0 + 2, area.x1 - 2), y = rng.range(area.y0 + 2, area.y1 - 2);
    const foot = { x0: x - r - 1, y0: y - r - 1, x1: x + r + 1, y1: y + r + 1 };
    if (!fits(foot)) continue;
    out.push({ x, y, r, h: r * rng.range(0.7, 1.3), color: rng.pick(spec.rockColor), mesa: false, v: rng.int(0, 3) });
  }
}
