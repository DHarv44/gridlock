// Where a building can carry graffiti, worked out from its model: the blank ground-floor band of
// non-storefront walls (windows start above 2.6 m in the facade shader), whole walls of windowless
// buildings, rooftop housings, and now and then the roof itself. Street-facing sides weigh most.
import type { Rect } from '../../shared/math';
import type { Building, Lot } from '../../shared/world/cityTypes';
import type { Decorated, Mass } from './buildingDetail';

export interface GraffitiSpot {
  /** Bottom centre of the spot, just off the surface (three: x, y up, z). */
  x: number; y: number; z: number;
  /** Outward normal (x, z); (0, 0) means a roof, facing up. */
  nx: number; nz: number;
  /** Room for a piece: width along the surface, height up it. */
  w: number; h: number;
  /** How likely this spot is to be hit, relative to others. */
  weight: number;
}

/** Facade rules mirrored from buildingMaterial: no windows below this height... */
const WINDOW_START = 2.6;
/** ...and storefront glass on the ground floor from this window density up. */
const STOREFRONT_DENSITY = 0.6;
/** Buildings this bare have no windows worth avoiding anywhere. */
const BLANK_DENSITY = 0.1;
const SEGMENT = 9;

const WEIGHT = { front: 5, side: 4, back: 2.5, upper: 2, housing: 0.7, roof: 0.35 };

interface Wall { x0: number; z0: number; x1: number; z1: number; nx: number; nz: number; dir: number }

/** The four walls of a rect with outward normals; `dir` matches Dir (N E S W). */
function walls(r: Rect): Wall[] {
  return [
    { x0: r.x0, z0: r.y0, x1: r.x1, z1: r.y0, nx: 0, nz: -1, dir: 0 },
    { x0: r.x1, z0: r.y0, x1: r.x1, z1: r.y1, nx: 1, nz: 0, dir: 1 },
    { x0: r.x0, z0: r.y1, x1: r.x1, z1: r.y1, nx: 0, nz: 1, dir: 2 },
    { x0: r.x0, z0: r.y0, x1: r.x0, z1: r.y1, nx: -1, nz: 0, dir: 3 },
  ];
}

/** A wall another mass of the same building stands against is inside the building. */
function shared(wl: Wall, self: Mass, masses: Mass[]): boolean {
  return masses.some((m) => m !== self && walls(m.r).some((o) => {
    if (o.nx !== -wl.nx || o.nz !== -wl.nz) return false;
    // Same line, overlapping spans.
    if (wl.nx !== 0) return Math.abs(o.x0 - wl.x0) < 0.05 && Math.min(o.z1, wl.z1) - Math.max(o.z0, wl.z0) > 0.5;
    return Math.abs(o.z0 - wl.z0) < 0.05 && Math.min(o.x1, wl.x1) - Math.max(o.x0, wl.x0) > 0.5;
  }));
}

/** Splits a wall band into spots no wider than SEGMENT metres. */
function band(out: GraffitiSpot[], wl: Wall, y0: number, h: number, weight: number): void {
  const len = Math.hypot(wl.x1 - wl.x0, wl.z1 - wl.z0);
  const n = Math.max(1, Math.round(len / SEGMENT));
  const seg = len / n;
  if (seg < 2 || h < 0.8) return;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    out.push({
      x: wl.x0 + (wl.x1 - wl.x0) * t + wl.nx * 0.04, y: y0, z: wl.z0 + (wl.z1 - wl.z0) * t + wl.nz * 0.04,
      nx: wl.nx, nz: wl.nz, w: seg - 0.6, h, weight: weight / n,
    });
  }
}

/** Spots on one building, given what decorate() added (rooftop housings, an awning). */
export function graffitiSpots(b: Building, lot: Lot | undefined, masses: Mass[], deco: Decorated): GraffitiSpot[] {
  const out: GraffitiSpot[] = [];
  if (b.kind === 'house') return out;
  for (const m of masses) {
    for (const wl of walls(m.r)) {
      if (shared(wl, m, masses)) continue;
      const facing = lot && lot.front === wl.dir ? WEIGHT.front : lot && (lot.front + 2) % 4 === wl.dir ? WEIGHT.back : WEIGHT.side;
      // An awning hangs over that wall's street level and would hide anything painted there.
      if (m.win < STOREFRONT_DENSITY && deco.awning !== wl.dir) band(out, wl, 0.3, Math.min(WINDOW_START - 0.4, m.h - 0.6), facing);
      if (m.win <= BLANK_DENSITY && m.h > 5) band(out, wl, WINDOW_START + 0.2, Math.min(4.5, m.h - WINDOW_START - 1), WEIGHT.upper);
    }
    if (m.win < STOREFRONT_DENSITY && (m.r.x1 - m.r.x0) > 8 && (m.r.y1 - m.r.y0) > 8) {
      out.push({ x: (m.r.x0 + m.r.x1) / 2, y: m.h + 0.06, z: (m.r.y0 + m.r.y1) / 2, nx: 0, nz: 0, w: Math.min(m.r.x1 - m.r.x0, (m.r.y1 - m.r.y0) * 2) * 0.6, h: (m.r.y1 - m.r.y0) * 0.6, weight: WEIGHT.roof });
    }
  }
  for (const hs of deco.housings) for (const wl of walls(hs.r)) band(out, wl, hs.y + 0.2, hs.h - 0.5, WEIGHT.housing / 4);
  return out;
}
