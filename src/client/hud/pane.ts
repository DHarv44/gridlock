// A left-side slide-in pane with a list of actionable rows, optional tabs, and rows with several
// clickable slots. A controller drives it with nav(): up/down between rows, left/right between
// tabs or slots, A to activate, B to go back.
import type { NavCmd } from '../game/input';

export interface PaneSlot {
  text: string;
  /** Waiting for input / currently selected. */
  active?: boolean;
  empty?: boolean;
  onClick: () => void;
}

export interface PaneRow {
  name: string;
  sub?: string;
  price?: string;
  affordable?: boolean;
  disabled?: boolean;
  group?: string;
  onClick?: () => void;
  slots?: PaneSlot[];
}

export interface PaneTab { label: string; active: boolean; onClick: () => void }

/** A colour chip in a swatch grid (paint shop). `onHover` previews it. */
export interface PaneSwatch { color: string; label: string; on?: boolean; onClick: () => void; onHover?: (over: boolean) => void }

export interface PaneContent {
  title: string;
  subtitle?: string;
  tabs?: PaneTab[];
  swatches?: PaneSwatch[];
  rows: PaneRow[];
  footer?: string;
  html?: string;
  wide?: boolean;
  /** Controller B / back; defaults to closing the pane. */
  back?: () => void;
}

