// Highways (WORLD.highways), on corridors of their own through the blocks (world/corridors.ts). Two
// steps. Before blocks are laid out (planWays): plan each from the lines alone (planWay): which cross
// streets pass it (the main streets; the side streets end short of it, roadgen.ts), where its interchanges are, and,
// rarely, a trench that side streets bridge. Once the road graph exists (buildWays): its height
// profile (on the ground, climbing only to bridge the streets that pass under it, the river and the
// other highway; down in its trench), diamond interchanges with their ramps at ground level beside
// it, and its deck and ramps in the road graph so traffic and the police drive it. Deterministic
// from the layout.
import { LANE_W, MAP_SIZE, type RoadLine, type RoadNode, type Segment } from './cityTypes';
import type { RoadLayout } from './roadgen';
import { WORLD } from './worldSpec';
import { CORRIDOR_W, DECK_H, DECK_HALF, FOOT_GAP, HUMP, HUMP_GRADE, HUMP_PAD, MAIN_GRADE, MERGE, profileZ, RAMP_LAT, RAMP_LEN, RAMP_W, type Ramp, TRENCH_D, type Way, WAY0, wayPoint } from './wayTypes';

/** The run a trench's dive takes. */
const DIVE = TRENCH_D / MAIN_GRADE;
/** A ramp's reach along the corridor from its cross street's kerb. */
const REACH = FOOT_GAP + RAMP_LEN + MERGE;

/** Plans each highway corridor (world/corridors.ts put them in: east-west first). */
export function planWays(L: RoadLayout): void {
  const spec = WORLD.highways;
  if (!spec || spec.count <= 0) return;
  const corridors: { axis: 'h' | 'v'; line: number }[] = [];
  L.ys.forEach((l, j) => { if (l.highway) corridors.push({ axis: 'h', line: j }); });
  L.xs.forEach((l, i) => { if (l.highway) { corridors.push({ axis: 'v', line: i }); L.bridgeLines.delete(i); } });
  // One trench at most (WORLD.highways.sunken), on the first corridor with room for it.
  let trenched = spec.sunken <= 0;
  corridors.forEach((c, k) => {
    const other = corridors.find((o) => o.axis !== c.axis);
    const plan = planWay(L, c.axis, other ? (other.axis === 'h' ? L.ys : L.xs)[other.line].pos : null, k > 0, !trenched);
    (c.axis === 'h' ? L.ys : L.xs)[c.line].plan = plan;
    if (plan.trench.length) trenched = true;
  });
}

/** Which cross lines pass a corridor, where its interchanges are, which bridge its trench. Along the
 *  corridor, `otherAt` is where the other highway crosses it (`climbs`: this one goes over it). */
