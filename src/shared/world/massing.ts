// Building massing: the blocks a building is drawn as (tower podiums and shafts, split-height
// blocks, houses under a pitched roof). Shared so the server knows the same roofs the client draws
// (helicopters set down on them: world/collision.ts floorAt). Each building has its own seeded RNG,
// so the result doesn't depend on anything else generated around it.
import type { Rect } from '../math';
import { Rng } from '../rng';
import type { Building } from './cityTypes';

export interface Mass { r: Rect; base: number; h: number; wall: string; roof: string; win: number; kind: number }

/** kind codes for the building shader: 0 flat roof, 1 corrugated (warehouse), 2 house. */
export const KIND = { flat: 0, metal: 1, house: 2 } as const;

const shade = (hex: string, k: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${((ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).padStart(6, '0')}`;
};
const inset = (r: Rect, d: number): Rect => ({ x0: r.x0 + d, y0: r.y0 + d, x1: r.x1 - d, y1: r.y1 - d });
const W = (r: Rect) => r.x1 - r.x0;
const D = (r: Rect) => r.y1 - r.y0;

/** The masses of building `bi` in a city generated from `seed`. */
export function massesFor(b: Building, seed: number, bi: number): Mass[] {
  const rng = new Rng((seed ^ 0xb11d) + Math.imul(bi + 1, 0x9e3779b1));
  const win = b.kind === 'house' ? 0.25 : b.windows;
  const base = { wall: b.wall, roof: b.roof, win, kind: b.kind === 'house' ? KIND.house : b.kind === 'warehouse' || b.kind === 'hangar' ? KIND.metal : KIND.flat };
  const r = b.rect;
  if (b.kind === 'tower' && W(r) > 20 && D(r) > 20) {
    const podium = rng.range(7, 13);
    const ins = rng.range(2.5, Math.min(6, Math.min(W(r), D(r)) * 0.18));
    const shaft = inset(r, ins);
    const out: Mass[] = [{ ...base, r, base: 0, h: podium, roof: shade(b.roof, 1.1) }];
    if (rng.chance(0.45) && W(shaft) > 14 && D(shaft) > 14) {
      const split = b.h * rng.range(0.7, 0.85);
      out.push({ ...base, r: shaft, base: 0, h: split });
      out.push({ ...base, r: inset(shaft, rng.range(2, 3.5)), base: 0, h: b.h });
    } else out.push({ ...base, r: shaft, base: 0, h: b.h });
    return out;
  }
  if (b.kind === 'block' && rng.chance(0.45) && Math.max(W(r), D(r)) > 16) {
    const t = rng.range(0.38, 0.62);
    const lower = b.h * rng.range(0.55, 0.85);
    if (W(r) >= D(r)) {
      const cx = r.x0 + W(r) * t;
      return [{ ...base, r: { ...r, x1: cx }, base: 0, h: b.h }, { ...base, r: { ...r, x0: cx }, base: 0, h: lower }];
    }
    const cy = r.y0 + D(r) * t;
    return [{ ...base, r: { ...r, y1: cy }, base: 0, h: b.h }, { ...base, r: { ...r, y0: cy }, base: 0, h: lower }];
  }
  return [{ ...base, r, base: 0, h: b.kind === 'house' ? b.h - 1.6 : b.h }];
}
