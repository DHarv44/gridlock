// The crosshair: always where the mouse is (the game's pointer), faint, and strong while Aim is held
// (you face toward it then). Hidden while a menu has the mouse or the controller is in use. Also
// keeps where your character is on screen for the input (aiming turns you toward the mouse).
import * as THREE from 'three';
import type { Input } from '../game/input';

export class Crosshair {
  private el = document.createElement('div');
  private v = new THREE.Vector3();
  private shown = false;
  private aiming = false;

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
    const show = !!at && input.enabled && (input.mouseActive || input.scoped);
    if (show !== this.shown) { this.shown = show; this.el.classList.toggle('on', show); }
    if (input.scoped !== this.aiming) { this.aiming = input.scoped; this.el.classList.toggle('aiming', this.aiming); }
    if (!show) return;
    const p = input.crosshair();
    this.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
  }
}
