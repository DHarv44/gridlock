// Static collision world: axis-aligned boxes (buildings, containers, fences) and tree trunks,
// bucketed in a uniform grid. Used by server physics and client-side prediction alike.
import type { City } from './cityTypes';
import { LAND0, LAND1, MAP_SIZE } from './cityTypes';
import { FIXTURES } from '../packs';
import { fixtureRect, ringSides } from './fixtures';
import { FLAT_PROPS } from './interiors';
import { gangSpots } from './gangSpots';
import { WORLD_X } from './levels';
import { KIND, massesFor } from './massing';
import { wayCollision } from './ways';

/** `gate`: a box that can open (a vault door: its interior's index); open gates are passed through. */
export interface Box2 { x0: number; y0: number; x1: number; y1: number; h: number; gate?: number }
export interface Circle2 { x: number; y: number; r: number; h: number }
export interface Hit { nx: number; ny: number; depth: number }
export interface RayHit { t: number; nx: number; ny: number }

const CELL = 24;
// The grid covers the map and, east of it, the strips upper floors live in (world/levels.ts).
const NX = Math.ceil(WORLD_X / CELL);
const N = Math.ceil(MAP_SIZE / CELL);
const TRUNK_R = 0.45;
/** How far past the map's edge a boat can go out to sea (the map has ~80 m of sea all round). */
const SEA_MARGIN = 0;

export class StaticWorld {
  readonly boxes: Box2[] = [];
  readonly circles: Circle2[] = [];
  /** Gates standing open right now (interior indexes): the server sets them, clients mirror it. */
  readonly openGates = new Set<number>();
  private boxCells: number[][] = Array.from({ length: NX * N }, () => []);
  private circleCells: number[][] = Array.from({ length: NX * N }, () => []);
  private stamp: Uint32Array;
  private stampC: Uint32Array;
  private q = 1;

  constructor(city: City) {
    const r = city.riverRow;
    if (r >= 0) {
      this.riverY0 = city.ys[r].pos + city.ys[r].width / 2;
      this.riverY1 = city.ys[r + 1].pos - city.ys[r + 1].width / 2;
    }
    this.sea = city.edge === 'sea';
    this.ponds = city.ponds;
    // Walk-in buildings: their room's walls (with the door gap), furniture and the solid rest,
    // instead of one solid box.
    const open = new Set(city.interiors.map((i) => i.building));
    city.buildings.forEach((b, bi) => { if (!open.has(bi)) this.addBox({ ...b.rect, h: b.h }); });
    city.interiors.forEach((i, k) => {
      for (const w of [...i.walls, ...i.rest]) this.addBox({ ...w.rect, h: w.h });
      for (const p of i.props) if (!FLAT_PROPS.has(p.kind)) this.addBox({ ...p.rect, h: p.h });
      if (i.vault) this.addBox({ ...i.vault.door, h: 3.2, gate: k });
      // Upper floors, out in their strips east of the map (world/levels.ts).
      for (const fl of i.floors) {
        for (const w of fl.walls) this.addBox({ ...w.rect, h: w.h });
        for (const p of fl.props) if (!FLAT_PROPS.has(p.kind)) this.addBox({ ...p.rect, h: p.h });
      }
    });
    for (const o of city.obstacles) this.addBox({ ...o.rect, h: o.h });
    // Payphone booths are solid (they don't get knocked over): the booth's body, square to the kerb,
    // from its back panel to just in front of the phone (render/booths.ts draws it).
    for (const b of gangSpots(city).booths) {
      const c = Math.round(Math.cos(b.angle)), s = Math.round(Math.sin(b.angle));
      const cx = b.x + c * 0.125, cy = b.y + s * 0.125, hx = c ? 0.28 : 0.47, hy = c ? 0.47 : 0.28;
      this.addBox({ x0: cx - hx, y0: cy - hy, x1: cx + hx, y1: cy + hy, h: 2.5 });
    }
    for (const t of city.trees) this.addCircle({ x: t.x, y: t.y, r: TRUNK_R, h: 7 });
    // Open country's rock: round columns, boulders (world/landforms.ts).
    for (const r of city.rocks) this.addCircle({ x: r.x, y: r.y, r: r.r, h: r.h });
    // Fixtures (world/fixtures.ts): a footprint, a trunk, or a corral's rails with its gate open.
    for (const f of city.fixtures) {
      const spec = FIXTURES[f.spec], h = spec.height;
      if (spec.solid === 'box') this.addBox({ ...fixtureRect(f), h });
      else if (spec.solid === 'ring') for (const s of ringSides(f)) this.addBox({ ...s, h: Math.min(h, 1.6) });
      else if (typeof spec.solid === 'number') this.addCircle({ x: f.x, y: f.y, r: spec.solid, h });
    }
    // Highways (world/ways.ts): ramp walls and deck columns on the street, barriers on their strips.
    const ways = wayCollision(city, (x, y) => this.boatWater(x, y));
    for (const b of ways.boxes) this.addBox(b);
    for (const c of ways.circles) this.addCircle(c);
    this.stamp = new Uint32Array(this.boxes.length);
    this.stampC = new Uint32Array(this.circles.length);
    // Roofs, by the blocks each building is drawn as (world/massing.ts: a tower's podium and shaft
    // are separate roofs). Walk-in buildings are walls round an open room, so their collision boxes
    // have no roof of their own. What a helicopter can set down on.
    city.buildings.forEach((b, bi) => {
      for (const m of massesFor(b, city.seed, bi)) {
        // A house's pitched roof: it sits on the ridge, half a metre or so above the eaves.
        const id = this.roofs.push({ ...m.r, h: m.h + (m.kind === KIND.house ? 0.8 : 0), bi }) - 1;
        const [i0, j0, i1, j1] = StaticWorld.cellRange(m.r.x0, m.r.y0, m.r.x1, m.r.y1);
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.roofCells[j * N + i].push(id);
      }
    });
  }

