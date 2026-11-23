// Gas station layout, worked out from the lot and its kiosk (placegen.ts shrinks the building to a
// kiosk at the back): the forecourt in front, two pump islands across it under one canopy, and a
// tall price sign at the street corner. Shared so the islands and the sign pole are solid
// (city obstacles) and the renderer draws the same thing.
import type { Rect } from '../math';
import { DIR_VEC, type Lot } from './cityTypes';

export interface GasLayout {
  /** Facade runs along x (fronts facing north/south)? */
  along: boolean;
  dir: [number, number];
  forecourt: Rect;
  canopy: Rect;
  islands: Rect[];
  /** Pump positions (two per island) and the price sign pole. */
  pumps: { x: number; y: number }[];
  sign: { x: number; y: number };
}

/** Kiosk depth from the lot's back edge, and the forecourt depth a lot needs. */
export const KIOSK_DEPTH = 8;
export const GAS_MIN_DEPTH = 28;
export const GAS_MIN_FRONTAGE = 20;

export function gasLayout(lot: Lot): GasLayout {
  const r = lot.rect, k = lot.building!.rect;
  const [dx, dy] = DIR_VEC[lot.front];
  const along = dy !== 0;
  // Forecourt: from the lot's street edge back to a few metres short of the kiosk.
  const fc: Rect = dy < 0 ? { x0: r.x0, x1: r.x1, y0: r.y0, y1: k.y0 - 3 }
    : dy > 0 ? { x0: r.x0, x1: r.x1, y0: k.y1 + 3, y1: r.y1 }
    : dx < 0 ? { x0: r.x0, x1: k.x0 - 3, y0: r.y0, y1: r.y1 }
    : { x0: k.x1 + 3, x1: r.x1, y0: r.y0, y1: r.y1 };
  // Across = along the frontage; deep = toward the kiosk.
  const a0 = along ? fc.x0 : fc.y0, a1 = along ? fc.x1 : fc.y1;
  const d0 = along ? fc.y0 : fc.x0, d1 = along ? fc.y1 : fc.x1;
  const am = (a0 + a1) / 2, dm = (d0 + d1) / 2, span = Math.min(a1 - a0 - 6, 22);
  const toRect = (aLo: number, aHi: number, dLo: number, dHi: number): Rect =>
    along ? { x0: aLo, x1: aHi, y0: dLo, y1: dHi } : { x0: dLo, x1: dHi, y0: aLo, y1: aHi };
  // Two islands side by side across the frontage, each 1.3 m deep and 5 m long, in the middle depth.
  const islands = [-1, 1].map((s) => {
    const c = am + s * span / 4;
    return toRect(c - 2.5, c + 2.5, dm - 0.65, dm + 0.65);
  });
  const pumps = islands.flatMap((i) => {
    const cx = (i.x0 + i.x1) / 2, cy = (i.y0 + i.y1) / 2;
    return [-1.4, 1.4].map((o) => (along ? { x: cx + o, y: cy } : { x: cx, y: cy + o }));
  });
  const canopy = toRect(am - span / 2, am + span / 2, dm - 4.5, dm + 4.5);
  // Price sign: at the street edge, at one end of the frontage.
  const edge = dy < 0 ? r.y0 + 1.2 : dy > 0 ? r.y1 - 1.2 : dx < 0 ? r.x0 + 1.2 : r.x1 - 1.2;
  const end = a1 - 1.5;
  const sign = along ? { x: end, y: edge } : { x: edge, y: end };
  return { along, dir: [dx, dy], forecourt: fc, canopy, islands, pumps, sign };
}
