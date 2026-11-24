// Damage on the vehicle models. Each side (front, rear, left, right) has a dent level from the
// server (0 clean, 1 scuffed, 2 dented, 3 smashed). On the model, vertices near a damaged side are
// pushed in by a noisy crease (deeper and reaching further at higher levels), their shading is
// broken up so the panel reads as crumpled, and the paint there is scraped dark and dull; glass on
// that side cracks, and at the worst it's gone (dark). Done in the vertex shader of per-vehicle
// material clones (one shared program), so the cached geometry stays shared.
import * as THREE from 'three';
import type { VehicleSpec } from '../../shared/packs';

/** The snapshot's damage number: overall state in the low 2 bits, then each side's level. */
export function decodeDamage(d: number): { overall: number; sides: number[] } {
  return { overall: d & 3, sides: [(d >> 2) & 3, (d >> 4) & 3, (d >> 6) & 3, (d >> 8) & 3] };
}

const NOISE = /* glsl */ `
uniform vec4 uDent;   // front, rear, left (-z), right (+z): level / 3
uniform vec3 uHalf;   // half length, height, half width
uniform float uSeed;
float dH(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float dN(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dH(i), dH(i + vec3(1, 0, 0)), f.x), mix(dH(i + vec3(0, 1, 0)), dH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(dH(i + vec3(0, 0, 1)), dH(i + vec3(1, 0, 1)), f.x), mix(dH(i + vec3(0, 1, 1)), dH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// How hard each side's damage reaches this point (front, rear, left, right). A worse hit reaches
// further in: at the worst, the whole bonnet (or boot, or door line).
vec4 dentSides(vec3 p) {
  return vec4(
    smoothstep(uHalf.x - 0.5 - 1.2 * uDent.x, uHalf.x, p.x) * uDent.x,
    smoothstep(uHalf.x - 0.5 - 1.2 * uDent.y, uHalf.x, -p.x) * uDent.y,
    smoothstep(uHalf.z - 0.25 - 0.3 * uDent.z, uHalf.z, -p.z) * uDent.z,
    smoothstep(uHalf.z - 0.25 - 0.3 * uDent.w, uHalf.z, p.z) * uDent.w);
}
// How dented a point looks (0..1), worked out per pixel so big flat faces don't smear it.
float dentLook(vec3 p) {
  vec4 s = dentSides(p);
  return clamp(s.x + s.y + s.z + s.w, 0.0, 1.0) * (0.55 + 0.9 * dN((p * 2.3 + uSeed) * 2.7 + 5.0));
}
// How dented this point is (0..1) and where it's pushed to.
float dentAt(vec3 p, out vec3 moved) {
  vec3 q = p * 2.3 + uSeed;
  float n = dN(q), n2 = dN(q * 2.7 + 5.0);
  vec4 s = dentSides(p);
  float wf = s.x, wr = s.y, wl = s.z, wR = s.w;
  moved = p;
  moved.x += (-wf + wr) * (0.12 + 0.6 * n);
  moved.z += (wl - wR) * (0.05 + 0.38 * n);
  // Crumpled ends buckle up and down; a smashed side sags a little.
  moved.y += (wf + wr) * (n2 - 0.45) * 0.4 - (wl + wR) * n2 * 0.08;
  return clamp(wf + wr + wl + wR, 0.0, 1.0) * (0.55 + 0.9 * n2);
}
// Scrapes: thin streaks to bare metal running along the body (as it slid along whatever it hit),
// and grime darkening the crumpled panel, more of both the worse the dent.
vec3 scraped(vec3 col, vec3 p, float dent) {
  float streak = smoothstep(0.62, 0.72, dN(vec3(p.x * 1.8, p.y * 22.0, p.z * 22.0))) * smoothstep(0.1, 0.5, dent);
  float grime = dent * (0.25 + 0.35 * dN(p * 4.0 + 7.0));
  col = mix(col, vec3(0.55, 0.55, 0.56), clamp(streak, 0.0, 0.9));
  return col * (1.0 - clamp(grime, 0.0, 0.6));
}
`;

type Shader = Parameters<THREE.Material['onBeforeCompile']>[0];

/** A clone of `base` that dents. `glass`: cracks and goes dark where it's damaged. */
function denting(base: THREE.Material, half: THREE.Vector3, seed: number, glass: boolean): THREE.Material {
  const m = base.clone();
  const u = { uDent: { value: new THREE.Vector4() }, uHalf: { value: half }, uSeed: { value: seed } };
  m.userData.dent = u.uDent;
  const standard = (m as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
  m.onBeforeCompile = (sh: Shader) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${NOISE}\nvarying float vDent;\nvarying vec3 vDentP;`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        vec3 dMoved; float dW = dentAt(position, dMoved);
        vec3 dq = position * 6.1 + uSeed;
        objectNormal = normalize(objectNormal + (vec3(dN(dq), dN(dq + 11.0), dN(dq + 23.0)) - 0.5) * 2.4 * dW);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed = dMoved; vDent = dW; vDentP = position;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${NOISE}\nvarying float vDent;\nvarying vec3 vDentP;`)
      .replace('#include <color_fragment>', glass
        ? `#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03), smoothstep(0.3, 0.8, dentLook(vDentP)));`
        : `#include <color_fragment>\n diffuseColor.rgb = scraped(diffuseColor.rgb, vDentP + uSeed, clamp(dentLook(vDentP), 0.0, 1.0));`);
    if (standard) {
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.85, clamp(dentLook(vDentP), 0.0, 1.0));`)
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n metalnessFactor *= 1.0 - 0.6 * clamp(dentLook(vDentP), 0.0, 1.0);`);
    }
  };
  m.customProgramCacheKey = () => `dent-${glass ? 'g' : 'b'}-${base.type}`;
  return m;
}

/** The damage materials of one vehicle's cab (the trailer keeps the shared ones). */
export interface Dents {
  body: THREE.Material; shiny: THREE.Material; lampOn: THREE.Material; lampOff: THREE.Material;
  key: number;
}

export function makeDents(spec: VehicleSpec, seed: number, mats: { body: THREE.Material; shiny: THREE.Material; lampOn: THREE.Material; lampOff: THREE.Material }): Dents {
  const half = new THREE.Vector3(spec.length / 2, spec.height, spec.width / 2);
  const s = (seed % 97) * 0.37;
  return {
    body: denting(mats.body, half, s, false), shiny: denting(mats.shiny, half, s, true),
    lampOn: denting(mats.lampOn, half, s, true), lampOff: denting(mats.lampOff, half, s, true),
    key: -1,
  };
}

/** Sets the dent levels (front, rear, left, right; 0-3) on a vehicle's damage materials. */
export function setDents(d: Dents, sides: number[]): void {
  const key = sides[0] | (sides[1] << 2) | (sides[2] << 4) | (sides[3] << 6);
  if (key === d.key) return;
  d.key = key;
  for (const m of [d.body, d.shiny, d.lampOn, d.lampOff]) (m.userData.dent.value as THREE.Vector4).set(sides[0] / 3, sides[1] / 3, sides[2] / 3, sides[3] / 3);
}
