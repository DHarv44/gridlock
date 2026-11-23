// Streams ground chunks (canvas textures on flat planes) around the camera.
import * as THREE from 'three';
import type { CityMap } from '../../shared/world/city';
import { MAP_SIZE } from '../../shared/world/cityTypes';
import { CHUNK, paintChunk } from './groundPaint';

interface Chunk { mesh: THREE.Mesh; tex: THREE.CanvasTexture; used: number }

const MAX_CHUNKS = 48;
const BUILDS_PER_FRAME = 3;
const BUILD_BUDGET_MS = 3;
const N = Math.ceil(MAP_SIZE / CHUNK);

export class Ground {
  private chunks = new Map<number, Chunk>();
  private geo = new THREE.PlaneGeometry(CHUNK, CHUNK).rotateX(-Math.PI / 2);
  private sea: THREE.Mesh;
  private frame = 0;

  constructor(private scene: THREE.Scene, private map: CityMap, private maxAniso: number) {
    // A huge sea plane under everything for areas outside the map.
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#1f4250' }));
    this.sea.position.set(MAP_SIZE / 2, -0.05, MAP_SIZE / 2);
    this.sea.receiveShadow = true;
    scene.add(this.sea);
  }

  update(view: { x0: number; y0: number; x1: number; y1: number }): void {
    this.frame++;
    const i0 = Math.max(0, Math.floor(view.x0 / CHUNK)), i1 = Math.min(N - 1, Math.floor(view.x1 / CHUNK));
    const j0 = Math.max(0, Math.floor(view.y0 / CHUNK)), j1 = Math.min(N - 1, Math.floor(view.y1 / CHUNK));
    const cx = (view.x0 + view.x1) / 2, cy = (view.y0 + view.y1) / 2;
    const missing: [number, number, number][] = [];
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * N + i;
        const c = this.chunks.get(k);
        if (c) { c.used = this.frame; continue; }
        const d = ((i + 0.5) * CHUNK - cx) ** 2 + ((j + 0.5) * CHUNK - cy) ** 2;
        missing.push([i, j, d]);
      }
    }
    missing.sort((a, b) => a[2] - b[2]);
    // Build nearest first, within a small per-frame time budget (always at least one).
    const t0 = performance.now();
    for (const [i, j] of missing.slice(0, BUILDS_PER_FRAME)) {
      this.build(i, j);
      if (performance.now() - t0 > BUILD_BUDGET_MS) break;
    }
    if (this.chunks.size > MAX_CHUNKS) this.evict();
  }

  private build(i: number, j: number): void {
    const canvas = document.createElement('canvas');
    paintChunk(this.map, i, j, canvas);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.maxAniso;
    tex.generateMipmaps = true;
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.position.set((i + 0.5) * CHUNK, 0, (j + 0.5) * CHUNK);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.scene.add(mesh);
    this.chunks.set(j * N + i, { mesh, tex, used: this.frame });
  }

  private evict(): void {
    const sorted = [...this.chunks.entries()].sort((a, b) => a[1].used - b[1].used);
    for (const [k, c] of sorted.slice(0, this.chunks.size - MAX_CHUNKS)) {
      if (c.used === this.frame) break;
      this.scene.remove(c.mesh);
      (c.mesh.material as THREE.Material).dispose();
      c.tex.dispose();
      this.chunks.delete(k);
    }
  }
}
