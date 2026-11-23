// The gun shop, built like the paint shop: walking in fades the screen and opens the counter with the
// picked weapon turning large on the left and a card (picture, name, price) for everything on sale on
// the right. Pick with arrows / WASD / D-pad / mouse, buy with Enter / E / A (or click Buy); owned guns
// sell ammo instead. Walk out with Esc / Backspace / B.
import { ARMOR_MODEL, RULES, WEAPONS, type WeaponPart, weaponIndex } from '../../shared/packs';
import type { BuyKind, YouState } from '../../shared/protocol';
import type { NavCmd } from '../game/input';
import { WeaponStage, weaponThumbs } from '../render/weaponStage';

export interface GunShopVisit {
  shop: string;
  stock: string[];                 // weapon ids on sale
  you: () => YouState | null;      // read live: cash, weapons, armour change as you buy
  buy: (kind: BuyKind, id: string) => void;
  close: () => void;
}

interface Item { key: string; name: string; group: string; parts: WeaponPart[]; wi: number }

const COLS = 3;
const FADE_MS = 220;
const GROUPS = ['Melee', 'Pistols', 'SMGs', 'Shotguns', 'Rifles', 'Sniper', 'Heavy', 'Heavy', 'Throwables', 'Launchers'];
const $ = (n: number) => `$${n.toLocaleString('en-US')}`;

export class GunShop {
  private root = document.createElement('div');
  private fade = document.createElement('div');
  private stage: WeaponStage | null = null;
  private visit: GunShopVisit | null = null;
  private items: Item[] = [];
  private sel = 0;
  private busy = false;
  private raf = 0;
  private last = 0;
  private refreshT = 0;
  private keys = (e: KeyboardEvent) => this.onKey(e);

  constructor() {
    this.fade.className = 'screen-fade';
    this.root.className = 'garage gun-shop';
    this.root.hidden = true;
    document.body.append(this.fade, this.root);
  }

  get isOpen(): boolean { return !!this.visit; }