function planWay(L: RoadLayout, axis: 'h' | 'v', otherAt: number | null, climbs: boolean, trenchOk: boolean): NonNullable<RoadLine['plan']> {
  const cross = axis === 'h' ? L.xs : L.ys;
  const at = (k: number) => cross[k].pos, hw = (k: number) => cross[k].width / 2;
  const all = cross.map((_, k) => k).filter((k) => !cross[k].highway && !cross[k].rail);
  const river = axis === 'v' && L.riverRow >= 0 ? [L.ys[L.riverRow].pos, L.ys[L.riverRow + 1].pos] : null;
  const overlaps = (a0: number, a1: number, b0: number, b1: number) => a1 > b0 && a0 < b1;
  // What the other highway and the river need: their corridor or water kept clear, and if this
  // highway climbs over them, the climb (where nothing can join it).
  const climb = (c0: number, c1: number): [number, number] => [c0 - HUMP - 4, c1 + HUMP + 4];
  const keepOut: [number, number][] = [];
  if (otherAt !== null) keepOut.push(climbs ? climb(otherAt - CORRIDOR_W / 2 - 3, otherAt + CORRIDOR_W / 2 + 3) : [otherAt - CORRIDOR_W / 2 - 5, otherAt + CORRIDOR_W / 2 + 5]);
  if (river) keepOut.push(climb(river[0], river[1]));
  const clashes = (a0: number, a1: number) => keepOut.some(([b0, b1]) => overlaps(a0, a1, b0, b1));
  const mains = all.filter((k) => k >= 1 && k <= cross.length - 2 && cross[k].arterial);
  const hump = (k: number): [number, number] => [at(k) - hw(k) - HUMP_PAD - HUMP, at(k) + hw(k) + HUMP_PAD + HUMP];
  // Interchanges at main streets with room for their ramps either side: clear of the others' climbs.
  const exits = mains.filter((k) => {
    const a0 = at(k) - hw(k) - REACH, a1 = at(k) + hw(k) + REACH;
    return !clashes(a0, a1) && mains.every((o) => o === k || !overlaps(a0, a1, ...hump(o)));
  });
  if (exits.length < 2) return { cross: all, exits: [], trench: [] };
  const lo = at(exits[0]), hi = at(exits[exits.length - 1]);
  // Inside the highway's run only the main streets (and the river's banks) pass; outside it, all.
  const bank = (k: number) => axis === 'v' && L.riverRow >= 0 && (k === L.riverRow || k === L.riverRow + 1);
  const passes = new Set(all.filter((k) => at(k) <= lo || at(k) >= hi || mains.includes(k) || bank(k)));
  // A trench, rarely: one or two side streets bridging it near the middle, its dives clear of every
  // climb and ramp.
  const trench: number[] = [];
  if (trenchOk) {
    // Not where it climbs, nor where a ramp joins it (ramps can run beside the dive, at street level).
    const busy: [number, number][] = [];
    for (const k of passes) if (at(k) > lo && at(k) < hi) busy.push(hump(k));
    for (const k of exits) {
      const m = hw(k) + FOOT_GAP + RAMP_LEN;
      busy.push([at(k) - m - MERGE, at(k) - m], [at(k) + m, at(k) + m + MERGE]);
    }
    const mid = (lo + hi) / 2;
    const runs = all.filter((k) => !passes.has(k) && at(k) > lo && at(k) < hi)
      .flatMap((k) => [[k], [k, k + 1]]).filter((run) => run.every((k) => all.includes(k) && !passes.has(k) && at(k) < hi))
      .sort((p, q) => Math.abs(at(p[0]) - mid) - Math.abs(at(q[0]) - mid));
    for (const run of runs) {
      const t0 = at(run[0]) - hw(run[0]) - 3 - DIVE, u1 = at(run[run.length - 1]) + hw(run[run.length - 1]) + 3 + DIVE;
      if (clashes(t0, u1) || busy.some(([b0, b1]) => b1 > t0 - 4 && b0 < u1 + 4)) continue;
      trench.push(...run);
      for (const k of run) passes.add(k);
      break;
    }
  }
  return { cross: [...passes].sort((a, b) => a - b), exits, trench };
}

interface Graph { nodes: RoadNode[]; segs: Segment[] }

/** Builds the highways along the planned corridors and adds their decks and ramps to the road graph. */
export function buildWays(L: RoadLayout, g: Graph): Way[] {
  const ways: Way[] = [];
  const lines: { axis: 'h' | 'v'; line: number }[] = [];
  L.ys.forEach((l, j) => { if (l.highway) lines.push({ axis: 'h', line: j }); });
  L.xs.forEach((l, i) => { if (l.highway) lines.push({ axis: 'v', line: i }); });
  for (const { axis, line } of lines) {
    const w = buildWay(L, g, axis, line, ways.length, ways);
    if (w) ways.push(w);
  }
  return ways;
}