  /** The river's banks (y; none: 0, 0), whether sea lies round the land, the ponds: set in the
   *  constructor. */
  private riverY0 = 0;
  private riverY1 = 0;
  private sea = true;
  private ponds: { x0: number; y0: number; x1: number; y1: number }[] = [];

  /** Water a boat can be on: the sea round the island, the whole river, under the bridges too (a
   *  boat goes under the deck: from above, the bridge hides it), and ponds. Upper-floor strips are dry. */
  boatWater(x: number, y: number): boolean {
    if (x >= MAP_SIZE || y >= MAP_SIZE || x < -SEA_MARGIN || y < -SEA_MARGIN) return false; // the edge of the world
    if (x < LAND0 || x > LAND1 || y < LAND0 || y > LAND1) return this.sea;
    if (y > this.riverY0 && y < this.riverY1) return true;
    return this.ponds.some((p) => x > p.x0 && x < p.x1 && y > p.y0 && y < p.y1);
  }

  private roofs: (Box2 & { bi: number })[] = [];
  private roofCells: number[][] = Array.from({ length: N * N }, () => []);

  /** Height of what's under a point on the street map: the highest roof whose footprint holds it at
   *  least `inset` metres in from the edge, else 0 (the street). Upper-floor strips have no roofs. */
  floorAt(x: number, y: number, inset = 0): number {
    if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return 0;
    let top = 0;
    for (const id of this.roofCells[Math.floor(y / CELL) * N + Math.floor(x / CELL)]) {
      const r = this.roofs[id];
      if (r.h > top && x >= r.x0 + inset && x <= r.x1 - inset && y >= r.y0 + inset && y <= r.y1 - inset) top = r.h;
    }
    return top;
  }

  /** The building (index) whose roof is under a point, if any (as floorAt). */
  roofAt(x: number, y: number, inset = 0): number {
    if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return -1;
    let best = -1, top = 0;
    for (const id of this.roofCells[Math.floor(y / CELL) * N + Math.floor(x / CELL)]) {
      const r = this.roofs[id];
      if (r.h > top && x >= r.x0 + inset && x <= r.x1 - inset && y >= r.y0 + inset && y <= r.y1 - inset) { top = r.h; best = r.bi; }
    }
    return best;
  }

  private static cellRange(x0: number, y0: number, x1: number, y1: number): [number, number, number, number] {
    const cx = (v: number) => Math.max(0, Math.min(NX - 1, Math.floor(v / CELL)));
    const cy = (v: number) => Math.max(0, Math.min(N - 1, Math.floor(v / CELL)));
    return [cx(x0), cy(y0), cx(x1), cy(y1)];
  }

