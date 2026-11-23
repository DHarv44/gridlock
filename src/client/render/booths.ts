// Gang payphones: a hooded phone on a pole at the curb, the phone facing the sidewalk. From above you
// see the hood's blue PHONE sign (a white handset); the gang's colour is a stripe along its curb edge.
// A phone that rings for you blinks its lamp, shakes its handset and lights the pavement.
import * as THREE from 'three';
import { type Booth, gangColor } from '../../shared/world/gangSpots';
import { handset } from '../hud/phoneIcon';
import type { ParticleLayer } from './particles';

const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
/** Seconds from one ring to the next. */
const RING_CYCLE = 6;
const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

/** The hood's top: payphone blue with a white handset, readable from the camera. */
function signTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 190; // the canvas matches the canopy's proportions
  const g = c.getContext('2d')!;
  g.fillStyle = '#1d4f9c'; g.fillRect(0, 0, 128, 190);
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 6; g.strokeRect(5, 5, 118, 180);
  handset(g, 64, 98, 44, '#ffffff');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

interface Phone { booth: Booth; lamp: THREE.Mesh; handset: THREE.Mesh; on: THREE.MeshBasicMaterial; color: THREE.Color }

export class Booths {
  private phones: Phone[] = [];
  private t = 0;

  constructor(scene: THREE.Scene, readonly booths: Booth[]) {
    const metal = new THREE.MeshLambertMaterial({ color: '#8d949b' });
    const shell = new THREE.MeshLambertMaterial({ color: '#c9ccd0' });
    const dark = new THREE.MeshLambertMaterial({ color: '#25272b' });
    const off = new THREE.MeshLambertMaterial({ color: '#3a3c40' });
    const sign = new THREE.MeshBasicMaterial({ map: signTexture() });
    for (const b of booths) {
      const color = gangColor(b.gang);
      const g = new THREE.Group();
      const part = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.scale.set(sx, sy, sz);
        m.castShadow = geo === box;
        g.add(m);
        return m;
      };
      // Local +x points at the street; the phone faces -x (the sidewalk), where you stand to answer.
      part(box, metal, 0.3, 0, 0, 0.12, 2.4, 0.12);                       // pole
      part(box, shell, 0.22, 0.9, 0, 0.06, 1.2, 0.9);                     // back panel
      for (const s of [-1, 1]) part(box, shell, -0.05, 0.9, s * 0.42, 0.5, 1.2, 0.05); // privacy wings
      part(box, shell, -0.1, 2.4, 0, 0.95, 0.1, 1.35);                    // canopy
      part(flat, sign, -0.13, 2.51, 0, 0.82, 1, 1.22);                    // the PHONE sign on the canopy
      part(box, new THREE.MeshLambertMaterial({ color }), 0.34, 2.4, 0, 0.08, 0.13, 1.35); // gang stripe
      part(box, dark, 0.13, 1.1, 0, 0.14, 0.6, 0.36);                     // phone unit
      const hs = part(box, dark, 0.04, 1.28, 0.22, 0.08, 0.34, 0.08);     // handset on its hook
      const on = new THREE.MeshBasicMaterial({ color });
      const lamp = part(box, off, -0.1, 2.5, -0.6, 0.3, 0.1, 0.12);
      g.position.set(b.x, 0, b.y);
      g.rotation.y = -b.angle;
      scene.add(g);
      lamp.userData.off = off;
      this.phones.push({ booth: b, lamp, handset: hs, on, color: new THREE.Color(color) });
    }
  }

  /** True on the frame a new ring begins: the moment for the ring sound. */
  newRing = false;

  /** Blinks and shakes the phones ringing for the local player. */
  update(dt: number, ringing: (b: Booth) => boolean, glow: ParticleLayer, night: number): void {
    this.newRing = (this.t + dt) % RING_CYCLE < this.t % RING_CYCLE;
    this.t += dt;
    // An American phone's cadence: a 2 s ring, then 4 s quiet.
    const burst = this.t % RING_CYCLE < 2;
    for (const p of this.phones) {
      const ring = ringing(p.booth) && burst;
      p.lamp.material = ring ? p.on : p.lamp.userData.off;
      p.handset.position.y = 1.3 + (ring ? Math.sin(this.t * 90) * 0.015 : 0);
      if (ringing(p.booth)) glow.put(p.booth.x, p.booth.y, 0.08, 3 + night * 3, 1, 0, p.color.r, p.color.g, p.color.b, (ring ? 0.4 : 0.18) + night * 0.25);
    }
  }
}
