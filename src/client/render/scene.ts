// three.js scene, lights and the day/night cycle. World (x, y) maps to three (x, height, y).
import * as THREE from 'three';

export interface Lighting {
  night: number;          // 0 day .. 1 full night
  hour: number;
}

const SKY_DAY = new THREE.Color('#9fb4c4');
const SKY_NIGHT = new THREE.Color('#0d1220');

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly sun = new THREE.DirectionalLight('#fff4e0', 2.2);
  readonly hemi = new THREE.HemisphereLight('#cfe0ff', '#4a4438', 1.1);
  readonly flash: THREE.PointLight[] = [];
  readonly lighting: Lighting = { night: 0, hour: 12 };

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.camera = new THREE.PerspectiveCamera(40, 1, 2, 900);
    this.camera.up.set(0, 0, -1);
    this.scene.add(this.hemi);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -140; sc.right = 140; sc.top = 140; sc.bottom = -140; sc.near = 10; sc.far = 500;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.sun, this.sun.target);
    // A small pool of point lights for explosions and muzzle flashes (fixed count: no shader recompiles).
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight('#ffb060', 0, 40, 1.6);
      this.flash.push(l);
      this.scene.add(l);
    }
    this.scene.fog = new THREE.Fog(SKY_DAY, 500, 900);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Sun arc, colours and ambient from the in-game clock (minutes since midnight). */
  setTime(gameMinutes: number, focusX: number, focusY: number): void {
    const hour = gameMinutes / 60;
    const day = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));         // 0 at 6:00/18:00, 1 at noon
    const twilight = Math.max(0, 1 - Math.abs(hour - 18.5) / 1.6) + Math.max(0, 1 - Math.abs(hour - 6) / 1.4);
    const night = Math.min(1, Math.max(0, 1 - day * 3.5));
    this.lighting.night = night;
    this.lighting.hour = hour;
    const az = ((hour - 6) / 12) * Math.PI;
    const elev = 0.35 + day * 0.9;
    const dir = new THREE.Vector3(Math.cos(az) * 0.8, elev, 0.45 + Math.sin(az) * 0.2).normalize();
    this.sun.position.set(focusX + dir.x * 220, dir.y * 220, focusY + dir.z * 220);
    this.sun.target.position.set(focusX, 0, focusY);
    const sunColor = new THREE.Color('#fff2dc').lerp(new THREE.Color('#ff9a5a'), Math.min(1, twilight));
    const moon = new THREE.Color('#7f9cff');
    this.sun.color.copy(night > 0.6 ? moon : sunColor);
    this.sun.intensity = night > 0.6 ? 0.9 : 0.5 + day * 2.0;
    this.hemi.intensity = 0.95 + day * 0.3 - night * 0.05;
    this.hemi.color.set(night > 0.5 ? '#7d90c8' : '#cfe0ff');
    this.hemi.groundColor.set(night > 0.5 ? '#2a2c3a' : '#4a4438');
    const sky = SKY_DAY.clone().lerp(SKY_NIGHT, night);
    this.renderer.setClearColor(sky);
    (this.scene.fog as THREE.Fog).color.copy(sky);
    this.renderer.toneMappingExposure = 1.05 + night * 0.25;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
