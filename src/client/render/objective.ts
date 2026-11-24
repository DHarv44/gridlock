// The job marker in the GTA2 manner: a bobbing arrow over the objective. The way there is the road
// route drawn on the radar and the map (game/waypoint.ts JobRoute), as for a waypoint.
import * as THREE from 'three';
import type { ParticleLayer } from './particles';

const YELLOW = '#ffd21f';

export class ObjectiveMarker {
  private over: THREE.Group;
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
  }

  update(dt: number, target: number[] | null, glow: ParticleLayer): void {
    this.t += dt;
    if (!target) { this.over.visible = false; return; }
    const [tx, ty] = target;
    this.over.visible = true;
    this.over.position.set(tx, 4.5 + Math.sin(this.t * 4) * 0.6, ty);
    this.over.rotation.y = this.t * 2;
    glow.put(tx, ty, 0.09, 4, 1, 0, 1, 0.82, 0.1, 0.4);
  }
}