function buildWay(L: RoadLayout, g: Graph, axis: 'h' | 'v', line: number, wi: number, built: Way[]): Way | null {
  const plan = (axis === 'h' ? L.ys : L.xs)[line].plan;
  if (!plan || plan.exits.length < 2) return null;
  const pos = axis === 'h' ? L.ys[line].pos : L.xs[line].pos;
  const along = (n: RoadNode) => (axis === 'h' ? n.x : n.y);
  const hw = (n: RoadNode) => (axis === 'h' ? n.wv : n.wh) / 2;
  const crossIdx = (n: RoadNode) => (axis === 'h' ? n.i : n.j);
  // The streets passing the corridor, in order along it.
  const ln = g.nodes.filter((n) => n.level === undefined && !n.end && (axis === 'h' ? n.j === line : n.i === line)).sort((a, b) => along(a) - along(b));
  const nodeOf = (k: number) => ln.find((n) => crossIdx(n) === k);
  const exits = plan.exits.map(nodeOf).filter((n): n is RoadNode => !!n);
  if (exits.length < 2) return null;
  const first = exits[0], last = exits[exits.length - 1];
  const way: Way = { kind: 'highway', axis, line, pos, strip: WAY0 + wi, a0: 0, a1: 0, profile: [], sunk: [], bridges: [], ramps: [] };
  way.a0 = along(first) + hw(first) + FOOT_GAP + RAMP_LEN;
  way.a1 = along(last) - hw(last) - FOOT_GAP - RAMP_LEN;

  // The profile: on the ground, but for climbs (rise from, top from, top to, back down at, height).
  const climbs: [number, number, number, number, number][] = [];
  const climb = (c0: number, c1: number, z: number) => { const run = z / HUMP_GRADE; climbs.push([c0 - run, c0, c1, c1 + run, z]); };
  const inRun = (a: number) => a > along(first) && a < along(last);
  for (const n of ln) {
    if (plan.trench.includes(crossIdx(n)) || !inRun(along(n))) continue;
    climb(along(n) - hw(n) - HUMP_PAD, along(n) + hw(n) + HUMP_PAD, DECK_H);
  }
  if (axis === 'v' && L.riverRow >= 0 && inRun(L.ys[L.riverRow].pos)) climb(L.ys[L.riverRow].pos, L.ys[L.riverRow + 1].pos, DECK_H);
  // Over the other highway (built first): clear of its deck where it is there.
  const other = built.find((o) => o.kind === 'highway' && o.axis !== axis);
  if (other && inRun(other.pos)) climb(other.pos - DECK_HALF - 3, other.pos + DECK_HALF + 3, Math.max(0, profileZ(other, pos)) + DECK_H);
  let trench: [number, number, number, number] | null = null;
  const tn = plan.trench.map(nodeOf).filter((n): n is RoadNode => !!n);
  if (tn.length) {
    const t1 = along(tn[0]) - hw(tn[0]) - 3, u0 = along(tn[tn.length - 1]) + hw(tn[tn.length - 1]) + 3;
    trench = [t1 - TRENCH_D / MAIN_GRADE, t1, u0, u0 + TRENCH_D / MAIN_GRADE];
    way.sunk.push([trench[0], trench[3]]);
    for (const n of tn) way.bridges.push([along(n) - hw(n), along(n) + hw(n)]);
  }
  const zAt = (a: number): number => {
    if (trench && a > trench[0] && a < trench[3]) {
      const [t0, t1, u0, u1] = trench;
      return -TRENCH_D * (a < t1 ? (a - t0) / (t1 - t0) : a > u0 ? (u1 - a) / (u1 - u0) : 1);
    }
    let z = 0;
    for (const [s0, s1, e0, e1, h] of climbs) {
      if (a <= s0 || a >= e1) continue;
      z = Math.max(z, a < s1 ? (h * (a - s0)) / (s1 - s0) : a > e0 ? (h * (e1 - a)) / (e1 - e0) : h);
    }
    return z;
  };
  // Sampled every metre, keeping only the corners.
  const pts: [number, number][] = [];
  for (let a = 0; a <= MAP_SIZE; a += 1) {
    const z = zAt(a);
    if (pts.length >= 2) {
      const [a1, z1] = pts[pts.length - 1], [a0, z0] = pts[pts.length - 2];
      if (Math.abs((z1 - z0) / (a1 - a0) - (z - z1) / (a - a1)) < 1e-9) { pts[pts.length - 1] = [a, z]; continue; }
    }
    pts.push([a, z]);
  }
  way.profile = pts;

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
  const side = (travel: 1 | -1): 1 | -1 => (axis === 'h' ? travel : (-travel as 1 | -1));
  const ramp = (n: RoadNode, travel: 1 | -1, on: boolean) => {
    const sd = side(travel);
    // On-ramps leave past the crossing they start from; exits end short of the one they come to.
    const beyond: 1 | -1 = on ? travel : (-travel as 1 | -1);
    const foot = along(n) + beyond * (hw(n) + FOOT_GAP);
    const lane = sd * 1.5 * LANE_W, lat = sd * RAMP_LAT;
    // Lined up in the ramp's lane at the crossing, along it beside the highway's climb, then over
    // into its outer lane where it's on the ground.
    const pathPts: [number, number][] = [[-FOOT_GAP - 2, lat], [0, lat], [RAMP_LEN / 2, lat], [RAMP_LEN, lat], [RAMP_LEN + MERGE / 2, (lat + lane) / 2], [RAMP_LEN + MERGE, lane]];
    const path = pathPts.map(([s, l]) => wayPoint(way, foot + beyond * s, l));
    if (!on) path.reverse();
    const deck = deckAt(foot + beyond * (RAMP_LEN + MERGE));
    const r: Ramp = { way: wi, lat, side: sd, foot, up: beyond, travel, node: n.id, deckNode: deck.id };
    way.ramps.push(r);
    if (on) addSeg(n, deck, { oneway: true, path }, RAMP_W, 1);
    else addSeg(deck, n, { oneway: true, path }, RAMP_W, 1);
    // A ramp meets the cross street at a signalled junction.
    n.lights = WORLD.modern;
  };
  for (const n of exits) {
    if (n !== last) { ramp(n, 1, true); ramp(n, -1, false); }
    if (n !== first) { ramp(n, 1, false); ramp(n, -1, true); }
  }
  deckNodes.sort((a, b) => along(a) - along(b));
  for (let i = 0; i + 1 < deckNodes.length; i++) addSeg(deckNodes[i], deckNodes[i + 1], { level: way.strip }, 2 * DECK_HALF, 2);
  return way;
}
