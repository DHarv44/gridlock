// Lambert material for instanced buildings: per-instance wall/roof colours, procedural windows
// on the walls that light up at night, ground-level darkening.
import * as THREE from 'three';

export interface BuildingUniforms { uNight: { value: number } }

export function buildingMaterial(): { mat: THREE.MeshLambertMaterial; uniforms: BuildingUniforms } {
  const uniforms: BuildingUniforms = { uNight: { value: 0 } };
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = uniforms.uNight;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aWall; attribute vec3 aRoof; attribute vec2 aWin;
        varying vec3 vWall; varying vec3 vRoof; varying vec2 vWin; varying vec3 vGW; varying vec3 vGN;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vWall = aWall; vRoof = aRoof; vWin = aWin;
        vec4 gw = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vGW = gw.xyz;
        vGN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uNight;
        varying vec3 vWall; varying vec3 vRoof; varying vec2 vWin; varying vec3 vGW; varying vec3 vGN;
        float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec3 gWindowGlow = vec3(0.0);`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          bool roof = vGN.y > 0.5;
          vec3 col = roof ? vRoof : vWall;
          if (roof) {
            vec2 c = floor(vGW.xz / 4.0);
            col *= (0.9 + 0.12 * h21(c)) * 1.7;
          } else {
            float u = abs(vGN.x) > 0.5 ? vGW.z : vGW.x;
            float v = vGW.y;
            float density = vWin.x;
            vec2 cell = vec2(floor(u / 2.6), floor(v / 3.2));
            vec2 f = vec2(fract(u / 2.6), fract(v / 3.2));
            float inWin = step(0.22, f.x) * step(f.x, 0.78) * step(0.3, f.y) * step(f.y, 0.82) * step(2.4, v);
            float wins = inWin * step(1.0 - density, h21(cell * 0.37 + vWin.y));
            vec3 glass = mix(vec3(0.10, 0.13, 0.17), vec3(0.35, 0.45, 0.55), 0.35 * density);
            col = mix(col, glass, wins * 0.85);
            float lit = step(0.55, h21(cell + vWin.y * 7.0)) * wins;
            gWindowGlow = vec3(1.0, 0.78, 0.45) * lit * uNight * 0.9;
            col *= mix(0.55, 1.0, smoothstep(0.0, 4.0, v));
          }
          diffuseColor.rgb = col;
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += gWindowGlow;`);
  };
  return { mat, uniforms };
}
