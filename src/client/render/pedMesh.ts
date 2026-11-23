// Box-built pedestrians with walk / aim / down / dead poses, coloured from the archetype look.
import * as THREE from 'three';
import { hash32 } from '../../shared/math';
import { PEDS, WEAPONS } from '../../shared/packs';

const S = 1.25; // drawn a little larger than life so people read from the air
const box = (w: number, h: number, d: number, y0: number) => new THREE.BoxGeometry(w * S, h * S, d * S).translate(0, (y0 + h / 2) * S, 0);
const G = {
  torso: box(0.32, 0.62, 0.5, 0.88),
  head: box(0.26, 0.27, 0.24, 1.52),
  hat: box(0.3, 0.09, 0.3, 1.76),
  leg: new THREE.BoxGeometry(0.17 * S, 0.86 * S, 0.17 * S).translate(0, -0.43 * S, 0),
  arm: new THREE.BoxGeometry(0.13 * S, 0.62 * S, 0.13 * S).translate(0, -0.31 * S, 0),
  gun: new THREE.BoxGeometry(1, 0.09 * S, 0.08 * S).translate(0.5, 0, 0),
};

const mats = new Map<string, THREE.MeshLambertMaterial>();
const mat = (c: string) => {
  let m = mats.get(c);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); mats.set(c, m); }
  return m;
};

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
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const add = (geo: THREE.BufferGeometry, color: string, parent: THREE.Object3D = body) => {
    const m = new THREE.Mesh(geo, mat(color));
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  add(G.torso, top);
  add(G.head, skin);
  if (look.hat && (hash32(h + 4) % 100) / 100 < (look.hatChance ?? 0)) add(G.hat, pick(look.hat, 5));
  const legL = add(G.leg, bottom), legR = add(G.leg, bottom);
  legL.position.set(0, 0.88 * S, -0.12 * S); legR.position.set(0, 0.88 * S, 0.12 * S);
  const armL = add(G.arm, top), armR = add(G.arm, top);
  armL.position.set(0, 1.46 * S, -0.31 * S); armR.position.set(0, 1.46 * S, 0.31 * S);
  const gun = new THREE.Mesh(G.gun, mat('#1d1f22'));
  gun.position.set(0.1, 1.16 * S, 0.22 * S);
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
    v.gun.material = mat(spec.kind === 'melee' ? (spec.id === 'bat' ? '#a0773f' : '#b9bcc0') : '#1d1f22');
  }
}

/** Poses the ped for this frame. speed in m/s. */
export function animatePed(v: PedView, dt: number, speed: number, aiming: boolean, down: boolean, dead: boolean, busy: boolean): void {
  const b = v.body;
  if (dead || down) {
    v.deadT = Math.min(1, v.deadT + dt * 5);
    b.rotation.z = -Math.PI / 2 * v.deadT;
    b.position.y = 0.25 * v.deadT;
    v.legL.rotation.z = v.legR.rotation.z = 0;
    v.armL.rotation.z = 0.5; v.armR.rotation.z = -0.3;
    return;
  }
  v.deadT = 0;
  b.rotation.z = 0;
  b.position.y = busy ? -0.45 : 0;
  v.phase += dt * Math.min(speed, 8) * 2.3;
  const swing = Math.min(1, speed / 2) * 0.7;
  const s = Math.sin(v.phase) * swing;
  v.legL.rotation.z = s; v.legR.rotation.z = -s;
  const twoHanded = v.gun.visible && v.gun.scale.x > 0.45 * S;
  if (aiming || (v.gun.visible && v.weapon >= 0 && WEAPONS[v.weapon].kind !== 'melee')) {
    v.armR.rotation.z = Math.PI / 2;
    v.armL.rotation.z = twoHanded ? Math.PI / 2.3 : -s;
    v.armL.rotation.x = twoHanded ? 0.5 : 0;
    v.gun.rotation.z = 0;
  } else {
    v.armL.rotation.z = -s; v.armR.rotation.z = s;
    v.armL.rotation.x = 0;
  }
}
