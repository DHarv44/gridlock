// Your cell phone: slides up at the bottom right like a handset (P / LB). Home has Contacts (gangs
// whose number you have: call to ask for work), Messages (texts) and Bank. A gang calling pops it up
// with Answer / Decline. Arrows + Enter work it, Backspace goes back, P / Esc puts it away; WASD
// still walks you while it's out. The server decides everything (missions/cell.ts).
import { CALLERS, FACTIONS, GANG_CALLERS, GANGS, RESPECT } from '../../shared/packs';
import type { S2C, YouState } from '../../shared/protocol';
import type { NavCmd } from '../game/input';

type Screen = 'home' | 'contacts' | 'messages' | 'read' | 'bank' | 'ring' | 'talk';
interface Text { from: string; body: string; read: boolean; at: string }

const APPS: { id: Screen; label: string; glyph: string }[] = [
  { id: 'contacts', label: 'Contacts', glyph: '☎' },
  { id: 'messages', label: 'Messages', glyph: '✉' },
  { id: 'bank', label: 'Bank', glyph: '$' },
];
/** A caller as the phone shows them: a gang, a person (packs/calls.ts), in their gang's colour. */
const gangOf = (id: string) => Object.entries(GANG_CALLERS).find(([, crew]) => crew.includes(id))?.[0] ?? id;
const gangName = (g: string) => CALLERS.find((c) => c.id === g)?.name ?? FACTIONS.find((f) => f.id === g)?.name ?? g;
const gangColor = (g: string) => FACTIONS.find((f) => f.id === gangOf(g))?.color ?? '#ccc';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const $ = (n: number) => `$${n.toLocaleString('en-US')}`;

export class Phone {
  private root = document.createElement('div');
  private screenEl: HTMLElement;
  private clockEl: HTMLElement;
  private screen: Screen = 'home';
  private sel = 0;
  private texts: Text[] = [];
  private reading = 0;
  private ringing = '';
  private talk = { gang: '', text: '', until: 0 };
  private you: YouState | null = null;
  private clock = '';
  private keys = (e: KeyboardEvent) => this.onKey(e);
  /** Sends answer / decline / dial to the server; `ring` plays the ringtone. */
  send: (m: { t: 'call'; accept: boolean } | { t: 'dial'; gang: string }) => void = () => {};
  ring: () => void = () => {};
  /** A text arrived while the phone was away. */
  onText: (from: string) => void = () => {};
  /** Any text arriving: the chirp. */
  textTone: () => void = () => {};

  constructor(parent: HTMLElement) {
    this.root.className = 'phone';
    this.root.innerHTML = '<div class="ph-bar"><span class="ph-clock"></span><span class="ph-signal"><i></i><i></i><i></i><i></i></span></div><div class="ph-screen"></div><div class="ph-home-bar"></div>';
    this.screenEl = this.root.querySelector('.ph-screen')!;
    this.clockEl = this.root.querySelector('.ph-clock')!;
    this.root.addEventListener('mousedown', (e) => e.stopPropagation());
    parent.appendChild(this.root);
  }

  get isOpen(): boolean { return this.root.classList.contains('open'); }

  /** Whether the phone has the controls: browsing it does. A call ringing or on the line doesn't
   *  (the handset just shows who it is), so you keep driving or walking. */
  get capturing(): boolean { return this.isOpen && this.screen !== 'ring' && this.screen !== 'talk'; }

  /** The phone button: answers a ringing call, otherwise takes the phone out or puts it away. */
  button(): void {
    if (this.ringing && this.screen === 'ring' && this.isOpen) this.answer();
    else this.toggle();
  }

  toggle(): void { if (this.isOpen) this.close(); else this.open('home'); }

  open(s: Screen = 'home'): void {
    if (!this.isOpen) window.addEventListener('keydown', this.keys, true);
    this.root.classList.add('open');
    this.go(s);
  }

  close(): void {
    if (this.ringing) { this.send({ t: 'call', accept: false }); this.ringing = ''; }
    this.root.classList.remove('open');
    window.removeEventListener('keydown', this.keys, true);
  }

