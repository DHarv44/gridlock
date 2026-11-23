// In-game HUD (DOM overlay): money, wanted stars, health/armour, weapon, radar, feeds, chat.
import { VEHICLES, WEAPONS } from '../../shared/packs';
import { Mode, type PlayerInfo, type YouState } from '../../shared/protocol';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', parent?: HTMLElement): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  parent?.appendChild(e);
  return e;
};

export class Hud {
  readonly root: HTMLElement;
  readonly radar: HTMLCanvasElement;
  private clock: HTMLElement;
  private cash: HTMLElement;
  private stars: HTMLElement;
  private weapon: HTMLElement;
  private ammo: HTMLElement;
  private veh: HTMLElement;
  private hp: HTMLElement;
  private ar: HTMLElement;
  private feed: HTMLElement;
  private note: HTMLElement;
  private chat: HTMLElement;
  private chatInput: HTMLInputElement | null = null;
  private prompt: HTMLElement;
  private big: HTMLElement;
  private score: HTMLElement;
  readonly bigmap: HTMLElement;
  readonly bigmapCanvas: HTMLCanvasElement;
  private shownCash = 0;
  onChat: (text: string) => void = () => {};

  constructor() {
    this.root = document.getElementById('hud')!;
    this.root.innerHTML = '';
    const tr = el('div', 'hud-tr', this.root);
    this.clock = el('div', 'hud-clock', tr);
    this.cash = el('div', 'hud-cash', tr);
    this.stars = el('div', 'hud-stars', tr);
    for (let i = 0; i < 5; i++) el('i', '', this.stars).textContent = '★';
    const br = el('div', 'hud-br', this.root);
    this.weapon = el('div', 'hud-weapon', br);
    this.ammo = el('div', 'hud-ammo', br);
    this.veh = el('div', 'hud-veh', br);
    const bl = el('div', 'hud-bl', this.root);
    const mapWrap = el('div', 'hud-map', bl);
    this.radar = el('canvas', '', mapWrap);
    this.radar.width = this.radar.height = 220;
    const bars = el('div', 'bars', bl);
    const hpBar = el('div', 'bar hp', bars); this.hp = el('div', '', hpBar);
    const arBar = el('div', 'bar ar', bars); this.ar = el('div', '', arBar);
    this.feed = el('div', 'hud-feed', this.root);
    this.note = el('div', 'hud-note', this.root);
    this.chat = el('div', 'hud-chat', this.root);
    this.prompt = el('div', 'hud-prompt', this.root);
    this.prompt.hidden = true;
    this.big = el('div', 'hud-big', this.root);
    this.big.hidden = true;
    this.score = el('div', 'hud-score', this.root);
    this.score.hidden = true;
    this.bigmap = el('div', 'hud-bigmap', this.root);
    this.bigmap.hidden = true;
    this.bigmapCanvas = el('canvas', '', this.bigmap);
    this.root.hidden = false;
  }

  update(you: YouState, gameMinutes: number, seen: boolean): void {
    const h = Math.floor(gameMinutes / 60) % 24, m = Math.floor(gameMinutes % 60);
    this.clock.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    this.shownCash += (you.cash - this.shownCash) * 0.2;
    if (Math.abs(you.cash - this.shownCash) < 1) this.shownCash = you.cash;
    this.cash.textContent = `$${Math.round(this.shownCash).toLocaleString('en-US')}`;
    [...this.stars.children].forEach((s, i) => s.classList.toggle('on', i < you.wl));
    this.stars.classList.toggle('flash', you.wl > 0 && seen);
    this.hp.style.width = `${Math.max(0, Math.min(100, you.hp))}%`;
    this.ar.style.width = `${Math.max(0, Math.min(100, you.ar))}%`;
    (this.ar.parentElement as HTMLElement).style.visibility = you.ar > 0 ? 'visible' : 'hidden';
    const held = you.w[you.wi];
    const vt = you.vt >= 0 ? VEHICLES[you.vt] : null;
    const mounted = vt?.weapons?.length && you.mode === Mode.Driver;
    if (mounted) {
      this.weapon.textContent = vt!.name;
      this.ammo.innerHTML = '';
    } else if (held) {
      const spec = WEAPONS[held[0]];
      this.weapon.textContent = spec.name;
      this.ammo.innerHTML = spec.clip === 0 ? '' : you.rl > 0 ? '<small>reloading…</small>' : `${held[2]} <small>/ ${held[1]}</small>`;
    }
    if (vt) {
      this.veh.innerHTML = `${vt.name}<div class="bar veh"><div style="width:${Math.round(you.vhp * 100)}%"></div></div>`;
    } else this.veh.innerHTML = '';
    if (you.mode === Mode.Dead) { this.big.hidden = false; this.big.className = 'hud-big wasted'; this.big.textContent = 'WASTED'; }
    else if (you.mode === Mode.Busted) { this.big.hidden = false; this.big.className = 'hud-big busted'; this.big.textContent = 'BUSTED'; }
    else this.big.hidden = true;
  }

  feedLine(text: string, kind: string): void {
    const d = el('div', kind, this.feed);
    d.textContent = text;
    setTimeout(() => d.remove(), 7000);
    while (this.feed.children.length > 6) this.feed.firstElementChild?.remove();
  }

  notify(text: string, kind: string): void {
    const d = el('div', kind, this.note);
    d.textContent = text;
    setTimeout(() => d.remove(), 3500);
    while (this.note.children.length > 3) this.note.firstElementChild?.remove();
  }

  chatLine(text: string): void {
    const d = el('div', 'line', this.chat);
    d.textContent = text;
    if (this.chatInput) this.chat.appendChild(this.chatInput);
    setTimeout(() => d.remove(), 12000);
    while (this.chat.querySelectorAll('.line').length > 8) this.chat.querySelector('.line')?.remove();
  }

  /** Opens the chat input; resolves when closed. */
  openChat(onDone: () => void): void {
    if (this.chatInput) return;
    const input = el('input', '', this.chat);
    input.maxLength = 160;
    input.placeholder = 'Say something…';
    this.chatInput = input;
    setTimeout(() => input.focus(), 0);
    const close = (send: boolean) => {
      if (send && input.value.trim()) this.onChat(input.value.trim());
      input.remove();
      this.chatInput = null;
      onDone();
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') close(true);
      if (e.key === 'Escape') close(false);
    });
    input.addEventListener('blur', () => { if (this.chatInput === input) close(false); });
  }

  setPrompt(text: string | null): void {
    this.prompt.hidden = !text;
    if (text) this.prompt.innerHTML = `<kbd>E</kbd>${text}`;
  }

  showScore(on: boolean, players: PlayerInfo[], code: string): void {
    this.score.hidden = !on;
    if (!on) return;
    const rows = [...players].sort((a, b) => b.cash - a.cash).map((p) =>
      `<tr><td><span class="sw" style="background:${p.color}"></span>${esc(p.name)}</td><td>$${p.cash.toLocaleString('en-US')}</td><td>${p.kills}</td><td>${p.deaths}</td><td>${'★'.repeat(p.wl)}</td><td>${p.ping}ms</td></tr>`).join('');
    this.score.innerHTML = `<table><tr><th>Player</th><th>Cash</th><th>Kills</th><th>Deaths</th><th>Wanted</th><th>Ping</th></tr>${rows}</table><div class="code">Room code <b>${code}</b> · ${location.origin}/#${code}</div>`;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
