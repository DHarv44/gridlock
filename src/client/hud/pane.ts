// A left-side slide-in pane with a list of actionable rows.

export interface PaneRow {
  name: string;
  sub?: string;
  price?: string;
  affordable?: boolean;
  disabled?: boolean;
  group?: string;
  onClick?: () => void;
}

export interface PaneContent {
  title: string;
  subtitle?: string;
  rows: PaneRow[];
  footer?: string;
  html?: string;
}

export class Pane {
  readonly el: HTMLElement;
  private renderFn: (() => PaneContent) | null = null;
  private sig = '';
  onClose: () => void = () => {};

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'pane';
    document.body.appendChild(this.el);
  }

  get isOpen(): boolean {
    return this.el.classList.contains('open');
  }

  open(render: () => PaneContent): void {
    this.renderFn = render;
    this.sig = '';
    this.refresh();
    this.el.classList.add('open');
  }

  close(): void {
    if (!this.isOpen) return;
    this.el.classList.remove('open');
    this.renderFn = null;
    this.onClose();
  }

  /** Re-renders only when the content actually changed (keeps clicks/hover stable). */
  refresh(): void {
    if (!this.renderFn) return;
    const c = this.renderFn();
    const sig = JSON.stringify(c, (k, v) => (typeof v === 'function' ? undefined : v));
    if (sig === this.sig) return;
    this.sig = sig;
    this.el.innerHTML = '';
    const header = document.createElement('header');
    header.innerHTML = `<h2></h2>${c.subtitle ? '<p></p>' : ''}`;
    header.querySelector('h2')!.textContent = c.title;
    if (c.subtitle) header.querySelector('p')!.textContent = c.subtitle;
    this.el.appendChild(header);
    const list = document.createElement('div');
    list.className = 'list';
    if (c.html) list.innerHTML = c.html;
    let group = '';
    for (const r of c.rows) {
      if (r.group && r.group !== group) {
        group = r.group;
        const g = document.createElement('div');
        g.className = 'group';
        g.textContent = group;
        list.appendChild(g);
      }
      const row = document.createElement('div');
      row.className = `item${r.disabled ? ' disabled' : ''}`;
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
      if (r.onClick && !r.disabled) row.addEventListener('click', r.onClick);
      list.appendChild(row);
    }
    this.el.appendChild(list);
    if (c.footer) {
      const f = document.createElement('footer');
      f.textContent = c.footer;
      this.el.appendChild(f);
    }
  }
}
