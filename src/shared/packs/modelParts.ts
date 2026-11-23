import type { Paint, Part } from './types';

// Model building blocks. Coordinates are fractions: x along length (+front), y across width
// (+right), z of height. Wheels are added by the renderer from the movement type.

/** Box part. */
export const b = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, paint: Paint, tag?: Part['tag']): Part =>
  ({ x: [x0, x1], y: [y0, y1], z: [z0, z1], paint, ...(tag ? { tag } : {}) });

/** Profile part: a side silhouette extruded across [y0, y1]. */
export const p = (pts: [number, number][], y0: number, y1: number, paint: Paint): Part => {
  const xs = pts.map((q) => q[0]), zs = pts.map((q) => q[1]);
  return { x: [Math.min(...xs), Math.max(...xs)], y: [y0, y1], z: [Math.min(...zs), Math.max(...zs)], paint, profile: pts };
};

/** Mirror image across the centreline (for left/right pairs). */
export const pair = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, paint: Paint): Part[] =>
  [b(x0, x1, y0, y1, z0, z1, paint), b(x0, x1, -y1, -y0, z0, z1, paint)];

export const lights = (front = 0.5, rear = -0.5, zl = 0.3, zh = 0.45): Part[] => [
  b(front - 0.03, front + 0.012, -0.44, -0.26, zl, zh, 'headlight', 'headlight'),
  b(front - 0.03, front + 0.012, 0.26, 0.44, zl, zh, 'headlight', 'headlight'),
  b(rear - 0.012, rear + 0.03, -0.45, -0.28, zl, zh, 'taillight', 'taillight'),
  b(rear - 0.012, rear + 0.03, 0.28, 0.45, zl, zh, 'taillight', 'taillight'),
];

/** Mirrors, grille, plates and bumpers shared by passenger cars. */
export const carBits = (mirrorX: number, mirrorZ: number, zb = 0.2): Part[] => [
  ...pair(mirrorX - 0.03, mirrorX + 0.02, 0.48, 0.56, mirrorZ, mirrorZ + 0.08, 'body'),
  b(0.49, 0.515, -0.22, 0.22, zb + 0.06, zb + 0.18, 'dark'),
  b(0.5, 0.52, -0.09, 0.09, zb, zb + 0.07, 'white'),
  b(-0.52, -0.5, -0.09, 0.09, zb + 0.1, zb + 0.17, 'white'),
  b(0.48, 0.52, -0.5, 0.5, zb - 0.04, zb + 0.06, 'trim'),
  b(-0.52, -0.48, -0.5, 0.5, zb - 0.04, zb + 0.06, 'trim'),
];
