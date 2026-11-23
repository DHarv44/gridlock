// In-world storefronts: a lit doorway (or roller door for drive-in services), a coloured fascia
// along the street side, and a sign board over the sidewalk with the shop's name. Unsold
// properties get a FOR SALE board out front. Signs lie flat and read north-up from the camera.
import * as THREE from 'three';
import { PROPERTIES, SERVICES } from '../../shared/packs';
import { type City, DIR_VEC, type Lot, type Place } from '../../shared/world/cityTypes';
import type { ParticleLayer } from './particles';

const DRIVE_IN = new Set(['dealer', 'respray', 'chopshop', 'fire', 'police']);
const texCache = new Map<string, THREE.CanvasTexture>();

function signTexture(text: string, bg: string, fg: string): THREE.CanvasTexture {
  const key = `${text}|${bg}|${fg}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = Math.max(256, text.length * 56);
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, c.width - 10, c.height - 10);
  ctx.font = '700 62px Bahnschrift, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeText(text, c.width / 2, c.height / 2 + 3);
  ctx.fillStyle = fg;
  ctx.fillText(text, c.width / 2, c.height / 2 + 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

const readableInk = (bg: string) => {
  const n = parseInt(bg.slice(1), 16);
  const lum = ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255;
  return lum > 0.6 ? '#141414' : '#ffffff';
};

const flatGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const boxGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

interface Glow { x: number; y: number; r: number; g: number; b: number; size: number }

export class Storefronts {
  private forSale = new Map<number, THREE.Object3D>();
  private glows: Glow[] = [];

  constructor(private scene: THREE.Scene, city: City) {
    for (const s of city.services) {
      const spec = SERVICES[s.spec];
      if (spec.verb === 'military' || spec.verb === 'helipad') continue;
      this.front(s, city.lots[s.lot], spec.signText, spec.sign, DRIVE_IN.has(spec.verb));
    }
    for (const p of city.properties) {
      const spec = PROPERTIES[p.spec];
      const lot = city.lots[p.lot];
      if (spec.signText) this.front(p, lot, spec.signText, spec.signColor ?? '#444444', false);
      this.forSaleBoard(p, lot);
    }
  }

  /** Door, fascia and sign on the street side of a building. */
  private front(place: Place, lot: Lot, text: string, color: string, garage: boolean): void {
    const b = lot.building?.rect;
    if (!b || lot.front < 0) return;
    const [dx, dy] = DIR_VEC[lot.front];
    const along = dy !== 0; // facade runs along x when facing north/south
    const facadeLen = along ? b.x1 - b.x0 : b.y1 - b.y0;
    // Door centre on the wall (place.x/y sits just outside the door).
    const wx = place.x - dx * 0.9, wy = place.y - dy * 0.9;
    const doorW = garage ? Math.min(6, facadeLen * 0.5) : 2.2, doorH = garage ? 3.4 : 2.6;
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      this.scene.add(m);
      return m;
    };
    const lit = new THREE.MeshBasicMaterial({ color: garage ? '#2b2a27' : '#ffd9a0' });
    const frame = new THREE.MeshLambertMaterial({ color });
    // Doorway: frame + glowing opening (a roller door for drive-in services).
    add(boxGeo, frame, wx + dx * 0.12, 0, wy + dy * 0.12, along ? doorW + 0.5 : 0.25, doorH + 0.3, along ? 0.25 : doorW + 0.5);
    add(boxGeo, lit, wx + dx * 0.26, 0, wy + dy * 0.26, along ? doorW : 0.06, doorH, along ? 0.06 : doorW);
    if (garage) {
      const stripes = new THREE.MeshLambertMaterial({ color: '#8f9296' });
      for (let k = 0; k < 6; k++) add(boxGeo, stripes, wx + dx * 0.3, 0.4 + k * 0.5, wy + dy * 0.3, along ? doorW : 0.04, 0.06, along ? 0.04 : doorW);
    }
    // Fascia band along the frontage.
    const fx = (b.x0 + b.x1) / 2, fy = (b.y0 + b.y1) / 2;
    const fcx = dx !== 0 ? (dx > 0 ? b.x1 : b.x0) + dx * 0.15 : fx, fcy = dy !== 0 ? (dy > 0 ? b.y1 : b.y0) + dy * 0.15 : fy;
    add(boxGeo, frame, fcx, doorH + 0.5, fcy, along ? facadeLen * 0.92 : 0.3, 1.1, along ? 0.3 : facadeLen * 0.92);
    // Sign board over the sidewalk, flat so it reads from above, its long side along the facade and
    // kept within it. On east/west fronts it turns a quarter so the text's top points at the wall.
    const w = Math.min(facadeLen * 0.95, Math.max(5, text.length * 1.4)), h = 2.2;
    const lo = (along ? b.x0 : b.y0) + w / 2, hi = (along ? b.x1 : b.y1) - w / 2;
    const mid = Math.min(Math.max(along ? wx : wy, lo), Math.max(lo, hi));
    const sx = along ? mid : wx + dx * 1.6, sy = along ? wy + dy * 1.6 : mid;
    const sign = new THREE.MeshBasicMaterial({ map: signTexture(text, color, readableInk(color)) });
    const board = add(flatGeo, sign, sx, doorH + 1.4, sy, w, 1, h);
    if (!along) {
      board.rotation.y = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
      board.updateMatrix();
    }
    add(boxGeo, new THREE.MeshLambertMaterial({ color: '#2a2c30' }), sx, doorH + 1.25, sy, along ? w + 0.2 : h + 0.2, 0.14, along ? h + 0.2 : w + 0.2);
    const c = new THREE.Color(color);
    this.glows.push({ x: sx, y: sy, r: c.r, g: c.g, b: c.b, size: w * 1.6 });
    if (!garage) this.glows.push({ x: wx + dx * 2.4, y: wy + dy * 2.4, r: 1, g: 0.8, b: 0.5, size: 5 });
  }

  /** A realtor board in the front yard / on the sidewalk, hidden once the property is bought. */
  private forSaleBoard(place: Place, lot: Lot): void {
    if (lot.front < 0) return;
    const [dx, dy] = DIR_VEC[lot.front];
    const r = lot.rect;
    const edgeX = dx > 0 ? r.x1 : dx < 0 ? r.x0 : place.x, edgeY = dy > 0 ? r.y1 : dy < 0 ? r.y0 : place.y;
    const side = 3.5;
    const x = edgeX - dx * 1.2 + (dy !== 0 ? side : 0), y = edgeY - dy * 1.2 + (dx !== 0 ? side : 0);
    const group = new THREE.Group();
    const post = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: '#e8e4da' }));
    post.scale.set(0.12, 2.2, 0.12);
    const board = new THREE.Mesh(flatGeo, new THREE.MeshBasicMaterial({ map: signTexture('FOR SALE', '#b8261d', '#ffffff') }));
    board.scale.set(2.6, 1, 0.95);
    board.position.y = 2.25;
    group.add(post, board);
    group.position.set(x, 0, y);
    this.scene.add(group);
    this.forSale.set(place.id, group);
  }

  setOwners(owners: Map<number, string>): void {
    for (const [id, obj] of this.forSale) obj.visible = !owners.has(id);
  }

  /** Night glow under signs and light spilling out of open doors. */
  putGlows(layer: ParticleLayer, night: number, v: { x0: number; y0: number; x1: number; y1: number }): void {
    if (night < 0.05) return;
    for (const g of this.glows) {
      if (g.x < v.x0 || g.x > v.x1 || g.y < v.y0 || g.y > v.y1) continue;
      layer.put(g.x, g.y, 0.07, g.size, 1, 0, g.r, g.g, g.b, 0.35 * night);
    }
  }
}
