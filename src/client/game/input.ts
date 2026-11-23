// Keyboard + mouse buttons mapped through rebindable actions. Edge actions latch until the next
// sim tick consumes them; UI actions fire callbacks immediately.
import { BTN } from '../../shared/protocol';
import { type Action, ACTIONS, Bindings } from './controls';

export type UiAction = 'interact' | 'chat' | 'map' | 'menu' | 'scoreOn' | 'scoreOff';

const EDGE_BTN: Partial<Record<Action, number>> = { enter: BTN.enter, reload: BTN.reload, prevWeapon: BTN.prev, nextWeapon: BTN.next, horn: BTN.horn };
const KIND = new Map(ACTIONS.map((a) => [a.id, a.kind]));

export class Input {
  readonly bindings = new Bindings();
  private down = new Set<string>();
  private edges = 0;
  private pressed = new Set<Action>(); // held actions pressed since the last tick (taps shorter than a tick)
  weaponWish = -1;
  enabled = true;
  /** When set, the next key or mouse button is handed to this callback instead of the game. */
  capture: ((code: string) => void) | null = null;
  onUi: (a: UiAction) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => this.key(e, e.code, true));
    window.addEventListener('keyup', (e) => this.key(e, e.code, false));
    window.addEventListener('blur', () => this.release());
    window.addEventListener('mousedown', (e) => {
      if (this.capture) { e.preventDefault(); this.takeCapture(`Mouse${e.button}`); return; }
      if (e.target === canvas) this.press(`Mouse${e.button}`, true);
    });
    window.addEventListener('mouseup', (e) => this.press(`Mouse${e.button}`, false));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      if (this.enabled) this.edges |= e.deltaY > 0 ? BTN.next : BTN.prev;
    }, { passive: true });
  }

  private takeCapture(code: string): void {
    const cb = this.capture!;
    this.capture = null;
    cb(code);
  }

  private key(e: KeyboardEvent, code: string, isDown: boolean): void {
    if (this.capture && isDown) {
      e.preventDefault();
      this.takeCapture(code); // the capturer treats 'Escape' as cancel
      return;
    }
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    if (isDown && code === 'Escape') { this.onUi('menu'); return; }
    const actions = this.bindings.actionsFor(code);
    // Keep the browser from acting on game keys (Ctrl+R reload, Space scroll, Tab focus...).
    if (actions.length || (e.ctrlKey && this.enabled)) e.preventDefault();
    if (isDown && !e.repeat && code.startsWith('Digit') && this.enabled) this.weaponWish = (Number(code.slice(5)) + 9) % 10;
    if (e.repeat) return;
    this.press(code, isDown);
  }

  private press(code: string, isDown: boolean): void {
    if (isDown) this.down.add(code); else this.down.delete(code);
    for (const a of this.bindings.actionsFor(code)) {
      const kind = KIND.get(a);
      if (a === 'scores') { this.onUi(isDown ? 'scoreOn' : 'scoreOff'); continue; }
      if (!isDown) continue;
      if (kind === 'ui') { this.onUi(a as UiAction); continue; }
      if (!this.enabled) continue;
      if (kind === 'edge') this.edges |= EDGE_BTN[a] ?? 0;
      else this.pressed.add(a);
    }
  }

  /** Is the action held (or was it tapped since the last tick)? */
  held(a: Action): boolean {
    if (!this.enabled) return false;
    if (this.pressed.has(a)) return true;
    return this.bindings.keys(a).some((k) => this.down.has(k));
  }

  axis(neg: Action, pos: Action): number {
    return (this.held(pos) ? 1 : 0) - (this.held(neg) ? 1 : 0);
  }

  /** Buttons for this tick (held + latched edges); clears the latches. */
  takeButtons(): number {
    let b = this.edges;
    this.edges = 0;
    if (this.held('fire')) b |= BTN.fire;
    if (this.held('handbrake')) b |= BTN.handbrake;
    if (this.held('climb')) b |= BTN.up;
    if (this.held('sprint')) b |= BTN.sprint;
    if (this.held('descend')) b |= BTN.down;
    this.pressed.clear();
    return this.enabled ? b : b & ~BTN.fire;
  }

  takeWeaponWish(): number {
    const w = this.weaponWish;
    this.weaponWish = -1;
    return w;
  }

  release(): void {
    this.down.clear();
    this.pressed.clear();
  }
}
