// The paint shop's view: the player's car on a plain backdrop, spun by dragging (or spin() from
// keys / controller; it turns slowly on its own until you touch it), and a paint mist when it
// sprays. Its own renderer, made and disposed with the modal.
import * as THREE from 'three';
import { VEHICLES } from '../../shared/packs';
import { makeVehicle, type VehicleView } from './vehicleMesh';

const MIST = 900;
const SPRAY_S = 1.6;

export class GarageScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  private turntable = new THREE.Group();
  private car: VehicleView | null = null;
  private carKey = '';
  private mist: THREE.Points;
  private sprayT = 0;
  private spin = 0;

  constructor(private canvas: HTMLCanvasElement) {
    // Transparent: the modal's own backdrop shows behind the car.
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.build();
    // Drag to spin.
    let drag: number | null = null;
    canvas.addEventListener('pointerdown', (e) => { drag = e.clientX; this.auto = false; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (drag !== null) { this.spin += (e.clientX - drag) * 0.012; drag = e.clientX; } });
    canvas.addEventListener('pointerup', () => { drag = null; });
    const pos = new Float32Array(MIST * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mist = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.09, transparent: true, opacity: 0, depthWrite: false }));
    this.scene.add(this.mist);
  }

  /** Lights and a soft shadow under the car; no room. */
  private build(): void {
    const s = this.scene;
    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(4, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
    s.add(key);
    const rim = new THREE.DirectionalLight('#9fb6ff', 0.9);
    rim.position.set(-6, 4, -5);
    s.add(rim, new THREE.HemisphereLight('#dfe6ee', '#2a2622', 1.1));
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.ShadowMaterial({ opacity: 0.45 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.receiveShadow = true;
    s.add(shadow, this.turntable);
  }

  /** Turns the car (radians); stops it turning on its own. */
  spinBy(rad: number): void {
    this.auto = false;
    this.spin += rad;
  }

  private auto = true;

  /** Shows a vehicle in a colour (palette index); rebuilt only when either changes. */
  setCar(type: number, color: number): void {
    const key = `${type}:${color}`;
    if (key === this.carKey) return;
    this.carKey = key;
    if (this.car) this.turntable.remove(this.car.root);
    const v = makeVehicle(type, color, false);
    if (v.trailer) v.trailer.visible = false; // rigs come in without their trailer
    v.root.position.y = 0;
    v.root.traverse((o) => { o.castShadow = true; });
    this.turntable.add(v.root);
    this.car = v;
    // Frame it: longer vehicles get the camera further back.
    const len = VEHICLES[type].length;
    const d = 4.2 + len * 1.15;
    this.camera.position.set(d * 0.72, 1.4 + len * 0.32, d * 0.82);
    this.camera.lookAt(0, 0.7, 0);
  }

  /** Starts the paint mist; `midway` runs when the booth is thickest (swap the colour then). */
  spray(midway: () => void): void {
    this.sprayT = SPRAY_S;
    this.midway = midway;
    const p = this.mist.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < MIST; i++) p.setXYZ(i, (Math.random() - 0.5) * 7, Math.random() * 3, (Math.random() - 0.5) * 5);
    p.needsUpdate = true;
  }

  private midway: (() => void) | null = null;

  render(dt: number): void {
    const cv = this.canvas;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (w && h && (cv.width !== Math.round(w * this.renderer.getPixelRatio()) || cv.height !== Math.round(h * this.renderer.getPixelRatio()))) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    if (this.auto) this.spin += dt * 0.35;
    this.turntable.rotation.y = this.spin;
    if (this.sprayT > 0) {
      this.sprayT -= dt;
      const k = 1 - Math.abs(this.sprayT / SPRAY_S - 0.5) * 2; // 0 → 1 → 0
      (this.mist.material as THREE.PointsMaterial).opacity = Math.max(0, k) * 0.85;
      this.mist.rotation.y += dt * 0.6;
      if (this.midway && this.sprayT < SPRAY_S / 2) { this.midway(); this.midway = null; }
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.scene.traverse((o) => {
      // Vehicle geometry and materials are shared caches used by the main view: leave them.
      if (o === this.car?.root || this.car?.root.getObjectById(o.id)) return;
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
