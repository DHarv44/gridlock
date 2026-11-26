// Open country's ground, painted from the land's shape (shared/world/relief.ts): colour by height
// (pale washes, the zone's own ground, drier or redder tops), broad drifts of its ground colours,
// rock layers banding the steep slopes, and hillshading lit from the north-west as maps are. Zones
// blend into each other along wandering edges. Worked out at a metre a pixel and smoothed up.
import { ZONES, type ZoneSpec } from '../../shared/packs';
import type { CityMap } from '../../shared/world/city';
import { relief, vnoise, warp } from '../../shared/world/relief';

type RGB = [number, number, number];
const rgb = (hex: string): RGB => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export { rgb, type RGB };

/** A wild zone's colours, ready to blend. */
interface Look { amp: number; low: RGB; mid: RGB; high: RGB; drift: RGB[]; strata: RGB[] }
const looks = new Map<number, Look | null>();
function lookOf(zi: number): Look | null {
  if (looks.has(zi)) return looks.get(zi)!;
  const z: ZoneSpec | undefined = ZONES[zi];
  const w = z?.layout === 'wild' ? z.wild : undefined;
  const mid = w ? rgb(z!.ground) : null;
  const look = w && mid ? {
    amp: w.relief ?? 0, mid, low: w.low ? rgb(w.low) : mid, high: w.high ? rgb(w.high) : mid,
    drift: w.ground.map(rgb), strata: (w.strata ?? []).map(rgb),
  } : null;
  looks.set(zi, look);
  return look;
}

/** Whether this universe has any open country to paint. */
export const hasWild = (): boolean => ZONES.some((z) => z.layout === 'wild');

/** How far (m) the edge between two kinds of country wanders, and how much it frays close up. */
const WOBBLE = 22, FRAY = 9;
/** Hillshade strength, and the light's direction over the map (from the north-west). */
const SHADE = 1.25, LX = -0.707, LY = -0.707;
/** Height of one rock layer (m). */
const LAYER = 2.4;

/**
 * Paints the chunk [X0, X0 + size) x [Y0, Y0 + size) of open country into `ctx` (in world metres).
 * Pixels outside open country are left clear for the town painting under/over them.
 */
export function paintRelief(ctx: CanvasRenderingContext2D, map: CityMap, X0: number, Y0: number, size: number): void {
  const seed = map.city.seed;
  // Each metre's zone, found at a point wobbled at two scales: where one kind of country gives way
  // to another the line wanders and frays, as soil and rock change, rather than ruling straight.
  const looksAt: (Look | null)[] = new Array(size * size);
  let any = false;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = X0 + i + 0.5, y = Y0 + j + 0.5;
      const [dx, dy] = warp(seed, x, y, WOBBLE);
      const fx = (vnoise(x / 7, y / 7, seed + 613) - 0.5) * FRAY, fy = (vnoise(x / 7, y / 7, seed + 827) - 0.5) * FRAY;
      const z = map.zoneAt(x + dx + fx, y + dy + fy);
      const look = z >= 0 ? lookOf(z) : null;
      looksAt[j * size + i] = look;
      if (look) any = true;
    }
  }
  if (!any) return;
  // Heights on the metre grid (one extra row and column for slopes).
  const n = size + 1;
  const H = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) H[j * n + i] = relief(seed, X0 + i, Y0 + j);

  const img = new ImageData(size, size);
  const d = img.data;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const l = looksAt[j * size + i];
      if (!l) continue;
      const h = H[j * n + i];
      const gx = H[j * n + i + 1] - h, gy = H[(j + 1) * n + i] - h;
      const drift = vnoise((X0 + i) / 85, (Y0 + j) / 85, seed + 3301);
      const c = zoneColor(l, h, gx, gy, drift);
      // Hillshade: slopes facing the light brighter, the far sides darker (slope in m per m).
      const shade = Math.min(1.22, Math.max(0.74, 1.03 - SHADE * l.amp * (gx * LX + gy * LY)));
      const k = (j * size + i) * 4;
      d[k] = c[0] * shade; d[k + 1] = c[1] * shade; d[k + 2] = c[2] * shade;
      d[k + 3] = 255;
    }
  }
  const off = document.createElement('canvas');
  off.width = off.height = size;
  off.getContext('2d')!.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(off, X0, Y0, size, size);
}

/** One zone's colour at a height (0..1) and slope, with its drift colour mixed in. */
function zoneColor(l: Look, h: number, gx: number, gy: number, drift: number): RGB {
  let c = h < 0.5 ? mix(l.low, l.mid, h / 0.5) : mix(l.mid, l.high, (h - 0.5) / 0.5);
  if (l.drift.length) {
    const f = drift * (l.drift.length - 1), k = Math.floor(f);
    c = mix(c, mix(l.drift[k], l.drift[Math.min(k + 1, l.drift.length - 1)], f - k), 0.3);
  }
  if (l.strata.length) {
    // Rock layers show where it's steep: bands by height, stronger the steeper.
    const slope = Math.hypot(gx, gy) * l.amp;
    const band = l.strata[Math.floor((h * l.amp) / LAYER) % l.strata.length];
    c = mix(c, band, Math.min(0.85, slope * 1.4));
  }
  return c;
}