  /** Server messages for the phone. */
  onMessage(m: S2C): boolean {
    if (m.t === 'text') {
      this.texts.unshift({ from: m.from, body: m.body, read: false, at: this.clock });
      if (this.texts.length > 40) this.texts.pop();
      this.textTone();
      if (this.isOpen && this.screen === 'messages') this.draw(); else this.onText(m.from);
      return true;
    }
    if (m.t !== 'call') return false;
    if (m.state === 'ring') { this.ringing = m.gang; this.ringT = 0; this.open('ring'); }
    else if (m.state === 'missed') { this.ringing = ''; if (this.screen === 'ring') this.close(); }
    else {
      this.ringing = '';
      if (m.text) { this.talk = { gang: m.gang, text: m.text, until: performance.now() + 3500 }; this.open('talk'); }
      else if (this.screen === 'ring') this.close();
    }
    return true;
  }

  private ringT = 0;

  /** A voiced call on the line (hud/talk.ts): the handset shows who it is while they talk, and goes
   *  away when they're done. */
  line(who: string | null): void {
    if (who) {
      this.ringing = '';
      this.talk = { gang: who, text: 'On the line', until: Infinity };
      this.open('talk');
    } else if (this.isOpen && this.screen === 'talk') this.close();
  }

  /** Every frame: live balances, the clock, the ringtone, and calls winding up. */
  update(dt: number, you: YouState | null, clock: string): void {
    this.you = you;
    if (clock !== this.clock) { this.clock = clock; this.clockEl.textContent = clock; }
    if (this.ringing && (this.ringT -= dt) <= 0) { this.ringT = 3; this.ring(); }
    if (this.screen === 'talk' && this.isOpen && performance.now() > this.talk.until) this.close();
    if (this.isOpen && this.screen === 'bank') this.draw();
  }

  private contacts(): string[] {
    const rs = this.you?.rs ?? [];
    return GANGS.filter((_, i) => (rs[i] ?? 0) >= RESPECT.cellAt);
  }

  private go(s: Screen): void {
    this.screen = s;
    this.sel = 0;
    if (s === 'read') this.texts[this.reading].read = true;
    this.draw();
  }

  private count(): number {
    switch (this.screen) {
      case 'home': return APPS.length;
      case 'contacts': return this.contacts().length;
      case 'messages': return this.texts.length;
      case 'ring': return 2;
      default: return 0;
    }
  }

  nav(c: NavCmd): void {
    const n = this.count();
    if (c === 'zoomOut') { this.close(); return; } // LB: the phone button puts it away
    if (c === 'back') this.back();
    else if (c === 'ok') this.choose();
    else if (n && (c === 'down' || c === 'right')) { this.sel = (this.sel + 1) % n; this.draw(); }
    else if (n && (c === 'up' || c === 'left')) { this.sel = (this.sel - 1 + n) % n; this.draw(); }
  }

  private back(): void {
    if (this.screen === 'ring') { this.decline(); return; }
    if (this.screen === 'read') this.go('messages');
    else if (this.screen === 'home' || this.screen === 'talk') this.close();
    else this.go('home');
  }

  private choose(): void {
    switch (this.screen) {
      case 'home': this.go(APPS[this.sel].id); break;
      case 'contacts': { const g = this.contacts()[this.sel]; if (g) { this.send({ t: 'dial', gang: g }); this.talk = { gang: g, text: 'Calling…', until: performance.now() + 8000 }; this.go('talk'); } break; }
      case 'messages': if (this.texts.length) { this.reading = this.sel; this.go('read'); } break;
      case 'ring': if (this.sel === 0) this.answer(); else this.decline(); break;
      default: this.back();
    }
  }

  private answer(): void {
    this.send({ t: 'call', accept: true });
    this.talk = { gang: this.ringing, text: 'Connecting…', until: performance.now() + 8000 };
    this.ringing = '';
    this.go('talk');
  }

  private decline(): void {
    this.send({ t: 'call', accept: false });
    this.ringing = '';
    this.close();
  }

