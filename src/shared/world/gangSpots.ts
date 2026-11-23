// Payphone booths in each gang's turf and kill-frenzy crate spots. Deterministic from the city
// seed (own RNG stream, so city generation itself is untouched); server and clients both call it.
import { dist2 } from '../math';
import { FACTIONS, GANGS, RESPECT } from '../packs';
import { Rng } from '../rng';
import { turfGang } from './gangTurf';
import type { Block, City } from './cityTypes';

export interface Booth { id: number; x: number; y: number; angle: number; gang: string }
export interface CrateSpot { id: number; x: number; y: number }

function spread<T extends { x: number; y: number }>(rng: Rng, pool: T[], n: number): T[] {
  const left = rng.shuffle([...pool]);
  const out: T[] = [];
  while (out.length < n && left.length) {
    let bi = 0, bd = -1;
    for (let k = 0; k < Math.min(left.length, 40); k++) {
      let d = Infinity;
      for (const o of out) d = Math.min(d, dist2(o.x, o.y, left[k].x, left[k].y));
      if (d > bd) { bd = d; bi = k; }
    }
    out.push(left.splice(bi, 1)[0]);
  }
  return out;
}

/** A point on the curb side of a block's sidewalk, facing the street. */
function curbPoint(rng: Rng, b: Block): { x: number; y: number; angle: number } {
  const r = b.rect, i = 0.9, t = rng.range(0.25, 0.75);
  switch (Math.floor(rng.next() * 4)) {
    case 0: return { x: r.x0 + (r.x1 - r.x0) * t, y: r.y0 + i, angle: -Math.PI / 2 };
    case 1: return { x: r.x1 - i, y: r.y0 + (r.y1 - r.y0) * t, angle: 0 };
    case 2: return { x: r.x0 + (r.x1 - r.x0) * t, y: r.y1 - i, angle: Math.PI / 2 };
    default: return { x: r.x0 + i, y: r.y0 + (r.y1 - r.y0) * t, angle: Math.PI };
  }
}

export function gangSpots(city: City): { booths: Booth[]; crates: CrateSpot[] } {
  const rng = new Rng(city.seed ^ 0x9a7e);
  const booths: Booth[] = [];
  for (const gang of GANGS) {
    // Phones stand on the gang's own turf.
    const blocks = city.blocks.filter((b) => turfGang(b.district) === gang);
    const spots = blocks.map((b) => ({ ...curbPoint(rng, b), b }));
    for (const s of spread(rng, spots, RESPECT.phonesPerGang)) booths.push({ id: booths.length, x: s.x, y: s.y, angle: s.angle, gang });
  }
  const open = city.lots.filter((l) => l.use === 'park' || l.use === 'plaza' || l.use === 'parking')
    .map((l) => ({ x: (l.rect.x0 + l.rect.x1) / 2 + rng.range(-3, 3), y: (l.rect.y0 + l.rect.y1) / 2 + rng.range(-3, 3) }));
  const crates = spread(rng, open, RESPECT.frenzyCrates).map((p, id) => ({ id, x: p.x, y: p.y }));
  return { booths, crates };
}

export const gangColor = (gang: string): string => FACTIONS.find((f) => f.id === gang)?.color ?? '#888888';
