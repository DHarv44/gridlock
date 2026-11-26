// Keyboard, mouse buttons and gamepad buttons mapped through rebindable actions. Edge actions latch
// until the next sim tick consumes them; UI actions fire callbacks immediately. Analog sticks and
// triggers are read by Steering straight from `pad`.
import { BTN } from '../../shared/protocol';
import { type Action, ACTIONS, Bindings } from './controls';
import { PAD, Pad, PAD_ACTIONS, type PadAction } from './gamepad';

export type UiAction = 'action' | 'chat' | 'map' | 'menu' | 'radio' | 'scoreOn' | 'scoreOff' | 'phone';
export type NavCmd = 'up' | 'down' | 'left' | 'right' | 'ok' | 'back' | 'zoomIn' | 'zoomOut';

const EDGE_BTN: Partial<Record<Action, number>> = { prevWeapon: BTN.prev, nextWeapon: BTN.next, horn: BTN.horn, call: BTN.call, hitch: BTN.hitch };
const KIND = new Map(ACTIONS.map((a) => [a.id, a.kind]));
const PAD_IDS = new Set<string>(PAD_ACTIONS.map((d) => d.id));
/** With the mouse this close (px) to your character, aiming doesn't turn you. */
const AIM_DEAD = 6;
const NAV: [number, NavCmd][] = [[PAD.up, 'up'], [PAD.down, 'down'], [PAD.left, 'left'], [PAD.right, 'right'], [PAD.a, 'ok'], [PAD.b, 'back'], [PAD.rb, 'zoomIn'], [PAD.lb, 'zoomOut']];

export class Input {
  readonly bindings = new Bindings();
  readonly pad = new Pad();
  /** On foot the right trigger fires (in vehicles it is the gas); set by Steering each tick. */
  triggerFires = true;
  onNav: (c: NavCmd) => void = () => {};
  private navRepeat = -1;
  private down = new Set<string>();
  private edges = 0;
  private pressed = new Set<Action>(); // held actions pressed since the last tick (taps shorter than a tick)
  weaponWish = -1;
  enabled = true;
  /** Set by steering each tick: aiming on purpose (Aim held with the mouse, or the right stick). */
  aimingNow = false;
  /** When set, the next key or mouse button is handed to this callback instead of the game. */
  capture: ((code: string) => void) | null = null;
  onUi: (a: UiAction) => void = () => {};

