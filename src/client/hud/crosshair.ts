// The crosshair while Aim is held: wherever the mouse has moved it on screen (game/input.ts
// crosshair, relative to your character), and you face toward it.
import * as THREE from 'three';
import type { Input } from '../game/input';

/** The crosshair stays this far (px) inside the edges of the screen. */
const EDGE = 12;

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
    const w = window.innerWidth, h = window.innerHeight;
    const off = input.crosshair();
    const x = Math.max(EDGE, Math.min(w - EDGE, (this.v.x * 0.5 + 0.5) * w + off.x));
    const y = Math.max(EDGE, Math.min(h - EDGE, (-this.v.y * 0.5 + 0.5) * h + off.y));
    this.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
}
