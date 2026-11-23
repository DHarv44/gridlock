// Builds vehicle meshes from pack part lists. Static parts are merged per (type, colour, wrecked)
// into one geometry with vertex colours; animated parts (rotors, turrets, sirens) stay separate.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE, type Paint, type Part, VEHICLES, type VehicleSpec } from '../../shared/packs';
import { hitchOffset } from '../../shared/sim/physics';
import { densify, shapeGeometry, widthAt } from './bodyShape';

const NAMED: Record<string, string> = {
  glass: '#1b2632', dark: '#202326', chrome: '#c9ccd0', trim: '#2a2c30', headlight: '#fff6d8', taillight: '#c4161c',
  red: '#e0201c', blue: '#1f5bff', white: '#f2f2ee', black: '#141518', yellow: '#e3b30c', olive: '#4f5536', tire: '#141414',
};

const paintColor = (p: Paint, body: string, wrecked: boolean): string => {
  if (wrecked) return p === 'glass' ? '#0c0c0c' : p === 'body' ? '#26221f' : '#1c1b1a';
  if (p === 'body') return body;
  if (p.startsWith('#')) return p;
  return NAMED[p] ?? '#ff00ff';
};

function profileGeometry(spec: VehicleSpec, part: Part): THREE.BufferGeometry {
  const L = spec.length, W = spec.width, H = spec.height;
  const depth = (part.y[1] - part.y[0]) * W;
  const bevel = Math.min(0.08, depth * 0.08, H * 0.05);
  const pts = spec.shape ? densify(part.profile!, 0.05) : part.profile!;
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x * L, z * H)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.02, depth - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 1 });
  g.translate(0, 0, part.y[0] * W + bevel);
  g.clearGroups();
  return g;
}

