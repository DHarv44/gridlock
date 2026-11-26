// Mouse aiming on screen: where your character stands (you face from there toward the mouse,
// game/input.ts mouseAim), and, while Aim is held, a crosshair at the mouse.
import * as THREE from 'three';
import type { Input } from '../game/input';

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
    if (at) {
      this.v.set(at.x, at.h, at.y).project(camera);
      input.anchorX = (this.v.x * 0.5 + 0.5) * window.innerWidth;
      input.anchorY = (-this.v.y * 0.5 + 0.5) * window.innerHeight;
    }
    const show = !!at && input.scoped && input.enabled && !input.pad.active;
    if (show !== this.shown) { this.shown = show; this.el.classList.toggle('on', show); }
    if (show) this.el.style.transform = `translate(${input.mouseX.toFixed(1)}px, ${input.mouseY.toFixed(1)}px)`;
  }
}
