// Gang graffiti: each gang's pieces (see graffitiArt.ts) painted on the spots its turf's building
// models offer (see buildingSpots.ts): mostly the blank street-level bands of walls, sometimes
// bare upper walls, now and then a rooftop. Pieces are sized to fit their spot. Placement is
// seeded from the city so every player sees the same walls. One merged mesh per gang.
import * as THREE from 'three';
import { FACTIONS } from '../../shared/packs';
import { Rng } from '../../shared/rng';
import type { City } from '../../shared/world/cityTypes';
import type { GraffitiSpot } from './buildingSpots';
import { gangAtlas, PIECES } from './graffitiArt';

/** Spot weight → chance it gets painted: 1 - e^(-weight·K). */
const K = 0.35;
const MAX_W = 8;
const ROWS = PIECES.length;
const BIG = PIECES.map((p, i) => (p.big ? i : -1)).filter((i) => i >= 0);
const SMALL = PIECES.map((p, i) => (p.big ? -1 : i)).filter((i) => i >= 0);

interface Quads { pos: number[]; uv: number[] }

export class Graffiti {
  constructor(scene: THREE.Scene, city: City, spots: (GraffitiSpot & { gang: string })[]) {
    const rng = new Rng(city.seed ^ 0x6a11);
    const gangs = FACTIONS.filter((f) => f.gang);
    const quads = new Map<string, Quads>(gangs.map((g) => [g.id, { pos: [], uv: [] }]));
    for (const s of spots) {
      const q = quads.get(s.gang);
      if (!q || !rng.chance(1 - Math.exp(-s.weight * K))) continue;
      const roomy = s.w >= 4.5 && s.h >= 2;
      const row = s.nx === 0 && s.nz === 0 ? rng.pick(BIG) : roomy && rng.chance(0.5) ? rng.pick(BIG) : rng.pick(SMALL);
      // Fit a 2:1 piece inside the spot, a little smaller than the room it has.
      const w = Math.min(MAX_W, s.w * rng.range(0.55, 0.92), s.h * 2 * 0.95);
      if (w < 1.2) continue;
      place(q, s, w, w / 2, rng, row);
    }
    for (const g of gangs) {
      const q = quads.get(g.id)!;
      if (!q.pos.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(q.pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(q.uv, 2));
      geo.computeVertexNormals();
      const mat = new THREE.MeshLambertMaterial({
        map: gangAtlas(g, new Rng(city.seed ^ (g.id.charCodeAt(0) * 977))),
        transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      mesh.renderOrder = 1;
      scene.add(mesh);
    }
  }
}

/** Lays a w × h piece somewhere within the spot. */
function place(q: Quads, s: GraffitiSpot, w: number, h: number, rng: Rng, row: number): void {
  const slide = (s.w - w) / 2 * (rng.next() * 2 - 1);
  let p0: number[], p1: number[], p2: number[], p3: number[];
  if (s.nx === 0 && s.nz === 0) {
    // Roof: lying flat, a little off square, reading upright from above.
    const a = (rng.next() - 0.5) * 0.5, ca = Math.cos(a), sa = Math.sin(a);
    const cx = s.x + slide, cz = s.z + (rng.next() - 0.5) * Math.max(0, s.h - h);
    const at = (u: number, v: number) => [cx + u * ca - v * sa, s.y, cz + u * sa + v * ca];
    [p0, p1, p2, p3] = [at(-w / 2, h / 2), at(w / 2, h / 2), at(w / 2, -h / 2), at(-w / 2, -h / 2)];
  } else {
    // Wall: right as seen from outside = (nz, 0, -nx).
    const rx = s.nz, rz = -s.nx;
    const cx = s.x + rx * slide, cz = s.z + rz * slide;
    const y = s.y + rng.next() * Math.max(0, s.h - h);
    p0 = [cx - (rx * w) / 2, y, cz - (rz * w) / 2];
    p1 = [cx + (rx * w) / 2, y, cz + (rz * w) / 2];
    p2 = [p1[0], y + h, p1[2]];
    p3 = [p0[0], y + h, p0[2]];
  }
  q.pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
  const v0 = 1 - (row + 1) / ROWS, v1 = 1 - row / ROWS;
  q.uv.push(0, v0, 1, v0, 1, v1, 0, v0, 1, v1, 0, v1);
}