  open(v: GunShopVisit): void {
    if (this.visit) return;
    this.visit = v;
    this.items = [{ key: 'armor', name: 'Body Armor', group: 'Protection', parts: ARMOR_MODEL, wi: -1 }];
    for (const id of v.stock) {
      const wi = weaponIndex(id), w = WEAPONS[wi];
      if (w.model) this.items.push({ key: w.id, name: w.name, group: GROUPS[w.slot] ?? 'Other', parts: w.model, wi });
    }
    this.sel = Math.min(1, this.items.length - 1);
    void this.blackout(() => {
      this.build();
      this.root.hidden = false;
      this.stage = new WeaponStage(this.root.querySelector('canvas')!);
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
    if (!this.visit || this.busy) return;
    const v = this.visit;
    this.busy = true;
    void this.blackout(() => {
      cancelAnimationFrame(this.raf);
      window.removeEventListener('keydown', this.keys, true);
      this.stage?.dispose();
      this.stage = null;
      this.root.hidden = true;
      this.root.innerHTML = '';
      this.visit = null;
      this.busy = false;
      v.close();
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
    if (i < 0 || i >= this.items.length) return;
    this.sel = i;
    const it = this.items[i];
    this.stage?.show(it.key, it.parts);
    this.root.querySelectorAll<HTMLElement>('.gs-card').forEach((c, k) => c.classList.toggle('on', k === i));
    this.root.querySelectorAll<HTMLElement>('.gs-card')[i]?.scrollIntoView({ block: 'nearest' });
    this.update();
  }

  /** What buying the picked item means right now: kind, price, label, and whether it can be done. */
  private offer(it: Item, you: YouState): { kind: BuyKind; price: number; label: string; can: boolean; note: string } {
    if (it.wi < 0) {
      const full = you.ar >= 100;
      return { kind: 'armor', price: RULES.armorPrice, label: full ? 'Armor full' : 'Buy armor', can: !full && you.cash >= RULES.armorPrice, note: `Armor ${Math.round(you.ar)} / 100` };
    }
    const w = WEAPONS[it.wi];
    const owned = you.w.some((h) => h[0] === it.wi);
    if (owned && w.clip === 0) return { kind: 'weapon', price: 0, label: 'Owned', can: false, note: 'You have one' };
    if (owned) return { kind: 'ammo', price: w.ammoPrice, label: `Ammo +${w.ammoBundle}`, can: you.cash >= w.ammoPrice, note: 'Owned' };
    return { kind: 'weapon', price: w.price, label: 'Buy', can: you.cash >= w.price, note: '' };
  }

  private purchase(): void {
    const v = this.visit, you = v?.you(), it = this.items[this.sel];
    if (!v || !you || !it || this.busy) return;
    const o = this.offer(it, you);
    if (!o.can) { this.root.querySelector('.gs-buy')?.classList.add('short'); return; }
    v.buy(o.kind, it.wi < 0 ? '' : it.key);
    this.refreshT = 0.15;
  }

  private build(): void {
    const v = this.visit!;
    this.root.innerHTML = `<div class="garage-box"><canvas class="garage-view"></canvas><div class="garage-side">
      <h2></h2><p class="garage-sub">Guns, ammo and body armor.</p><div class="gs-cash"></div><div class="gs-cards"></div>
      <div class="gs-detail"><div class="gs-name"></div><div class="gs-note"></div><div class="gs-stats"></div></div>
      <div class="garage-actions"><button class="primary gs-buy"></button><button class="out">Walk out</button></div></div></div>`;
    this.root.querySelector('h2')!.textContent = v.shop;
    const thumbs = weaponThumbs(this.items.map((i) => ({ key: i.key, parts: i.parts })));
    const cards = this.root.querySelector('.gs-cards')!;
    this.items.forEach((it, i) => {
      const c = document.createElement('button');
      c.className = 'gs-card';
      c.innerHTML = `<img alt=""><span class="gs-card-name"></span><span class="gs-card-price"></span>`;
      c.querySelector('img')!.src = thumbs.get(it.key) ?? '';
      c.querySelector('.gs-card-name')!.textContent = it.name;
      c.addEventListener('click', () => this.pick(i));
      c.addEventListener('dblclick', () => { this.pick(i); this.purchase(); });
      cards.appendChild(c);
    });
    this.root.querySelector('.gs-buy')!.addEventListener('click', () => this.purchase());
    this.root.querySelector('.out')!.addEventListener('click', () => this.leave());
  }

  /** Refreshes prices, owned marks, cash and the picked item's details from the live state. */
  private update(): void {
    const you = this.visit?.you();
    if (!you || !this.root.firstChild) return;
    this.root.querySelector('.gs-cash')!.textContent = `Cash ${$(you.cash)}`;
    this.root.querySelectorAll<HTMLElement>('.gs-card').forEach((c, i) => {
      const o = this.offer(this.items[i], you);
      c.querySelector('.gs-card-price')!.textContent = o.note === 'Owned' || o.note === 'You have one' ? 'Owned' : $(o.price);
      c.classList.toggle('owned', o.note === 'Owned' || o.note === 'You have one');
    });
    const it = this.items[this.sel], o = this.offer(it, you);
    this.root.querySelector('.gs-name')!.textContent = it.name;
    this.root.querySelector('.gs-note')!.textContent = [it.group, o.note].filter(Boolean).join(' · ');
    this.root.querySelector('.gs-stats')!.innerHTML = it.wi < 0 ? '' : stats(it.wi);
    const buy = this.root.querySelector<HTMLButtonElement>('.gs-buy')!;
    buy.innerHTML = o.price ? `${o.label} <span>${$(o.price)}</span>` : o.label;
    buy.disabled = !o.can;
    buy.classList.remove('short');
  }
}

/** Damage, fire rate, range and magazine as bars against the strongest sold weapon. */
function stats(wi: number): string {
  const w = WEAPONS[wi];
  const sold = WEAPONS.filter((x) => x.price > 0);
  const dmg = (x: typeof w) => x.projectile ? x.projectile.blast * 1.2 : x.damage * (x.pellets ?? 1);
  const rows: [string, number, number, string][] = [
    ['Damage', dmg(w), Math.max(...sold.map(dmg)), w.projectile ? 'explosive' : `${w.damage}${w.pellets ? ` ×${w.pellets}` : ''}`],
    ['Fire rate', w.rate, Math.max(...sold.map((x) => x.rate)), `${w.rate}/s`],
    ['Range', w.range, Math.max(...sold.map((x) => x.range)), `${w.range} m`],
  ];
  if (w.clip) rows.push(['Magazine', Math.min(w.clip, 100), 100, `${w.clip}`]);
  return rows.map(([name, v, max, label]) =>
    `<div class="gs-stat"><span>${name}</span><div class="gs-bar"><div style="width:${Math.max(4, Math.min(100, (v / max) * 100)).toFixed(0)}%"></div></div><b>${label}</b></div>`).join('');
}
