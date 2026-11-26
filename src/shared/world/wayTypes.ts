// Highways (and an elevated railway): their shapes and sizes. A highway runs along its own corridor
// on the ground, fenced in, and only climbs where it has to: over the main cross streets that pass
// under it (the side streets end at its fence), the river and the other highway; rarely it's sunk
// in a trench instead. It lives on its own strip off the map (world/levels.ts: strip WAY0 + index),
// so it never touches the street except through its ramps, which run at ground level beside it
// from the cross streets. Drawing puts it back over its corridor at the height its profile gives.
// Sizes in metres.
import { LANE_W } from './cityTypes';

export { MAX_WAYS, WAY0 } from './levels';

/** Deck surface height where it bridges a street (5 m clear under a 0.5 m deck). */
export const DECK_H = 5.5;
/** Half the deck's width: two lanes each way, a median barrier and shoulders. */
export const DECK_HALF = 2 * LANE_W + 1.3;
/** A ramp, barriers included, alongside the deck (a 0.1 m gap from its edge): a full lane with a
 *  shoulder each side. */
export const RAMP_W = 7.4;
/** Ramp lane centre, out from the corridor's centre line. */
export const RAMP_LAT = DECK_HALF + 0.1 + RAMP_W / 2;
/** A highway's corridor, fence to fence: the deck, and the ramps outside it. */
export const AVENUE_W = 2 * (DECK_HALF + 0.1 + RAMP_W);
/** How steeply the highway climbs to bridge a street, and the run that takes it up. */
export const HUMP_GRADE = 0.06;
export const HUMP = DECK_H / HUMP_GRADE;
/** The deck stays up this far past a bridged street's kerbs. */
export const HUMP_PAD = 2;
/** A ramp's foot: this far from the cross street's kerb. */
export const FOOT_GAP = 4;
/** A ramp's lane from its foot to where it meets the deck's: past the bridge's climb, so it joins
 *  (or leaves) the highway where that's on the ground too. */
export const RAMP_LEN = HUMP + HUMP_PAD + 2;
/** Where along a ramp (from its foot) you pass between street and highway, and how far it's
 *  walled in on the street's side. */
export const SWITCH_S = 10;
export const CLEAR_S = 16;
/** The lane beside the deck where a ramp merges in (or an exit peels off). */
export const MERGE = 30;
/** Steepest grade where the way dives into its trench (a city cut: steep, the blocks are short). */
export const MAIN_GRADE = 0.12;
/** A trench's road surface below the street (4.3 m clear under the bridges' 0.5 m slabs). */
export const TRENCH_D = 4.8;
/** Barrier thickness and height (jersey walls). */
export const WALL_T = 0.3;
export const WALL_H = 1.0;

/** A ramp between the street and a way's deck. `lat` is the ramp lane's centre across the way's
 *  axis, out from its centre line (±RAMP_LAT; `side` is its sign). Along the axis, `foot` is
 *  where it meets the street and `up` the direction it climbs; `travel` is the way traffic drives
 *  (on-ramps climb the way they go, exits come down). */
export interface Ramp {
  way: number;
  lat: number;
  side: 1 | -1;
  foot: number;
  up: 1 | -1;
  travel: 1 | -1;
  /** The street node it starts or ends at, and the deck node where it joins the way. */
  node: number;
  deckNode: number;
}

export interface Way {
  kind: 'highway' | 'rail';
  axis: 'h' | 'v';
  /** The road line it runs along (index into city.xs for 'v', city.ys for 'h') and that line's
   *  position across the axis. */
  line: number;
  pos: number;
  /** Strip (world/levels.ts floor index) it lives on. */
  strip: number;
  /** Along-axis extent of its deck. */
  a0: number;
  a1: number;
  /** Height along the axis: [along, z] points, piecewise linear (0 on the ground, DECK_H over a
   *  street it bridges, higher over another way, -TRENCH_D in a trench). */
  profile: [number, number][];
  /** Along-axis stretches in a trench or crossing ground level (the avenue isn't there). */
  sunk: [number, number][];
  /** Where cross streets bridge its trench: along-axis intervals. */
  bridges: [number, number][];
  ramps: Ramp[];
}

/** A point on a way: along its axis and across it, from ground coordinates. */
export function wayLocal(w: Way, x: number, y: number): { a: number; l: number } {
  return w.axis === 'h' ? { a: x, l: y - w.pos } : { a: y, l: x - w.pos };
}

/** Ground coordinates of (along, across) on a way. */
export function wayPoint(w: Way, a: number, l: number): { x: number; y: number } {
  return w.axis === 'h' ? { x: a, y: w.pos + l } : { x: w.pos + l, y: a };
}

/** Height of the way's deck at `a` along it (its profile). */
export function profileZ(w: Way, a: number): number {
  const p = w.profile;
  if (a <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    if (a <= p[i][0]) {
      const [a0, z0] = p[i - 1], [a1, z1] = p[i];
      return a1 === a0 ? z1 : z0 + ((a - a0) / (a1 - a0)) * (z1 - z0);
    }
  }
  return p[p.length - 1][1];
}

/** Distance up a ramp from its foot (negative: before it). */
export const rampS = (r: Ramp, a: number): number => (a - r.foot) * r.up;

/** Is (a, l) in a ramp's lane (between its walls), from `s0` to `s1` up it? */
export function inRamp(r: Ramp, a: number, l: number, s0: number, s1: number, pad = 0): boolean {
  if (Math.abs(l - (r.lat)) > RAMP_W / 2 + pad) return false;
  const s = rampS(r, a);
  return s >= s0 && s <= s1;
}