function partGeometry(spec: VehicleSpec, part: Part, color: THREE.Color): THREE.BufferGeometry {
  const L = spec.length, W = spec.width, H = spec.height;
  let g: THREE.BufferGeometry;
  if (part.profile) g = profileGeometry(spec, part);
  else {
    const sx = (part.x[1] - part.x[0]) * L, sy = (part.z[1] - part.z[0]) * H, sz = (part.y[1] - part.y[0]) * W;
    // Shaped bodies bend boxes along the length too, so long boxes (stripes) need segments.
    const segs = spec.shape ? Math.max(1, Math.ceil((part.x[1] - part.x[0]) / 0.06)) : 1;
    g = new THREE.BoxGeometry(Math.max(sx, 0.02), Math.max(sy, 0.02), Math.max(sz, 0.02), segs);
    g.translate(((part.x[0] + part.x[1]) / 2) * L, ((part.z[0] + part.z[1]) / 2) * H, ((part.y[0] + part.y[1]) / 2) * W);
  }
  const n = g.attributes.position.count;
  const cols = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) cols.set([color.r, color.g, color.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

function wheels(spec: VehicleSpec, axleOverride?: number[]): THREE.BufferGeometry[] {
  if (spec.movement === 'rotor') return [];
  const out: THREE.BufferGeometry[] = [];
  const r = spec.movement === 'bike' ? 0.32 : spec.movement === 'tracks' ? 0 : Math.min(0.48, spec.height * 0.24);
  if (r === 0) return out;
  const axles = axleOverride ?? (spec.length > 9 ? [0.36, -0.2, -0.36] : spec.movement === 'bike' ? [0.38, -0.38] : spec.trailer ? [0.33, -0.25, -0.38] : [0.33, -0.33]);
  const sides = spec.movement === 'bike' ? [0] : [-1, 1];
  const tyre = new THREE.Color('#1c1c1c'), rim = new THREE.Color(spec.movement === 'bike' ? '#3a3a3a' : '#9da2a8');
  const coloured = (g: THREE.BufferGeometry, c: THREE.Color) => {
    const n = g.attributes.position.count;
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    return g.toNonIndexed();
  };
  for (const ax of axles) {
    // Tuck wheels in where a shaped body narrows toward its ends.
    const tuck = spec.shape ? Math.min(1, widthAt({ ...spec.shape, hips: 0 }, ax, 0.3)) : 1;
    for (const s of sides) {
      const z = s * (spec.width / 2 * tuck - 0.13);
      const t = new THREE.CylinderGeometry(r, r, 0.28, 14).rotateX(Math.PI / 2).translate(ax * spec.length, r, z);
      out.push(coloured(t, tyre));
      if (s !== 0) {
        const h = new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.04, 10).rotateX(Math.PI / 2).translate(ax * spec.length, r, z + s * 0.14);
        out.push(coloured(h, rim));
      }
    }
  }
  return out;
}

const SHINY = new Set<Paint>(['glass', 'chrome']);

interface Built {
  body: THREE.BufferGeometry;
  shiny: THREE.BufferGeometry | null;
  lights: THREE.BufferGeometry | null;
  animated: { tag: Part['tag']; geo: THREE.BufferGeometry; offset: THREE.Vector3 }[];
  trailer?: Built;
}
const cache = new Map<string, Built>();

function build(type: number, colorIdx: number, wrecked: boolean): Built {
  const key = `${type}:${colorIdx}:${wrecked ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const spec = VEHICLES[type];
  const body = PALETTE[colorIdx] ?? '#888888';
  const built = buildParts(spec, spec.model, body, wrecked);
  if (spec.trailer) {
    // The trailer is built as its own "vehicle" with only rear axles.
    const t = spec.trailer;
    const tspec: VehicleSpec = { ...spec, length: t.length, width: t.width, height: t.height, model: t.model, trailer: undefined, shape: undefined };
    built.trailer = buildParts(tspec, t.model, body, wrecked, [-0.28, -0.4]);
  }
  cache.set(key, built);
  return built;
}

function buildParts(spec: VehicleSpec, model: Part[], body: string, wrecked: boolean, axles?: number[]): Built {
  const staticParts: THREE.BufferGeometry[] = [...wheels(spec, axles)];
  const shinyParts: THREE.BufferGeometry[] = [];
  const lightParts: THREE.BufferGeometry[] = [];
  const animated: Built['animated'] = [];
  for (const part of model) {
    const col = new THREE.Color(paintColor(part.paint, body, wrecked));
    const raw = partGeometry(spec, part, col);
    const g = raw.index ? raw.toNonIndexed() : raw;
    if (spec.shape) shapeGeometry(g, spec.shape, spec.length, spec.height);
    if (part.tag === 'rotor' || part.tag === 'tailrotor' || part.tag === 'turret' || part.tag === 'barrel' || part.tag === 'siren') {
      g.computeBoundingBox();
      const offset = g.boundingBox!.getCenter(new THREE.Vector3());
      if (part.tag === 'rotor' || part.tag === 'tailrotor') g.translate(-offset.x, -offset.y, -offset.z);
      animated.push({ tag: part.tag, geo: g, offset });
    } else if ((part.tag === 'headlight' || part.tag === 'taillight') && !wrecked) lightParts.push(g);
    else if (SHINY.has(part.paint) && !wrecked) shinyParts.push(g);
    else staticParts.push(g);
  }
  return {
    body: mergeGeometries(staticParts)!,
    shiny: shinyParts.length ? mergeGeometries(shinyParts) : null,
    lights: lightParts.length ? mergeGeometries(lightParts) : null,
    animated,
  };
}

// Paint reflects the scene environment (set up in Stage); glass and chrome are mirror-like.
const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.35, roughness: 0.38 });
const shinyMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.9, roughness: 0.08 });
/** Lamp lenses: plain glass by day and on parked cars, glowing when the lights are on. */
export const lampMats = {
  off: new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.2, roughness: 0.25, color: '#9a9a9a' }),
  on: new THREE.MeshBasicMaterial({ vertexColors: true }),
};
export const sirenMats = {
  red: new THREE.MeshBasicMaterial({ color: '#ff2a2a' }), redDim: new THREE.MeshLambertMaterial({ color: '#661010' }),
  blue: new THREE.MeshBasicMaterial({ color: '#3a6bff' }), blueDim: new THREE.MeshLambertMaterial({ color: '#10205a' }),
};
const animMat = new THREE.MeshLambertMaterial({ vertexColors: true });

export interface VehicleView {
  root: THREE.Group;
  turret: THREE.Group | null;
  rotors: THREE.Mesh[];
  tailRotors: THREE.Mesh[];
  sirens: THREE.Mesh[];
  /** Head and tail lamp lenses (cab and trailer); their material shows whether the lights are on. */
  lamps: THREE.Mesh[];
  /** Pivot at the hitch; rotate it by (trailer angle - vehicle angle). */
  trailer: THREE.Group | null;
  key: string;
}

export function makeVehicle(type: number, colorIdx: number, wrecked: boolean): VehicleView {
  const spec = VEHICLES[type];
  const b = build(type, colorIdx, wrecked);
  const root = new THREE.Group();
  const body = new THREE.Mesh(b.body, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);
  if (b.shiny) root.add(new THREE.Mesh(b.shiny, shinyMat));
  const view: VehicleView = { root, turret: null, rotors: [], tailRotors: [], sirens: [], lamps: [], trailer: null, key: `${type}:${colorIdx}:${wrecked}` };
  if (b.lights) { const m = new THREE.Mesh(b.lights, lampMats.off); view.lamps.push(m); root.add(m); }
  if (b.trailer && spec.trailer) {
    const pivot = new THREE.Group();
    pivot.position.x = -hitchOffset(spec);
    const tb = new THREE.Group();
    tb.position.x = -spec.trailer.length / 2; // the trailer's front edge sits on the hitch
    const tm = new THREE.Mesh(b.trailer.body, bodyMat);
    tm.castShadow = true; tm.receiveShadow = true;
    tb.add(tm);
    if (b.trailer.shiny) tb.add(new THREE.Mesh(b.trailer.shiny, shinyMat));
    if (b.trailer.lights) { const m = new THREE.Mesh(b.trailer.lights, lampMats.off); view.lamps.push(m); tb.add(m); }
    pivot.add(tb);
    root.add(pivot);
    view.trailer = pivot;
  }
  for (const a of b.animated) {
    const m = new THREE.Mesh(a.geo, a.tag === 'siren' ? sirenMats.redDim : animMat);
    m.castShadow = true;
    if (a.tag === 'turret' || a.tag === 'barrel') {
      if (!view.turret) {
        view.turret = new THREE.Group();
        // Pivot the turret around its own centre (front-back midpoint of the turret part).
        const tpart = spec.model.find((p) => p.tag === 'turret');
        const pivot = tpart ? ((tpart.x[0] + tpart.x[1]) / 2) * spec.length : 0;
        view.turret.position.x = pivot;
        view.turret.userData.pivot = pivot;
        root.add(view.turret);
      }
      m.position.x = -view.turret.userData.pivot;
      view.turret.add(m);
    } else if (a.tag === 'rotor') {
      m.position.copy(a.offset);
      // Make the rotor read as a disc: two crossed blades.
      const blade2 = new THREE.Mesh(a.geo, animMat);
      blade2.rotation.y = Math.PI / 2;
      m.add(blade2);
      view.rotors.push(m);
      root.add(m);
    } else if (a.tag === 'tailrotor') {
      m.position.copy(a.offset);
      view.tailRotors.push(m);
      root.add(m);
    } else {
      // Sirens: left half red, right half blue (by position).
      m.userData.blue = a.offset.z > 0;
      m.material = m.userData.blue ? sirenMats.blueDim : sirenMats.redDim;
      view.sirens.push(m);
      root.add(m);
    }
  }
  return view;
}
