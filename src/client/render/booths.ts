// Gang payphones: a hooded phone on a pole at the curb, the phone facing the sidewalk. From above you
// see the hood's blue PHONE sign (a white handset); the gang's colour is a stripe along its curb edge.
// A phone that rings for you blinks its lamp, shakes its handset and lights the pavement.
import * as THREE from 'three';
import { RULES } from '../../shared/packs';
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

/** A WANTED bill for a job post's board: the header, a likeness, the reward. */
function posterTexture(reward: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 136;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e6dcc0'; g.fillRect(0, 0, 96, 136);
  g.fillStyle = 'rgba(120,90,50,0.25)'; g.fillRect(0, 0, 96, 6); g.fillRect(0, 130, 96, 6);
  g.fillStyle = '#2a1e14';
  g.textAlign = 'center';
  g.font = '700 22px Rockwell, Georgia, serif';
  g.fillText('WANTED', 48, 26);
  g.fillStyle = '#8a7a62'; g.fillRect(24, 34, 48, 52);
  g.fillStyle = '#3e2c1a';
  g.beginPath(); g.arc(48, 56, 13, 0, Math.PI * 2); g.fill();
  g.fillRect(30, 70, 36, 16);
  g.fillStyle = '#2a1e14';
  g.font = '700 13px Georgia, serif';
  g.fillText('DEAD OR ALIVE', 48, 104);
  g.font = '700 18px Rockwell, Georgia, serif';
  g.fillText(reward, 48, 124);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
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
    const post = RULES.jobPost === 'post';
    const wood = new THREE.MeshLambertMaterial({ color: '#6b4a2e' });
    const posters = post ? ['$500', '$250', '$1000', '$100'].map((r) => new THREE.MeshLambertMaterial({ map: posterTexture(r) })) : [];
    const brass = new THREE.MeshLambertMaterial({ color: '#b58a3a' });
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
      if (post) {
        // A job post: a timber post with a notice board, the gang's flag and a bell that swings when
        // there's work for you.
        part(box, wood, 0.3, 0, 0, 0.18, 2.8, 0.18);                      // post
        part(box, wood, 0.18, 1.0, 0, 0.08, 1.0, 1.1);                    // board
        for (const z of [-0.28, 0.12]) part(box, posters[(Math.round(b.x + b.y + z * 10) % posters.length + posters.length) % posters.length], 0.12, 1.2 + z * 0.4, z, 0.02, 0.45, 0.32); // wanted bills
        part(box, wood, 0.1, 2.6, 0, 0.7, 0.08, 0.08);                    // arm
        part(box, new THREE.MeshLambertMaterial({ color }), 0.32, 2.2, 0.35, 0.03, 0.5, 0.6); // gang flag
        const bell = part(box, brass, -0.15, 2.25, 0, 0.22, 0.3, 0.22);   // the bell
        const on = new THREE.MeshBasicMaterial({ color });
        g.position.set(b.x, 0, b.y);
        g.rotation.y = -b.angle;
        scene.add(g);
        bell.userData.off = brass;
        this.phones.push({ booth: b, lamp: bell, handset: bell, on, color: new THREE.Color(color) });
        continue;
      }
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
      if (p.lamp === p.handset) {
        // A job post's bell swings while it rings.
        p.lamp.rotation.x = ring ? Math.sin(this.t * 14) * 0.5 : 0;
        p.lamp.material = ringing(p.booth) ? p.on : p.lamp.userData.off;
      } else {
        p.lamp.material = ring ? p.on : p.lamp.userData.off;
        p.handset.position.y = 1.3 + (ring ? Math.sin(this.t * 90) * 0.015 : 0);
      }
      if (ringing(p.booth)) glow.put(p.booth.x, p.booth.y, 0.08, 3 + night * 3, 1, 0, p.color.r, p.color.g, p.color.b, (ring ? 0.4 : 0.18) + night * 0.25);
    }
  }
}
