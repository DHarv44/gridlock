// A shop counter, built like the paint shop: walking in fades the screen and opens the shop with the
// picked item turning large on the left and a card (picture, name, price) for everything on sale on
// the right. Pick with arrows / WASD / D-pad / mouse, buy with Enter / E / A (or the button), turn
// the item with Z / X / bumpers or by dragging, walk out with Esc / Backspace / B. Each shop (gun
// shop, dealership) describes its items, its turntable and what buying means; this runs the counter.
import type { NavCmd } from '../game/input';

export interface ShowItem { key: string; name: string; group: string; thumb: string }
export interface Offer { label: string; price: number; can: boolean; note: string; owned: boolean }
export interface Turntable { show(key: string): void; render(dt: number): void; spinBy(rad: number): void; dispose(): void }

export interface ShopSpec<I extends ShowItem> {
  title: string;
  sub: string;
  items: I[];
  /** The first item picked. */
  start?: number;
  stage: (canvas: HTMLCanvasElement) => Turntable;
  /** What buying this item means now (read live: money and ownership change as you buy). */
  offer: (item: I) => Offer;
  /** Stat bars and the like for the picked item (HTML). */
  details: (item: I) => string;
  /** The money line under the title. */
  money: () => string;
  buy: (item: I) => void;
  close: () => void;
}

const COLS = 3;
const FADE_MS = 220;
export const $ = (n: number) => `$${n.toLocaleString('en-US')}`;

/** Bars for a stat sheet: [label, value, max, shown]. */
export function statBars(rows: [string, number, number, string][]): string {
  return rows.map(([name, v, max, label]) =>
    `<div class="gs-stat"><span>${name}</span><div class="gs-bar"><div style="width:${Math.max(4, Math.min(100, (v / max) * 100)).toFixed(0)}%"></div></div><b>${label}</b></div>`).join('');
}

export class Showroom {
  private root = document.createElement('div');
  private fade = document.createElement('div');
  private stage: Turntable | null = null;
  private spec: ShopSpec<ShowItem> | null = null;
  private sel = 0;
  private busy = false;
  private raf = 0;
  private last = 0;
  private refreshT = 0;
  private keys = (e: KeyboardEvent) => this.onKey(e);

  constructor() {
    this.fade.className = 'screen-fade';
    this.root.className = 'garage showroom';
    this.root.hidden = true;
    document.body.append(this.fade, this.root);
  }

  get isOpen(): boolean { return !!this.spec; }

