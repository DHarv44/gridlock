// Job markers in the GTA2 manner: a bobbing arrow over the objective, and a flat arrow at the
// player's feet pointing the way when the objective is out of sight.
import * as THREE from 'three';
import type { ParticleLayer } from './particles';

const YELLOW = '#ffd21f';

export class ObjectiveMarker {
  private over: THREE.Group;
  private pointer: THREE.Mesh;
  private t = 0;

  constructor(scene: THREE.Scene) {
    const mat = new THREE.MeshBasicMaterial({ color: YELLOW });
    this.over = new THREE.Group();
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 4).rotateX(Math.PI), mat);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), mat);
    shaft.position.y = 1.4;
    this.over.add(head, shaft);
    this.over.visible = false;
    scene.add(this.over);
    const tri = new THREE.Shape([new THREE.Vector2(1.4, 0), new THREE.Vector2(-0.7, 0.8), new THREE.Vector2(-0.3, 0), new THREE.Vector2(-0.7, -0.8)]);
    this.pointer = new THREE.Mesh(new THREE.ShapeGeometry(tri).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, opacity: 0.9, depthWrite: false }));
    this.pointer.visible = false;
    this.pointer.renderOrder = 5;
    scene.add(this.pointer);
  }

  update(dt: number, target: number[] | null, me: { x: number; y: number } | null, glow: ParticleLayer, view: { x0: number; y0: number; x1: number; y1: number }): void {
    this.t += dt;
    if (!target || !me) { this.over.visible = false; this.pointer.visible = false; return; }
    const [tx, ty] = target;
    this.over.visible = true;
    this.over.position.set(tx, 4.5 + Math.sin(this.t * 4) * 0.6, ty);
    this.over.rotation.y = this.t * 2;
    glow.put(tx, ty, 0.09, 4, 1, 0, 1, 0.82, 0.1, 0.4);
    const inView = tx > view.x0 + 40 && tx < view.x1 - 40 && ty > view.y0 + 40 && ty < view.y1 - 40;
    const d = Math.hypot(tx - me.x, ty - me.y);
    this.pointer.visible = !inView && d > 12;
    if (this.pointer.visible) {
      const a = Math.atan2(ty - me.y, tx - me.x);
      this.pointer.position.set(me.x + Math.cos(a) * 3.5, 0.35, me.y + Math.sin(a) * 3.5);
      this.pointer.rotation.y = -a;
    }
  }
}
