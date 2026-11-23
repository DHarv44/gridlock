// Walk-in ground floors (shared/world/interiors.ts) and the cutaway. The floors, walls cut at waist
// height, furniture and the solid rest of each building (a dark cut block) always sit inside their
// building, invisible under the roof. Stand at or in a walk-in place on foot and that building is
// hidden (render/hideable.ts): you see the floor plan from the same camera, in the same world.
import * as THREE from 'three';
import type { City } from '../../shared/world/cityTypes';
import type { Interior, PropKind } from '../../shared/world/interiors';
import { setHidden } from './hideable';
import { Batch, lambert, UNIT } from './instancing';
import type { ParticleLayer } from './particles';

const FLOOR: Record<Interior['layout'], string> = { shop: '#d9d4c7', kiosk: '#d6d2c6', diner: '#e3d7c0', club: '#2b2531', warehouse: '#8f8d86' };
const WALL: Record<Interior['layout'], string> = { shop: '#ece8df', kiosk: '#ece8df', diner: '#efe4d2', club: '#3d3346', warehouse: '#b8b5ad' };
const PROP: Record<PropKind, string> = {
  counter: '#6e5136', shelf: '#b9bdc2', table: '#7a5a3a', booth: '#a63a3a', bar: '#4a2a1a',
  rack: '#a9773d', desk: '#5f6368', stool: '#2a2a2a', dance: '#7a3aa0',
};
const CUT = '#2f3136';
/** How close (m) outside a walk-in place you must be for it to open up. */
const NEAR = 3.2;

export class Interiors {
  private open = -1;

  constructor(scene: THREE.Scene, private city: City) {
    const box = new Batch(UNIT.box(), lambert());
    const add = (r: { x0: number; y0: number; x1: number; y1: number }, y: number, h: number, color: string) =>
      box.add((r.x0 + r.x1) / 2, y, (r.y0 + r.y1) / 2, r.x1 - r.x0, h, r.y1 - r.y0, color);
    for (const i of city.interiors) {
      add(i.room, 0, 0.06, FLOOR[i.layout]);
      for (const w of i.walls) add(w.rect, 0, i.wallH, WALL[i.layout]);
      for (const r of i.rest) add(r.rect, 0, i.wallH, CUT);
      for (const p of i.props) add(p.rect, p.kind === 'dance' ? 0.06 : 0, p.h, PROP[p.kind]);
    }
    box.build(scene);
  }

  /** Opens the walk-in place you're at or in (on foot); closes it again when you leave. */
  update(x: number, y: number, onFoot: boolean): void {
    let want = -1;
    if (onFoot) {
      for (const i of this.city.interiors) {
        const r = i.room;
        if (x > r.x0 - NEAR && x < r.x1 + NEAR && y > r.y0 - NEAR && y < r.y1 + NEAR) { want = i.building; break; }
      }
    }
    if (want === this.open) return;
    if (this.open >= 0) setHidden(this.open, false);
    if (want >= 0) setHidden(want, true);
    this.open = want;
  }

  /** The open place's lights, so it isn't a black hole at night. */
  putGlows(layer: ParticleLayer, night: number): void {
    if (this.open < 0 || night < 0.05) return;
    const i = this.city.interiors.find((x) => x.building === this.open);
    if (!i) return;
    const r = i.room;
    layer.put((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 0.08, Math.max(r.x1 - r.x0, r.y1 - r.y0) * 1.1, 1, 0, 1, 0.92, 0.8, 0.45 * night);
  }
}
