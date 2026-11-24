// Visual detail for buildings: massing (podiums, setbacks, split heights), parapets, rooftop
// equipment, pitched house roofs, storefront awnings. Footprints never exceed the collision box.
import type { Rect } from '../../shared/math';
import type { Rng } from '../../shared/rng';
import { type Building, DIR_VEC, type Lot } from '../../shared/world/cityTypes';
import type { Batch } from './instancing';

// Massing lives in shared/world/massing.ts (the server needs the same roofs).
import { KIND, type Mass } from '../../shared/world/massing';
export { KIND, type Mass, massesFor } from '../../shared/world/massing';

export interface DetailBatches {
  box: Batch;
  cyl: Batch;
  gable: Batch;
  glass: Batch;
}

const shade = (hex: string, k: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${((ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).padStart(6, '0')}`;
};

const inset = (r: Rect, d: number): Rect => ({ x0: r.x0 + d, y0: r.y0 + d, x1: r.x1 - d, y1: r.y1 - d });
const W = (r: Rect) => r.x1 - r.x0;
const D = (r: Rect) => r.y1 - r.y0;

/** Places non-overlapping rooftop items on a roof rectangle. */
class RoofPlanner {
  private used: Rect[] = [];
  constructor(private roof: Rect, private rng: Rng) {}
  place(w: number, d: number): Rect | null {
    const r = inset(this.roof, 1.2);
    if (W(r) < w || D(r) < d) return null;
    for (let k = 0; k < 8; k++) {
      const x = this.rng.range(r.x0, r.x1 - w), y = this.rng.range(r.y0, r.y1 - d);
      const c = { x0: x, y0: y, x1: x + w, y1: y + d };
      if (this.used.some((u) => c.x0 < u.x1 + 0.6 && c.x1 > u.x0 - 0.6 && c.y0 < u.y1 + 0.6 && c.y1 > u.y0 - 0.6)) continue;
      this.used.push(c);
      return c;
    }
    return null;
  }
}

const cx = (r: Rect) => (r.x0 + r.x1) / 2;
const cy = (r: Rect) => (r.y0 + r.y1) / 2;

/** A rooftop box with walls (stair or lift housing): a graffiti spot too. */
export interface Housing { r: Rect; y: number; h: number }

/** What decoration added that changes where graffiti can go. */
export interface Decorated { housings: Housing[]; awning: number }

/** Adds the building's detail; returns its rooftop housings and the awning's side (Dir, or -1). */
export function decorate(b: Building, lot: Lot | undefined, masses: Mass[], rng: Rng, out: DetailBatches): Decorated {
  const housings: Housing[] = [];
  if (b.kind === 'house') { house(b, masses[0], rng, out); return { housings, awning: -1 }; }
  for (const m of masses) parapet(m, out);
  const top = masses.reduce((a, c) => (c.h > a.h ? c : a));
  for (const m of masses) {
    const isTop = m === top;
    const plan = new RoofPlanner(m.r, rng);
    const area = W(m.r) * D(m.r);
    const y = m.h;
    if (m.kind === KIND.metal) {
      // Skylight strips and a few vents on industrial roofs.
      const along = W(m.r) >= D(m.r);
      const len = (along ? W(m.r) : D(m.r)) - 4;
      const strips = Math.floor((along ? D(m.r) : W(m.r)) / 7);
      for (let k = 1; k <= strips; k++) {
        const off = (k / (strips + 1) - 0.5) * (along ? D(m.r) : W(m.r));
        if (along) out.glass.add(cx(m.r), y, cy(m.r) + off, len, 0.35, 1.6, '#9fc2d6');
        else out.glass.add(cx(m.r) + off, y, cy(m.r), 1.6, 0.35, len, '#9fc2d6');
      }
      for (let k = 0; k < Math.min(6, area / 300); k++) {
        const p = plan.place(1, 1);
        if (p) out.cyl.add(cx(p), y, cy(p), 0.6, 1.2, 0.6, '#8d9296');
      }
      continue;
    }
    if (isTop && b.kind === 'tower') {
      const sw = plan.place(5, 6);
      if (sw) { out.box.add(cx(sw), y, cy(sw), 5, 3.5, 6, shade(m.wall, 0.9)); housings.push({ r: sw, y, h: 3.5 }); }
      if (rng.chance(0.3) && W(m.r) > 22 && D(m.r) > 22) helipad(m, out);
      else if (rng.chance(0.5)) {
        out.cyl.add(cx(m.r) + rng.range(-3, 3), y, cy(m.r) + rng.range(-3, 3), 0.25, rng.range(3, 6), 0.25, '#b9bcc0');
      }
    } else if (rng.chance(0.6)) {
      const sw = plan.place(3, 4);
      if (sw) { out.box.add(cx(sw), y, cy(sw), 3, 2.6, 4, shade(m.wall, 0.9)); housings.push({ r: sw, y, h: 2.6 }); }
    }
    if (b.windows < 0.9 && rng.chance(0.35)) {
      // Water tank on legs.
      const t = plan.place(3.4, 3.4);
      if (t) {
        for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) out.box.add(cx(t) + dx * 1.1, y, cy(t) + dz * 1.1, 0.18, 2, 0.18, '#3a3330');
        out.cyl.add(cx(t), y + 2, cy(t), 3.2, 2.8, 3.2, '#7a5a3f');
        out.cyl.add(cx(t), y + 4.8, cy(t), 2.2, 0.6, 2.2, '#5a4030');
      }
    }
    const acs = Math.max(1, Math.min(7, Math.floor(area / 220)));
    for (let k = 0; k < acs; k++) {
      const p = plan.place(1.8, 2.6);
      if (!p) break;
      out.box.add(cx(p), y, cy(p), 1.8, 1.1, 2.6, rng.pick(['#a7abaf', '#bfc2c4', '#8f9498']));
      out.cyl.add(cx(p), y + 1.1, cy(p) - 0.5, 1.1, 0.06, 1.1, '#2b2e31');
    }
    for (let k = 0; k < Math.min(8, Math.floor(area / 140)); k++) {
      const p = plan.place(0.6, 0.6);
      if (p) out.cyl.add(cx(p), y, cy(p), 0.45, rng.range(0.5, 1.2), 0.45, '#6f7478');
    }
    if (rng.chance(0.18) && area > 300) {
      // Solar array.
      const p = plan.place(Math.min(10, W(m.r) * 0.4), Math.min(6, D(m.r) * 0.4));
      if (p) {
        for (let x = p.x0 + 0.9; x < p.x1 - 0.5; x += 1.9) out.glass.add(x, y + 0.3, cy(p), 1.6, 0.12, D(p), '#1d2b4a');
      }
    }
  }
  if (lot && lot.front >= 0 && !b.sign && b.kind === 'block' && b.h < 26 && rng.chance(0.5)) {
    awning(b, lot, rng, out);
    return { housings, awning: lot.front };
  }
  return { housings, awning: -1 };
}

function parapet(m: Mass, out: DetailBatches): void {
  const r = m.r, t = 0.35, h = m.kind === KIND.metal ? 0.5 : 1.0;
  const c = shade(m.wall, 0.92);
  out.box.add(cx(r), m.h, r.y0 + t / 2, W(r), h, t, c);
  out.box.add(cx(r), m.h, r.y1 - t / 2, W(r), h, t, c);
  out.box.add(r.x0 + t / 2, m.h, cy(r), t, h, D(r) - 2 * t, c);
  out.box.add(r.x1 - t / 2, m.h, cy(r), t, h, D(r) - 2 * t, c);
}

function helipad(m: Mass, out: DetailBatches): void {
  const x = cx(m.r), z = cy(m.r), y = m.h;
  out.cyl.add(x, y, z, 15, 0.25, 15, '#3d4046');
  out.cyl.add(x, y + 0.25, z, 13.6, 0.02, 13.6, '#e2b93b');
  out.cyl.add(x, y + 0.26, z, 12.6, 0.02, 12.6, '#3d4046');
  out.box.add(x - 1.8, y + 0.27, z, 0.8, 0.02, 5, '#f2f0ea');
  out.box.add(x + 1.8, y + 0.27, z, 0.8, 0.02, 5, '#f2f0ea');
  out.box.add(x, y + 0.27, z, 3.6, 0.02, 0.8, '#f2f0ea');
}

function house(b: Building, m: Mass, rng: Rng, out: DetailBatches): void {
  const r = m.r, along = W(r) >= D(r);
  const over = 0.5;
  out.gable.add(cx(r), m.h, cy(r), (along ? W(r) : D(r)) + over * 2, 2.4, (along ? D(r) : W(r)) + over * 2, b.roof, along ? 0 : Math.PI / 2);
  if (rng.chance(0.6)) {
    const t = rng.range(0.2, 0.8);
    const x = along ? r.x0 + W(r) * t : cx(r) + D(r) * 0.0 + rng.range(-1, 1);
    const z = along ? cy(r) + rng.range(-1, 1) : r.y0 + D(r) * t;
    out.box.add(x, m.h, z, 0.9, 3.3, 0.9, '#7a4a3a');
  }
}

const AWNINGS = ['#b0302a', '#2f6a3a', '#24508f', '#d9a32a', '#7a2a5a', '#2a7a7a'];

function awning(b: Building, lot: Lot, rng: Rng, out: DetailBatches): void {
  const r = b.rect;
  const [dx, dz] = DIR_VEC[lot.front as 0 | 1 | 2 | 3];
  const color = rng.pick(AWNINGS);
  const depth = 1.5;
  if (dx !== 0) {
    const x = dx > 0 ? r.x1 + depth / 2 : r.x0 - depth / 2;
    out.box.add(x, 3.1, cy(r), depth, 0.25, D(r) * 0.8, color);
  } else {
    const z = dz > 0 ? r.y1 + depth / 2 : r.y0 - depth / 2;
    out.box.add(cx(r), 3.1, z, W(r) * 0.8, 0.25, depth, color);
  }
}
