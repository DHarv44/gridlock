// Sea and river surfaces with a scrolling procedural normal map, plus bridge decks over the river.
import * as THREE from 'three';
import { Rng } from '../../shared/rng';
import type { CityMap } from '../../shared/world/city';
import { LAND0, LAND1, LANE_W } from '../../shared/world/cityTypes';
import { Batch, lambert, UNIT } from './instancing';

function normalMap(): THREE.CanvasTexture {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(N, N);
  const rng = new Rng(7);
  // Sum of a few tileable sine waves gives a height field; normals from its gradient.
  const waves = Array.from({ length: 6 }, () => ({ kx: rng.int(1, 6), ky: rng.int(-6, 6), ph: rng.next() * 6.28, a: rng.range(0.4, 1) }));
  const hgt = (x: number, y: number) => waves.reduce((s, w) => s + w.a * Math.sin(((w.kx * x + w.ky * y) / N) * Math.PI * 2 + w.ph), 0);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1);
      const nx = -dx * 2, ny = -dy * 2, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const i = (y * N + x) * 4;
      img.data[i] = ((nx / l) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((nz / l) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export class Water {
  private tex: THREE.CanvasTexture;
  private t = 0;

  constructor(scene: THREE.Scene, map: CityMap) {
    this.tex = normalMap();
    this.tex.repeat.set(1 / 80, 1 / 80);
    const mat = new THREE.MeshStandardMaterial({ color: '#163a47', roughness: 0.32, metalness: 0.1, normalMap: this.tex, normalScale: new THREE.Vector2(0.22, 0.22) });
    // World-space UVs so the pattern is continuous across planes.
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
        #ifdef USE_NORMALMAP
          vNormalMapUv = (normalMapTransform * vec3((modelMatrix * vec4(position, 1.0)).xz, 1.0)).xy;
        #endif`);
    };
    const plane = (x0: number, y0: number, x1: number, y1: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0).rotateX(-Math.PI / 2), mat);
      m.position.set((x0 + x1) / 2, 0.03, (y0 + y1) / 2);
      m.receiveShadow = true;
      scene.add(m);
    };
    const far = 6000, e = 1.5;
    if (map.city.edge === 'sea') {
      plane(-far, -far, far, LAND0 - e);
      plane(-far, LAND1 + e, far, far);
      plane(-far, LAND0 - e, LAND0 - e, LAND1 + e);
      plane(LAND1 + e, LAND0 - e, far, LAND1 + e);
    }
    const r = map.river;
    if (r) plane(LAND0, r.y0, LAND1, r.y1);
    for (const p of map.city.ponds) plane(p.x0, p.y0, p.x1, p.y1);
    if (r) this.bridges(scene, map, r);
  }

  private bridges(scene: THREE.Scene, map: CityMap, r: { y0: number; y1: number }): void {
    const deck = new Batch(UNIT.box(), lambert());
    for (const b of map.city.bridges) {
      const w = b.x1 - b.x0, len = b.y1 - b.y0 + 2, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      deck.add(cx, -1.4, cy, w + 0.6, 1.5, len, '#5d5f62');
      deck.add(cx, 0.08, cy, w - 0.4, 0.02, len, '#3a3d42');
      // Lane markings on the deck.
      deck.add(cx - 0.2, 0.1, cy, 0.15, 0.01, len, '#e2b93b');
      deck.add(cx + 0.2, 0.1, cy, 0.15, 0.01, len, '#e2b93b');
      deck.add(cx - LANE_W, 0.1, cy, 0.12, 0.01, len, '#d8d6cf');
      deck.add(cx + LANE_W, 0.1, cy, 0.12, 0.01, len, '#d8d6cf');
      // Railings and posts.
      for (const side of [-1, 1]) {
        const x = cx + side * (w / 2 + 0.15);
        deck.add(x, 0, cy, 0.3, 1.0, len, '#9a978e');
        deck.add(x, 1.0, cy, 0.4, 0.12, len, '#b8b5ac');
      }
      // Piers in the river.
      for (let y = r.y0 + 12; y < r.y1 - 6; y += 22) deck.add(cx, -4, y, w * 0.6, 4, 3, '#6d6b66');
    }
    deck.build(scene);
  }

  update(dt: number): void {
    this.t += dt;
    this.tex.offset.set(this.t * 0.004, this.t * 0.0025);
  }
}
