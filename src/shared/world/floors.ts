// Upper floors of towers and apartment blocks (world/levels.ts puts floor f at x + f * LEVEL_BAND).
// Each floor fills the walk-in room's footprint: a closed shell, the lift (elevator or stairs) at the
// back in the middle, a corridor from it toward the front, and offices or flats either side of it,
// each with a doorway onto the corridor. Built in the room's local frame (`a` across, `d` in from the
// front) and handed back as rects through `rect`, already lifted onto the floor.
import type { Rect } from '../math';
import type { InteriorLayout } from '../packs';
import type { Box, Prop, PropKind, Spot } from './interiors';
import { FLOOR_H, MAX_FLOORS, onFloor } from './levels';

export interface UpperFloor { f: number; rect: Rect; walls: Box[]; props: Prop[]; lift: Spot }

const T = 0.3, WALL_H = 2.8, CORR = 2.2, DOOR = 1.1, UNIT = 4.8;

/** How many floors above the lobby a building of height h gets. */
export const floorsFor = (h: number): number => Math.max(1, Math.min(MAX_FLOORS, Math.floor(h / FLOOR_H) - 1));

export function upperFloors(
  layout: InteriorLayout, n: number, ia0: number, ia1: number, d0: number, iD: number,
  rect: (a0: number, a1: number, d0: number, d1: number) => Rect,
  point: (a: number, d: number) => { x: number; y: number }, face: number,
): UpperFloor[] {
  const out: UpperFloor[] = [];
  const am = (ia0 + ia1) / 2, c0 = am - CORR / 2, c1 = am + CORR / 2;
  const liftD = iD - 1.8;
  for (let f = 1; f <= n; f++) {
    const lift = (r: Rect): Rect => { const a = onFloor(r.x0, r.y0, f), b = onFloor(r.x1, r.y1, f); return { x0: a.x, y0: a.y, x1: b.x, y1: b.y }; };
    const walls: Box[] = [], props: Prop[] = [];
    const wall = (a0: number, a1: number, e0: number, e1: number) => { if (a1 - a0 > 0.05 && e1 - e0 > 0.05) walls.push({ rect: lift(rect(a0, a1, e0, e1)), h: WALL_H }); };
    const prop = (kind: PropKind, a0: number, a1: number, e0: number, e1: number, h: number) => props.push({ kind, rect: lift(rect(a0, a1, e0, e1)), h });
    // Closed shell round the floor.
    wall(ia0 - T, ia1 + T, d0 - T, d0);
    wall(ia0 - T, ia1 + T, iD, iD + T);
    wall(ia0 - T, ia0, d0, iD);
    wall(ia1, ia1 + T, d0, iD);
    // The lift at the back of the corridor.
    prop(layout === 'tower' ? 'lift' : 'stairs', am - 1.2, am + 1.2, iD - 1.0, iD, layout === 'tower' ? 2.6 : 0.05);
    // Offices / flats either side of the corridor, when there's room for them.
    for (const [s0, s1, spine] of [[ia0, c0, c0], [c1, ia1, c1]] as const) {
      if (s1 - s0 < 3) continue;
      const units: [number, number][] = [];
      for (let e = d0; e < iD - 0.5; e += UNIT) units.push([e, Math.min(iD, e + UNIT)]);
      units.forEach(([e0, e1], k) => {
        // The corridor-side wall with a doorway in the middle of the unit.
        const dm = (e0 + e1) / 2;
        const ws = spine === c0 ? [c0 - T, c0] : [c1, c1 + T];
        wall(ws[0], ws[1], e0, dm - DOOR / 2);
        wall(ws[0], ws[1], dm + DOOR / 2, e1);
        if (k > 0) wall(s0, s1, e0 - T / 2, e0 + T / 2);
        // Furniture against the outer wall.
        const outer = spine === c0 ? s0 : s1, inward = spine === c0 ? 1 : -1;
        const x0 = outer + inward * 0.3, x1 = outer + inward * 2.2;
        if (layout === 'tower') prop('desk', Math.min(x0, x1), Math.max(x0, x1), dm - 0.8, dm + 0.8, 0.8);
        else {
          prop('bed', Math.min(x0, x1), Math.max(x0, x1), e0 + 0.4, e0 + 2.0, 0.55);
          if (e1 - e0 > 3.6) prop('booth', Math.min(x0, x1), Math.max(x0, x1), e1 - 1.4, e1 - 0.4, 0.8);
        }
      });
    }
    const pt = point(am, liftD), on = onFloor(pt.x, pt.y, f);
    out.push({ f, rect: lift(rect(ia0, ia1, d0, iD)), walls, props, lift: { x: on.x, y: on.y, angle: face } });
  }
  return out;
}
