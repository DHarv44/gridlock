// The ground's real height: open country rises and falls with the land's shape (world/relief.ts);
// towns, water and the railway stay level, the hills easing down to them over FALL metres. A grid
// of heights every STEP metres, built once at world generation from the seed (Rng-free arithmetic,
// no trig), so the server and every client agree bit for bit. How hilly is a noun: each wild zone's
// WildSpec.relief, scaled by WorldSpec.terrain. A world without `terrain` is flat (z 0 everywhere).
//
// Heights are where the ground is; a body's z stays above its own ground, so collision, cover
// heights and the rest work as on flat ground. Movement asks `grade` to climb slower and run
// downhill a little faster; sight lines ask `groundZ` so ridges hide what's behind them.
import { ZONES } from '../packs';
import { MAP_SIZE } from './cityTypes';
import type { City } from './cityTypes';
import type { CityMap } from './city';
import { relief } from './relief';
import { WORLD } from './worldSpec';

/** Grid spacing (m), the distance (m) over which hills ease down to level ground, the relief value
 *  that sits at ground level (so the land runs both above and below the towns), and how wide (m)
 *  the zone-to-zone blend of hilliness is. */
const STEP = 8, FALL = 60, LEVEL = 0.45, BLEND = 6;

export interface Terrain {
  step: number;
  /** Points per side; point (i, j) is at (i * step, j * step). */
  n: number;
  h: Float32Array;
}

/** The ground heights for a generated city, or undefined for a flat world. */
export function buildTerrain(city: City, map: CityMap): Terrain | undefined {
  const scale = WORLD.terrain?.scale ?? 0;
  if (scale <= 0) return undefined;
  const n = Math.ceil(MAP_SIZE / STEP) + 1, N = n * n;
  // Open ground (a wild zone, dry, off the railway's bed) carries its zone's hilliness.
  const amp = new Float32Array(N);
  const open = new Uint8Array(N);
  const rail = city.railway;
  const railHalf = rail ? rail.width / 2 + 14 : 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = i * STEP, y = j * STEP, k = j * n + i;
      const z = map.zoneAt(x, y);
      const w = z >= 0 && ZONES[z].layout === 'wild' ? ZONES[z].wild : undefined;
      if (!w || map.isWater(x, y)) continue;
      if (rail && Math.abs((rail.axis === 'h' ? y : x) - rail.pos) < railHalf) continue;
      open[k] = 1;
      amp[k] = (w.relief ?? 0) * scale;
    }
  }
  // Water lies level to its banks: a grid step round each pond and the river is level too, so no
  // grid cell straddling the bank tips the water's edge.
  const wet = [...city.ponds, ...(map.river ? [map.river] : [])];
  for (const r of wet) {
    const i0 = Math.max(0, Math.floor(r.x0 / STEP) - 1), i1 = Math.min(n - 1, Math.ceil(r.x1 / STEP) + 1);
    const j0 = Math.max(0, Math.floor(r.y0 / STEP) - 1), j1 = Math.min(n - 1, Math.ceil(r.y1 / STEP) + 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) open[j * n + i] = 0;
  }
  blur(amp, n, BLEND);
  blur(amp, n, BLEND);
  const d = distance(open, n);
  const h = new Float32Array(N);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      if (!open[k]) continue;
      const t = Math.min(1, d[k] / FALL), mask = t * t * (3 - 2 * t);
      h[k] = (relief(city.seed, i * STEP, j * STEP) - LEVEL) * amp[k] * mask;
    }
  }
  return { step: STEP, n, h };
}

