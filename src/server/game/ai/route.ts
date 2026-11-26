// A* over the road node graph, plus lane geometry helpers.
import { LANE_W, type RoadNode, type Segment } from '../../../shared/world/cityTypes';
import type { World } from '../world';

export interface LanePoints {
  sx: number; sy: number;   // lane start (just past the intersection we leave)
  ex: number; ey: number;   // lane end (just before the intersection we enter)
  hx: number; hy: number;   // heading
  to: RoadNode;
}

export function laneOf(w: World, seg: Segment, dir: 1 | -1, lane: number): LanePoints {
  // A ramp (world/waygen.ts): one lane, one way, along its own path.
  if (seg.path) {
    const p = seg.path, a = p[0], n = p[1], z = p[p.length - 1];
    const h = Math.hypot(n.x - a.x, n.y - a.y) || 1;
    return { sx: a.x, sy: a.y, ex: z.x, ey: z.y, hx: (n.x - a.x) / h, hy: (n.y - a.y) / h, to: w.city.nodes[seg.b] };
  }
  const A = w.city.nodes[seg.a], B = w.city.nodes[seg.b];
  const from = dir === 1 ? A : B, to = dir === 1 ? B : A;
  const hx = seg.axis === 'h' ? dir : 0, hy = seg.axis === 'v' ? dir : 0;
  const rx = -hy, ry = hx;
  const off = (Math.min(lane, seg.lanes - 1) + 0.5) * LANE_W;
  const halfFrom = (seg.axis === 'h' ? from.wv : from.wh) / 2 + 1;
  const halfTo = (seg.axis === 'h' ? to.wv : to.wh) / 2 + (to.lights ? 3.6 : 1.5);
  return {
    sx: from.x + hx * halfFrom + rx * off, sy: from.y + hy * halfFrom + ry * off,
    ex: to.x - hx * halfTo + rx * off, ey: to.y - hy * halfTo + ry * off,
    hx, hy, to,
  };
}

/** Segment taking you from node a to adjacent node b (a one-way ramp only its own way). */
export function segBetween(w: World, a: number, b: number): Segment | null {
  for (const s of w.city.nodes[a].segs) {
    const seg = w.city.segs[s];
    if (seg.oneway ? seg.a === a && seg.b === b : (seg.a === a && seg.b === b) || (seg.a === b && seg.b === a)) return seg;
  }
  return null;
}

/** Which way you'd head setting off from node `from` along a segment (its ramp path's first leg, or
 *  toward its other end). */
export function headingFrom(w: World, s: Segment, from: number): { x: number; y: number } {
  if (s.path) { const a = s.path[0], b = s.path[1]; const h = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: (b.x - a.x) / h, y: (b.y - a.y) / h }; }
  const n = w.city.nodes[from], o = w.city.nodes[s.a === from ? s.b : s.a];
  const h = Math.hypot(o.x - n.x, o.y - n.y) || 1;
  return { x: (o.x - n.x) / h, y: (o.y - n.y) / h };
}

/** Heading on arriving at node `at` along a segment. */
export function headingInto(w: World, s: Segment, at: number): { x: number; y: number } {
  if (s.path) { const p = s.path, a = p[p.length - 2], b = p[p.length - 1]; const h = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: (b.x - a.x) / h, y: (b.y - a.y) / h }; }
  const n = w.city.nodes[at], o = w.city.nodes[s.a === at ? s.b : s.a];
  const h = Math.hypot(n.x - o.x, n.y - o.y) || 1;
  return { x: (n.x - o.x) / h, y: (n.y - o.y) / h };
}

/** May you go from `prev` through `cur` onto `s`? One-way ramps only their way, and no turning back
 *  on a highway's deck (there's a barrier down the middle) or between its ramps. */
export function canTake(w: World, s: Segment, cur: number, prevSeg: Segment | undefined): boolean {
  if (s.oneway && s.a !== cur) return false;
  if (!prevSeg || (prevSeg.way === undefined && s.way === undefined)) return true;
  const i = headingInto(w, prevSeg, cur), o = headingFrom(w, s, cur);
  return i.x * o.x + i.y * o.y > -0.5;
}

export function findRoute(w: World, from: number, to: number): number[] {
  if (from === to) return [to];
  const nodes = w.city.nodes;
  const n = nodes.length;
  const g = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const via = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const open: number[] = [from];
  const goal = nodes[to];
  const h = (i: number) => Math.abs(nodes[i].x - goal.x) + Math.abs(nodes[i].y - goal.y);
  const f = new Float64Array(n).fill(Infinity);
  g[from] = 0;
  f[from] = h(from);
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (cur === to) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    for (const si of nodes[cur].segs) {
      const s = w.city.segs[si];
      const nb = s.a === cur ? s.b : s.a;
      if (closed[nb] || !canTake(w, s, cur, via[cur] >= 0 ? w.city.segs[via[cur]] : undefined)) continue;
      // Highways are quicker: their decks count for less.
      const cost = g[cur] + (Math.abs(s.x1 - s.x0) + Math.abs(s.y1 - s.y0)) * (s.level !== undefined ? 0.55 : 1);
      if (cost < g[nb]) {
        g[nb] = cost;
        f[nb] = cost + h(nb) * 0.55;
        prev[nb] = cur;
        via[nb] = si;
        open.push(nb);
      }
    }
  }
  if (prev[to] < 0) return [];
  const path: number[] = [];
  for (let c = to; c !== -1; c = prev[c]) path.push(c);
  return path.reverse();
}

export { isGreen } from '../../../shared/world/traffic';
