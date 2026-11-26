// Raised and sunken ways (highways, and later railways): their shapes and sizes. A way runs along
// one road line of the grid (an avenue), on its own strip off the map (world/levels.ts: strip
// WAY0 + index), so it never touches the street below except through its ramps. Drawing lifts it
// back over its avenue at the height its profile gives. Sizes in metres.
import { LANE_W } from './cityTypes';

export { MAX_WAYS, WAY0 } from './levels';

/** Deck surface height over the street (5 m clear under a 0.5 m deck). */
export const DECK_H = 5.5;
/** Half the deck's width: two lanes each way, a median barrier and shoulders. */
export const DECK_HALF = 2 * LANE_W + 1.3;
/** A ramp lane, barriers included, alongside the deck (a 0.1 m gap from its edge). */
export const RAMP_W = 4.6;
/** Ramp lane centre, out from the avenue's centre line. */
export const RAMP_LAT = DECK_HALF + 0.1 + RAMP_W / 2;
/** Curb to curb of an avenue a highway runs over: its lanes under the deck, the ramp lanes outside. */
export const AVENUE_W = 2 * (DECK_HALF + 0.1 + RAMP_W);
/** Ramp grade (rise per metre) and the length that takes it up to the deck. */
export const GRADE = 0.075;
export const RAMP_LEN = DECK_H / GRADE;
/** Where along a ramp (from its foot) you pass between street and deck: past 3.8 m up, nothing on
 *  the street can reach you any more. */
export const SWITCH_S = 3.8 / GRADE;
/** How much of a ramp sits on the street (walled in): up to 4.6 m, after that it's overhead. */
export const CLEAR_S = 4.6 / GRADE;
/** The lane beside the deck where a ramp merges in (or an exit peels off). */
export const MERGE = 30;
/** Steepest grade where the way itself dives into a trench or climbs over another way (a city cut:
 *  steep, the blocks are short). */
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
  /** Height along the axis: [along, z] points, piecewise linear (DECK_H where raised, -DECK_H in a
   *  trench, higher where it climbs over another way). */
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
