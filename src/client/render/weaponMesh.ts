// Builds weapon models (packs/weaponModels.ts) into meshes: one merged geometry per material, cached
// per model, so a ped's weapon is a handful of shared meshes. `look` picks cheap Lambert materials
// for the street or lit Standard ones for the gun shop's turntable.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { WeaponMat, WeaponPart } from '../../shared/packs';

const LOOK: Record<string, { color: string; metal: number; rough: number }> = {
  steel: { color: '#6f757b', metal: 0.8, rough: 0.38 },
  black: { color: '#1e2023', metal: 0.5, rough: 0.5 },
  polymer: { color: '#2b2d30', metal: 0.05, rough: 0.75 },
  wood: { color: '#7a4a26', metal: 0, rough: 0.6 },
  chrome: { color: '#d4d8dc', metal: 1, rough: 0.15 },
  olive: { color: '#4f5a36', metal: 0.1, rough: 0.7 },
  brass: { color: '#b08d3c', metal: 0.9, rough: 0.3 },
  red: { color: '#a3261e', metal: 0.3, rough: 0.45 },
  glass: { color: '#3f6b3a', metal: 0.1, rough: 0.1 },
  cloth: { color: '#d8d2c0', metal: 0, rough: 0.95 },
};

const mats = new Map<string, THREE.Material>();
function material(m: WeaponMat, shop: boolean): THREE.Material {
  const key = `${shop ? 's' : 'w'}:${m}`;
  let out = mats.get(key);
  if (!out) {
    const l = LOOK[m] ?? { color: m, metal: 0.2, rough: 0.6 };
    out = shop
      ? new THREE.MeshStandardMaterial({ color: l.color, metalness: l.metal, roughness: l.rough, transparent: m === 'glass', opacity: m === 'glass' ? 0.85 : 1 })
      : new THREE.MeshLambertMaterial({ color: l.color });
    mats.set(key, out);
  }
  return out;
}

function partGeometry(p: WeaponPart): THREE.BufferGeometry {
  const sx = p.x[1] - p.x[0], sy = p.y[1] - p.y[0], sz = p.z[1] - p.z[0];
  let g: THREE.BufferGeometry;
  if (p.shape === 'box') g = new THREE.BoxGeometry(sx, sy, sz);
  else {
    // A unit cylinder along y, stretched to the part's extents and turned to its axis.
    g = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
    const axis = p.axis ?? 'x';
    if (axis === 'x') g.rotateZ(Math.PI / 2);
    else if (axis === 'z') g.rotateX(Math.PI / 2);
    g.scale(sx, sy, sz);
  }
  if (p.tilt) g.rotateZ(p.tilt);
  g.translate((p.x[0] + p.x[1]) / 2, (p.y[0] + p.y[1]) / 2, (p.z[0] + p.z[1]) / 2);
  return g.index ? g.toNonIndexed() : g;
}

const cache = new Map<string, { mat: WeaponMat; geo: THREE.BufferGeometry }[]>();

/** Merged geometry per material for a model (cached by `key`). */
function merged(key: string, parts: WeaponPart[]): { mat: WeaponMat; geo: THREE.BufferGeometry }[] {
  let out = cache.get(key);
  if (!out) {
    const by = new Map<WeaponMat, THREE.BufferGeometry[]>();
    for (const p of parts) (by.get(p.mat) ?? by.set(p.mat, []).get(p.mat)!).push(partGeometry(p));
    out = [...by].map(([mat, gs]) => ({ mat, geo: mergeGeometries(gs)! }));
    cache.set(key, out);
  }
  return out;
}

/** A model as a group of meshes (sharing cached geometry). `shop` for the turntable's lit look. */
export function weaponModel(key: string, parts: WeaponPart[], shop = false): THREE.Group {
  const g = new THREE.Group();
  for (const { mat, geo } of merged(key, parts)) {
    const m = new THREE.Mesh(geo, material(mat, shop));
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

/** The model's bounding box (for framing it). */
export function modelBounds(parts: WeaponPart[]): THREE.Box3 {
  const b = new THREE.Box3();
  for (const p of parts) b.union(new THREE.Box3(new THREE.Vector3(p.x[0], p.y[0], p.z[0]), new THREE.Vector3(p.x[1], p.y[1], p.z[1])));
  return b;
}
