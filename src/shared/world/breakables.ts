// Street furniture vehicles can knock over (packs/streetProps.ts): where the city puts it, a grid to
// find it near a point, and what a vehicle does when it meets one. Worked out from the city alone, so
// the server, the client's prediction and the drawing agree. Fast enough, a vehicle knocks it flat
// and loses a little speed; slower, it's in the way like a wall. Shared physics: pure.
import { STREET_PROPS, ZONES } from '../packs';
import { Rng } from '../rng';
import type { Body } from '../sim/physics';
import type { City } from './cityTypes';
import { obbVsCircle } from './collision';

/** One piece of street furniture: its kind (STREET_PROPS index), spot, and the way over the road
 *  (a lamp's arm reaches out that way). */
export interface StreetProp { kind: number; x: number; y: number; ox: number; oy: number }

const CELL = 16;

export class Breakables {
  readonly list: StreetProp[] = [];
  private cells = new Map<number, number[]>();

  constructor(city: City) {
    STREET_PROPS.forEach((spec, kind) => {
      if (spec.along === 'road') this.alongRoads(city, kind, spec.every ?? 34);
    });
    this.onKerbs(city);
    this.list.forEach((p, i) => {
      const k = this.key(Math.floor(p.x / CELL), Math.floor(p.y / CELL));
      const arr = this.cells.get(k);
      if (arr) arr.push(i); else this.cells.set(k, [i]);
    });
  }

  private key(i: number, j: number): number { return j * 4096 + i; }

  /** Lamp-post style: down every road (not bridges), alternating sides, arms out over the road. */
  private alongRoads(city: City, kind: number, every: number): void {
    for (const s of city.segs) {
      if (s.bridge) continue;
      const len = s.axis === 'h' ? s.x1 - s.x0 : s.y1 - s.y0;
      const side = s.width / 2 + 0.6;
      for (let p = 16; p < len - 10; p += every) {
        const flip = Math.floor(p / every) % 2 ? 1 : -1;
        const x = s.axis === 'h' ? s.x0 + p : s.x0 + side * flip;
        const y = s.axis === 'h' ? s.y0 + side * flip : s.y0 + p;
        this.list.push({ kind, x, y, ox: s.axis === 'v' ? -flip : 0, oy: s.axis === 'h' ? -flip : 0 });
      }
    }
  }

  /** Hydrants, bins and boxes on the kerbs of each block (not parks or compounds). */
  private onKerbs(city: City): void {
    const rng = new Rng(city.seed ^ 0xb11d);
    const kerb = STREET_PROPS.map((s, kind) => ({ s, kind })).filter(({ s }) => s.along === 'kerb');
    for (const b of city.blocks) {
      const z = ZONES[b.zone];
      if (z.layout === 'park' || z.layout === 'compound') continue;
      const r = b.rect;
      for (const { s, kind } of kerb) {
        if (s.busyOnly && !z.busy) continue;
        const [lo, hi] = s.perBlock ?? [0, 1];
        for (let n = rng.int(lo, hi); n > 0; n--) {
          const side = Math.floor(rng.next() * 4), t = rng.range(0.15, 0.85), inset = s.radius + 0.4;
          const x = side === 1 ? r.x1 - inset : side === 3 ? r.x0 + inset : r.x0 + (r.x1 - r.x0) * t;
          const y = side === 0 ? r.y0 + inset : side === 2 ? r.y1 - inset : r.y0 + (r.y1 - r.y0) * t;
          this.list.push({ kind, x, y, ox: side === 1 ? 1 : side === 3 ? -1 : 0, oy: side === 0 ? -1 : side === 2 ? 1 : 0 });
        }
      }
    }
  }

  /** Calls `fn` with the index of every prop within `r` of (x, y). */
  near(x: number, y: number, r: number, fn: (i: number) => void): void {
    const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((y - r) / CELL), j1 = Math.floor((y + r) / CELL);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (const k of this.cells.get(this.key(i, j)) ?? []) fn(k);
  }

  /** A vehicle (half length and width) meets the standing props it's touching: fast enough, each is
   *  knocked flat (`knock` is told, with the way it was hit) and the vehicle keeps `slow` of its
   *  speed; slower, the prop stops it like a wall. */
  meet(b: Body, hl: number, hw: number, standing: (i: number) => boolean, knock: (i: number, angle: number) => void): void {
    // A vehicle standing still is left where it is (parked against a hydrant, say).
    if (Math.abs(b.vx) + Math.abs(b.vy) < 0.3) return;
    const c = Math.cos(b.angle), s = Math.sin(b.angle);
    this.near(b.x, b.y, hl + 1, (i) => {
      if (!standing(i)) return;
      const p = this.list[i], spec = STREET_PROPS[p.kind];
      const h = obbVsCircle(b.x, b.y, c, s, hl, hw, { x: p.x, y: p.y, r: spec.radius });
      if (!h) return;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed >= spec.knockSpeed) {
        knock(i, Math.atan2(b.vy, b.vx));
        b.vx *= spec.slow; b.vy *= spec.slow;
        return;
      }
      // Too slow to knock it down: it's in the way.
      b.x += h.nx * h.depth; b.y += h.ny * h.depth;
      const vn = b.vx * h.nx + b.vy * h.ny;
      if (vn < 0) { b.vx -= vn * h.nx; b.vy -= vn * h.ny; }
    });
  }
}
