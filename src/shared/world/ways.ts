// Ways at run time: how high the surface is under a point (street, ramp, deck, trench), crossing
// between the street and a highway on a ramp, and the walls that keep you on them. A ramp runs at
// ground level from its cross street; its first part is the street's, walled in; past SWITCH_S along
// it you're moved onto the way's strip (world/levels.ts), whose walls take over; coming off, the
// same in reverse. Drawing never sees the jump: both sides map to the same point on the corridor.
// The corridor is fenced on the street's side wherever the highway's in it (corridorFences).
import type { Box2, Circle2 } from './collision';
import type { City } from './cityTypes';
import { railColumns } from './railgen';
import { groundAt } from './terrain';
import { FLOOR_H, floorOf, isWayStrip, LEVEL_BAND, MAX_FLOORS } from './levels';
import { CLEAR_S, CORRIDOR_W, DECK_H, DECK_HALF, inRamp, MERGE, profileZ, RAMP_LEN, RAMP_W, rampS, SWITCH_S, WALL_H, WALL_T, type Way, wayLocal, wayPoint } from './wayTypes';

/** A highway's sound walls, where the blocks back onto its corridor. */
export const SOUND_WALL_H = 3.2;

/** The client's city's ways, for drawing code that only has a position (installed once the city
 *  is built). */
let drawn: Way[] = [];
export function installWays(ways: Way[]): void { drawn = ways; }
/** surfaceZ over the installed ways, on the installed ground (world/terrain.ts: hills in open
 *  country; 0 in a flat world and on upper floors). */
export const heightAt = (x: number, y: number): number => surfaceZ(drawn, x, y) + groundAt(x, y);

/** The way whose strip `f` is, if any. */
export const wayOn = (ways: Way[], f: number): Way | undefined => (isWayStrip(f) ? ways.find((w) => w.strip === f) : undefined);

/** Height of the surface something at (x, y) stands on: a building's floor, a ramp, a deck, a trench. */
export function surfaceZ(ways: Way[], x: number, y: number): number {
  const f = floorOf(x);
  if (f === 0) return 0;
  if (f <= MAX_FLOORS) return f * FLOOR_H;
  const w = wayOn(ways, f);
  if (!w) return 0;
  const { a, l } = wayLocal(w, x - f * LEVEL_BAND, y);
  // A ramp's on the ground the whole way, beside the highway's climb.
  for (const r of w.ramps) if (inRamp(r, a, l, -5, RAMP_LEN, 0.4)) return 0;
  return profileZ(w, a);
}

/** The walls round a highway's corridor, as boxes along it [a0, a1] and across it [l0, l1]: sound
 *  walls (`tall`) down both edges, where the blocks back onto it, open where streets pass; a low
 *  wall across the corridor at each crossing's kerbs, open for the ramps that start there. */
export function corridorFences(city: City, w: Way): { a0: number; a1: number; l0: number; l1: number; tall: boolean }[] {
  const out: { a0: number; a1: number; l0: number; l1: number; tall: boolean }[] = [];
  const E = CORRIDOR_W / 2, T = 0.3;
  const along = (x: number, y: number) => (w.axis === 'h' ? x : y);
  const crossings = city.nodes.filter((n) => n.level === undefined && !n.end && (w.axis === 'h' ? n.j === w.line : n.i === w.line))
    .map((n) => { const a = along(n.x, n.y), h = (w.axis === 'h' ? n.wv : n.wh) / 2; return { n, a0: a - h, a1: a + h }; })
    .sort((p, q) => p.a0 - q.a0);
  // The highway's run: from its first interchange's street to its last.
  const lo = w.a0 - RAMP_LEN - MERGE - 20, hi = w.a1 + RAMP_LEN + MERGE + 20;
  // Edges, along the run: gaps where streets pass and where the other highway's corridor crosses.
  const gaps = [...crossings.map((c) => [c.a0, c.a1] as [number, number]),
    ...city.ways.filter((o) => o.kind === 'highway' && o.axis !== w.axis).map((o) => [o.pos - E, o.pos + E] as [number, number])].sort((p, q) => p[0] - q[0]);
  let from = Math.max(lo, crossings[0]?.a1 ?? lo);
  const last = Math.min(hi, crossings[crossings.length - 1]?.a0 ?? hi);
  for (const [g0, g1] of gaps) {
    if (g1 <= from) continue;
    if (g0 > last) break;
    if (g0 - from > 0.5) out.push({ a0: from, a1: g0, l0: -E, l1: -E + T, tall: true }, { a0: from, a1: g0, l0: E - T, l1: E, tall: true });
    from = Math.max(from, g1);
  }
  if (last - from > 0.5) out.push({ a0: from, a1: last, l0: -E, l1: -E + T, tall: true }, { a0: from, a1: last, l0: E - T, l1: E, tall: true });
  // Across the corridor at each crossing's kerbs along the run, but for its ramps' feet.
  for (const c of crossings) {
    for (const [a, dir] of [[c.a0, -1], [c.a1, 1]] as const) {
      if (a < lo || a > hi) continue;
      const open = w.ramps.filter((r) => r.node === c.n.id && r.up === dir).map((r) => [r.lat - RAMP_W / 2, r.lat + RAMP_W / 2] as [number, number]).sort((p, q) => p[0] - q[0]);
      let from = -E;
      for (const [o0, o1] of open) { if (o0 > from) out.push({ a0: a + (dir < 0 ? -T : 0), a1: a + (dir < 0 ? 0 : T), l0: from, l1: o0, tall: false }); from = o1; }
      if (E > from) out.push({ a0: a + (dir < 0 ? -T : 0), a1: a + (dir < 0 ? 0 : T), l0: from, l1: E, tall: false });
    }
  }
  return out;
}

