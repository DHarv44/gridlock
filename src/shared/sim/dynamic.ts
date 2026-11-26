// Moving things in the way: vehicles as oriented boxes. The server pushes vehicles and peds apart
// (systems/contacts.ts); the client's prediction of its own car or ped (client/game/predict.ts) uses
// `blockBy` to stop at other vehicles where they're drawn, instead of driving or walking into them
// and being pulled back out by the server a moment later.
import { obbVsCircle } from '../world/collision';
import type { Body } from './physics';

/** A vehicle's footprint: centre, heading, half length and half width (`id`: which vehicle). */
export interface Obb { x: number; y: number; angle: number; hl: number; hw: number; id?: number }
export interface Hit { nx: number; ny: number; depth: number }

/** Separating-axis test of two boxes: the normal points from b toward a, depth is the overlap. */
export function obbVsObb(a: Obb, b: Obb): Hit | null {
  const ca = Math.cos(a.angle), sa = Math.sin(a.angle), cb = Math.cos(b.angle), sb = Math.sin(b.angle);
  const dx = a.x - b.x, dy = a.y - b.y;
  const axes: [number, number][] = [[ca, sa], [-sa, ca], [cb, sb], [-sb, cb]];
  let best = Infinity, nx = 0, ny = 0;
  for (const [ax, ay] of axes) {
    const ra = a.hl * Math.abs(ca * ax + sa * ay) + a.hw * Math.abs(-sa * ax + ca * ay);
    const rb = b.hl * Math.abs(cb * ax + sb * ay) + b.hw * Math.abs(-sb * ax + cb * ay);
    const d = dx * ax + dy * ay;
    const o = ra + rb - Math.abs(d);
    if (o <= 0) return null;
    if (o < best) { best = o; const s = d < 0 ? -1 : 1; nx = ax * s; ny = ay * s; }
  }
  return { nx, ny, depth: best };
}

/** Pushes a body out of the boxes in `others` (which don't move) and takes away its speed into
 *  them: a vehicle (`box`: its half length and width) or a ped (`r`: its radius). `self`: the
 *  vehicle being moved, never in its own way. */
export function blockBy(b: Body, shape: { hl: number; hw: number } | { r: number }, others: Obb[], self = 0): void {
  for (const o of others) {
    if (self && o.id === self) continue;
    let h: Hit | null;
    if ('r' in shape) {
      const g = obbVsCircle(o.x, o.y, Math.cos(o.angle), Math.sin(o.angle), o.hl, o.hw, { x: b.x, y: b.y, r: shape.r });
      // That normal pushes the box off the circle: the ped goes the other way.
      h = g && { nx: -g.nx, ny: -g.ny, depth: g.depth };
    } else {
      h = obbVsObb({ x: b.x, y: b.y, angle: b.angle, hl: shape.hl, hw: shape.hw }, o);
    }
    if (!h) continue;
    b.x += h.nx * h.depth;
    b.y += h.ny * h.depth;
    const vn = b.vx * h.nx + b.vy * h.ny;
    if (vn < 0) { b.vx -= vn * h.nx; b.vy -= vn * h.ny; }
  }
}
