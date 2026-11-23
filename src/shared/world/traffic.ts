// Traffic signal timing, shared so clients show the same lights the AI obeys.
import type { RoadNode } from './cityTypes';

export const CYCLE = 22;

/** 0 red, 1 amber, 2 green for traffic travelling along `axis` at time t (server seconds). */
export function lightState(node: RoadNode, axis: 'h' | 'v', t: number): 0 | 1 | 2 {
  if (!node.lights) return 2;
  const phase = (t + node.id * 3.7) % CYCLE;
  const [start, end] = axis === 'h' ? [0, 9.5] : [11, 20.5];
  if (phase < start || phase >= end) return 0;
  return phase >= end - 2 ? 1 : 2;
}

/** Drivers treat amber as go (they slow for it via look-ahead), red as stop. */
export function isGreen(node: RoadNode, axis: 'h' | 'v', t: number): boolean {
  return lightState(node, axis, t) !== 0;
}