/** Crossing on a ramp: a point on the street past the switch moves up onto the way's strip, a point
 *  on the strip below it moves down to the street. Null: stays where it is. */
export function crossing(ways: Way[], x: number, y: number): { x: number; y: number } | null {
  const f = floorOf(x);
  if (f === 0) {
    for (const w of ways) {
      const { a, l } = wayLocal(w, x, y);
      if (Math.abs(l) > DECK_HALF + RAMP_W + 1) continue;
      for (const r of w.ramps) if (inRamp(r, a, l, SWITCH_S, CLEAR_S + 2, 0.5)) return { x: x + w.strip * LEVEL_BAND, y };
    }
    return null;
  }
  const w = wayOn(ways, f);
  if (!w) return null;
  const gx = x - f * LEVEL_BAND;
  const { a, l } = wayLocal(w, gx, y);
  for (const r of w.ramps) if (inRamp(r, a, l, SWITCH_S - 12, SWITCH_S, 0.5)) return { x: gx, y };
  return null;
}

/** On foot, heading for (tx, ty) on another level (street or a way's deck): where to walk now, up or
 *  down the ramp that makes the trip shortest. Null when they're on the same level. */
export function rampWalk(ways: Way[], x: number, y: number, tx: number, ty: number): { x: number; y: number } | null {
  const mf = floorOf(x), tf = floorOf(tx);
  if (mf === tf || (!isWayStrip(mf) && !isWayStrip(tf))) return null;
  const me = { x: x - mf * LEVEL_BAND, y }, to = { x: tx - tf * LEVEL_BAND, y: ty };
  // On a deck: down to the street first (even to get onto another way).
  const w = isWayStrip(mf) ? wayOn(ways, mf) : wayOn(ways, tf);
  if (!w || !w.ramps.length) return null; // a railway's viaduct: no walking up to it
  const down = isWayStrip(mf);
  let best = w.ramps[0], bd = Infinity;
  for (const r of w.ramps) {
    const foot = wayPoint(w, r.foot, r.lat), top = wayPoint(w, r.foot + r.up * RAMP_LEN, r.lat);
    const d = down ? Math.hypot(top.x - me.x, top.y - me.y) + Math.hypot(foot.x - to.x, foot.y - to.y)
      : Math.hypot(foot.x - me.x, foot.y - me.y) + Math.hypot(top.x - to.x, top.y - to.y);
    if (d < bd) { bd = d; best = r; }
  }
  const r = best;
  const { a, l } = wayLocal(w, me.x, me.y);
  const s = rampS(r, a);
  const inLane = Math.abs(l - r.lat) < RAMP_W / 2;
  const at = (s2: number) => wayPoint(w, r.foot + r.up * s2, r.lat);
  if (down) {
    const p = inLane && s < RAMP_LEN + 2 ? at(SWITCH_S - 4) : at(RAMP_LEN + 6);
    return { x: p.x + mf * LEVEL_BAND, y: p.y };
  }
  return inLane && s > -3 ? at(SWITCH_S + 4) : at(-3);
}

