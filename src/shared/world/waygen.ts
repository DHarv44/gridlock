// Highways over the avenues (WORLD.highways). Two steps: before blocks are laid out, pick the avenues
// and widen them for the ramp lanes (pickWayLines); once the road graph exists, build each way: its
// height profile (raised; a rare stretch sunk in a trench; climbing over the other highway where
// they cross), diamond interchanges at cross streets with an on- and an off-ramp each way, and its
// deck and ramps in the road graph so traffic and the police drive it. Deterministic from the layout.
import { LANE_W, MAP_SIZE, type RoadLine, type RoadNode, type Segment } from './cityTypes';
import type { RoadLayout } from './roadgen';
import { WORLD } from './worldSpec';
import { DECK_H, DECK_HALF, MAIN_GRADE, MERGE, RAMP_LAT, RAMP_LEN, CLEAR_S, type Ramp, TRENCH_D, type Way, WAY0, wayPoint, AVENUE_W } from './wayTypes';

/** Room between a crossing's box and a ramp's foot. */
const FOOT_GAP = 4;
/** Fewest cross streets between interchanges. */
const EXIT_EVERY = 3;

/** A road line becomes a highway's corridor: as wide as the highway and its ramps, never merged
 *  away (it stays arterial), and no street along it (roadgen.ts). */
function widen(l: RoadLine): void {
  l.width = AVENUE_W; l.lanes = 2; l.parking = false; l.highway = true; l.arterial = true;
}

/** The avenue nearest `target` (a fraction of the map) among `ok` arterials, or -1. */
function nearest(lines: RoadLine[], ok: (i: number) => boolean, target: number): number {
  let bi = -1, bd = Infinity;
  lines.forEach((l, i) => {
    if (!l.arterial || !ok(i)) return;
    const d = Math.abs(l.pos / MAP_SIZE - target);
    if (d < bd) { bd = d; bi = i; }
  });
  return bi;
}

/** Marks and widens the lines that become highway corridors: the first east-west (north of the
 *  river), the second north-south (it crosses the river on its own). */
export function pickWayLines(L: RoadLayout): void {
  const spec = WORLD.highways;
  if (!spec || spec.count <= 0) return;
  const nx = L.xs.length - 1, ny = L.ys.length - 1, r = L.riverRow;
  const j = nearest(L.ys, (j) => j >= 2 && j <= ny - 2 && (r < 0 || (j !== r && j !== r + 1)), 0.32);
  if (j >= 0) widen(L.ys[j]);
  if (spec.count > 1) {
    const i = nearest(L.xs, (i) => i >= 2 && i <= nx - 2, 0.56);
    if (i >= 0) { widen(L.xs[i]); L.bridgeLines.delete(i); }
  }
}

interface Graph { nodes: RoadNode[]; segs: Segment[] }

/** Builds the ways over the marked avenues and adds their decks and ramps to the road graph (ground
 *  avenue segments a trench replaces are taken out). */
export function buildWays(L: RoadLayout, g: Graph): Way[] {
  const ways: Way[] = [];
  const lines: { axis: 'h' | 'v'; line: number }[] = [];
  L.ys.forEach((l, j) => { if (l.highway) lines.push({ axis: 'h', line: j }); });
  L.xs.forEach((l, i) => { if (l.highway) lines.push({ axis: 'v', line: i }); });
  for (const { axis, line } of lines) {
    const w = buildWay(L, g, axis, line, ways.length, lines);
    if (w) ways.push(w);
  }
  return ways;
}

