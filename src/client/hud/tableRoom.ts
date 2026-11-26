// A card or casino table's screen, built like the shops' counters (hud/showroom.ts): walking up fades
// the screen and opens a box with the table drawn large on the left (tableFelt.ts) and the stakes,
// your money and your moves on the right (cardTable.ts), the main move at the foot like a shop's
// Buy. Pick with arrows / WASD / D-pad / mouse, play with Enter / E / A, get up with Esc /
// Backspace / B. It redraws from the live state (the server's view of the table, your money) and
// only touches the page when something changed, so clicks and hovers aren't lost.
import type { NavCmd } from '../game/input';
import type { TableScreen, TBtn } from './cardTable';
import { type Act, esc } from './tableFelt';
import './tables.css';

export interface TableVisit {
  /** The screen as things stand. */
  screen: (a: Act) => TableScreen;
  /** Get up from the table (the server's told). */
  leave: () => void;
  /** The box is gone. */
  close: () => void;
}

const FADE_MS = 220;

export class TableRoom {
  private root = document.createElement('div');
  private fade = document.createElement('div');
  private visit: TableVisit | null = null;
  private acts: (() => void)[] = [];
  private felt = '';
  private side = '';
  private focus = '';
  private auto = true;
  private busy = false;
  private timer = 0;
  private keys = (e: KeyboardEvent) => this.onKey(e);

  constructor() {
    this.fade.className = 'screen-fade';
    this.root.className = 'garage showroom tableroom';
    this.root.hidden = true;
    this.root.innerHTML = '<div class="garage-box"><div class="tr-view"><div class="tr-felt"></div><div class="tr-log"></div></div><div class="garage-side tr-side"></div></div>';
    // One listener for every button: each carries the index of what it does in this drawing.
    this.root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-a]');
      if (!el || (el as HTMLButtonElement).disabled) return;
      // A click on the side moves the pick there (back to resting on the main move if it was that).
      if (el.closest('.tr-side')) { this.focus = el.dataset.k ?? ''; this.auto = this.focus === 'primary'; }
      this.acts[Number(el.dataset.a)]?.();
      this.refresh();
    });
    document.body.append(this.fade, this.root);
  }

  get isOpen(): boolean { return !!this.visit; }

  open(visit: TableVisit): void {
    if (this.visit) return;
    this.visit = visit;
    this.felt = this.side = this.focus = '';
    this.auto = true;
    void this.blackout(() => {
      this.root.hidden = false;
      this.refresh();
      window.addEventListener('keydown', this.keys, true);
      this.timer = window.setInterval(() => this.refresh(), 250);
    });
  }

  /** Walk away (`tell`: the server hears you get up; not when it put you out itself). */
  leave(tell = true): void {
    const v = this.visit;
    if (!v || this.busy) return;
    this.busy = true;
    if (tell) v.leave();
    void this.blackout(() => {
      window.clearInterval(this.timer);
      window.removeEventListener('keydown', this.keys, true);
      this.root.hidden = true;
      this.visit = null;
      this.busy = false;
      v.close();
    });
  }

  /** Redraws from the live state; only what changed reaches the page. */
  refresh(): void {
    const v = this.visit;
    if (!v || this.root.hidden) return;
    this.acts = [];
    const a: Act = (fn) => { this.acts.push(fn); return `data-a="${this.acts.length - 1}"`; };
    const s = v.screen(a);
    const felt = s.felt;
    const btn = (b: TBtn, cls: string, key: string) =>
      `<button class="${cls}${b.on ? ' on' : ''}" data-k="${esc(key)}" ${a(b.act)}${b.off ? ' disabled' : ''}><span>${esc(b.text)}</span>${b.sub ? `<em>${esc(b.sub)}</em>` : ''}${b.price ? `<b>${esc(b.price)}</b>` : ''}</button>`;
    const groups = s.groups.map((g) => `<div class="tr-group"><div class="tr-gname">${esc(g.name)}</div><div class="tr-btns${g.chips ? ' chips' : ''}">${g.btns.map((b, i) => btn(b, 'tr-btn', `${g.name}/${i}`)).join('')}</div></div>`).join('');
    const side = `<h2>${esc(s.title)}</h2><p class="garage-sub">${esc(s.sub)}</p><div class="gs-cash">${esc(s.money)}</div><div class="tr-groups">${groups}</div>
      <div class="garage-actions">${s.primary ? btn(s.primary, 'primary gs-buy', 'primary') : ''}${btn({ text: 'Leave the table', act: () => this.leave() }, 'out', 'leave')}</div>`;
    if (felt !== this.felt) { this.felt = felt; this.root.querySelector('.tr-felt')!.innerHTML = felt; }
    if (side !== this.side) { this.side = side; this.root.querySelector('.tr-side')!.innerHTML = side; }
    const log = s.log.map((l) => `<div>${esc(l)}</div>`).join('');
    const logEl = this.root.querySelector('.tr-log')!;
    if (logEl.innerHTML !== log) logEl.innerHTML = log;
    this.mark();
  }

  nav(c: NavCmd): void {
    if (c === 'back') { this.leave(); return; }
    const list = this.choices();
    if (!list.length) return;
    let i = Math.max(0, list.findIndex((b) => b.dataset.k === this.focus));
    if (c === 'ok') { list[i]?.click(); return; }
    if (c === 'up' || c === 'left') i = (i - 1 + list.length) % list.length;
    else if (c === 'down' || c === 'right') i = (i + 1) % list.length;
    else return;
    this.focus = list[i].dataset.k ?? '';
    this.auto = false;
    this.mark();
  }

  /** The buttons you can move between (the side's), the main move picked first. */
  private choices(): HTMLButtonElement[] {
    return [...this.root.querySelectorAll<HTMLButtonElement>('.tr-side [data-a]:not([disabled])')];
  }

  private mark(): void {
    const list = this.choices();
    // Unless you've moved the pick yourself it rests on the main move (when there is one to make).
    const main = list.find((b) => b.dataset.k === 'primary')?.dataset.k;
    if (this.auto || !list.some((b) => b.dataset.k === this.focus)) this.focus = main ?? list[0]?.dataset.k ?? '';
    for (const b of this.root.querySelectorAll<HTMLElement>('.tr-side [data-a]')) b.classList.toggle('kf', b.dataset.k === this.focus);
  }

  private onKey(e: KeyboardEvent): void {
    const map: Record<string, NavCmd> = {
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      Enter: 'ok', KeyE: 'ok', Space: 'ok', Backspace: 'back',
    };
    const c = map[e.code];
    if (!c) return;
    e.preventDefault();
    e.stopPropagation();
    if (!e.repeat) this.nav(c);
  }

  private async blackout(during: () => void): Promise<void> {
    this.fade.classList.add('on');
    await new Promise((r) => setTimeout(r, FADE_MS));
    during();
    await new Promise((r) => setTimeout(r, 60));
    this.fade.classList.remove('on');
  }
}
