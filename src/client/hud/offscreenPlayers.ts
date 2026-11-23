// Other players who are off screen: their name pinned to the screen edge on their side, in their
// colour, with an arrow pointing at them. On screen they have their name tag in the world instead.
import * as THREE from 'three';
import type { PlayerInfo } from '../../shared/protocol';

/** How far in from the screen edge the markers sit (px). */
const INSET = 34;

export class OffscreenPlayers {
  private root = document.createElement('div');
  private marks = new Map<number, HTMLElement>();
  private v = new THREE.Vector3();

  constructor(parent: HTMLElement) {
    this.root.className = 'offscreen-players';
    parent.appendChild(this.root);
  }

  /** `at` gives a player's current spot (the smooth on-screen position when known). */
  update(camera: THREE.Camera, players: PlayerInfo[], meId: number, at: (p: PlayerInfo) => { x: number; y: number }): void {
    const w = window.innerWidth, h = window.innerHeight, cx = w / 2, cy = h / 2;
    const seen = new Set<number>();
    for (const p of players) {
      if (p.id === meId) continue;
      const pos = at(p);
      this.v.set(pos.x, 0, pos.y).project(camera);
      const sx = (this.v.x * 0.5 + 0.5) * w, sy = (-this.v.y * 0.5 + 0.5) * h;
      if (sx > 0 && sx < w && sy > 0 && sy < h) continue; // on screen: the world tag shows them
      // Pin to the inset edge along the line from the screen centre toward them.
      const dx = sx - cx, dy = sy - cy;
      const k = Math.min((cx - INSET) / Math.max(1e-6, Math.abs(dx)), (cy - INSET) / Math.max(1e-6, Math.abs(dy)));
      let el = this.marks.get(p.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'op-mark';
        el.innerHTML = '<span class="op-arrow"></span><span class="op-name"></span>';
        this.root.appendChild(el);
        this.marks.set(p.id, el);
      }
      el.style.setProperty('--op', p.color);
      el.querySelector('.op-name')!.textContent = p.name;
      el.style.transform = `translate(${(cx + dx * k).toFixed(1)}px, ${(cy + dy * k).toFixed(1)}px)`;
      (el.querySelector('.op-arrow') as HTMLElement).style.transform = `rotate(${Math.atan2(dy, dx).toFixed(3)}rad)`;
      // The name sits on the screen side of the arrow, so it never runs off the edge it's pinned to.
      const sideways = (cx - INSET) / Math.max(1e-6, Math.abs(dx)) <= (cy - INSET) / Math.max(1e-6, Math.abs(dy));
      el.dataset.edge = sideways ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'b' : 't');
      seen.add(p.id);
    }
    for (const [id, el] of this.marks) if (!seen.has(id)) { el.remove(); this.marks.delete(id); }
  }
}
