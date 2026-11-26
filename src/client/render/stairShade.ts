// In a stairwell (world/stairs.ts), everything but the stairwell is greyed out: a flat grey veil
// drawn over the whole view, with a hole cut where the stairwell is. It's laid at the stairwell's
// wall tops so the hole lines up with its walls from the overhead camera, and drawn last without a
// depth test so tall buildings out in the street go under it too.
import * as THREE from 'three';
import type { City } from '../../shared/world/cityTypes';
import { FLOOR_H, groundOf, onFloor } from '../../shared/world/levels';
import { StairIndex, type Stairwell } from '../../shared/world/stairs';

const WALL_H = 2.8, T = 0.3, REACH = 2000;

export class StairShade {
  private index: StairIndex;
  private mesh: THREE.Mesh;
  private on: Stairwell | null = null;

  constructor(scene: THREE.Scene, city: City) {
    this.index = new StairIndex(city);
    const mat = new THREE.MeshBasicMaterial({ color: '#7d8186', transparent: true, opacity: 0.78, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    this.mesh.renderOrder = 999;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  /** Every frame: where you are over the map (x, y) and your floor f, on foot. */
  update(x: number, y: number, f: number, onFoot: boolean): void {
    const at = onFloor(x, y, f);
    const s = onFoot ? this.index.at(at.x, at.y)?.s ?? null : null;
    if (s === this.on) return;
    this.on = s;
    this.mesh.visible = !!s;
    if (!s) return;
    // The stairwell's outside edge, back over the map.
    const a = groundOf(s.rect.x0 - T, s.rect.y0 - T), b = groundOf(s.rect.x1 + T, s.rect.y1 + T);
    const outer = new THREE.Shape([
      new THREE.Vector2(a.x - REACH, a.y - REACH), new THREE.Vector2(b.x + REACH, a.y - REACH),
      new THREE.Vector2(b.x + REACH, b.y + REACH), new THREE.Vector2(a.x - REACH, b.y + REACH),
    ]);
    outer.holes.push(new THREE.Path([
      new THREE.Vector2(a.x, a.y), new THREE.Vector2(a.x, b.y), new THREE.Vector2(b.x, b.y), new THREE.Vector2(b.x, a.y),
    ]));
    // Shapes are drawn in x/y; the world's ground is x/z.
    const geo = new THREE.ShapeGeometry(outer).rotateX(Math.PI / 2);
    this.mesh.geometry.dispose();
    this.mesh.geometry = geo;
    this.mesh.position.y = s.f * FLOOR_H + WALL_H;
  }
}
