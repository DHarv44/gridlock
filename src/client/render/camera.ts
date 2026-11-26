// Top-down chase camera: looks straight down, rises with speed, leads movement and aim.
import * as THREE from 'three';

// GTA2 frames ~25 x 19 m on foot at 4:3; widescreen and longer gun ranges get a bit more room.
const FOOT_HEIGHT = 44;
const MAX_HEIGHT = 115;
/** Holding Aim brings the camera this much closer. */
const SCOPE_ZOOM = 0.6;

export class ChaseCamera {
  x = 1000;
  y = 1000;
  height = FOOT_HEIGHT;
  /** Zoom state the height has settled at (a change of Aim zooms fast until it gets there). */
  private wasScoped = false;
  private leadX = 0;
  private leadY = 0;
  /** Shake "trauma" 0..1; the visible shake is trauma² so small hits stay subtle. */
  private trauma = 0;
  private shakeT = 0;
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(private cam: THREE.PerspectiveCamera) {}

  addShake(trauma: number): void {
    this.trauma = Math.min(1, this.trauma + trauma);
  }

  /** `scoped`: Aim held, the camera closes in (quickly, and back out quickly on letting go). */
  update(dt: number, tx: number, ty: number, vx: number, vy: number, alt: number, aimX: number, aimY: number, driving: boolean, scoped = false): void {
    const speed = Math.hypot(vx, vy);
    const dev = window as unknown as { __camHeight?: number; __camAt?: { x: number; y: number } }; // dev hooks
    if (dev.__camAt) { tx = dev.__camAt.x; ty = dev.__camAt.y; vx = 0; vy = 0; aimX = tx; aimY = ty; }
    const forced = dev.__camHeight;
    // GTA2: height grows with speed (about 2x at top speed), zooms out fast and creeps back in.
    const zoom = (driving ? 1 + Math.min(1.2, Math.max(0, speed - 3) / 40) : 1) * (scoped ? SCOPE_ZOOM : 1);
    const want = forced ?? Math.min(MAX_HEIGHT, FOOT_HEIGHT * zoom + alt * 0.9);
    const rate = scoped !== this.wasScoped ? 8 : want > this.height ? 2.2 : 0.45;
    if (Math.abs(want - this.height) < 0.5) this.wasScoped = scoped;
    this.height += (want - this.height) * Math.min(1, dt * rate);
    // Big lead along travel in vehicles (capped to part of the view); on foot, toward the aim point.
    const half = this.height * Math.tan(THREE.MathUtils.degToRad(this.cam.fov / 2));
    let lx = driving ? vx * 1.1 : (aimX - tx) * 0.22;
    let ly = driving ? vy * 1.1 : (aimY - ty) * 0.22;
    const ll = Math.hypot(lx, ly), cap = half * (driving ? 0.6 : 0.35);
    if (ll > cap) { lx *= cap / ll; ly *= cap / ll; }
    const k = Math.min(1, dt * (driving ? 2 : 4));
    this.leadX += (lx - this.leadX) * k;
    this.leadY += (ly - this.leadY) * k;
    this.x = tx + this.leadX;
    this.y = ty + this.leadY;
    // Smooth shake: layered sines (not per-frame random jitter), scaled with height so it reads the
    // same at any zoom, plus a little roll and a downward punch.
    this.trauma = Math.max(0, this.trauma - dt * 1.1);
    this.shakeT += dt;
    const s = this.trauma * this.trauma;
    const t = this.shakeT;
    const amp = s * this.height * 0.045;
    const sx = amp * (Math.sin(t * 37) * 0.6 + Math.sin(t * 61 + 1.3) * 0.4);
    const sy = amp * (Math.sin(t * 43 + 2.1) * 0.6 + Math.sin(t * 71 + 0.4) * 0.4);
    const roll = s * 0.06 * Math.sin(t * 29 + 0.7);
    const dip = s * this.height * 0.06;
    this.cam.up.set(Math.sin(roll), 0, -Math.cos(roll));
    this.cam.position.set(this.x + sx, this.height - dip, this.y + sy);
    this.cam.lookAt(this.x + sx, 0, this.y + sy);
  }

  /** Projects a screen point onto the ground plane at height h. */
  screenToWorld(px: number, py: number, h = 0): { x: number; y: number } {
    const ndc = new THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
    this.ray.setFromCamera(ndc, this.cam);
    this.plane.constant = -h;
    const p = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(this.plane, p)) return { x: this.x, y: this.y };
    return { x: p.x, y: p.z };
  }

  /** Visible ground rectangle (with margin) for chunk streaming. */
  viewRect(margin = 40): { x0: number; y0: number; x1: number; y1: number } {
    const half = this.height * Math.tan(THREE.MathUtils.degToRad(this.cam.fov / 2));
    const hw = half * this.cam.aspect;
    return { x0: this.x - hw - margin, x1: this.x + hw + margin, y0: this.y - half - margin, y1: this.y + half + margin };
  }
}
