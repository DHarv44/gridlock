// Where boats lie moored: along both banks of the river, clear of the bridges, and here and there
// round the coast. Each mooring is a point on the bank and the way out into the water (a unit
// vector); the boat lies alongside it, parallel to the bank. Worked out from the city alone, so it
// is the same every time; the server keeps the ones a pedestrian can actually step down from.
import { type City, LAND0, LAND1 } from './cityTypes';

export interface Mooring { x: number; y: number; nx: number; ny: number; angle: number }

/** Metres between moorings along the river, and round the coast. */
const RIVER_STEP = 170, COAST_STEP = 380;
/** Moorings keep this far from a bridge (m). */
const BRIDGE_CLEAR = 18;

export function moorings(city: City): Mooring[] {
  const out: Mooring[] = [];
  const r = city.riverRow;
  const north = city.ys[r].pos + city.ys[r].width / 2, south = city.ys[r + 1].pos - city.ys[r + 1].width / 2;
  // The river: alternate banks, skipping anywhere near a bridge.
  let k = 0;
  for (let x = LAND0 + 60; x < LAND1 - 60; x += RIVER_STEP, k++) {
    if (city.bridges.some((b) => x > b.x0 - BRIDGE_CLEAR && x < b.x1 + BRIDGE_CLEAR)) continue;
    out.push(k % 2 ? { x, y: south, nx: 0, ny: -1, angle: Math.PI } : { x, y: north, nx: 0, ny: 1, angle: 0 });
  }
  // The coast: the island's four shores.
  for (let t = LAND0 + 150; t < LAND1 - 150; t += COAST_STEP) {
    out.push({ x: t, y: LAND0, nx: 0, ny: -1, angle: 0 });
    out.push({ x: t, y: LAND1, nx: 0, ny: 1, angle: Math.PI });
    out.push({ x: LAND0, y: t, nx: -1, ny: 0, angle: Math.PI / 2 });
    out.push({ x: LAND1, y: t, nx: 1, ny: 0, angle: -Math.PI / 2 });
  }
  return out;
}
