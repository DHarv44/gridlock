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

  /** A traffic light went down (or up): its live lamp face goes with it (render/streetProps.ts). */
  onSignal: (k: number, down: boolean) => void = () => {};

  /** Standing (as far as this client knows)? */
  standing(i: number): boolean { return !this.down.has(i) && !this.mine.has(i); }

  /** Your own car knocked it over: it starts to fall at once, ahead of the server. */
  knock(i: number, angle: number): void {
    if (!this.down.has(i) && !this.mine.has(i)) this.falling.set(i, 0);
    this.mine.set(i, angle);
    this.place(i);
    this.dirty();
  }

  /** The server's list of what's down. Newly down ones fall (not the ones already lying there
   *  when you arrive). */
  setDown(list: [number, number][]): void {
    const before = new Set([...this.down.keys(), ...this.mine.keys()]);
    this.down = new Map(list.map(([i, a]) => [i, a / 100]));
    this.mine.clear();
    for (const i of this.down.keys()) if (!before.has(i) && this.synced) this.falling.set(i, 0);
    for (const i of before) if (!this.down.has(i)) this.falling.delete(i);
    this.synced = true;
    for (const i of new Set([...before, ...this.down.keys()])) this.place(i);
    this.dirty();
  }

  /** Every frame: props on their way down. */
  update(dt: number): void {
    if (!this.falling.size) return;
    for (const [i, t] of this.falling) {
      const done = t + dt >= this.fallTime(i) + BOUNCE;
      if (done) this.falling.delete(i); else this.falling.set(i, t + dt);
      this.place(i);
    }
    this.dirty();
  }

  /** Props falling: how long since they were hit (s). */
  private falling = new Map<number, number>();
  /** The server's first list has come (props already down then just lie there). */
  private synced = false;

  /** A tall pole takes longer to come down than a bin (like a toppling rod, ~√height). */
  private fallTime(i: number): number {
    const h = Math.max(...STREET_PROPS[this.props.list[i].kind].parts.map((p) => (p.y ?? 0) + p.h));
    return 0.25 + 0.2 * Math.sqrt(h);
  }

  /** How far over (0 upright .. π/2 flat): speeding up as it goes, then a little bounce. */
  private tilt(i: number): number {
    const t = this.falling.get(i);
    if (t === undefined) return Math.PI / 2;
    const T = this.fallTime(i);
    if (t < T) { const u = t / T; return (Math.PI / 2) * u * u; }
    const b = (t - T) / BOUNCE;
    return Math.PI / 2 - 0.12 * Math.sin(Math.PI * b) * (1 - b);
  }

  private dirty(): void { for (const mesh of this.meshes) mesh.instanceMatrix.needsUpdate = true; }

  /** Puts a prop's parts standing, or tipped over about its foot the way it was hit. */
  private place(i: number): void {
    const p = this.props.list[i];
    const fell = this.down.get(i) ?? this.mine.get(i);
    const lamp = this.lampOf.get(i);
    if (lamp !== undefined) this.lamps[lamp].off = fell !== undefined;
    if (p.signal !== undefined) this.onSignal(p.signal, fell !== undefined);
    // Tipping about the foot: turn the fall direction onto +x, tip +y over toward it, turn back.
    const pivot = this.pivot.identity();
    if (fell !== undefined) {
      const th = this.tilt(i);
      pivot.makeTranslation(p.x, 0.12 * Math.sin(th), p.y)
        .multiply(this.r1.makeRotationY(-fell)).multiply(this.r2.makeRotationZ(-th)).multiply(this.r3.makeRotationY(fell));
    } else pivot.makeTranslation(p.x, 0, p.y);
    for (const s of this.slots[i]) {
      const { part } = s, y = part.y ?? 0, reach = p.reach ?? 0;
      // A traffic light's arm spans its road; its head hangs at the tip.
      const out = part.span === 'arm' ? reach / 2 : part.span === 'end' ? reach - 0.3 : part.out ?? 0;
      const sx = part.w, sy = part.h, sz = part.span === 'arm' ? reach + 0.15 : part.d ?? part.w;
      // Standing: the part's own spot, its long side out over the road for an arm.
      const along = p.ox !== 0 ? [sz, sy, sx] : [sx, sy, sz];
      this.m.compose(this.v.set(p.ox * out, y, p.oy * out), this.q.identity(), this.sc.set(along[0], along[1], along[2]));
      s.mesh.setMatrixAt(s.index, this.m.premultiply(pivot));
    }
  }

  private pivot = new THREE.Matrix4();
  private r1 = new THREE.Matrix4();
  private r2 = new THREE.Matrix4();
  private r3 = new THREE.Matrix4();
  private v = new THREE.Vector3();
  private sc = new THREE.Vector3();
}

/** The little bounce when a fallen prop hits the ground (s). */
const BOUNCE = 0.22;