  private addBox(b: Box2): void {
    const id = this.boxes.push(b) - 1;
    const [i0, j0, i1, j1] = StaticWorld.cellRange(b.x0, b.y0, b.x1, b.y1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.boxCells[j * NX + i].push(id);
  }

  private addCircle(c: Circle2): void {
    const id = this.circles.push(c) - 1;
    const [i0, j0, i1, j1] = StaticWorld.cellRange(c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.circleCells[j * NX + i].push(id);
  }

  /** Calls fn for each box/circle overlapping the query rect (each once). */
  near(x0: number, y0: number, x1: number, y1: number, box: (b: Box2) => void, circle?: (c: Circle2) => void): void {
    const q = ++this.q;
    const [i0, j0, i1, j1] = StaticWorld.cellRange(x0, y0, x1, y1);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        for (const id of this.boxCells[j * NX + i]) {
          if (this.stamp[id] === q) continue;
          this.stamp[id] = q;
          const b = this.boxes[id];
          if (b.gate !== undefined && this.openGates.has(b.gate)) continue; // an open vault door
          box(b);
        }
        if (!circle) continue;
        for (const id of this.circleCells[j * NX + i]) {
          if (this.stampC[id] === q) continue;
          this.stampC[id] = q;
          circle(this.circles[id]);
        }
      }
    }
  }

  /** Pushes a circle out of static geometry taller than z. Mutates p; returns the last hit or null. */
  resolveCircle(p: { x: number; y: number }, r: number, z = 0): Hit | null {
    let hit: Hit | null = null;
    this.near(p.x - r, p.y - r, p.x + r, p.y + r, (b) => {
      if (b.h <= z) return;
      const cx = Math.max(b.x0, Math.min(p.x, b.x1)), cy = Math.max(b.y0, Math.min(p.y, b.y1));
      let dx = p.x - cx, dy = p.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) return;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        dx /= d; dy /= d;
        p.x += dx * (r - d); p.y += dy * (r - d);
        hit = { nx: dx, ny: dy, depth: r - d };
      } else {
        // Centre inside the box: exit through the nearest face.
        const l = p.x - b.x0, rr = b.x1 - p.x, t = p.y - b.y0, bt = b.y1 - p.y;
        const m = Math.min(l, rr, t, bt);
        if (m === l) { p.x = b.x0 - r; hit = { nx: -1, ny: 0, depth: m + r }; }
        else if (m === rr) { p.x = b.x1 + r; hit = { nx: 1, ny: 0, depth: m + r }; }
        else if (m === t) { p.y = b.y0 - r; hit = { nx: 0, ny: -1, depth: m + r }; }
        else { p.y = b.y1 + r; hit = { nx: 0, ny: 1, depth: m + r }; }
      }
    }, (c) => {
      if (c.h <= z) return;
      const dx = p.x - c.x, dy = p.y - c.y, rr = r + c.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr || d2 < 1e-9) return;
      const d = Math.sqrt(d2);
      p.x += (dx / d) * (rr - d); p.y += (dy / d) * (rr - d);
      hit = { nx: dx / d, ny: dy / d, depth: rr - d };
    });
    return hit;
  }

  /**
   * Separates an oriented box (centre, angle, half extents) from static geometry.
   * Mutates o; returns the deepest contact normal (pointing away from the obstacle).
   */
  resolveObb(o: { x: number; y: number; angle: number }, hl: number, hw: number, z = 0): Hit | null {
    let worst: Hit | null = null;
    const c = Math.cos(o.angle), s = Math.sin(o.angle);
    const ex = Math.abs(c) * hl + Math.abs(s) * hw, ey = Math.abs(s) * hl + Math.abs(c) * hw;
    for (let pass = 0; pass < 2; pass++) {
      this.near(o.x - ex - 1, o.y - ey - 1, o.x + ex + 1, o.y + ey + 1, (b) => {
        if (b.h <= z) return;
        const h = obbVsAabb(o.x, o.y, c, s, hl, hw, b);
        if (!h) return;
        o.x += h.nx * h.depth; o.y += h.ny * h.depth;
        if (!worst || h.depth > worst.depth) worst = h;
      }, (ci) => {
        if (ci.h <= z) return;
        const h = obbVsCircle(o.x, o.y, c, s, hl, hw, ci);
        if (!h) return;
        o.x += h.nx * h.depth; o.y += h.ny * h.depth;
        if (!worst || h.depth > worst.depth) worst = h;
      });
    }
    return worst;
  }

  /** First static hit along a segment at height z. t is the fraction along the segment. */
  raycast(x0: number, y0: number, x1: number, y1: number, z = 1.2): RayHit | null {
    const dx = x1 - x0, dy = y1 - y0;
    const out: { best: RayHit | null } = { best: null };
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / CELL));
    for (let k = 0; k < steps; k++) {
      const ta = k / steps, tb = (k + 1) / steps;
      if (out.best && out.best.t < ta) break;
      const ax = x0 + dx * ta, ay = y0 + dy * ta, bx = x0 + dx * tb, by = y0 + dy * tb;
      this.near(Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by), (b) => {
        if (b.h <= z) return;
        const h = rayAabb(x0, y0, dx, dy, b);
        if (h && (!out.best || h.t < out.best.t)) out.best = h;
      }, (c) => {
        if (c.h <= z) return;
        const h = rayCircle(x0, y0, dx, dy, c.x, c.y, c.r);
        if (h && (!out.best || h.t < out.best.t)) out.best = h;
      });
    }
    return out.best;
  }
}

