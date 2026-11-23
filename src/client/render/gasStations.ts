// Gas stations (layout: shared/world/gas.ts): a canopy on pillars over two pump islands, the pumps,
// and a tall price sign at the street corner. The canopy's top reads the brand from the street
// camera, laid out like the shop signs (upright on north/south fronts, a quarter turn on east/west).
import * as THREE from 'three';
import { SERVICES } from '../../shared/packs';
import type { City } from '../../shared/world/cityTypes';
import { gasLayout } from '../../shared/world/gas';
import type { ParticleLayer } from './particles';

const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const CANOPY_H = 5, CANOPY_T = 0.5;

function brandTexture(text: string, w: number, h: number, price: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4f4f1'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#d8402f'; g.fillRect(0, h * 0.72, w, h * 0.28);
  g.fillStyle = '#d8402f';
  g.font = `800 ${Math.round(h * (price ? 0.3 : 0.42))}px Bahnschrift, "Segoe UI", sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h * (price ? 0.24 : 0.38));
  if (price) {
    g.fillStyle = '#1d2024'; g.fillRect(w * 0.12, h * 0.42, w * 0.76, h * 0.26);
    g.fillStyle = '#ffd24a'; g.font = `700 ${Math.round(h * 0.2)}px Bahnschrift, monospace`;
    g.fillText('3.49⁹', w / 2, h * 0.56);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class GasStations {
  private glows: { x: number; y: number; size: number }[] = [];

  constructor(scene: THREE.Scene, city: City) {
    const white = new THREE.MeshLambertMaterial({ color: '#eceeee' });
    const red = new THREE.MeshLambertMaterial({ color: '#d8402f' });
    const concrete = new THREE.MeshLambertMaterial({ color: '#b9bcbf' });
    const steel = new THREE.MeshLambertMaterial({ color: '#8d949b' });
    const dark = new THREE.MeshLambertMaterial({ color: '#25282c' });
    const screen = new THREE.MeshBasicMaterial({ color: '#7fe08a' });
    const canopyTop = new THREE.MeshBasicMaterial({ map: brandTexture('GAS & GO', 512, 160, false) });
    const signTop = new THREE.MeshBasicMaterial({ map: brandTexture('GAS', 256, 200, true) });
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.rotation.y = ry;
      m.castShadow = geo === box;
      m.receiveShadow = geo === box;
      m.updateMatrix();
      m.matrixAutoUpdate = false;
      scene.add(m);
    };
    for (const s of city.services) {
      if (SERVICES[s.spec].verb !== 'gas') continue;
      const lot = city.lots[s.lot];
      if (!lot?.building) continue;
      const L = gasLayout(lot);
      const c = L.canopy, cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2, cw = c.x1 - c.x0, cd = c.y1 - c.y0;
      // Canopy: slab with a red fascia, the brand on top, on four pillars standing in the islands.
      add(box, white, cx, CANOPY_H, cy, cw, CANOPY_T, cd);
      add(box, red, cx, CANOPY_H - 0.05, cy, cw + 0.12, 0.32, cd + 0.12);
      const quarter = L.along ? 0 : (L.dir[0] > 0 ? Math.PI / 2 : -Math.PI / 2);
      const [tw, td] = L.along ? [cw, cd] : [cd, cw];
      add(flat, canopyTop, cx, CANOPY_H + CANOPY_T + 0.01, cy, tw * 0.96, 1, td * 0.96, quarter);
      for (const isl of L.islands) {
        const ix = (isl.x0 + isl.x1) / 2, iy = (isl.y0 + isl.y1) / 2;
        add(box, concrete, ix, 0, iy, isl.x1 - isl.x0, 0.22, isl.y1 - isl.y0);
        // Pillars at the island ends.
        const ends = L.along ? [[isl.x0 + 0.35, iy], [isl.x1 - 0.35, iy]] : [[ix, isl.y0 + 0.35], [ix, isl.y1 - 0.35]];
        for (const [px, py] of ends) add(box, steel, px, 0.22, py, 0.36, CANOPY_H - 0.22, 0.36);
      }
      for (const p of L.pumps) {
        // A dispenser across the island: white body, red top, a lit price display each side.
        const [w, d] = L.along ? [0.75, 0.5] : [0.5, 0.75];
        add(box, white, p.x, 0.22, p.y, w, 1.55, d);
        add(box, red, p.x, 1.77, p.y, w + 0.04, 0.22, d + 0.04);
        add(box, screen, p.x, 1.25, p.y, L.along ? 0.4 : 0.52, 0.22, L.along ? 0.52 : 0.4);
        add(box, dark, p.x + (L.along ? 0.42 : 0), 0.7, p.y + (L.along ? 0 : 0.42), 0.08, 0.7, 0.08); // hose
      }
      // Price sign: a cabinet on a tall pole at the street corner, its top reading from above.
      const sg = L.sign;
      add(box, steel, sg.x, 0, sg.y, 0.3, 7.2, 0.3);
      const [pw, pd] = L.along ? [2.4, 1.9] : [1.9, 2.4];
      add(box, white, sg.x, 7.2, sg.y, pw, 0.5, pd);
      add(flat, signTop, sg.x, 7.71, sg.y, 2.3, 1, 1.8, quarter);
      this.glows.push({ x: cx, y: cy, size: Math.max(cw, cd) * 1.3 });
    }
  }

  /** Canopy lights pooling on the forecourt at night. */
  putGlows(layer: ParticleLayer, night: number, v: { x0: number; y0: number; x1: number; y1: number }): void {
    if (night < 0.05) return;
    for (const g of this.glows) {
      if (g.x < v.x0 - 20 || g.x > v.x1 + 20 || g.y < v.y0 - 20 || g.y > v.y1 + 20) continue;
      layer.put(g.x, g.y, 0.07, g.size, 1, 0, 1, 0.95, 0.85, 0.5 * night);
    }
  }
}