export class Pane {
  readonly el: HTMLElement;
  private renderFn: (() => PaneContent) | null = null;
  private content: PaneContent | null = null;
  private sig = '';
  /** Focusable elements by row, rebuilt on render. */
  private grid: HTMLElement[][] = [];
  private fr = 0;
  private fc = 0;
  private padFocus = false;
  private fresh = false;
  onClose: () => void = () => {};

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'pane';
    document.body.appendChild(this.el);
    this.el.addEventListener('mousemove', () => { if (this.padFocus) { this.padFocus = false; this.showFocus(); } });
  }

  get isOpen(): boolean {
    return this.el.classList.contains('open');
  }

  open(render: () => PaneContent): void {
    this.renderFn = render;
    this.sig = '';
    this.fr = this.fc = 0;
    this.fresh = true;
    this.refresh();
    this.fresh = false;
    this.el.classList.add('open');
  }

  close(): void {
    if (!this.isOpen) return;
    this.el.classList.remove('open');
    this.renderFn = null;
    this.onClose();
  }

  /** Controller navigation. */
  nav(c: NavCmd): void {
    if (c === 'back') { const b = this.content?.back; if (b) b(); else this.close(); return; }
    if (c === 'zoomIn' || c === 'zoomOut') return;
    if (!this.grid.length) return;
    if (!this.padFocus) { this.padFocus = true; this.showFocus(); return; }
    if (c === 'ok') { this.grid[this.fr]?.[this.fc]?.click(); return; }
    if (c === 'up' || c === 'down') {
      this.fr = (this.fr + (c === 'up' ? -1 : 1) + this.grid.length) % this.grid.length;
      this.fc = Math.min(this.fc, this.grid[this.fr].length - 1);
    } else {
      const n = this.grid[this.fr].length;
      this.fc = Math.max(0, Math.min(n - 1, this.fc + (c === 'left' ? -1 : 1)));
    }
    this.showFocus();
  }

  private showFocus(): void {
    for (const el of this.el.querySelectorAll('.focus')) el.classList.remove('focus');
    if (!this.padFocus) return;
    this.fr = Math.min(this.fr, this.grid.length - 1);
    const row = this.grid[this.fr];
    if (!row) return;
    this.fc = Math.min(this.fc, row.length - 1);
    const el = row[this.fc];
    el.classList.add('focus');
    el.scrollIntoView({ block: 'nearest' });
    this.chips.get(el)?.onHover?.(true);
  }

  /** Re-renders only when the content actually changed (keeps clicks/hover stable). */
  refresh(): void {
    if (!this.renderFn) return;
    const c = this.renderFn();
    this.content = c;
    const sig = JSON.stringify(c, (k, v) => (typeof v === 'function' ? undefined : v));
    if (sig === this.sig) return;
    this.sig = sig;
    this.grid = [];
    this.chips.clear();
    this.el.innerHTML = '';
    this.el.classList.toggle('wide', !!c.wide);
    const header = document.createElement('header');
    header.innerHTML = `<h2></h2>${c.subtitle ? '<p></p>' : ''}`;
    header.querySelector('h2')!.textContent = c.title;
    if (c.subtitle) header.querySelector('p')!.textContent = c.subtitle;
    if (c.tabs) header.appendChild(this.tabs(c.tabs));
    this.el.appendChild(header);
    const list = document.createElement('div');
    list.className = 'list';
    if (c.html) list.innerHTML = c.html;
    if (c.swatches) list.appendChild(this.swatchGrid(c.swatches));
    let group = '';
    for (const r of c.rows) {
      if (r.group && r.group !== group) {
        group = r.group;
        const g = document.createElement('div');
        g.className = 'group';
        g.textContent = group;
        list.appendChild(g);
      }
      list.appendChild(this.row(r));
    }
    this.el.appendChild(list);
    if (c.footer) {
      const f = document.createElement('footer');
      f.textContent = c.footer;
      this.el.appendChild(f);
    }
    this.showFocus();
  }

  private tabs(tabs: PaneTab[]): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'tabs';
    const focusables: HTMLElement[] = [];
    for (const t of tabs) {
      const b = document.createElement('button');
      b.className = `tab${t.active ? ' on' : ''}`;
      b.textContent = t.label;
      b.addEventListener('click', t.onClick);
      bar.appendChild(b);
      focusables.push(b);
    }
    this.grid.push(focusables);
    if (this.fresh) this.fc = Math.max(0, tabs.findIndex((t) => t.active));
    return bar;
  }

  /** Colour chips, 6 per controller-navigation row; focus or hover previews. */
  private swatchGrid(list: PaneSwatch[]): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'swatch-grid';
    let navRow: HTMLElement[] = [];
    list.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = `chip${s.on ? ' on' : ''}`;
      b.style.background = s.color;
      b.title = s.label;
      b.addEventListener('click', s.onClick);
      if (s.onHover) {
        b.addEventListener('mouseenter', () => s.onHover!(true));
        b.addEventListener('mouseleave', () => s.onHover!(false));
        this.chips.set(b, s);
      }
      grid.appendChild(b);
      navRow.push(b);
      if (navRow.length === 6 || i === list.length - 1) { this.grid.push(navRow); navRow = []; }
    });
    return grid;
  }

  /** Swatch chips that preview when the controller focuses them. */
  private chips = new Map<HTMLElement, PaneSwatch>();

  private row(r: PaneRow): HTMLElement {
    const row = document.createElement('div');
    row.className = `item${r.disabled ? ' disabled' : ''}${r.slots ? ' slotted' : ''}`;
    const nm = document.createElement('div');
    nm.className = 'nm';
    nm.textContent = r.name;
    if (r.sub) { const s = document.createElement('small'); s.textContent = r.sub; nm.appendChild(s); }
    row.appendChild(nm);
    if (r.price) {
      const pr = document.createElement('div');
      pr.className = `pr${r.affordable === false ? ' no' : ''}`;
      pr.textContent = r.price;
      row.appendChild(pr);
    }
    if (r.slots) {
      const focusables: HTMLElement[] = [];
      for (const s of r.slots) {
        const b = document.createElement('button');
        b.className = `slot${s.active ? ' on' : ''}${s.empty ? ' empty' : ''}`;
        b.textContent = s.text;
        b.addEventListener('click', s.onClick);
        row.appendChild(b);
        focusables.push(b);
      }
      if (!r.disabled && focusables.length) this.grid.push(focusables);
    } else if (r.onClick && !r.disabled) {
      row.addEventListener('click', r.onClick);
      this.grid.push([row]);
    }
    return row;
  }
}