/** SAT between an OBB and an AABB; returns the minimum translation for the OBB. */
export function obbVsAabb(x: number, y: number, c: number, s: number, hl: number, hw: number, b: Box2): Hit | null {
  const bx = (b.x0 + b.x1) / 2, by = (b.y0 + b.y1) / 2, bhx = (b.x1 - b.x0) / 2, bhy = (b.y1 - b.y0) / 2;
  const dx = x - bx, dy = y - by;
  const axes: [number, number][] = [[1, 0], [0, 1], [c, s], [-s, c]];
  let best = Infinity, nx = 0, ny = 0;
  for (const [ax, ay] of axes) {
    const ra = hl * Math.abs(c * ax + s * ay) + hw * Math.abs(-s * ax + c * ay);
    const rb = bhx * Math.abs(ax) + bhy * Math.abs(ay);
    const d = dx * ax + dy * ay;
    const o = ra + rb - Math.abs(d);
    if (o <= 0) return null;
    if (o < best) { best = o; const sg = d < 0 ? -1 : 1; nx = ax * sg; ny = ay * sg; }
  }
  return { nx, ny, depth: best };
}

export function obbVsCircle(x: number, y: number, c: number, s: number, hl: number, hw: number, ci: { x: number; y: number; r: number }): Hit | null {
  const dx = ci.x - x, dy = ci.y - y;
  const lx = dx * c + dy * s, ly = -dx * s + dy * c;
  const px = Math.max(-hl, Math.min(hl, lx)), py = Math.max(-hw, Math.min(hw, ly));
  const ex = lx - px, ey = ly - py;
  const d2 = ex * ex + ey * ey;
  if (d2 >= ci.r * ci.r) return null;
  if (d2 < 1e-9) {
    // Circle centre inside the box: push along the nearest local face.
    const ox = hl - Math.abs(lx), oy = hw - Math.abs(ly);
    const [lnx, lny, depth] = ox < oy ? [-Math.sign(lx) || -1, 0, ox + ci.r] : [0, -Math.sign(ly) || -1, oy + ci.r];
    return { nx: lnx * c - lny * s, ny: lnx * s + lny * c, depth };
  }
  const d = Math.sqrt(d2);
  const wx = (ex * c - ey * s) / d, wy = (ex * s + ey * c) / d;
  return { nx: -wx, ny: -wy, depth: ci.r - d };
}

export function rayAabb(x0: number, y0: number, dx: number, dy: number, b: Box2): RayHit | null {
  let tmin = 0, tmax = 1, nx = 0, ny = 0;
  if (Math.abs(dx) < 1e-9) { if (x0 < b.x0 || x0 > b.x1) return null; }
  else {
    let t1 = (b.x0 - x0) / dx, t2 = (b.x1 - x0) / dx, n = -1;
    if (t1 > t2) { [t1, t2] = [t2, t1]; n = 1; }
    if (t1 > tmin) { tmin = t1; nx = n; ny = 0; }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (Math.abs(dy) < 1e-9) { if (y0 < b.y0 || y0 > b.y1) return null; }
  else {
    let t1 = (b.y0 - y0) / dy, t2 = (b.y1 - y0) / dy, n = -1;
    if (t1 > t2) { [t1, t2] = [t2, t1]; n = 1; }
    if (t1 > tmin) { tmin = t1; nx = 0; ny = n; }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin > 0 ? { t: tmin, nx, ny } : null;
}

export function rayCircle(x0: number, y0: number, dx: number, dy: number, cx: number, cy: number, r: number): RayHit | null {
  const fx = x0 - cx, fy = y0 - cy;
  const a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0 || a < 1e-12) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t < 0 || t > 1) return null;
  const hx = x0 + dx * t - cx, hy = y0 + dy * t - cy;
  return { t, nx: hx / r, ny: hy / r };
}
