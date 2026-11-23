// Assigns services (shops, hospitals, precincts...) and purchasable properties to lots.
import { dist2, rectH, rectW } from '../math';
import { DISTRICTS, PROPERTIES, SERVICES, ZONES, zoneIndex } from '../packs';
import type { Rng } from '../rng';
import { type Block, DIR_VEC, Dir, type Lot, type Place, SIDEWALK_W } from './cityTypes';

const DRIVE_IN = new Set(['dealer', 'respray', 'chopshop', 'hospital', 'police', 'fire']);
const INWARD = [Math.PI / 2, Math.PI, -Math.PI / 2, 0];
const PAD_DEPTH = 10;

function frontDepth(lot: Lot): number {
  return lot.front === Dir.N || lot.front === Dir.S ? rectH(lot.rect) : rectW(lot.rect);
}

/** Door point on the building's street side, and a pad point for vehicles. */
function frontPoints(lot: Lot): { door: { x: number; y: number }; pad: { x: number; y: number; angle: number } } {
  const b = lot.building!.rect, r = lot.rect;
  const f = lot.front === -1 ? Dir.S : lot.front;
  const [dx, dy] = DIR_VEC[f];
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const bx = dx > 0 ? b.x1 : dx < 0 ? b.x0 : cx;
  const by = dy > 0 ? b.y1 : dy < 0 ? b.y0 : cy;
  const lx = dx > 0 ? r.x1 : dx < 0 ? r.x0 : cx;
  const ly = dy > 0 ? r.y1 : dy < 0 ? r.y0 : cy;
  const strip = Math.abs(lx - bx) + Math.abs(ly - by);
  const padOff = strip >= 7 ? -strip / 2 : SIDEWALK_W + 2.6;
  return {
    door: { x: bx + dx * 0.9, y: by + dy * 0.9 },
    pad: { x: lx + dx * padOff, y: ly + dy * padOff, angle: INWARD[f] },
  };
}

function carvePad(lot: Lot): boolean {
  const b = lot.building!.rect;
  if (lot.front < 0 || frontDepth(lot) < PAD_DEPTH + 12) return false;
  switch (lot.front) {
    case Dir.N: b.y0 = Math.max(b.y0, lot.rect.y0 + PAD_DEPTH); break;
    case Dir.S: b.y1 = Math.min(b.y1, lot.rect.y1 - PAD_DEPTH); break;
    case Dir.W: b.x0 = Math.max(b.x0, lot.rect.x0 + PAD_DEPTH); break;
    case Dir.E: b.x1 = Math.min(b.x1, lot.rect.x1 - PAD_DEPTH); break;
  }
  return rectW(b) >= 8 && rectH(b) >= 8;
}

export class PlaceBuilder {
  readonly services: Place[] = [];
  readonly properties: Place[] = [];

  constructor(private rng: Rng, private lots: Lot[], private blocks: Block[]) {}

  build(): void {
    SERVICES.forEach((spec, si) => {
      const zones = new Set(spec.zones.map(zoneIndex));
      const want = (l: Lot) => zones.has(l.zone) && this.free(l)
        && (spec.verb === 'military' ? l.use === 'pad' : spec.verb === 'helipad' ? l.use === 'building' && l.front >= 0
          : l.use === 'building' && l.front >= 0 && (!DRIVE_IN.has(spec.verb) || frontDepth(l) >= PAD_DEPTH + 12));
      for (const lot of this.choose(want, spec.count, 260)) {
        if (DRIVE_IN.has(spec.verb) && !carvePad(lot)) continue;
        lot.service = si;
        const name = `${spec.name}, ${this.districtOf(lot)}`;
        lot.name = name;
        if (spec.verb === 'military' || spec.verb === 'helipad') {
          if (spec.verb === 'helipad') { lot.building = undefined; lot.use = 'pad'; }
          const cx = (lot.rect.x0 + lot.rect.x1) / 2, cy = (lot.rect.y0 + lot.rect.y1) / 2;
          this.services.push({ id: this.services.length, lot: lot.id, verb: spec.verb, spec: si, x: cx, y: cy, pad: { x: cx, y: cy, angle: 0 }, name });
          lot.pad = { x: cx, y: cy, angle: 0 };
          continue;
        }
        lot.building!.sign = spec.sign;
        const p = frontPoints(lot);
        lot.door = p.door;
        lot.pad = p.pad;
        this.services.push({ id: this.services.length, lot: lot.id, verb: spec.verb, spec: si, x: p.door.x, y: p.door.y, pad: p.pad, name });
      }
    });

    PROPERTIES.forEach((spec, pi) => {
      const zones = new Set(spec.zones.map(zoneIndex));
      const houses = spec.zones.every((z) => ZONES[zoneIndex(z)].layout === 'houses');
      const want = (l: Lot) => zones.has(l.zone) && this.free(l) && !!l.building && l.front >= 0
        && (houses ? l.use === 'yard' : l.use === 'building');
      for (const lot of this.choose(want, spec.count, 90)) {
        lot.property = pi;
        const p = frontPoints(lot);
        lot.door = p.door;
        lot.pad = p.pad;
        lot.propertyId = this.properties.length;
        const name = `${spec.name}, ${this.districtOf(lot)}`;
        lot.name = name;
        this.properties.push({ id: this.properties.length, lot: lot.id, verb: spec.kind, spec: pi, x: p.door.x, y: p.door.y, pad: p.pad, name });
      }
    });
  }

  private free(l: Lot): boolean {
    return l.service === undefined && l.property === undefined;
  }

  private districtOf(lot: Lot): string {
    return DISTRICTS[this.blocks[lot.block].district]?.name ?? 'Bayhaven';
  }

  /** Picks up to n lots, spreading them apart (farthest-point sampling over a shuffled pool). */
  private choose(want: (l: Lot) => boolean, n: number, minGap: number): Lot[] {
    const pool = this.rng.shuffle(this.lots.filter(want));
    const picked: Lot[] = [];
    const cx = (l: Lot) => (l.rect.x0 + l.rect.x1) / 2, cy = (l: Lot) => (l.rect.y0 + l.rect.y1) / 2;
    while (picked.length < n && pool.length) {
      let bestI = 0, bestD = -1;
      for (let k = 0; k < Math.min(pool.length, 60); k++) {
        let d = Infinity;
        for (const p of picked) d = Math.min(d, dist2(cx(p), cy(p), cx(pool[k]), cy(pool[k])));
        if (d > bestD) { bestD = d; bestI = k; }
      }
      if (picked.length && bestD < minGap * minGap * 0.25 && pool.length < 3) break;
      picked.push(pool.splice(bestI, 1)[0]);
    }
    return picked;
  }
}