/** Collision for the ways: on the street, the walls of each ramp's lower part and the columns under
 *  the decks (none in the cross streets, the ramps or the river), and the trench and its dives
 *  fenced off between the cross streets that bridge it; on each strip, the deck's edge and median
 *  barriers (open where ramps join), the ramps' upper walls and the deck's ends. */
export function wayCollision(city: City, isWater: (x: number, y: number) => boolean): { boxes: Box2[]; circles: Circle2[] } {
  const boxes: Box2[] = [], circles: Circle2[] = [];
  // An elevated railway: its columns at the kerbs and the stations' stair towers on the sidewalks.
  const rail = city.railway;
  if (rail && rail.strip) {
    for (const c of railColumns(rail, city.nodes, isWater)) circles.push({ x: c.x, y: c.y, r: 0.35, h: rail.z });
    for (const s of rail.stations) for (const t of s.towers) boxes.push({ ...t, h: 4 });
  }
  for (const w of city.ways) {
    if (w.kind !== 'highway') continue;
    const lift = w.strip * LEVEL_BAND;
    // A box on the way from along a0..a1, across l0..l1 (ground, or lifted onto the strip).
    const box = (a0: number, a1: number, l0: number, l1: number, h: number, up: boolean) => {
      const p = wayPoint(w, Math.min(a0, a1), Math.min(l0, l1)), q = wayPoint(w, Math.max(a0, a1), Math.max(l0, l1));
      const b = { x0: Math.min(p.x, q.x), y0: Math.min(p.y, q.y), x1: Math.max(p.x, q.x), y1: Math.max(p.y, q.y), h };
      if (up) { b.x0 += lift; b.x1 += lift; }
      boxes.push(b);
    };
    const T = WALL_T;
    // Street: the corridor's fences, wherever the highway's in it.
    for (const f of corridorFences(city, w)) box(f.a0, f.a1, f.l0, f.l1, f.tall ? SOUND_WALL_H : 1.2, false);
    for (const r of w.ramps) {
      const at = (s: number) => r.foot + r.up * s;
      const lo = r.lat - RAMP_W / 2, hi = r.lat + RAMP_W / 2;
      // Street: walled in from the cross street's kerb to the switch and a bit past, closed there.
      box(at(-4.3), at(CLEAR_S), lo, lo + T, 3, false);
      box(at(-4.3), at(CLEAR_S), hi - T, hi, 3, false);
      box(at(CLEAR_S), at(CLEAR_S + 0.6), lo, hi, 3, false);
      // Strip: walls from below the switch to the top, closed at the bottom end.
      box(at(SWITCH_S - 12), at(RAMP_LEN), lo, lo + T, WALL_H, true);
      box(at(SWITCH_S - 12), at(RAMP_LEN), hi - T, hi, WALL_H, true);
      box(at(SWITCH_S - 12.6), at(SWITCH_S - 12), lo, hi, WALL_H, true);
      // The merge (or exit) lane beside the deck: its outer wall closes in on the deck's edge.
      const steps = 5, out = r.side, o0 = Math.abs(r.lat) + RAMP_W / 2, o1 = DECK_HALF + 0.3;
      for (let k = 0; k < steps; k++) {
        const e = out * (o0 + (o1 - o0) * ((k + 0.5) / steps));
        box(at(RAMP_LEN + (k * MERGE) / steps), at(RAMP_LEN + ((k + 1) * MERGE) / steps), e - out * T, e, WALL_H, true);
      }
    }
    // Deck edges, except where a ramp's lane runs alongside, and the median barrier.
    for (const sd of [1, -1] as const) {
      const gaps = w.ramps.filter((r) => r.side === sd).map((r) => {
        const a = r.foot + r.up * RAMP_LEN, b = r.foot + r.up * (RAMP_LEN + MERGE);
        return [Math.min(a, b), Math.max(a, b)] as [number, number];
      }).sort((p, q) => p[0] - q[0]);
      let from = w.a0;
      for (const [g0, g1] of gaps) { if (g0 > from) box(from, g0, sd * DECK_HALF - T, sd * DECK_HALF, WALL_H, true); from = Math.max(from, g1); }
      if (w.a1 > from) box(from, w.a1, sd * DECK_HALF - T, sd * DECK_HALF, WALL_H, true);
    }
    box(w.a0, w.a1, -0.3, 0.3, WALL_H, true);
    box(w.a0 - 0.6, w.a0, -DECK_HALF, DECK_HALF, WALL_H, true);
    box(w.a1, w.a1 + 0.6, -DECK_HALF, DECK_HALF, WALL_H, true);
    // Street: the trench and its dives, fenced off except where cross streets bridge it.
    for (const [s0, s1] of w.sunk) {
      const cuts = w.bridges.filter(([b0, b1]) => b1 > s0 && b0 < s1).sort((p, q) => p[0] - q[0]);
      let from = s0;
      for (const [b0, b1] of cuts) { if (b0 > from) box(from, b0, -DECK_HALF - 0.6, DECK_HALF + 0.6, 2, false); from = b1; }
      if (s1 > from) box(from, s1, -DECK_HALF - 0.6, DECK_HALF + 0.6, 2, false);
    }
    // Columns under the raised deck, in pairs at its edges.
    for (const a of columnStations(city, w)) {
      for (const sd of [1, -1]) {
        const p = wayPoint(w, a, sd * (DECK_HALF - 0.6));
        if (!isWater(p.x, p.y)) circles.push({ x: p.x, y: p.y, r: 0.45, h: DECK_H });
      }
    }
  }
  return { boxes, circles };
}

