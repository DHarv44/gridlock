// Gang graffiti: each gang's brand (symbols, pieces, throw-ups, tags; see graffitiArt.ts) sprayed
// on the walls and rooftops of its turf. Placement is seeded from the city so every player sees
// the same walls. One merged mesh per gang.
import * as THREE from 'three';
import { FACTIONS } from '../../shared/packs';
import { Rng } from '../../shared/rng';
import type { City } from '../../shared/world/cityTypes';
import { turfGang } from '../../shared/world/gangTurf';
import { gangAtlas, PIECES } from './graffitiArt';

/** Share of turf buildings with wall pieces, pieces per building, share with a rooftop piece. */
const TAG_CHANCE = 0.7;
const MAX_PER_BUILDING = 2;
const ROOF_CHANCE = 0.55;
const ROWS = PIECES.length;
const BIG = PIECES.map((p, i) => (p.big ? i : -1)).filter((i) => i >= 0);

interface Quads { pos: number[]; uv: number[] }
type Rect = { x0: number; y0: number; x1: number; y1: number };

export class Graffiti {
  constructor(scene: THREE.Scene, city: City) {
    const rng = new Rng(city.seed ^ 0x6a11);
    const gangs = FACTIONS.filter((f) => f.gang);
    const quads = new Map<string, Quads>(gangs.map((g) => [g.id, { pos: [], uv: [] }]));
    for (const b of city.buildings) {
      const lot = city.lots[b.lot];
      const gang = lot ? turfGang(city.blocks[lot.block]?.district ?? -1) : null;
      const q = gang ? quads.get(gang) : undefined;
      if (!q || !rng.chance(TAG_CHANCE)) continue;
      const n = 1 + rng.int(0, MAX_PER_BUILDING - 1);
      for (let k = 0; k < n; k++) wallPiece(q, b.rect, b.h, rng, rng.int(0, ROWS - 1));
      // Rooftop pieces ("heaven spots") are what the overhead camera sees best: the big ones.
      if (b.kind !== 'house' && rng.chance(ROOF_CHANCE)) roofPiece(q, b.rect, b.h, rng, rng.pick(BIG));
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

function pushQuad(q: Quads, p0: number[], p1: number[], p2: number[], p3: number[], row: number): void {
  q.pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
  const v0 = 1 - (row + 1) / ROWS, v1 = 1 - row / ROWS;
  q.uv.push(0, v0, 1, v0, 1, v1, 0, v0, 1, v1, 0, v1);
}

/** A piece lying on a flat roof, turned a little off square, reading upright from above. */
function roofPiece(q: Quads, r: Rect, h: number, rng: Rng, row: number): void {
  const sx = r.x1 - r.x0, sz = r.y1 - r.y0;
  const w = Math.min(10, Math.min(sx, sz * 2) * 0.75);
  const hh = w / 2;
  if (w < 3) return;
  const cx = r.x0 + w / 2 + rng.next() * Math.max(0, sx - w);
  const cz = r.y0 + hh / 2 + rng.next() * Math.max(0, sz - hh);
  const a = (rng.next() - 0.5) * 0.5;
  const ca = Math.cos(a), sa = Math.sin(a);
  const y = h + 0.06;
  // Corners as (along, across) offsets; "across" negative is screen-up (the piece's top).
  const at = (u: number, v: number) => [cx + u * ca - v * sa, y, cz + u * sa + v * ca];
  pushQuad(q, at(-w / 2, hh / 2), at(w / 2, hh / 2), at(w / 2, -hh / 2), at(-w / 2, -hh / 2), row);
}

/** A piece on a random outer wall of a building (rect in world x/y; three is y-up). */
function wallPiece(q: Quads, r: Rect, h: number, rng: Rng, row: number): void {
  // Outward normal (three x, z) and the wall's span along it.
  const walls = [
    { nx: 0, nz: -1, a: r.x0, b: r.x1, at: r.y0 },
    { nx: 0, nz: 1, a: r.x0, b: r.x1, at: r.y1 },
    { nx: -1, nz: 0, a: r.y0, b: r.y1, at: r.x0 },
    { nx: 1, nz: 0, a: r.y0, b: r.y1, at: r.x1 },
  ];
  const wl = walls[rng.int(0, 3)];
  const len = wl.b - wl.a;
  const w = Math.min(7, len * 0.8);
  const hh = Math.min(w / 2, h - 0.8);
  if (w < 1.5 || hh < 0.6) return;
  const along = wl.a + w / 2 + rng.next() * (len - w);
  const base = 0.35 + rng.next() * Math.max(0, Math.min(1.2, h - hh - 0.6));
  const off = 0.04;
  // Centre of the piece's bottom edge, just off the wall.
  const cx = wl.nx !== 0 ? wl.at + wl.nx * off : along;
  const cz = wl.nz !== 0 ? wl.at + wl.nz * off : along;
  // Right as seen from outside = (nz, 0, -nx).
  const rx = wl.nz, rz = -wl.nx;
  const p0 = [cx - (rx * w) / 2, base, cz - (rz * w) / 2];
  const p1 = [cx + (rx * w) / 2, base, cz + (rz * w) / 2];
  pushQuad(q, p0, p1, [p1[0], base + hh, p1[2]], [p0[0], base + hh, p0[2]], row);
}
