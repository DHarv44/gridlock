// Gamepad (browser standard mapping): analog sticks and triggers, rebindable buttons, edge detection.
// No package: the Gamepad API is polled once per frame.

export const PAD_BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'Left stick click', 'Right stick click', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right'];
export const padButtonName = (i: number): string => (i < 0 ? 'unbound' : PAD_BUTTONS[i] ?? `Button ${i}`);

/** Raw button indices used to drive menus (fixed, so menus always work). */
export const PAD = { a: 0, b: 1, up: 12, down: 13, left: 14, right: 15 } as const;

export type PadAction = 'fire' | 'action' | 'jump' | 'sprint' | 'prevWeapon' | 'nextWeapon' | 'horn' | 'map' | 'scores' | 'menu';

/** Button actions with their default buttons. Sticks and triggers are fixed (see PAD_AXES). */
export const PAD_ACTIONS: { id: PadAction; label: string; button: number }[] = [
  { id: 'fire', label: 'Fire', button: 5 },
  { id: 'action', label: 'Action: get in/out, shops, properties', button: 3 },
  { id: 'jump', label: 'Jump · handbrake · helicopter climb', button: 0 },
  { id: 'sprint', label: 'Sprint · helicopter descend', button: 1 },
  { id: 'prevWeapon', label: 'Previous weapon', button: 14 },
  { id: 'nextWeapon', label: 'Next weapon', button: 15 },
  { id: 'horn', label: 'Horn / siren', button: 10 },
  { id: 'map', label: 'City map', button: 8 },
  { id: 'scores', label: 'Scores (hold)', button: 13 },
  { id: 'menu', label: 'Pause menu', button: 9 },
];

export const PAD_AXES: [string, string][] = [
  ['Left stick', 'Move on foot (any direction, push further to run) · steer'],
  ['Right stick', 'Aim on foot · tank turret'],
  ['RT', 'Accelerate · fire on foot'],
  ['LT', 'Brake / reverse'],
];

const STORE = 'gridlock.pad.v1';
const DEAD = 0.16;

/** Radial deadzone rescaled to 0..1 so small stick motions still move smoothly. */
function stick(x: number, y: number): [number, number] {
  const m = Math.hypot(x, y);
  if (m < DEAD) return [0, 0];
  const k = Math.min(1, (m - DEAD) / (1 - DEAD)) / m;
  return [x * k, y * k];
}

const trigger = (v: number) => (v < 0.06 ? 0 : Math.min(1, (v - 0.06) / 0.9));

export class Pad {
  connected = false;
  /** The controller was the last thing touched (cleared by keyboard use). */
  active = false;
  lx = 0; ly = 0; rx = 0; ry = 0; lt = 0; rt = 0;
  private buttons: boolean[] = [];
  private prev: boolean[] = [];
  private map = new Map<PadAction, number>();
  /** When set, the next button press is handed to this callback instead of the game. */
  capture: ((button: number) => void) | null = null;

  constructor() {
    this.defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Record<string, number> | null;
      if (saved) for (const a of PAD_ACTIONS) if (typeof saved[a.id] === 'number') this.map.set(a.id, saved[a.id]);
    } catch { /* defaults */ }
  }

  buttonFor(a: PadAction): number {
    return this.map.get(a) ?? -1;
  }

  /** Binds a button; any other action on that button loses it. */
  bind(a: PadAction, button: number): void {
    for (const [k, v] of this.map) if (v === button && k !== a) this.map.set(k, -1);
    this.map.set(a, button);
    this.save();
  }

  reset(): void {
    this.defaults();
    this.save();
  }

  private defaults(): void {
    for (const a of PAD_ACTIONS) this.map.set(a.id, a.button);
  }

  private save(): void {
    try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries(this.map))); } catch { /* ignore */ }
  }

  /** Reads the first connected pad; call once per frame. */
  poll(): void {
    const gp = [...(navigator.getGamepads?.() ?? [])].find((p) => p && p.connected) ?? null;
    this.connected = !!gp;
    this.prev = this.buttons;
    if (!gp) { this.buttons = []; this.lx = this.ly = this.rx = this.ry = this.lt = this.rt = 0; return; }
    this.buttons = gp.buttons.map((b) => b.pressed);
    [this.lx, this.ly] = stick(gp.axes[0] ?? 0, gp.axes[1] ?? 0);
    [this.rx, this.ry] = stick(gp.axes[2] ?? 0, gp.axes[3] ?? 0);
    this.lt = trigger(gp.buttons[6]?.value ?? 0);
    this.rt = trigger(gp.buttons[7]?.value ?? 0);
    if (this.buttons.some(Boolean) || this.lx || this.ly || this.rx || this.ry || this.lt || this.rt) this.active = true;
    if (this.capture) {
      const i = this.buttons.findIndex((b, k) => b && !this.prev[k]);
      if (i >= 0) { const cb = this.capture; this.capture = null; cb(i); }
    }
  }

  rawHeld(i: number): boolean { return !!this.buttons[i]; }
  rawPressed(i: number): boolean { return !!this.buttons[i] && !this.prev[i]; }
  rawReleased(i: number): boolean { return !this.buttons[i] && !!this.prev[i]; }

  held(a: PadAction): boolean { return this.rawHeld(this.buttonFor(a)); }
  pressed(a: PadAction): boolean { return this.rawPressed(this.buttonFor(a)); }
  released(a: PadAction): boolean { return this.rawReleased(this.buttonFor(a)); }
}