  private onKey(e: KeyboardEvent): void {
    // A call ringing or on the line leaves every key to the game, except Backspace to decline.
    if (!this.capturing) {
      if (e.code === 'Backspace' && !e.repeat) { e.preventDefault(); e.stopPropagation(); this.back(); }
      return;
    }
    const map: Record<string, NavCmd> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'ok', Backspace: 'back' };
    const c = map[e.code];
    if (!c) return;
    e.preventDefault();
    e.stopPropagation();
    if (!e.repeat) this.nav(c);
  }

  private draw(): void {
    const s = this.screen, sel = this.sel;
    const row = (i: number, html: string, onClick: () => void) => {
      const el = document.createElement('button');
      el.className = `ph-row${i === sel ? ' on' : ''}`;
      el.innerHTML = html;
      el.tabIndex = -1;
      el.addEventListener('click', () => { this.sel = i; onClick(); });
      return el;
    };
    const head = (title: string) => `<div class="ph-title">${esc(title)}</div>`;
    const box = this.screenEl;
    box.innerHTML = '';
    if (s === 'home') {
      const unread = this.texts.filter((t) => !t.read).length;
      box.innerHTML = `<div class="ph-brand">Bayhaven Mobile</div><div class="ph-apps"></div>`;
      const apps = box.querySelector('.ph-apps')!;
      APPS.forEach((a, i) => {
        const b = row(i, `<span class="ph-icon">${a.glyph}${a.id === 'messages' && unread ? `<b class="ph-badge">${unread}</b>` : ''}</span><span>${a.label}</span>`, () => this.choose());
        b.classList.add('ph-app');
        apps.appendChild(b);
      });
    } else if (s === 'contacts') {
      box.innerHTML = head('Contacts');
      const list = this.contacts();
      if (!list.length) box.insertAdjacentHTML('beforeend', '<p class="ph-empty">No numbers yet. Work the payphones for a gang until they trust you with theirs.</p>');
      list.forEach((g, i) => box.appendChild(row(i, `<i class="ph-dot" style="background:${gangColor(g)}"></i><span>${esc(gangName(g))}</span><em>Call</em>`, () => this.choose())));
    } else if (s === 'messages') {
      box.innerHTML = head('Messages');
      if (!this.texts.length) box.insertAdjacentHTML('beforeend', '<p class="ph-empty">No messages.</p>');
      this.texts.forEach((t, i) => box.appendChild(row(i, `<span class="ph-from${t.read ? '' : ' new'}">${esc(t.from)}<small>${esc(t.at)}</small></span><span class="ph-preview">${esc(t.body)}</span>`, () => this.choose())));
    } else if (s === 'read') {
      const t = this.texts[this.reading];
      box.innerHTML = `${head(t.from)}<div class="ph-bubble">${esc(t.body)}</div><div class="ph-hint-time">${esc(t.at)}</div>`;
    } else if (s === 'bank') {
      const y = this.you;
      box.innerHTML = `${head('Harbor Trust')}<div class="ph-balance"><small>Bank balance</small><b>${$(y?.bank ?? 0)}</b></div><div class="ph-balance"><small>Cash on you</small><b>${$(y?.cash ?? 0)}</b></div><p class="ph-empty">Deposit at any ATM or bank. Banked money is safe if you die or get busted.</p>`;
    } else if (s === 'ring') {
      const g = this.ringing;
      box.innerHTML = `<div class="ph-call"><small>Incoming call</small><b style="color:${gangColor(g)}">${esc(gangName(g))}</b></div><div class="ph-call-btns"></div>`;
      const btns = box.querySelector('.ph-call-btns')!;
      btns.append(row(0, 'Answer', () => this.answer()), row(1, 'Decline', () => this.decline()));
      btns.children[0].classList.add('ph-answer');
      btns.children[1].classList.add('ph-decline');
    } else if (s === 'talk') {
      // What's said shows as speech bubbles beside you (hud/talk.ts); the handset shows who.
      const g = this.talk.gang;
      box.innerHTML = `<div class="ph-call"><small>${esc(this.talk.text)}</small><b style="color:${gangColor(g)}">${esc(gangName(g))}</b></div>`;
    }
  }
}
