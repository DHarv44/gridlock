// Keyboard + mouse state. Edge-triggered actions latch until the next sim tick consumes them.
import { BTN } from '../../shared/protocol';

export type UiAction = 'interact' | 'chat' | 'map' | 'menu' | 'scoreOn' | 'scoreOff';

export class Input {
  private keys = new Set<string>();
  private edges = 0;
  mouseX = 0;
  mouseY = 0;
  mouseDown = false;
  private clicked = false;
  weaponWish = -1;
  enabled = true;
  onUi: (a: UiAction) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => this.key(e, true));
    window.addEventListener('keyup', (e) => this.key(e, false));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });
    canvas.addEventListener('mousemove', (e) => { this.mouseX = e.clientX; this.mouseY = e.clientY; });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0 && this.enabled) { this.mouseDown = true; this.clicked = true; } });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      this.edges |= e.deltaY > 0 ? BTN.next : BTN.prev;
    }, { passive: true });
  }

  private key(e: KeyboardEvent, down: boolean): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    const k = e.code;
    if (k === 'Tab') { e.preventDefault(); this.onUi(down ? 'scoreOn' : 'scoreOff'); return; }
    if (down && k === 'Escape') { this.onUi('menu'); return; }
    if (!this.enabled) { if (!down) this.keys.delete(k); return; }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    if (down && !e.repeat) {
      switch (k) {
        case 'KeyF': case 'Enter': this.edges |= BTN.enter; break;
        case 'KeyE': this.onUi('interact'); break;
        case 'KeyR': this.edges |= BTN.reload; break;
        case 'KeyQ': this.edges |= BTN.prev; break;
        case 'KeyX': this.edges |= BTN.next; break;
        case 'KeyH': this.edges |= BTN.horn; break;
        case 'KeyT': e.preventDefault(); this.onUi('chat'); return;
        case 'KeyM': this.onUi('map'); break;
      }
      if (k.startsWith('Digit')) this.weaponWish = (Number(k.slice(5)) + 9) % 10;
    }
    if (down) this.keys.add(k); else this.keys.delete(k);
  }

  held(...codes: string[]): boolean {
    return codes.some((c) => this.keys.has(c));
  }

  axis(neg: string[], pos: string[]): number {
    return (this.held(...pos) ? 1 : 0) - (this.held(...neg) ? 1 : 0);
  }

  /** Buttons for this tick (held + latched edges); clears the latch. */
  takeButtons(): number {
    let b = this.edges;
    this.edges = 0;
    if (!this.enabled) return b & ~(BTN.fire);
    // A click shorter than one tick still fires once.
    if (this.mouseDown || this.clicked) b |= BTN.fire;
    this.clicked = false;
    if (this.held('Space')) b |= BTN.handbrake | BTN.up;
    if (this.held('ShiftLeft', 'ShiftRight')) b |= BTN.sprint | BTN.down;
    return b;
  }

  takeWeaponWish(): number {
    const w = this.weaponWish;
    this.weaponWish = -1;
    return w;
  }

  release(): void {
    this.keys.clear();
    this.mouseDown = false;
  }
}
