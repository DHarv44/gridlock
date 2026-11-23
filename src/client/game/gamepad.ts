// Gamepad (browser standard mapping): analog sticks and triggers, rebindable buttons, edge detection.
// No package: the Gamepad API is polled once per frame.

const DPAD = ['D-pad up', 'D-pad down', 'D-pad left', 'D-pad right'];
const XBOX = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'Left stick click', 'Right stick click', ...DPAD, 'Guide'];
const PLAYSTATION = ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', ...DPAD, 'PS', 'Touchpad'];
/** Button names follow the pad in use (PlayStation or Xbox-style). */
let names = XBOX;
export const padButtonName = (i: number): string => (i < 0 ? 'unbound' : names[i] ?? `Button ${i}`);

/** Sony's USB vendor id, or the names its pads report. */
const isPlayStation = (id: string) => /054c|dualshock|dualsense|wireless controller/i.test(id);

/** Raw button indices used to drive menus (fixed, so menus always work). */
export const PAD = { a: 0, b: 1, up: 12, down: 13, left: 14, right: 15 } as const;

export type PadAction = 'fire' | 'action' | 'jump' | 'sprint' | 'prevWeapon' | 'nextWeapon' | 'horn' | 'map' | 'scores' | 'menu';

/** Button actions with their default buttons. Sticks and triggers are fixed (see padAxes). */
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

/** The fixed stick and trigger layout, named for the pad in use. */
export const padAxes = (): [string, string][] => [
  ['Left stick', 'Move on foot (any direction, push further to run) · steer'],
  ['Right stick', 'Aim on foot · tank turret'],
  [padButtonName(7), 'Accelerate · fire on foot'],
  [padButtonName(6), 'Brake / reverse'],
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

  /** Name of the pad being read, or '' when none. */
  name = '';

  /** Reads the gamepad in use; call once per frame. Only standard-mapped pads count: flight
   *  sticks, throttles, wheels and headsets also show up as "gamepads" with their own layouts.
   *  With several pads, the most recently used one wins. */
  poll(): void {
    const all = [...(navigator.getGamepads?.() ?? [])].filter((p): p is Gamepad => !!p && p.connected && p.mapping === 'standard');
    const gp = all.sort((a, b) => b.timestamp - a.timestamp)[0] ?? null;
    this.connected = !!gp;
    if (gp && gp.id !== this.name) { this.name = gp.id; names = isPlayStation(gp.id) ? PLAYSTATION : XBOX; }
    if (!gp) this.name = '';
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
