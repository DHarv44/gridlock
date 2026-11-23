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

const FLOOR: Record<Interior['layout'], string> = {
  shop: '#d9d4c7', kiosk: '#d6d2c6', diner: '#e3d7c0', club: '#2b2531', warehouse: '#8f8d86', bank: '#cfc6b4', precinct: '#a9aeb3',
};
const WALL: Record<Interior['layout'], string> = {
  shop: '#ece8df', kiosk: '#ece8df', diner: '#efe4d2', club: '#3d3346', warehouse: '#b8b5ad', bank: '#e9e2d2', precinct: '#d8dbdd',
};
const PROP: Record<PropKind, string> = {
  counter: '#6e5136', shelf: '#b9bdc2', table: '#7a5a3a', booth: '#a63a3a', bar: '#4a2a1a',
  rack: '#a9773d', desk: '#5f6368', stool: '#2a2a2a', dance: '#7a3aa0', bench: '#7a5a3a', bars: '#4a4e54',
};
const CUT = '#2f3136';
/** How close (m) outside a walk-in place you must be for it to open up. */
const NEAR = 3.2;

export class Interiors {
  private open = -1;
  /** Vault doors by interior index (hidden when blown open). */
  private vaultDoors = new Map<number, THREE.Object3D>();

  constructor(scene: THREE.Scene, private city: City) {
    // Vault doors: a thick steel slab with a wheel, standing in the gap in the vault wall.
    const steel = new THREE.MeshStandardMaterial({ color: '#7d848c', metalness: 0.7, roughness: 0.35 });
    const dark = new THREE.MeshLambertMaterial({ color: '#3a3e44' });
    city.interiors.forEach((i, k) => {
      if (!i.vault) return;
      const d = i.vault.door, g = new THREE.Group();
      const slab = new THREE.Mesh(UNIT.box(), steel);
      slab.scale.set(d.x1 - d.x0, 3.0, d.y1 - d.y0);
      slab.castShadow = true;
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 16).rotateX(Math.PI / 2), dark);
      wheel.position.y = 3.05;
      g.add(slab, wheel);
      g.position.set((d.x0 + d.x1) / 2, 0, (d.y0 + d.y1) / 2);
      scene.add(g);
      this.vaultDoors.set(k, g);
    });
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

  /** Vault doors blown open (interior indexes) are gone until the vault shuts again. */
  setVaults(open: number[]): void {
    for (const [k, g] of this.vaultDoors) g.visible = !open.includes(k);
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
