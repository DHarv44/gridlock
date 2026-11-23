// Collects many copies of one geometry (position, scale, yaw, colour) into a single InstancedMesh.
import * as THREE from 'three';

interface Inst { x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number; color: string }

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const p = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const c = new THREE.Color();

export class Batch {
  private items: Inst[] = [];

  constructor(private geo: THREE.BufferGeometry, private mat: THREE.Material, private shadows: { cast: boolean; receive: boolean } = { cast: true, receive: true }) {}

  /** (x, z) is the ground position in world metres, y the base height. */
  add(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, rot = 0): void {
    this.items.push({ x, y, z, sx, sy, sz, rot, color });
  }

  get size(): number {
    return this.items.length;
  }

  build(scene: THREE.Scene): THREE.InstancedMesh | null {
    if (!this.items.length) return null;
    const mesh = new THREE.InstancedMesh(this.geo, this.mat, this.items.length);
    this.items.forEach((it, i) => {
      q.setFromAxisAngle(up, it.rot);
      mesh.setMatrixAt(i, m.compose(p.set(it.x, it.y, it.z), q, s.set(it.sx, it.sy, it.sz)));
      mesh.setColorAt(i, c.set(it.color));
    });
    mesh.castShadow = this.shadows.cast;
    mesh.receiveShadow = this.shadows.receive;
    scene.add(mesh);
    this.items = [];
    return mesh;
  }
}

/** Unit geometries with their base at y = 0. */
export const UNIT = {
  box: () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  cyl: (seg = 10) => new THREE.CylinderGeometry(0.5, 0.5, 1, seg).translate(0, 0.5, 0),
  /** Triangular prism with the ridge along x. */
  gable: () => {
    const shape = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5);
    g.rotateY(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  },
};

export const lambert = () => new THREE.MeshLambertMaterial();
