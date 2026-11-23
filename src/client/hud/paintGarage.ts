// The paint shop (GTA-style respray): stopping on the pad fades the screen, your car goes in
// (it vanishes from the street), and the shop opens with your car to spin (drag, Z / X, LB / RB).
// Pick a colour (arrows / WASD / D-pad / mouse; it shows on the car), Spray (Enter / E / A) or
// drive out (Esc / B). Spraying fills the view with mist and the car comes out in the new paint.
import { PALETTE, PALETTE_NAMES } from '../../shared/packs';
import type { NavCmd } from '../game/input';
import { GarageScene } from '../render/garageScene';

export interface GarageVisit {
  shop: string;
  type: number;            // vehicle type
  color: number;           // its paint now
  price: number;
  cash: number;
  wanted: boolean;
  /** Pays for a coat: a palette index, or '' for a surprise (the server picks). */
  buy: (id: string) => void;
  /** The car's paint as the server has it now (to show a surprise coat once it's applied). */
  paintNow: () => number;
  close: () => void;
}

const COLS = 6;
const FADE_MS = 220;

export class PaintGarage {
  private root: HTMLElement;
  private fade: HTMLElement;
  private scene: GarageScene | null = null;
  private visit: GarageVisit | null = null;
  private sel = 0;
  private busy = false;
  private raf = 0;
  private last = 0;
  private keys = (e: KeyboardEvent) => this.onKey(e);

  constructor() {
    this.fade = document.createElement('div');
    this.fade.className = 'screen-fade';
    document.body.appendChild(this.fade);
    this.root = document.createElement('div');
    this.root.className = 'garage';
    this.root.hidden = true;
    document.body.appendChild(this.root);
  }

  get isOpen(): boolean { return !!this.visit; }

  /** Fades to black, opens the garage, fades back in. */
  open(v: GarageVisit): void {
    if (this.visit) return;
    this.visit = v;
    this.sel = Math.max(0, v.color);
    this.busy = false;
    void this.blackout(() => {
      this.render();
      this.root.hidden = false;
      this.scene = new GarageScene(this.root.querySelector('canvas')!);
      this.scene.setCar(v.type, this.sel);
      window.addEventListener('keydown', this.keys, true);
      this.last = performance.now();
      const loop = () => {
        const now = performance.now();
        this.scene?.render(Math.min(0.1, (now - this.last) / 1000));
        this.last = now;
        this.raf = requestAnimationFrame(loop);
      };
      loop();
    });
  }

  /** Drives out: fade, close, fade back to the street. */
  leave(): void {
    if (!this.visit || this.busy) return;
    this.shut();
  }

  private shut(): void {
    const v = this.visit!;
    this.busy = true;
    void this.blackout(() => {
      cancelAnimationFrame(this.raf);
      window.removeEventListener('keydown', this.keys, true);
      this.scene?.dispose();
      this.scene = null;
      this.root.hidden = true;
      this.root.innerHTML = '';
      this.visit = null;
      this.busy = false;
      v.close();
    });
  }

  /** Black for a beat while `during` swaps what's on screen. */
  private async blackout(during: () => void): Promise<void> {
    this.fade.classList.add('on');
    await new Promise((r) => setTimeout(r, FADE_MS));
    during();
    await new Promise((r) => setTimeout(r, 60));
    this.fade.classList.remove('on');
  }

  /** Controller (and the game's Esc) while the garage is open. */
  nav(c: NavCmd): void {
    if (c === 'back') this.leave();
    else if (c === 'ok') this.spray(String(this.sel));
    else if (c === 'up') this.pick(this.sel - COLS);
    else if (c === 'down') this.pick(this.sel + COLS);
    else if (c === 'left') this.pick(this.sel - 1);
    else if (c === 'right') this.pick(this.sel + 1);
    else if (c === 'zoomIn') this.scene?.spinBy(0.35);
    else if (c === 'zoomOut') this.scene?.spinBy(-0.35);
  }

  private onKey(e: KeyboardEvent): void {
    const map: Record<string, NavCmd> = {
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      Enter: 'ok', KeyE: 'ok', Space: 'ok', Backspace: 'back', KeyZ: 'zoomOut', KeyX: 'zoomIn',
    };
    const c = map[e.code];
    if (!c) return;
    e.preventDefault();
    e.stopPropagation();
    if (!e.repeat || c === 'zoomIn' || c === 'zoomOut') this.nav(c);
  }

  private pick(i: number): void {
    if (this.busy || i < 0 || i >= PALETTE.length) return;
    this.sel = i;
    this.scene?.setCar(this.visit!.type, i);
    this.render();
  }

  private spray(id: string): void {
    const v = this.visit;
    if (!v || this.busy) return;
    if (v.cash < v.price) { this.root.querySelector('.garage-price')?.classList.add('short'); return; }
    this.busy = true;
    v.buy(id);
    const before = v.paintNow();
    this.scene?.spray(() => {
      // A chosen colour is known now; a surprise shows once the server has applied it.
      if (id !== '') this.scene?.setCar(v.type, Number(id));
      else this.waitForPaint(before);
    });
    setTimeout(() => this.shut(), 2300);
  }

  private waitForPaint(before: number, tries = 12): void {
    const v = this.visit;
    if (!v) return;
    const now = v.paintNow();
    if (now !== before && now >= 0) { this.scene?.setCar(v.type, now); return; }
    if (tries > 0) setTimeout(() => this.waitForPaint(before, tries - 1), 80);
  }

  private render(): void {
    const v = this.visit!;
    if (!this.root.firstChild) {
      this.root.innerHTML = `<div class="garage-box"><canvas class="garage-view"></canvas><div class="garage-side">
        <h2></h2><p class="garage-sub"></p><div class="garage-chips"></div><div class="garage-name"></div>
        <div class="garage-actions"><button class="primary spray"></button><button class="surprise">Surprise me</button><button class="out">Drive out</button></div>
      </div></div>`;
      const chips = this.root.querySelector('.garage-chips')!;
      PALETTE.forEach((hex, i) => {
        const b = document.createElement('button');
        b.className = 'chip';
        b.style.background = hex;
        b.title = PALETTE_NAMES[i] ?? hex;
        b.addEventListener('click', () => this.pick(i));
        b.addEventListener('dblclick', () => this.spray(String(i)));
        chips.appendChild(b);
      });
      this.root.querySelector('.spray')!.addEventListener('click', () => this.spray(String(this.sel)));
      this.root.querySelector('.surprise')!.addEventListener('click', () => this.spray(''));
      this.root.querySelector('.out')!.addEventListener('click', () => this.leave());
    }
    this.root.querySelector('h2')!.textContent = v.shop;
    this.root.querySelector('.garage-sub')!.textContent = v.wanted ? 'New paint, repairs, and the cops lose you.' : 'New paint and repairs.';
    this.root.querySelectorAll<HTMLElement>('.chip').forEach((c, i) => c.classList.toggle('on', i === this.sel));
    this.root.querySelector('.garage-name')!.textContent = `${PALETTE_NAMES[this.sel] ?? ''}${this.sel === v.color ? ' · current' : ''}`;
    const spray = this.root.querySelector<HTMLButtonElement>('.spray')!;
    spray.innerHTML = `Spray <span class="garage-price">$${v.price.toLocaleString('en-US')}</span>`;
    spray.disabled = v.cash < v.price;
  }
}