function buildWay(L: RoadLayout, g: Graph, axis: 'h' | 'v', line: number, wi: number, all: { axis: 'h' | 'v'; line: number }[]): Way | null {
  const H = DECK_H;
  const pos = axis === 'h' ? L.ys[line].pos : L.xs[line].pos;
  const along = (n: RoadNode) => (axis === 'h' ? n.x : n.y);
  const hw = (n: RoadNode) => (axis === 'h' ? n.wv : n.wh) / 2;
  // The cross streets passing under the corridor, in order along it.
  const ln = g.nodes.filter((n) => n.level === undefined && (axis === 'h' ? n.j === line : n.i === line)).sort((a, b) => along(a) - along(b));
  if (ln.length < 6) return null;
  /** Between cross streets k and k+1 the corridor crosses the river (no ramps there). */
  const overRiver = (k: number) => axis === 'v' && L.riverRow >= 0 && ln[k].j <= L.riverRow && ln[k + 1].j > L.riverRow;
  const way: Way = { kind: 'highway', axis, line, pos, strip: WAY0 + wi, a0: 0, a1: 0, profile: [], sunk: [], bridges: [], ramps: [] };
  // Stretches where the deck isn't at its usual height: no ramps there.
  const busy: [number, number][] = [];
  const free = (a0: number, a1: number) => busy.every(([b0, b1]) => a1 < b0 || a0 > b1);
  for (let k = 0; k < ln.length - 1; k++) if (overRiver(k)) busy.push([along(ln[k]) - 1, along(ln[k + 1]) + 1]);
  const pts: [number, number][] = [[0, H], [MAP_SIZE, H]];
  // Where the other highway's corridor crosses this one (the north-south one climbs over).
  const other = all.find((o) => o.axis !== axis);
  const cross = axis === 'v' && other ? L.ys[other.line].pos : null;
  // A rare stretch sunk in a trench: the cross streets bridge it; long blocks either side for the
  // dive (MAIN_GRADE), never near the crossing or the river.
  const spec = WORLD.highways!;
  let sunken = false;
  if (spec.sunken > 0 && wi === all.length - 1) {
    const need = (k0: number, k1: number) => along(ln[k1]) - hw(ln[k1]) - along(ln[k0]) - hw(ln[k0]) - 6 >= (H + TRENCH_D) / MAIN_GRADE;
    const mid = ln.length / 2;
    const order = ln.map((_, k) => k).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
    for (const p of order) {
      for (const q of [p + 1, p]) {
        if (p - 1 < 1 || q + 1 > ln.length - 2) continue;
        if (!need(p - 1, p) || !need(q, q + 1)) continue;
        if (cross !== null && cross > along(ln[p - 2] ?? ln[0]) && cross < along(ln[q + 2] ?? ln[ln.length - 1])) continue;
        let ok = true;
        for (let k = p - 1; k <= q; k++) if (overRiver(k)) ok = false;
        if (!ok) continue;
        const t0 = along(ln[p - 1]) + hw(ln[p - 1]) + 3, t1 = along(ln[p]) - hw(ln[p]) - 3;
        const u0 = along(ln[q]) + hw(ln[q]) + 3, u1 = along(ln[q + 1]) - hw(ln[q + 1]) - 3;
        pts.push([t0, H], [t1, -TRENCH_D], [u0, -TRENCH_D], [u1, H]);
        way.sunk.push([t0, u1]);
        busy.push([t0 - 1, u1 + 1]);
        for (let k = p; k <= q; k++) way.bridges.push([along(ln[k]) - hw(ln[k]), along(ln[k]) + hw(ln[k])]);
        sunken = true;
        break;
      }
      if (sunken) break;
    }
  }
  // Over the other highway: up to twice the deck height across its deck, at MAIN_GRADE either side.
  if (cross !== null) {
    const c = cross, half = DECK_HALF + 4, rise = H / MAIN_GRADE;
    pts.push([c - half - rise, H], [c - half, 2 * H], [c + half, 2 * H], [c + half + rise, H]);
    busy.push([c - half - rise - 1, c + half + rise + 1]);
  }
  way.profile = pts.sort((a, b) => a[0] - b[0]);

  // Interchanges: diamonds at cross streets, ramps in the blocks either side.
  const side = (travel: 1 | -1): 1 | -1 => (axis === 'h' ? travel : (-travel as 1 | -1));
  const reach = RAMP_LEN + MERGE;
  const plusOk = (k: number) => {
    const foot = along(ln[k]) + hw(ln[k]) + FOOT_GAP;
    return k + 1 < ln.length && along(ln[k + 1]) - hw(ln[k + 1]) - 2 - foot >= CLEAR_S && free(foot, foot + reach) && foot + reach < along(ln[ln.length - 1]);
  };
  const minusOk = (k: number) => {
    const foot = along(ln[k]) - hw(ln[k]) - FOOT_GAP;
    return k > 0 && foot - (along(ln[k - 1]) + hw(ln[k - 1]) + 2) >= CLEAR_S && free(foot - reach, foot) && foot - reach > along(ln[0]);
  };
  let first = -1, last = -1;
  for (let k = 1; k < ln.length - 1 && first < 0; k++) if (plusOk(k)) first = k;
  for (let k = ln.length - 2; k > first + EXIT_EVERY && last < 0; k--) if (minusOk(k)) last = k;
  if (first < 0 || last < 0) return null;
  const exits: number[] = [first];
  for (let k = first + EXIT_EVERY; k <= last - EXIT_EVERY; k++) {
    if (k - exits[exits.length - 1] >= EXIT_EVERY && plusOk(k) && minusOk(k)) exits.push(k);
  }
  exits.push(last);
  way.a0 = along(ln[first]) + hw(ln[first]) + FOOT_GAP + RAMP_LEN;
  way.a1 = along(ln[last]) - hw(ln[last]) - FOOT_GAP - RAMP_LEN;

  // Deck nodes where ramps join, then the deck between them.
  const deckNodes: RoadNode[] = [];
  const deckAt = (a: number): RoadNode => {
    let n = deckNodes.find((d) => Math.abs(along(d) - a) < 1);
    if (!n) {
      const p = wayPoint(way, a, 0);
      n = { id: g.nodes.length, i: -1, j: -1, x: p.x, y: p.y, segs: [], lights: false, wv: 0, wh: 0, level: way.strip };
      g.nodes.push(n);
      deckNodes.push(n);
    }
    return n;
  };
  const addSeg = (a: RoadNode, b: RoadNode, extra: Partial<Segment>, width: number, lanes: number) => {
    const lo = along(a) <= along(b) ? a : b, hi = lo === a ? b : a;
    const s: Segment = { id: g.segs.length, axis, a: a.id, b: b.id, x0: lo.x, y0: lo.y, x1: hi.x, y1: hi.y, width, lanes, parking: false, bridge: false, way: wi, ...extra };
    g.segs.push(s);
    a.segs.push(s.id);
    b.segs.push(s.id);
  };
  const ramp = (k: number, travel: 1 | -1, on: boolean) => {
    const n = ln[k];
    const sd = side(travel);
    // On-ramps start past the crossing they leave; exits end short of the one they come down to.
    const beyond: 1 | -1 = on ? travel : (-travel as 1 | -1);
    const foot = along(n) + beyond * (hw(n) + FOOT_GAP);
    const up = beyond;
    const lane = sd * 1.5 * LANE_W;
    const lat = sd * RAMP_LAT;
    // Lined up in the ramp's lane before its walls start (in the crossing's box), straight up it,
    // then over into the deck's outer lane.
    const upPts: [number, number][] = [[-FOOT_GAP - 2, lat], [0, lat], [RAMP_LEN / 2, lat], [RAMP_LEN, lat], [RAMP_LEN + MERGE / 2, (lat + lane) / 2], [reach, lane]];
    const path = upPts.map(([s, l]) => wayPoint(way, foot + up * s, l));
    if (!on) path.reverse();
    const deck = deckAt(foot + up * reach);
    const r: Ramp = { way: wi, lat, side: sd, foot, up, travel, node: n.id, deckNode: deck.id };
    way.ramps.push(r);
    if (on) addSeg(n, deck, { oneway: true, path }, 4.6, 1);
    else addSeg(deck, n, { oneway: true, path }, 4.6, 1);
    // A ramp meets the cross street at a signalled junction under the highway.
    n.lights = WORLD.modern;
  };
  for (const k of exits) {
    const isFirst = k === first, isLast = k === last;
    if (!isLast) { ramp(k, 1, true); ramp(k, -1, false); }
    if (!isFirst) { ramp(k, 1, false); ramp(k, -1, true); }
  }
  deckNodes.sort((a, b) => along(a) - along(b));
  for (let i = 0; i + 1 < deckNodes.length; i++) addSeg(deckNodes[i], deckNodes[i + 1], { level: way.strip }, 2 * DECK_HALF, 2);
  return way;
}
