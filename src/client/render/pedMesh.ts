// Box-built pedestrians with walk / aim / down / dead poses, coloured from the archetype look.
// Body (torso, belt, head, hair/hat), each limb (with hand/shoe) are merged vertex-coloured meshes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { hash32 } from '../../shared/math';
import { HAIR, PEDS, SHOES, WEAPONS } from '../../shared/packs';

const S = 1.55; // drawn larger than life so people read from the air

function cbox(w: number, h: number, d: number, x: number, y: number, z: number, color: string): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w * S, h * S, d * S).translate(x * S, y * S, z * S).toNonIndexed();
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry[]): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) { g = mergeGeometries(make())!; geoCache.set(key, g); }
  return g;
}

const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
const gunMats = new Map<string, THREE.MeshLambertMaterial>();
const gunMat = (c: string) => {
  let m = gunMats.get(c);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); gunMats.set(c, m); }
  return m;
};
const GUN = new THREE.BoxGeometry(1, 0.09 * S, 0.08 * S).translate(0.5, 0, 0);

export interface PedView {
  root: THREE.Group;
  body: THREE.Group;
  legL: THREE.Mesh; legR: THREE.Mesh;
  armL: THREE.Mesh; armR: THREE.Mesh;
  gun: THREE.Mesh;
  weapon: number;
  phase: number;
  deadT: number;
}

export function makePed(id: number, arch: number, playerColor: string | null): PedView {
  const look = PEDS[arch].look;
  const h = hash32(id);
  const pick = (arr: string[], salt: number) => arr[(hash32(h + salt) >>> 0) % arr.length];
  const skin = pick(look.skin, 1), top = playerColor ?? pick(look.top, 2), bottom = pick(look.bottom, 3);
  const hat = look.hat && (hash32(h + 4) % 100) / 100 < (look.hatChance ?? 0) ? pick(look.hat, 5) : null;
  const hair = pick(HAIR, 6), shoes = pick(SHOES, 7);
  const longHair = hash32(h + 8) % 3 === 0;
  const bodyGeo = cached(`b:${skin}:${top}:${bottom}:${hat}:${hair}:${longHair}`, () => {
    const parts = [
      cbox(0.3, 0.26, 0.54, 0, 1.38, 0, top),          // chest / shoulders
      cbox(0.27, 0.38, 0.44, 0, 1.06, 0, top),         // waist
      cbox(0.29, 0.07, 0.46, 0, 0.86, 0, '#2a2622'),   // belt
      cbox(0.28, 0.12, 0.44, 0, 0.84, 0, bottom),      // hips
      cbox(0.11, 0.08, 0.13, 0, 1.55, 0, skin),        // neck
      cbox(0.25, 0.27, 0.23, 0.01, 1.72, 0, skin),     // head
      cbox(0.05, 0.05, 0.2, 0.13, 1.74, 0, '#1a1a1a'), // brows / eyes line facing forward
    ];
    if (hat) parts.push(cbox(0.3, 0.09, 0.27, 0, 1.88, 0, hat), cbox(0.12, 0.03, 0.25, 0.17, 1.84, 0, hat));
    else {
      parts.push(cbox(0.27, 0.07, 0.25, -0.01, 1.87, 0, hair));
      parts.push(cbox(0.08, longHair ? 0.34 : 0.18, 0.25, -0.12, longHair ? 1.66 : 1.74, 0, hair));
    }
    return parts;
  });
  const legGeo = cached(`l:${bottom}:${shoes}`, () => [cbox(0.17, 0.78, 0.17, 0, -0.39, 0, bottom), cbox(0.25, 0.09, 0.16, 0.04, -0.82, 0, shoes)]);
  const armGeo = cached(`a:${top}:${skin}`, () => [cbox(0.13, 0.5, 0.13, 0, -0.25, 0, top), cbox(0.11, 0.13, 0.11, 0, -0.56, 0, skin)]);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const mesh = (g: THREE.BufferGeometry) => {
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    body.add(m);
    return m;
  };
  mesh(bodyGeo);
  const legL = mesh(legGeo), legR = mesh(legGeo);
  legL.position.set(0, 0.86 * S, -0.11 * S); legR.position.set(0, 0.86 * S, 0.11 * S);
  const armL = mesh(armGeo), armR = mesh(armGeo);
  armL.position.set(0, 1.47 * S, -0.34 * S); armR.position.set(0, 1.47 * S, 0.34 * S);
  const gun = new THREE.Mesh(GUN, gunMat('#1d1f22'));
  gun.position.set(0.2 * S, 1.4 * S, 0.3 * S);
  gun.visible = false;
  body.add(gun);
  const build = look.build ?? 1;
  body.scale.set(build, 1, build);
  return { root, body, legL, legR, armL, armR, gun, weapon: -1, phase: (h % 100) / 16, deadT: 0 };
}

export function setPedWeapon(v: PedView, wi: number): void {
  if (v.weapon === wi) return;
  v.weapon = wi;
  const spec = wi >= 0 ? WEAPONS[wi] : null;
  v.gun.visible = !!spec && spec.size > 0;
  if (spec && spec.size > 0) {
    v.gun.scale.x = spec.size * S;
    v.gun.material = gunMat(spec.kind === 'melee' ? (spec.id === 'bat' ? '#a0773f' : '#b9bcc0') : '#1d1f22');
  }
}

/** Poses the ped for this frame. speed in m/s. */
export function animatePed(v: PedView, dt: number, speed: number, aiming: boolean, down: boolean, dead: boolean, busy: boolean): void {
  const b = v.body;
  if (dead || down) {
    v.deadT = Math.min(1, v.deadT + dt * 5);
    b.rotation.z = -Math.PI / 2 * v.deadT;
    b.position.y = 0.3 * v.deadT;
    v.legL.rotation.z = v.legR.rotation.z = 0;
    v.armL.rotation.z = 0.5; v.armR.rotation.z = -0.3;
    return;
  }
  v.deadT = 0;
  b.rotation.z = 0;
  b.position.y = busy ? -0.55 : 0;
  v.phase += dt * Math.min(speed, 8) * 2.1;
  const swing = Math.min(1, speed / 2) * 0.7;
  const s = Math.sin(v.phase) * swing;
  v.legL.rotation.z = s; v.legR.rotation.z = -s;
  const armed = v.gun.visible && v.weapon >= 0 && WEAPONS[v.weapon].kind !== 'melee';
  const twoHanded = armed && v.gun.scale.x > 0.45 * S;
  if (aiming || armed) {
    v.armR.rotation.z = Math.PI / 2;
    v.armL.rotation.z = twoHanded ? Math.PI / 2.3 : -s;
    v.armL.rotation.x = twoHanded ? 0.5 : 0;
  } else {
    v.armL.rotation.z = -s; v.armR.rotation.z = s;
    v.armL.rotation.x = 0;
  }
}