  /** Mouse aim: while Aim is held, the crosshair is where the mouse is on screen, and you face from
   *  your character (`anchorX/Y`, kept by the HUD each frame) toward it. */
  mouseX = 0;
  mouseY = 0;
  private mouseSeen = false;
  anchorX = 0;
  anchorY = 0;
  private aiming = false;
  /** Current facing, kept by Steering so a new aim starts where you already face. */
  facingHint = 0;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => this.key(e, e.code, true));
    window.addEventListener('keyup', (e) => this.key(e, e.code, false));
    window.addEventListener('blur', () => this.release());
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.mouseSeen = true;
      // Moving the mouse is back on keyboard and mouse (the crosshair shows again).
      if (e.movementX || e.movementY) this.pad.active = false;
    });
    // No pointer over the game: aiming shows the crosshair where the mouse is.
    canvas.style.cursor = 'none';
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
    if (isDown) this.pad.active = false;
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
      if (a === 'aim') { if (isDown && this.enabled) this.startAim(); else if (!isDown) this.stopAim(); continue; }
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
    if (this.bindings.keys(a).some((k) => this.down.has(k))) return true;
    if (this.navMode) return false;
    if (a === 'fire' && this.triggerFires && this.pad.rt > 0.35) return true;
    return PAD_IDS.has(a) && this.pad.held(a as PadAction);
  }

  /** While a menu pane is open the pad drives it instead of the game. */
  private navMode = false;

  /** Polls the controller once per frame: buttons become actions (or menu navigation). */
  /** `callMode`: a call is ringing. The phone takes the D-pad, A and B to pick Answer or Decline
   *  (passed on as nav commands) while the sticks and triggers keep driving. */
  pollPad(dt: number, navMode: boolean, callMode = false): void {
    const pad = this.pad;
    pad.poll();
    this.navMode = navMode;
    pad.taken.clear();
    if (callMode && !navMode && pad.connected) {
      for (const [b, c] of NAV) {
        if (b === PAD.lb || b === PAD.rb) continue;
        pad.taken.add(b);
        if (pad.rawPressed(b)) this.onNav(c);
      }
    }
    const ly = pad.ly;
    // Sticks and triggers don't reach the game while a menu or chat has the controller.
    if (navMode || !this.enabled) pad.lx = pad.ly = pad.rx = pad.ry = pad.lt = pad.rt = 0;
    if (!pad.connected || pad.capture) return;
    if (pad.pressed('menu')) { this.onUi('menu'); return; }
    if (navMode) {
      for (const [b, c] of NAV) if (pad.rawPressed(b)) this.onNav(c);
      // Holding the stick or D-pad scrolls through the list after a short delay.
      const dir = ly < -0.6 || pad.rawHeld(PAD.up) ? 'up' : ly > 0.6 || pad.rawHeld(PAD.down) ? 'down' : null;
      if (!dir) this.navRepeat = -1;
      else if (this.navRepeat < 0) {
        if (!pad.rawPressed(PAD.up) && !pad.rawPressed(PAD.down)) this.onNav(dir);
        this.navRepeat = 0.4;
      } else if ((this.navRepeat -= dt) <= 0) { this.onNav(dir); this.navRepeat = 0.12; }
      return;
    }
    if (pad.pressed('scores')) this.onUi('scoreOn');
    if (pad.released('scores')) this.onUi('scoreOff');
    if (pad.pressed('action')) this.onUi('action');
    if (pad.pressed('map')) this.onUi('map');
    if (pad.pressed('radio')) this.onUi('radio');
    if (pad.pressed('phone')) this.onUi('phone');
    if (!this.enabled) return;
    for (const d of PAD_ACTIONS) {
      if (!pad.pressed(d.id)) continue;
      const kind = KIND.get(d.id as Action);
      if (kind === 'edge') this.edges |= EDGE_BTN[d.id as Action] ?? 0;
      else if (kind === 'held') this.pressed.add(d.id as Action);
    }
  }

  axis(neg: Action, pos: Action): number {
    return (this.held(pos) ? 1 : 0) - (this.held(neg) ? 1 : 0);
  }

  /** Buttons for this tick (held + latched edges); clears the latches. */
  takeButtons(): number {
    let b = this.edges;
    this.edges = 0;
    if (this.held('fire') && !this.fireBlocked) b |= BTN.fire;
    if (this.held('handbrake')) b |= BTN.handbrake;
    if (this.held('climb')) b |= BTN.up;
    if (this.held('jump')) b |= BTN.jump;
    if (this.held('sprint') || this.held('gallop')) b |= BTN.sprint;
    if (this.held('descend')) b |= BTN.down;
    if (this.aimingNow && this.enabled) b |= BTN.aim;
    this.pressed.clear();
    return this.enabled ? b : b & ~BTN.fire;
  }

  /** Queues a get-in/get-out for the next sim tick (the action key decides when). */
  pressEnter(): void {
    if (this.enabled) this.edges |= BTN.enter;
  }

  takeWeaponWish(): number {
    const w = this.weaponWish;
    this.weaponWish = -1;
    return w;
  }

  release(): void {
    this.down.clear();
    this.pressed.clear();
    this.stopAim();
  }

  /** Aim held (with the mouse): the crosshair shows and the camera closes in. */
  get scoped(): boolean { return this.aiming && this.enabled; }

  /** Whether the mouse is in use for the game: it has moved and the controller isn't in hand. */
  get mouseActive(): boolean { return this.mouseSeen && !this.pad.active; }

  /** Where the crosshair goes on screen: the mouse (or, before the mouse has moved at all, a little
   *  way out the way you face). */
  crosshair(): { x: number; y: number } {
    if (this.mouseSeen) return { x: this.mouseX, y: this.mouseY };
    return { x: this.anchorX + Math.cos(this.facingHint) * 140, y: this.anchorY + Math.sin(this.facingHint) * 140 };
  }

  /** Facing chosen with the mouse while Aim is held (from your character toward it), or null. */
  mouseAim(): number | null {
    return this.aiming ? this.mouseDirection() : null;
  }

  /** The way from your character (or your vehicle) to the mouse on screen, aiming or not, while
   *  the mouse is in use; null when it isn't or the mouse is right on you. */
  mouseDirection(): number | null {
    if (!this.enabled || !this.mouseActive) return null;
    const dx = this.mouseX - this.anchorX, dy = this.mouseY - this.anchorY;
    return Math.hypot(dx, dy) < AIM_DEAD ? null : Math.atan2(dy, dx);
  }

  /** Set by steering: you're riding and the mouse is behind you, where you can't shoot (the trigger
   *  does nothing, and the crosshair says so). */
  fireBlocked = false;

  private startAim(): void {
    this.aiming = true;
  }

  private stopAim(): void {
    this.aiming = false;
  }
}
