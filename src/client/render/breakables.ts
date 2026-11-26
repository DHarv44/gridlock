// Street furniture vehicles knock over (shared/world/breakables.ts, packs/streetProps.ts): drawn
// standing, or lying where it fell, the way it was hit. The server says what's down; your own car
// knocks things over at once in the prediction (game/predict.ts) and the server confirms. Lamp
// posts light the street at night while standing (`lamps`).
import * as THREE from 'three';
import { STREET_PROPS } from '../../shared/packs';
import type { Breakables } from '../../shared/world/breakables';
import { lambert, UNIT } from './instancing';

interface Slot { mesh: THREE.InstancedMesh; index: number; part: (typeof STREET_PROPS)[number]['parts'][number] }

export class StreetPropsView {
  /** Lamp heads, for the night glows: `off` once the post is down. */
  readonly lamps: { x: number; y: number; off?: boolean }[] = [];
  private slots: Slot[][] = [];
  private lampOf = new Map<number, number>();
  /** Down, from the server: prop → the way it fell. */
  private down = new Map<number, number>();
  /** Knocked by your own car, before the server has said so. */
  private mine = new Map<number, number>();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private meshes: THREE.InstancedMesh[] = [];

  constructor(scene: THREE.Scene, readonly props: Breakables) {
    const count = { cyl: 0, box: 0 };
    for (const p of props.list) for (const part of STREET_PROPS[p.kind].parts) count[part.shape]++;
    const make = (geo: THREE.BufferGeometry, n: number) => {
      const mesh = new THREE.InstancedMesh(geo, lambert(), Math.max(1, n));
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.count = n;
      scene.add(mesh);
      this.meshes.push(mesh);
      return mesh;
    };
    const meshes = { cyl: make(UNIT.cyl(8), count.cyl), box: make(UNIT.box(), count.box) };
    const used = { cyl: 0, box: 0 };
    const col = new THREE.Color();
    props.list.forEach((p, i) => {
      const slots: Slot[] = [];
      for (const part of STREET_PROPS[p.kind].parts) {
        const mesh = meshes[part.shape], index = used[part.shape]++;
        mesh.setColorAt(index, col.set(part.color));
        slots.push({ mesh, index, part });
        if (part.lamp) { this.lampOf.set(i, this.lamps.length); this.lamps.push({ x: p.x + p.ox * (part.out ?? 0), y: p.y + p.oy * (part.out ?? 0) }); }
      }
      this.slots.push(slots);
      this.place(i);
    });
    for (const mesh of this.meshes) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
  }

  /** Standing (as far as this client knows)? */
  standing(i: number): boolean { return !this.down.has(i) && !this.mine.has(i); }

  /** Your own car knocked it over: down at once, ahead of the server. */
  knock(i: number, angle: number): void {
    this.mine.set(i, angle);
    this.place(i);
    this.dirty();
  }

  /** The server's list of what's down. */
  setDown(list: [number, number][]): void {
    const before = new Set([...this.down.keys(), ...this.mine.keys()]);
    this.down = new Map(list.map(([i, a]) => [i, a / 100]));
    this.mine.clear();
    for (const i of new Set([...before, ...this.down.keys()])) this.place(i);
    this.dirty();
  }

  private dirty(): void { for (const mesh of this.meshes) mesh.instanceMatrix.needsUpdate = true; }

  /** Puts a prop's parts standing, or lying flat the way it fell (pivoting at its foot). */
  private place(i: number): void {
    const p = this.props.list[i];
    const fell = this.down.get(i) ?? this.mine.get(i);
    const lamp = this.lampOf.get(i);
    if (lamp !== undefined) this.lamps[lamp].off = fell !== undefined;
    for (const s of this.slots[i]) {
      const { part } = s, out = part.out ?? 0, y = part.y ?? 0;
      const sx = part.w, sy = part.h, sz = part.d ?? part.w;
      // Standing: the part's own spot, its long side out over the road for an arm.
      const ax = p.ox * out, az = p.oy * out;
      const along = p.ox !== 0 ? [sz, sy, sx] : [sx, sy, sz];
      if (fell === undefined) {
        this.m.compose(new THREE.Vector3(p.x + ax, y, p.y + az), this.q.identity(), new THREE.Vector3(along[0], along[1], along[2]));
      } else {
        // Lying: tipped 90° about its foot, falling the way the car was going.
        const fx = Math.cos(fell), fy = Math.sin(fell);
        const px = p.x + ax + fx * (y + 0.1), pz = p.y + az + fy * (y + 0.1);
        this.e.set(0, -fell, -Math.PI / 2, 'YXZ');
        this.m.compose(new THREE.Vector3(px, 0.12, pz), this.q.setFromEuler(this.e), new THREE.Vector3(along[0], along[1], along[2]));
      }
      s.mesh.setMatrixAt(s.index, this.m);
    }
  }
}