  open<I extends ShowItem>(spec: ShopSpec<I>): void {
    if (this.spec || !spec.items.length) return;
    this.spec = spec as unknown as ShopSpec<ShowItem>;
    this.sel = Math.min(spec.start ?? 0, spec.items.length - 1);
    void this.blackout(() => {
      this.build();
      this.root.hidden = false;
      this.stage = this.spec!.stage(this.root.querySelector('canvas')!);
      this.pick(this.sel);
      window.addEventListener('keydown', this.keys, true);
      this.last = performance.now();
      const loop = () => {
        const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000);
        this.last = now;
        this.stage?.render(dt);
        if ((this.refreshT -= dt) <= 0) { this.refreshT = 0.25; this.update(); }
        this.raf = requestAnimationFrame(loop);
      };
      loop();
    });
  }

  leave(): void {
    if (!this.spec || this.busy) return;
    const s = this.spec;
    this.busy = true;
    void this.blackout(() => {
      cancelAnimationFrame(this.raf);
      window.removeEventListener('keydown', this.keys, true);
      this.stage?.dispose();
      this.stage = null;
      this.root.hidden = true;
      this.root.innerHTML = '';
      this.spec = null;
      this.busy = false;
      s.close();
    });
  }

  private async blackout(during: () => void): Promise<void> {
    this.fade.classList.add('on');
    await new Promise((r) => setTimeout(r, FADE_MS));
    during();
    await new Promise((r) => setTimeout(r, 60));
    this.fade.classList.remove('on');
  }

  nav(c: NavCmd): void {
    if (c === 'back') this.leave();
    else if (c === 'ok') this.purchase();
    else if (c === 'up') this.pick(this.sel - COLS);
    else if (c === 'down') this.pick(this.sel + COLS);
    else if (c === 'left') this.pick(this.sel - 1);
    else if (c === 'right') this.pick(this.sel + 1);
    else if (c === 'zoomIn') this.stage?.spinBy(0.35);
    else if (c === 'zoomOut') this.stage?.spinBy(-0.35);
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
    const s = this.spec;
    if (!s || i < 0 || i >= s.items.length) return;
    this.sel = i;
    this.stage?.show(s.items[i].key);
    this.root.querySelectorAll<HTMLElement>('.gs-card').forEach((c, k) => c.classList.toggle('on', k === i));
    this.root.querySelectorAll<HTMLElement>('.gs-card')[i]?.scrollIntoView({ block: 'nearest' });
    this.update();
  }

  private purchase(): void {
    const s = this.spec, it = s?.items[this.sel];
    if (!s || !it || this.busy) return;
    if (!s.offer(it).can) { this.root.querySelector('.gs-buy')?.classList.add('short'); return; }
    s.buy(it);
    this.refreshT = 0.15;
  }

  private build(): void {
    const s = this.spec!;
    this.root.innerHTML = `<div class="garage-box"><canvas class="garage-view"></canvas><div class="garage-side">
      <h2></h2><p class="garage-sub"></p><div class="gs-cash"></div><div class="gs-cards"></div>
      <div class="gs-detail"><div class="gs-name"></div><div class="gs-note"></div><div class="gs-stats"></div></div>
      <div class="garage-actions"><button class="primary gs-buy"></button><button class="out">Walk out</button></div></div></div>`;
    this.root.querySelector('h2')!.textContent = s.title;
    this.root.querySelector('.garage-sub')!.textContent = s.sub;
    const cards = this.root.querySelector('.gs-cards')!;
    s.items.forEach((it, i) => {
      const c = document.createElement('button');
      c.className = 'gs-card';
      c.innerHTML = '<img alt=""><span class="gs-card-name"></span><span class="gs-card-price"></span>';
      c.querySelector('img')!.src = it.thumb;
      c.querySelector('.gs-card-name')!.textContent = it.name;
      c.addEventListener('click', () => this.pick(i));
      c.addEventListener('dblclick', () => { this.pick(i); this.purchase(); });
      cards.appendChild(c);
    });
    this.root.querySelector('.gs-buy')!.addEventListener('click', () => this.purchase());
    this.root.querySelector('.out')!.addEventListener('click', () => this.leave());
  }

  /** Refreshes prices, owned marks, money and the picked item's details from the live state. */
  private update(): void {
    const s = this.spec;
    if (!s || !this.root.firstChild) return;
    this.root.querySelector('.gs-cash')!.textContent = s.money();
    this.root.querySelectorAll<HTMLElement>('.gs-card').forEach((c, i) => {
      const o = s.offer(s.items[i]);
      c.querySelector('.gs-card-price')!.textContent = o.owned ? 'Owned' : $(o.price);
      c.classList.toggle('owned', o.owned);
    });
    const it = s.items[this.sel], o = s.offer(it);
    this.root.querySelector('.gs-name')!.textContent = it.name;
    this.root.querySelector('.gs-note')!.textContent = [it.group, o.note].filter(Boolean).join(' · ');
    this.root.querySelector('.gs-stats')!.innerHTML = s.details(it);
    const buy = this.root.querySelector<HTMLButtonElement>('.gs-buy')!;
    buy.innerHTML = o.price ? `${o.label} <span>${$(o.price)}</span>` : o.label;
    buy.disabled = !o.can;
    buy.classList.remove('short');
  }
}
