// The gun shop's view: the picked weapon large on a turntable (drag to spin; it turns slowly on its
// own until touched), and side-on thumbnails of every weapon for the shop's cards. Its own renderer,
// made and disposed with the modal; weapon geometry and materials are shared caches and stay.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { WeaponPart } from '../../shared/packs';
import { modelBounds, weaponModel } from './weaponMesh';

/** A soft studio room for metal to reflect (bare metal with nothing to reflect renders black). */
function studio(r: THREE.WebGLRenderer, s: THREE.Scene): void {
  const pm = new THREE.PMREMGenerator(r);
  s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  s.environmentIntensity = 0.7;
  pm.dispose();
}

function lights(s: THREE.Scene): void {
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(2, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5 });
  const rim = new THREE.DirectionalLight('#9fb6ff', 1.4);
  rim.position.set(-3, 2, -4);
  s.add(key, rim, new THREE.HemisphereLight('#e6ecf2', '#2a2622', 1.2));
}

/** Camera distance that fits a model of radius r in a perspective view of fov degrees. */
const fit = (r: number, fov: number) => r / Math.tan(THREE.MathUtils.degToRad(fov / 2)) * 1.15;

export class WeaponStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  private turntable = new THREE.Group();
  private item: THREE.Group | null = null;
  private key = '';
  private spin = 0.6;
  private auto = true;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    lights(this.scene);
    studio(this.renderer, this.scene);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.ShadowMaterial({ opacity: 0.4 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor, this.turntable);
    let drag: number | null = null;
    canvas.addEventListener('pointerdown', (e) => { drag = e.clientX; this.auto = false; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (drag !== null) { this.spin += (e.clientX - drag) * 0.012; drag = e.clientX; } });
    canvas.addEventListener('pointerup', () => { drag = null; });
  }

  /** Shows a model on the turntable, framed to its size. */
  show(key: string, parts: WeaponPart[]): void {
    if (key === this.key) return;
    this.key = key;
    if (this.item) this.turntable.remove(this.item);
    const b = modelBounds(key, parts), c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
    const r = Math.max(0.12, size.length() / 2);
    const m = weaponModel(key, parts, true);
    // Centred on the turntable, resting just above the floor.
    m.position.set(-c.x, -b.min.y + 0.04, -c.z);
    this.item = m;
    this.turntable.add(m);
    const d = fit(r, this.camera.fov);
    this.camera.position.set(0, size.y / 2 + 0.04 + d * 0.38, d);
    this.camera.lookAt(0, size.y / 2 + 0.04, 0);
  }

  spinBy(rad: number): void { this.auto = false; this.spin += rad; }

  render(dt: number): void {
    const cv = this.canvas, pr = this.renderer.getPixelRatio();
    const w = cv.clientWidth, h = cv.clientHeight;
    if (w && h && (cv.width !== Math.round(w * pr) || cv.height !== Math.round(h * pr))) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    if (this.auto) this.spin += dt * 0.4;
    this.turntable.rotation.y = this.spin;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.turntable.clear();
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

const thumbs = new Map<string, string>();

/** Side-on pictures (muzzle to the right) of each model, as image URLs; made once and kept. */
export function weaponThumbs(items: { key: string; parts: WeaponPart[] }[]): Map<string, string> {
  const todo = items.filter((i) => !thumbs.has(i.key));
  if (!todo.length) return thumbs;
  const canvas = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(240, 120, false);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  lights(scene);
  studio(r, scene);
  const cam = new THREE.PerspectiveCamera(22, 2, 0.01, 50);
  for (const { key, parts } of todo) {
    const b = modelBounds(key, parts), c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
    const m = weaponModel(key, parts, true);
    m.position.set(-c.x, -c.y, -c.z);
    scene.add(m);
    // Fit the length across the frame (or the height, for upright things like a bottle).
    const half = Math.max(size.x / 2 / cam.aspect, size.y / 2) * 1.12;
    const d = half / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    cam.position.set(0, d * 0.22, d);
    cam.lookAt(0, 0, 0);
    r.render(scene, cam);
    thumbs.set(key, canvas.toDataURL('image/png'));
    scene.remove(m);
  }
  scene.environment?.dispose();
  r.dispose();
  r.forceContextLoss();
  return thumbs;
}
