// ATMs: on the wall beside the door of every bank and of the businesses whose pack spec says so
// (`atm`). Worked out from the city alone, so server and clients agree on every one.
import { PROPERTIES, SERVICES } from '../packs';
import { type City, DIR_VEC, type Place } from './cityTypes';

/** An ATM: `x, y` is where you stand to use it; `wx, wy` its spot against the wall; `dir` the
 *  direction it faces (DIR_VEC index). */
export interface Atm { id: number; x: number; y: number; wx: number; wy: number; dir: number }

/** How far out from the wall you stand to use it (m). */
const STAND = 1.1;

/** Width of a storefront's hanging sign (render/storefronts.ts draws it; ATMs keep clear of it). */
export const signWidth = (text: string, facadeLen: number) => Math.min(facadeLen * 0.95, Math.max(5, text.length * 1.4));

export function atmsOf(city: City): Atm[] {
  const out: Atm[] = [];
  const add = (place: Place, signText: string | undefined) => {
    const lot = city.lots[place.lot];
    const b = lot?.building?.rect;
    if (!lot || !b || lot.front < 0) return;
    const [dx, dy] = DIR_VEC[lot.front];
    // The door point sits just outside the wall; step back onto the wall, then along it.
    const wallX = place.x - dx * 0.9, wallY = place.y - dy * 0.9;
    const along = dy !== 0; // the facade runs along x when facing north/south
    const lo = (along ? b.x0 : b.y0) + 0.8, hi = (along ? b.x1 : b.y1) - 0.8; // usable wall
    const door = along ? wallX : wallY;
    // Just past the end of the shop's sign so it shows from above (the sign is centred on the
    // door unless that would run it off the wall: storefronts.ts), else as far along as fits.
    let at: number;
    if (signText) {
      const w = signWidth(signText, hi - lo + 1.6), half = w / 2;
      const mid = Math.min(Math.max(door, lo - 0.8 + half), Math.max(lo - 0.8 + half, hi + 0.8 - half));
      at = mid + half + 0.7 <= hi ? mid + half + 0.7 : mid - half - 0.7 >= lo ? mid - half - 0.7 : hi - door > door - lo ? hi : lo;
    } else at = Math.min(door + 2.6, hi);
    if (Math.abs(at - door) < 1.4) return; // no room beside the door
    const wx = (along ? at : wallX) + dx * 0.22, wy = (along ? wallY : at) + dy * 0.22;
    out.push({ id: out.length, wx, wy, x: wx + dx * STAND, y: wy + dy * STAND, dir: lot.front });
  };
  for (const s of city.services) if (SERVICES[s.spec].atm) add(s, SERVICES[s.spec].signText);
  for (const p of city.properties) if (PROPERTIES[p.spec].atm) add(p, PROPERTIES[p.spec].signText);
  return out;
}
