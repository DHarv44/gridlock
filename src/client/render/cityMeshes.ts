// Static city geometry: buildings, rooftop units, signs, containers/fences, trees, street lamps.
import * as THREE from 'three';
import { Rng } from '../../shared/rng';
import type { City } from '../../shared/world/cityTypes';
import { buildingMaterial, type BuildingUniforms } from './buildingMaterial';

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpC = new THREE.Color();

function boxAt(m: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rot = 0): void {
  tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  m.setMatrixAt(i, tmpM.compose(tmpP.set(x, y, z), tmpQ, tmpS.set(sx, sy, sz)));
}

export interface LampSpot { x: number; y: number }

export class CityMeshes {
  readonly uniforms: BuildingUniforms;
  readonly lamps: LampSpot[] = [];

  constructor(scene: THREE.Scene, city: City) {
    const unit = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    const rng = new Rng(city.seed ^ 0xb11d);

    // Buildings.
    const { mat, uniforms } = buildingMaterial();
    this.uniforms = uniforms;
    const bGeo = unit.clone();
    const n = city.buildings.length;
    const wall = new Float32Array(n * 3), roof = new Float32Array(n * 3), win = new Float32Array(n * 2);
    const bMesh = new THREE.InstancedMesh(bGeo, mat, n);
    city.buildings.forEach((b, i) => {
      const r = b.rect;
      boxAt(bMesh, i, (r.x0 + r.x1) / 2, 0, (r.y0 + r.y1) / 2, r.x1 - r.x0, b.h, r.y1 - r.y0);
      // Color.set() already converts sRGB hex to the linear working space.
      tmpC.set(b.wall); wall.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
      tmpC.set(b.roof); roof.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
      win.set([b.kind === 'house' ? 0.25 : b.windows, rng.next() * 100], i * 2);
    });
    bGeo.setAttribute('aWall', new THREE.InstancedBufferAttribute(wall, 3));
    bGeo.setAttribute('aRoof', new THREE.InstancedBufferAttribute(roof, 3));
    bGeo.setAttribute('aWin', new THREE.InstancedBufferAttribute(win, 2));
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    scene.add(bMesh);

    // Rooftop units, house roofs ridges, signs.
    const props: { x: number; y: number; z: number; sx: number; sy: number; sz: number; c: string }[] = [];
    for (const b of city.buildings) {
      const r = b.rect, w = r.x1 - r.x0, d = r.y1 - r.y0;
      if (b.kind === 'house') {
        // A raised ridge reads as a pitched roof from above.
        const alongX = w >= d;
        props.push({ x: (r.x0 + r.x1) / 2, y: b.h, z: (r.y0 + r.y1) / 2, sx: alongX ? w * 0.95 : w * 0.45, sy: 1.2, sz: alongX ? d * 0.45 : d * 0.95, c: b.roof });
        continue;
      }
      const units = b.kind === 'tower' ? 3 : b.kind === 'warehouse' || b.kind === 'hangar' ? 2 : 1 + (rng.chance(0.5) ? 1 : 0);
      for (let k = 0; k < units; k++) {
        const sx = rng.range(2, Math.min(6, w * 0.3)), sz = rng.range(2, Math.min(6, d * 0.3));
        props.push({ x: rng.range(r.x0 + sx, r.x1 - sx), y: b.h, z: rng.range(r.y0 + sz, r.y1 - sz), sx, sy: rng.range(1.2, 3), sz, c: rng.pick(['#8a8f94', '#6e7378', '#a3a7aa']) });
      }
      if (b.kind === 'tower' && rng.chance(0.4)) {
        props.push({ x: (r.x0 + r.x1) / 2, y: b.h, z: (r.y0 + r.y1) / 2, sx: w * 0.5, sy: 4, sz: d * 0.5, c: b.wall });
      }
      if (b.sign) {
        // Coloured storefront band along all walls just above the door.
        props.push({ x: (r.x0 + r.x1) / 2, y: 3, z: (r.y0 + r.y1) / 2, sx: w + 0.3, sy: 1.4, sz: d + 0.3, c: b.sign });
      }
    }
    const pMesh = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial(), props.length);
    props.forEach((p, i) => { boxAt(pMesh, i, p.x, p.y, p.z, p.sx, p.sy, p.sz); pMesh.setColorAt(i, tmpC.set(p.c)); });
    pMesh.castShadow = true; pMesh.receiveShadow = true;
    scene.add(pMesh);

    // Containers, fences.
    const oMesh = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial(), Math.max(1, city.obstacles.length));
    city.obstacles.forEach((o, i) => {
      const r = o.rect;
      boxAt(oMesh, i, (r.x0 + r.x1) / 2, 0, (r.y0 + r.y1) / 2, r.x1 - r.x0, o.h, r.y1 - r.y0);
      oMesh.setColorAt(i, tmpC.set(o.color));
    });
    oMesh.castShadow = true; oMesh.receiveShadow = true;
    scene.add(oMesh);

    this.trees(scene, city, rng);
    this.streetLamps(scene, city);
  }

  private trees(scene: THREE.Scene, city: City, rng: Rng): void {
    const n = Math.max(1, city.trees.length);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 1, 6).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: '#5a4030' }), n);
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial(), n);
    city.trees.forEach((t, i) => {
      const h = 3 + t.r * 0.8;
      boxAt(trunk, i, t.x, 0, t.y, 1, h, 1);
      boxAt(crown, i, t.x, h + t.r * 0.4, t.y, t.r, t.r * 0.85, t.r, rng.next() * 6);
      crown.setColorAt(i, tmpC.set(rng.pick(['#3f6b35', '#4b7a3a', '#365e30', '#5a8a42', '#2f5530'])));
    });
    trunk.castShadow = true;
    crown.castShadow = true; crown.receiveShadow = true;
    scene.add(trunk, crown);
  }

  private streetLamps(scene: THREE.Scene, city: City): void {
    for (const s of city.segs) {
      if (s.bridge) continue;
      const len = s.axis === 'h' ? s.x1 - s.x0 : s.y1 - s.y0;
      const side = s.width / 2 + 0.6;
      for (let p = 16; p < len - 10; p += 34) {
        const flip = Math.floor(p / 34) % 2 ? 1 : -1;
        if (s.axis === 'h') this.lamps.push({ x: s.x0 + p, y: s.y0 + side * flip });
        else this.lamps.push({ x: s.x0 + side * flip, y: s.y0 + p });
      }
    }
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.12, 1, 5).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: '#2d3035' }), this.lamps.length);
    this.lamps.forEach((l, i) => boxAt(pole, i, l.x, 0, l.y, 1, 6.5, 1));
    pole.castShadow = true;
    scene.add(pole);
  }
}
