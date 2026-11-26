// Instanced flat-quad particle layer (camera looks straight down, so ground-facing quads work).
import * as THREE from 'three';
import { LEVEL_BAND, groundOf } from '../../shared/world/levels';
import { heightAt } from '../../shared/world/ways';

let softTex: THREE.Texture | null = null;
export function softTexture(): THREE.Texture {
  if (softTex) return softTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  softTex = new THREE.CanvasTexture(c);
  return softTex;
}

export interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  size: number; grow: number;
  life: number; max: number;
  r: number; g: number; b: number; a: number;
  rot: number; stretch: number;
  drag: number;
}

export class ParticleLayer {
  readonly mesh: THREE.InstancedMesh;
  private list: Particle[] = [];
  private color: THREE.InstancedBufferAttribute;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private s = new THREE.Vector3();
  private p = new THREE.Vector3();

  /** `map`'s alpha shapes each quad (a soft round blob unless given). */
  constructor(scene: THREE.Scene, private cap: number, additive: boolean, order: number, map: THREE.Texture = softTexture()) {
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.color = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    geo.setAttribute('aColor', this.color);
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: map } },
      vertexShader: `attribute vec4 aColor; varying vec4 vC; varying vec2 vUv;
        void main() { vC = aColor; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D map; varying vec4 vC; varying vec2 vUv;
        void main() { float a = texture2D(map, vUv).a * vC.a; if (a < 0.01) discard; gl_FragColor = vec4(vC.rgb, a); }`,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = order;
    this.mesh.count = 0;
    scene.add(this.mesh);
  }

  /** A glow drawn for the next frame only. */
  put(x: number, y: number, z: number, size: number, stretch: number, rot: number, r: number, g: number, b: number, a: number): void {
    if (this.list.length >= this.cap) return;
    this.list.push({ x, y, z, vx: 0, vy: 0, vz: 0, size, grow: 0, life: 0, max: -1, r, g, b, a, rot, stretch, drag: 0 });
  }

  spawn(p: Partial<Particle> & { x: number; y: number }): void {
    if (this.list.length >= this.cap) this.list.shift();
    const q: Particle = { z: 0.3, vx: 0, vy: 0, vz: 0, size: 1, grow: 0, life: 0, max: 1, r: 1, g: 1, b: 1, a: 1, rot: 0, stretch: 1, drag: 0, ...p };
    // Upstairs (world/levels.ts): drawn over the building, at that floor's height.
    if (q.x >= LEVEL_BAND) { const g = groundOf(q.x, q.y); q.z += heightAt(q.x, q.y); q.x = g.x; q.y = g.y; }
    this.list.push(q);
  }

  update(dt: number): void {
    let n = 0;
    const keep: Particle[] = [];
    for (const p of this.list) {
      // max < 0 marks a one-frame item (night glows): drawn at full alpha, then dropped.
      const once = p.max < 0;
      let fade = 1;
      if (!once) {
        p.life += dt;
        if (p.life >= p.max) continue;
        keep.push(p);
        const k = Math.exp(-p.drag * dt);
        p.vx *= k; p.vy *= k; p.vz *= k;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.size += p.grow * dt;
        const t = p.life / p.max;
        fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      }
      this.e.set(0, -p.rot, 0);
      this.q.setFromEuler(this.e);
      this.m.compose(this.p.set(p.x, p.z, p.y), this.q, this.s.set(p.size * p.stretch, 1, p.size));
      this.mesh.setMatrixAt(n, this.m);
      this.color.setXYZW(n, p.r, p.g, p.b, p.a * Math.max(0, fade));
      n++;
    }
    this.list = keep;
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.color.needsUpdate = true;
  }
}
