// Gang graffiti: each gang's tags, sprayed on building walls across its turf. The tags are drawn
// once per gang into a canvas atlas; placement is seeded from the city so every player sees the
// same walls. One merged mesh per gang.
import * as THREE from 'three';
import { FACTIONS } from '../../shared/packs';
import { Rng } from '../../shared/rng';
import type { City } from '../../shared/world/cityTypes';
import { turfGang } from '../../shared/world/gangTurf';

const CELL_W = 512, CELL_H = 256;
/** Share of turf buildings that carry tags, and tags per tagged building. */
const TAG_CHANCE = 0.7;
const MAX_PER_BUILDING = 2;
const ROOF_CHANCE = 0.55;

/** Draws a gang's tags, one per atlas row: fat outlined letters, a highlight, drips, overspray. */
function atlas(color: string, tags: string[], rng: Rng): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = CELL_W; c.height = CELL_H * tags.length;
  const ctx = c.getContext('2d')!;
  tags.forEach((tag, row) => {
    const cy = row * CELL_H + CELL_H / 2;
    ctx.save();
    ctx.translate(CELL_W / 2, cy);
    ctx.rotate((rng.next() - 0.5) * 0.18);
    const size = Math.min(150, (CELL_W * 0.9) / Math.max(2, tag.length * 0.62));
    ctx.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    // Overspray haze behind the letters.
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `${color}22`;
      const r = 2 + rng.next() * 6;
      ctx.beginPath();
      ctx.arc((rng.next() - 0.5) * size * tag.length * 0.62, (rng.next() - 0.5) * size, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = '#0b0b0c';
    ctx.strokeText(tag, 0, 0);
    ctx.fillStyle = color;
    ctx.fillText(tag, 0, 0);
    // Drips from the letters' lower edge.
    const width = ctx.measureText(tag).width;
    ctx.fillStyle = color;
    for (let i = 0; i < 7; i++) {
      const x = (rng.next() - 0.5) * width * 0.9;
      const len = size * (0.15 + rng.next() * 0.45);
      ctx.fillRect(x, size * 0.32, 3 + rng.next() * 3, len);
    }
    // Highlight inside the letters.
    ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.strokeText(tag, -size * 0.02, -size * 0.03);
    ctx.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

interface Quads { pos: number[]; uv: number[] }

export class Graffiti {
  constructor(scene: THREE.Scene, city: City) {
    const rng = new Rng(city.seed ^ 0x6a11);
    const gangs = FACTIONS.filter((f) => f.gang && f.tags?.length);
    const quads = new Map<string, Quads>(gangs.map((g) => [g.id, { pos: [], uv: [] }]));
    for (const b of city.buildings) {
      const lot = city.lots[b.lot];
      const gang = lot ? turfGang(city.blocks[lot.block]?.district ?? -1) : null;
      const q = gang ? quads.get(gang) : undefined;
      if (!q || !rng.chance(TAG_CHANCE)) continue;
      const rows = gangs.find((g) => g.id === gang)!.tags!.length;
      const n = 1 + rng.int(0, MAX_PER_BUILDING - 1);
      for (let k = 0; k < n; k++) wallTag(q, b.rect, b.h, rng, rng.int(0, rows - 1), rows);
      // Rooftop pieces ("heaven spots") are what the overhead camera sees best.
      if (b.kind !== 'house' && rng.chance(ROOF_CHANCE)) roofTag(q, b.rect, b.h, rng, rng.int(0, rows - 1), rows);
    }
    for (const g of gangs) {
      const q = quads.get(g.id)!;
      if (!q.pos.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(q.pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(q.uv, 2));
      geo.computeVertexNormals();
      const mat = new THREE.MeshLambertMaterial({
        map: atlas(g.color, g.tags!, new Rng(city.seed ^ g.id.length * 977)),
        transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      mesh.renderOrder = 1;
      scene.add(mesh);
    }
  }
}

/** A tag lying on a flat roof, turned a little off square, reading upright from above. */
function roofTag(q: Quads, r: { x0: number; y0: number; x1: number; y1: number }, h: number, rng: Rng, row: number, rows: number): void {
  const sx = r.x1 - r.x0, sz = r.y1 - r.y0;
  const w = Math.min(9, Math.min(sx, sz * 2) * 0.7);
  const hh = w / 2;
  if (w < 3) return;
  const cx = r.x0 + w / 2 + rng.next() * Math.max(0, sx - w);
  const cz = r.y0 + hh / 2 + rng.next() * Math.max(0, sz - hh);
  const a = (rng.next() - 0.5) * 0.5;
  const ca = Math.cos(a), sa = Math.sin(a);
  const y = h + 0.06;
  // Corners as (along, across) offsets; "across" negative is screen-up (the tag's top).
  const at = (u: number, v: number) => [cx + u * ca - v * sa, y, cz + u * sa + v * ca];
  const p0 = at(-w / 2, hh / 2), p1 = at(w / 2, hh / 2), p2 = at(w / 2, -hh / 2), p3 = at(-w / 2, -hh / 2);
  q.pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
  const v0 = 1 - (row + 1) / rows, v1 = 1 - row / rows;
  q.uv.push(0, v0, 1, v0, 1, v1, 0, v0, 1, v1, 0, v1);
}

/** One tag on a random outer wall of a building (rect in world x/y, y-up in three). */
function wallTag(q: Quads, r: { x0: number; y0: number; x1: number; y1: number }, h: number, rng: Rng, row: number, rows: number): void {
  const side = rng.int(0, 3);
  // Outward normal (three x, z) and the wall's span along it.
  const walls = [
    { nx: 0, nz: -1, a: r.x0, b: r.x1, at: r.y0 },
    { nx: 0, nz: 1, a: r.x0, b: r.x1, at: r.y1 },
    { nx: -1, nz: 0, a: r.y0, b: r.y1, at: r.x0 },
    { nx: 1, nz: 0, a: r.y0, b: r.y1, at: r.x1 },
  ];
  const wl = walls[side];
  const len = wl.b - wl.a;
  const w = Math.min(7, len * 0.8);
  const hh = Math.min(w / 2, h - 0.8);
  if (w < 1.5 || hh < 0.6) return;
  const along = wl.a + w / 2 + rng.next() * (len - w);
  const base = 0.35 + rng.next() * Math.max(0, Math.min(1.2, h - hh - 0.6));
  const off = 0.04;
  // Centre of the tag's bottom edge, just off the wall.
  const cx = wl.nx !== 0 ? wl.at + wl.nx * off : along;
  const cz = wl.nz !== 0 ? wl.at + wl.nz * off : along;
  // Right as seen from outside = (nz, 0, -nx).
  const rx = wl.nz, rz = -wl.nx;
  const p0 = [cx - (rx * w) / 2, base, cz - (rz * w) / 2];
  const p1 = [cx + (rx * w) / 2, base, cz + (rz * w) / 2];
  const p2 = [p1[0], base + hh, p1[2]];
  const p3 = [p0[0], base + hh, p0[2]];
  q.pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
  const v0 = 1 - (row + 1) / rows, v1 = 1 - row / rows;
  q.uv.push(0, v0, 1, v0, 1, v1, 0, v0, 1, v1, 0, v1);
}
