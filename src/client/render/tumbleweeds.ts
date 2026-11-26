// Tumbleweeds: a few dry brush balls bowling across open country on the wind, bouncing as they roll.
// Only in view and only where the country is open (a zone with brush, WildSpec.brush); one shared wind
// from the west with a slow wander. Each client's own (scenery, not solid, nothing on the wire).
import * as THREE from 'three';
import { ZONES } from '../../shared/packs';
import type { CityMap } from '../../shared/world/city';

/** How many roll at once round the view, and how fast (m/s). */
const COUNT = 7;
const SPEED: [number, number] = [2.5, 6];

interface Weed { mesh: THREE.Mesh; x: number; y: number; v: number; r: number; spin: number; hop: number; alive: boolean }

export class Tumbleweeds {
  private weeds: Weed[] = [];
  private t = 0;
  private open: boolean;

  constructor(scene: THREE.Scene, private map: CityMap) {
    this.open = ZONES.some((z) => z.wild?.brush);
    if (!this.open) return;
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: '#cbb07a', flatShading: true, transparent: true, opacity: 0.9 });
    const wire = new THREE.MeshBasicMaterial({ color: '#7a6440', wireframe: true });
    for (let k = 0; k < COUNT; k++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.add(new THREE.Mesh(geo, wire));
      mesh.visible = false;
      mesh.castShadow = true;
      scene.add(mesh);
      this.weeds.push({ mesh, x: 0, y: 0, v: 0, r: 0.5, spin: 0, hop: 0, alive: false });
    }
  }

  private isOpen(x: number, y: number): boolean {
    const z = this.map.zoneAt(x, y);
    return z >= 0 && !!ZONES[z].wild?.brush && !this.map.isWater(x, y);
  }

  /** Every frame, with the camera's view of the ground. */
  update(dt: number, view: { x0: number; y0: number; x1: number; y1: number }): void {
    if (!this.open) return;
    this.t += dt;
    // The wind: from the west, veering slowly.
    const wind = Math.sin(this.t * 0.05) * 0.35;
    const wx = Math.cos(wind), wy = Math.sin(wind);
    const w = view.x1 - view.x0, h = view.y1 - view.y0;
    for (const g of this.weeds) {
      if (!g.alive) {
        // Blow in from the upwind edge of the view, somewhere along it.
        if (Math.random() > dt * 0.4) continue;
        const x = view.x0 - 3, y = view.y0 + Math.random() * h;
        if (!this.isOpen(x + 6, y)) continue;
        Object.assign(g, { x, y, v: SPEED[0] + Math.random() * (SPEED[1] - SPEED[0]), r: 0.5 + Math.random() * 0.4, spin: 0, hop: Math.random() * 6, alive: true });
        g.mesh.scale.setScalar(g.r);
        g.mesh.visible = true;
      }
      // Gusts: speeding up and slowing as it goes.
      const v = g.v * (0.7 + 0.5 * Math.sin(this.t * 1.3 + g.hop));
      g.x += wx * v * dt; g.y += wy * v * dt;
      g.spin += (v / g.r) * dt;
      g.hop += dt * (2 + v * 0.4);
      const lift = Math.abs(Math.sin(g.hop)) * g.r * 0.9;
      g.mesh.position.set(g.x, g.r + lift, g.y);
      // Rolling about the axis across the wind.
      g.mesh.rotation.set(wy * g.spin, 0, -wx * g.spin);
      if (g.x > view.x1 + 6 || g.y < view.y0 - 6 || g.y > view.y1 + 6 || g.x > view.x0 + w + 10 || !this.isOpen(g.x, g.y)) {
        g.alive = false;
        g.mesh.visible = false;
      }
    }
  }
}