/** Ground height (m) at (x, y): 0 off the map (and on upper floors, far past it) or in a flat world. */
export function groundZ(t: Terrain | undefined, x: number, y: number): number {
  if (!t) return 0;
  const fx = x / t.step, fy = y / t.step;
  const i = Math.floor(fx), j = Math.floor(fy);
  if (i < 0 || j < 0 || i >= t.n - 1 || j >= t.n - 1) return 0;
  const u = fx - i, v = fy - j, k = j * t.n + i, h = t.h;
  const a = h[k], b = h[k + 1], c = h[k + t.n], e = h[k + t.n + 1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v;
}

/** Rise per metre heading along (dx, dy) (a unit vector) at (x, y): + uphill, - downhill. */
export function grade(t: Terrain | undefined, x: number, y: number, dx: number, dy: number): number {
  if (!t) return 0;
  return (groundZ(t, x + dx * 2, y + dy * 2) - groundZ(t, x - dx * 2, y - dy * 2)) / 4;
}

/** Sample spacing (m) along a sight line, the stretch at each end left out (the slope you stand
 *  on doesn't hide you), and how far the ground must rise over the line to block it. */
const LOOK = 3, ENDS = 2, CLEAR = 0.15;

/**
 * Where the ground first rises over the line from (x0, y0) to (x1, y1), each end z above its own
 * ground (a fraction along it, before `until`), or null if nothing in between stands in the way.
 */
export function terrainHit(t: Terrain | undefined, x0: number, y0: number, x1: number, y1: number, z: number, until = 1): number | null {
  if (!t) return null;
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len <= ENDS * 2) return null;
  const z0 = groundZ(t, x0, y0) + z, z1 = groundZ(t, x1, y1) + z;
  const n = Math.ceil(len / LOOK), lo = ENDS / len, hi = Math.min(until, 1 - ENDS / len);
  for (let k = 1; k < n; k++) {
    const f = k / n;
    if (f < lo) continue;
    if (f > hi) break;
    if (groundZ(t, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f) > z0 + (z1 - z0) * f + CLEAR) return f;
  }
  return null;
}

/** Steepest uphill slowdown and the downhill boost a body gets from the ground (factors on its top
 *  speed): a 10% climb costs about a quarter, a descent gives up to a tenth. */
const UPHILL = 2.6, DOWNHILL = 0.6, SLOWEST = 0.4, FASTEST = 1.1;
export function slopeFactor(g: number): number {
  return g > 0 ? Math.max(SLOWEST, 1 - g * UPHILL) : Math.min(FASTEST, 1 - g * DOWNHILL);
}

// ------------------------------------------------------------------ the client's installed ground

let installed: Terrain | undefined;
/** The client installs its city's ground once, for drawing (render code asks `groundAt`). */
export function installTerrain(t: Terrain | undefined): void { installed = t; }
export const groundAt = (x: number, y: number): number => groundZ(installed, x, y);
/** The lowest ground under a footprint of radius r: where to stand a thing so no side floats. */
export function groundUnder(x: number, y: number, r: number): number {
  if (!installed) return 0;
  return Math.min(groundAt(x, y), groundAt(x - r, y), groundAt(x + r, y), groundAt(x, y - r), groundAt(x, y + r));
}

// ------------------------------------------------------------------ grid helpers

/** Box blur of radius r points, in place (rows then columns). */
function blur(a: Float32Array, n: number, r: number): void {
  const tmp = new Float32Array(n);
  for (let pass = 0; pass < 2; pass++) {
    for (let line = 0; line < n; line++) {
      const at = (s: number) => (pass ? s * n + line : line * n + s);
      let sum = 0, cnt = 0;
      for (let s = 0; s <= r && s < n; s++) { sum += a[at(s)]; cnt++; }
      for (let s = 0; s < n; s++) {
        tmp[s] = sum / cnt;
        const add = s + r + 1, drop = s - r;
        if (add < n) { sum += a[at(add)]; cnt++; }
        if (drop >= 0) { sum -= a[at(drop)]; cnt--; }
      }
      for (let s = 0; s < n; s++) a[at(s)] = tmp[s];
    }
  }
}

/** Metres from each point to the nearest closed one (two-pass chamfer, 3-4 weights). */
function distance(open: Uint8Array, n: number): Float32Array {
  const BIG = 1e9, d = new Float32Array(n * n);
  for (let k = 0; k < n * n; k++) d[k] = open[k] ? BIG : 0;
  const A = STEP, D = STEP * 1.4;
  const relax = (k: number, o: number, w: number) => { if (d[o] + w < d[k]) d[k] = d[o] + w; };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      if (!d[k]) continue;
      if (i > 0) relax(k, k - 1, A);
      if (j > 0) { relax(k, k - n, A); if (i > 0) relax(k, k - n - 1, D); if (i < n - 1) relax(k, k - n + 1, D); }
    }
  }
  for (let j = n - 1; j >= 0; j--) {
    for (let i = n - 1; i >= 0; i--) {
      const k = j * n + i;
      if (!d[k]) continue;
      if (i < n - 1) relax(k, k + 1, A);
      if (j < n - 1) { relax(k, k + n, A); if (i < n - 1) relax(k, k + n + 1, D); if (i > 0) relax(k, k + n - 1, D); }
    }
  }
  return d;
}
