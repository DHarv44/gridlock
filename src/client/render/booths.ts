// Gang payphone booths: a small kiosk in the gang's colour with a light on top that blinks when
// the phone is ringing for you.
import * as THREE from 'three';
import { type Booth, gangColor } from '../../shared/world/gangSpots';
import type { ParticleLayer } from './particles';

const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

export class Booths {
  private lights: { booth: Booth; mesh: THREE.Mesh; on: THREE.MeshBasicMaterial; off: THREE.MeshLambertMaterial; color: THREE.Color }[] = [];
  private t = 0;

  constructor(scene: THREE.Scene, readonly booths: Booth[]) {
    const dark = new THREE.MeshLambertMaterial({ color: '#2a2c30' });
    const glass = new THREE.MeshLambertMaterial({ color: '#7fa6c0' });
    for (const b of booths) {
      const color = gangColor(b.gang);
      const g = new THREE.Group();
      const part = (mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
        const m = new THREE.Mesh(box, mat);
        m.position.set(x, y, z);
        m.scale.set(sx, sy, sz);
        m.castShadow = true;
        g.add(m);
        return m;
      };
      const shell = new THREE.MeshLambertMaterial({ color });
      part(shell, -0.45, 0, 0, 0.1, 2.3, 1.1);            // back wall (toward the building)
      part(shell, 0, 0, -0.5, 1.0, 2.3, 0.1);
      part(shell, 0, 0, 0.5, 1.0, 2.3, 0.1);
      part(glass, 0.0, 1.0, -0.47, 0.8, 1.0, 0.04);
      part(shell, 0, 2.3, 0, 1.15, 0.18, 1.2);           // roof
      part(dark, -0.32, 1.0, 0, 0.12, 0.55, 0.35);        // the phone
      const off = new THREE.MeshLambertMaterial({ color: '#333' });
      const on = new THREE.MeshBasicMaterial({ color });
      const lamp = part(off, 0, 2.48, 0, 0.5, 0.22, 0.5);
      g.position.set(b.x, 0, b.y);
      g.rotation.y = -b.angle;
      scene.add(g);
      this.lights.push({ booth: b, mesh: lamp, on, off, color: new THREE.Color(color) });
    }
  }

  /** Blinks the lamps of booths that will offer the local player work. */
  update(dt: number, ringing: (b: Booth) => boolean, glow: ParticleLayer, night: number): void {
    this.t += dt;
    const blink = Math.floor(this.t * 2.5) % 2 === 0;
    for (const l of this.lights) {
      const ring = ringing(l.booth);
      l.mesh.material = ring && blink ? l.on : l.off;
      if (ring && blink) glow.put(l.booth.x, l.booth.y, 0.08, 4 + night * 3, 1, 0, l.color.r, l.color.g, l.color.b, 0.35 + night * 0.3);
    }
  }
}
