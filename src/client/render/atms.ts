// ATMs on shop walls: a steel cash machine with a lit screen, under a green header whose top reads
// "ATM" from the street camera (the payphone sign's trick). Positions from shared/world/atms.ts.
import * as THREE from 'three';
import type { Atm } from '../../shared/world/atms';
import { DIR_VEC } from '../../shared/world/cityTypes';

const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

function headerTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 192; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1e7a4f'; g.fillRect(0, 0, 192, 128);
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 6; g.strokeRect(5, 5, 182, 118);
  g.fillStyle = '#ffffff';
  g.font = '800 66px Bahnschrift, "Segoe UI", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('ATM', 96, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function addAtms(scene: THREE.Scene, atms: Atm[]): void {
  const steel = new THREE.MeshLambertMaterial({ color: '#9aa1a8' });
  const dark = new THREE.MeshLambertMaterial({ color: '#2a2d31' });
  const screen = new THREE.MeshBasicMaterial({ color: '#5fd0c0' });
  const green = new THREE.MeshLambertMaterial({ color: '#1e7a4f' });
  const sign = new THREE.MeshBasicMaterial({ map: headerTexture() });
  for (const a of atms) {
    const g = new THREE.Group();
    const part = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.castShadow = geo === box;
      g.add(m);
    };
    // Local +x faces the sidewalk; the machine's back is against the wall.
    part(box, steel, 0, 0, 0, 0.38, 1.6, 0.78);            // cabinet
    part(box, dark, 0.2, 1.05, 0, 0.03, 0.34, 0.5);        // screen bezel
    part(box, screen, 0.215, 1.1, 0, 0.01, 0.26, 0.42);    // lit screen
    part(box, dark, 0.27, 0.86, 0, 0.16, 0.05, 0.5);       // keypad ledge
    part(box, dark, 0.2, 0.62, 0.12, 0.02, 0.04, 0.2);     // cash slot
    part(box, green, 0.2, 2.15, 0, 0.76, 0.16, 1.26);      // header
    const [dx, dy] = DIR_VEC[a.dir];
    g.position.set(a.wx, 0, a.wy);
    g.rotation.y = -Math.atan2(dy, dx);
    g.traverse((o) => { o.updateMatrix(); o.matrixAutoUpdate = false; }); // static: no per-frame updates
    scene.add(g);
    // "ATM" on the header's top, laid out like the shop signs: upright on north/south fronts, a
    // quarter turn (top toward the wall) on east/west ones.
    const top = new THREE.Mesh(flat, sign);
    top.position.set(a.wx + dx * 0.2, 2.32, a.wy + dy * 0.2);
    top.scale.set(1.2, 1, 0.72);
    if (dx !== 0) top.rotation.y = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
    top.updateMatrix();
    top.matrixAutoUpdate = false;
    scene.add(top);
  }
}
