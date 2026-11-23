// Three-quarter pictures of vehicles for shop cards (the dealership), made once with an offscreen
// renderer and kept. The vehicle meshes are the game's own (vehicleMesh.ts).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeVehicle } from './vehicleMesh';

const thumbs = new Map<string, string>();

/** `key` -> image URL for each vehicle type in its showroom colour (palette index). */
export function vehicleThumbs(items: { key: string; type: number; color: number }[]): Map<string, string> {
  const todo = items.filter((i) => !thumbs.has(i.key));
  if (!todo.length) return thumbs;
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(240, 120, false);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(3, 6, 4);
  scene.add(key, new THREE.HemisphereLight('#e6ecf2', '#2a2622', 1.1));
  const cam = new THREE.PerspectiveCamera(24, 2, 0.1, 200);
  for (const it of todo) {
    const v = makeVehicle(it.type, it.color, false);
    if (v.trailer) v.trailer.visible = false;
    scene.add(v.root);
    const b = new THREE.Box3().setFromObject(v.root), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    // Front three-quarter view from a little above, the whole length in frame.
    const radius = Math.max(s.x, s.z) * 0.62 + s.y * 0.3;
    const d = radius / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 0.62;
    cam.position.set(c.x + d * 0.78, c.y + d * 0.42, c.z + d * 0.62);
    cam.lookAt(c);
    r.render(scene, cam);
    thumbs.set(it.key, canvas.toDataURL('image/png'));
    scene.remove(v.root);
  }
  scene.environment?.dispose();
  r.dispose();
  r.forceContextLoss();
  return thumbs;
}
