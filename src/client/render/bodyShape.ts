// Plan-view body shaping. Car parts are side profiles extruded across the width, which from the
// top-down camera reads as a rectangle. This warps a part's vertices across the width by length
// and height: round tapered nose and tail, cabin tumblehome, optional flared hips.
import type * as THREE from 'three';
import type { BodyShape } from '../../shared/packs';

/** Adds points along each profile edge so the warp can curve it (no segment longer than `step`). */
export function densify(pts: [number, number][], step = 0.04): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length];
    const n = Math.max(1, Math.ceil(Math.abs(x1 - x0) / step));
    for (let k = 0; k < n; k++) out.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
  }
  return out;
}

/** 0 inside the body, rising along a quarter circle to 1 at the very end. */
const corner = (d: number, r: number) => (d <= 0 ? 0 : 1 - Math.sqrt(Math.max(0, 1 - Math.min(1, d / r) ** 2)));

/** Width factor at length fraction u (-0.5 rear .. 0.5 front) and height fraction h. */
export function widthAt(s: BodyShape, u: number, h: number): number {
  const r = s.round ?? 0.16;
  let k = 1 - s.nose * corner(u - (0.5 - r), r) - s.tail * corner(-0.5 + r - u, r);
  if (s.hips) k += s.hips * Math.max(0, 1 - Math.abs(u + 0.3) / 0.16) * (h < 0.55 ? 1 : 0);
  return k * (1 - s.tumble * Math.max(0, (h - 0.45) / 0.55) ** 1.3);
}

/** Warps geometry built in vehicle space (x along length, y up, z across). */
export function shapeGeometry(g: THREE.BufferGeometry, s: BodyShape, L: number, H: number): void {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = widthAt(s, pos.getX(i) / L, pos.getY(i) / H);
    pos.setZ(i, pos.getZ(i) * k);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
}
