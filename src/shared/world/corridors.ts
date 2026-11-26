// Where the highways and an elevated railway run: each through the middle of a row of blocks on a
// corridor of its own, never along a street, the way a city builds them: the land is taken from
// the blocks, whose buildings then back onto it. A corridor is a line of the grid with no street on
// it (roadgen.ts genGraph), put halfway between two streets; the lines beyond are pushed out so a
// block's worth of depth is left either side. Done before any block is laid out.
import { LAND1, MAP_SIZE, type RoadLine } from './cityTypes';
import { PLATFORM_HALF } from './railgen';
import { CORRIDOR_W } from './wayTypes';
import { WORLD } from './worldSpec';

/** Kerb to corridor: the depth of the blocks either side of one. */
const BACK = 30;
/** An elevated railway's strip: the viaduct and its platforms, an alley under them. */
export const RAIL_CORRIDOR_W = 2 * PLATFORM_HALF + 4;
const MIN_GAP = 46;

/** Inserts the universe's corridors into the lines (WORLD.highways: an east-west one, then a
 *  north-south one; an elevated WORLD.railway). Returns the river's row, moved if a corridor went
 *  in before it. */
export function insertCorridors(xs: RoadLine[], ys: RoadLine[], riverRow: number): number {
  const want: { axis: 'h' | 'v'; at: number; width: number; kind: 'highway' | 'rail' }[] = [];
  const hw = WORLD.highways;
  if (hw && hw.count > 0) want.push({ axis: 'h', at: 0.32, width: CORRIDOR_W, kind: 'highway' });
  if (hw && hw.count > 1) want.push({ axis: 'v', at: 0.56, width: CORRIDOR_W, kind: 'highway' });
  const rail = WORLD.railway;
  if (rail && rail.style === 'elevated') want.push({ axis: rail.axis, at: rail.at, width: RAIL_CORRIDOR_W, kind: 'rail' });
  for (const c of want) {
    // Horizontal corridors are rows of ys (an east-west line has a y); vertical ones, of xs.
    const lines = c.axis === 'h' ? ys : xs;
    const river = c.axis === 'h' ? riverRow : -1;
    const at = insertOne(lines, c.at, c.width, c.kind, river);
    if (at >= 0 && river >= 0 && at <= riverRow) riverRow++;
  }
  return riverRow;
}

const isCorridor = (l: RoadLine | undefined) => !!l && (!!l.highway || !!l.rail);

/** Puts one corridor in the gap nearest `at` (a fraction of the map): its index, or -1. */
function insertOne(lines: RoadLine[], at: number, width: number, kind: 'highway' | 'rail', riverRow: number): number {
  let g = -1, bd = Infinity;
  for (let k = 1; k + 1 < lines.length - 1; k++) {
    // Not the river, not beside it, not beside another corridor.
    if (riverRow >= 0 && k >= riverRow - 1 && k <= riverRow + 1) continue;
    if (isCorridor(lines[k]) || isCorridor(lines[k + 1])) continue;
    const d = Math.abs((lines[k].pos + lines[k + 1].pos) / 2 / MAP_SIZE - at);
    if (d < bd) { bd = d; g = k; }
  }
  if (g < 0) return -1;
  const a = lines[g], b = lines[g + 1];
  const need = a.width / 2 + BACK + width + BACK + b.width / 2;
  const short = Math.max(0, need - (b.pos - a.pos));
  for (let k = g + 1; k < lines.length; k++) lines[k].pos += short;
  const pos = a.pos + a.width / 2 + BACK + width / 2 + (b.pos - a.pos - need) / 2;
  lines.splice(g + 1, 0, { pos, width, lanes: 0, parking: false, arterial: true, ...(kind === 'highway' ? { highway: true } : { rail: true }) });
  // The map's edge road stays at the edge; streets pushed too near it go.
  const edge = lines[lines.length - 1];
  edge.pos = LAND1 - 8;
  while (lines.length > 2 && lines[lines.length - 2].pos > edge.pos - MIN_GAP && !isCorridor(lines[lines.length - 2])) lines.splice(lines.length - 2, 1);
  return g + 1;
}
