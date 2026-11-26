// The crosshair while Aim is held: out from your character the way you're aiming, as far as the
// mouse pushes the aim (game/input.ts crosshair), so you can see where shots will go.
import * as THREE from 'three';
import type { Input } from '../game/input';

/** How far out the crosshair goes at full push (share of the screen's shorter side), and how
 *  close in it stays. */
const REACH = 0.32, NEAREST = 0.08;

export class Crosshair {
  private el = document.createElement('div');
  private v = new THREE.Vector3();
  private shown = false;

  constructor(parent: HTMLElement) {
    this.el.className = 'crosshair';
    this.el.innerHTML = '<i></i><i></i><i></i><i></i><b></b>';
    parent.appendChild(this.el);
  }

  /** Every frame, after rendering: `at` is your character (world x, height, y), or null. */
  update(camera: THREE.Camera, at: { x: number; h: number; y: number } | null, input: Input): void {
    const show = !!at && input.scoped;
    if (show !== this.shown) { this.shown = show; this.el.classList.toggle('on', show); }
    if (!show) return;
    this.v.set(at!.x, at!.h, at!.y).project(camera);
    const w = window.innerWidth, h = window.innerHeight, side = Math.min(w, h);
    const { reach, angle } = input.crosshair();
    // Screen directions are world directions: the camera looks straight down, north up.
    const d = side * (NEAREST + (REACH - NEAREST) * reach);
    const x = (this.v.x * 0.5 + 0.5) * w + Math.cos(angle) * d, y = (-this.v.y * 0.5 + 0.5) * h + Math.sin(angle) * d;
    this.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
}
