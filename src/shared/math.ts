// Small math helpers shared by client and server. World space: x east, y south, metres.
// Angle 0 faces +x; positive angles turn toward +y (clockwise on screen).

export const TAU = Math.PI * 2;

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const sign = (v: number): number => (v > 0 ? 1 : v < 0 ? -1 : 0);

export function wrapAngle(a: number): number {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

export const angleDiff = (from: number, to: number): number => wrapAngle(to - from);

export function lerpAngle(a: number, b: number, t: number): number {
  return a + wrapAngle(b - a) * t;
}

export function approach(v: number, target: number, step: number): number {
  return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
}

export const dist2 = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax, dy = by - ay;
  return dx * dx + dy * dy;
};

export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.sqrt(dist2(ax, ay, bx, by));

export const angleTo = (ax: number, ay: number, bx: number, by: number): number => Math.atan2(by - ay, bx - ax);

export interface Rect { x0: number; y0: number; x1: number; y1: number }

export const rectW = (r: Rect): number => r.x1 - r.x0;
export const rectH = (r: Rect): number => r.y1 - r.y0;
export const rectCx = (r: Rect): number => (r.x0 + r.x1) / 2;
export const rectCy = (r: Rect): number => (r.y0 + r.y1) / 2;

export function rectContains(r: Rect, x: number, y: number, pad = 0): boolean {
  return x >= r.x0 - pad && x <= r.x1 + pad && y >= r.y0 - pad && y <= r.y1 + pad;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

export function insetRect(r: Rect, d: number): Rect {
  return { x0: r.x0 + d, y0: r.y0 + d, x1: r.x1 - d, y1: r.y1 - d };
}

/** Round for the wire: two decimals is centimetre precision. */
export const r2 = (v: number): number => Math.round(v * 100) / 100;

/** Stable 32-bit hash of an integer (used for deterministic per-entity looks). */
export function hash32(n: number): number {
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return (n ^ (n >>> 16)) >>> 0;
}