/** Where a way's trench is open to the sky (below street level and not under a cross street's
 *  bridge): along-axis intervals. The ground is cut away there. */
export function trenchOpen(w: Way): [number, number][] {
  const out: [number, number][] = [];
  for (const [s0, s1] of w.sunk) {
    let h0 = -1, h1 = -1;
    for (let a = s0; a <= s1; a += 0.5) if (profileZ(w, a) < -0.05) { if (h0 < 0) h0 = a; h1 = a; }
    if (h0 < 0) continue;
    let from = h0;
    for (const [b0, b1] of w.bridges.filter(([b0, b1]) => b1 > h0 && b0 < h1).sort((p, q) => p[0] - q[0])) {
      if (b0 > from) out.push([from, b0]);
      from = Math.max(from, b1);
    }
    if (h1 > from) out.push([from, h1]);
  }
  return out;
}

/** Ground rectangles a trench cuts out of the street. */
export function trenchHoles(w: Way): { x0: number; y0: number; x1: number; y1: number }[] {
  return trenchOpen(w).map(([a0, a1]) => {
    const p = wayPoint(w, a0, -DECK_HALF - 0.3), q = wayPoint(w, a1, DECK_HALF + 0.3);
    return { x0: Math.min(p.x, q.x), y0: Math.min(p.y, q.y), x1: Math.max(p.x, q.x), y1: Math.max(p.y, q.y) };
  });
}

/** Where columns stand along a way: every ~26 m under the raised deck, clear of cross streets, ramps'
 *  street parts and the trench. */
export function columnStations(city: City, w: Way): number[] {
  const out: number[] = [];
  const crossings = city.nodes.filter((n) => n.level === undefined && !n.end && (w.axis === 'h' ? n.j === w.line : n.i === w.line))
    .map((n) => { const a = w.axis === 'h' ? n.x : n.y, h = (w.axis === 'h' ? n.wv : n.wh) / 2 + 2; return [a - h, a + h] as [number, number]; });
  // Nor in the other highway's corridor (it passes under the bridge there).
  for (const o of city.ways) if (o.kind === 'highway' && o.axis !== w.axis) crossings.push([o.pos - CORRIDOR_W / 2 - 1, o.pos + CORRIDOR_W / 2 + 1]);
  const blocked = (a: number) => crossings.some(([c0, c1]) => a > c0 && a < c1)
    || w.sunk.some(([s0, s1]) => a > s0 - 4 && a < s1 + 4)
    || w.ramps.some((r) => { const s = rampS(r, a); return s > -2 && s < CLEAR_S + 2; });
  for (let a = w.a0 + 6; a < w.a1 - 6; a += 26) {
    let at = a;
    // Nudge off a crossing rather than lose the column.
    for (let k = 0; k < 6 && blocked(at); k++) at += 4;
    if (!blocked(at) && profileZ(w, at) > 2) out.push(at);
  }
  return out;
}
