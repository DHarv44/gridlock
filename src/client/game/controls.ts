// Player actions and their key bindings, for two control styles:
//  - 'mouse' (default): WASD moves in screen directions, the mouse aims, left click fires.
//  - 'classic': arrows turn and move relative to facing, Ctrl fires straight ahead.

export type Scheme = 'mouse' | 'classic';

export type Action =
  | 'forward' | 'back' | 'left' | 'right' | 'fire' | 'enter' | 'handbrake' | 'sprint' | 'climb' | 'descend'
  | 'prevWeapon' | 'nextWeapon' | 'reload' | 'interact' | 'horn' | 'turretLeft' | 'turretRight'
  | 'chat' | 'map' | 'scores';

export type ActionKind = 'held' | 'edge' | 'ui';

export interface ActionDef {
  id: Action;
  label: string;
  kind: ActionKind;
  group: string;
  mouse: string[];
  classic: string[];
  classicOnly?: boolean;
}

export const ACTIONS: ActionDef[] = [
  { id: 'forward', label: 'Up / accelerate', kind: 'held', group: 'Movement', mouse: ['KeyW', 'ArrowUp'], classic: ['ArrowUp'] },
  { id: 'back', label: 'Down / brake, reverse', kind: 'held', group: 'Movement', mouse: ['KeyS', 'ArrowDown'], classic: ['ArrowDown'] },
  { id: 'left', label: 'Left / steer left', kind: 'held', group: 'Movement', mouse: ['KeyA', 'ArrowLeft'], classic: ['ArrowLeft'] },
  { id: 'right', label: 'Right / steer right', kind: 'held', group: 'Movement', mouse: ['KeyD', 'ArrowRight'], classic: ['ArrowRight'] },
  { id: 'sprint', label: 'Sprint', kind: 'held', group: 'Movement', mouse: ['ShiftLeft'], classic: ['ShiftLeft'] },
  { id: 'fire', label: 'Fire', kind: 'held', group: 'Weapons', mouse: ['Mouse0'], classic: ['ControlLeft', 'ControlRight'] },
  { id: 'reload', label: 'Reload', kind: 'edge', group: 'Weapons', mouse: ['KeyR'], classic: ['KeyR'] },
  { id: 'prevWeapon', label: 'Previous weapon', kind: 'edge', group: 'Weapons', mouse: ['KeyQ'], classic: ['KeyZ'] },
  { id: 'nextWeapon', label: 'Next weapon', kind: 'edge', group: 'Weapons', mouse: ['KeyX'], classic: ['KeyX'] },
  { id: 'enter', label: 'Get in / out', kind: 'edge', group: 'Vehicles', mouse: ['KeyF', 'Enter'], classic: ['Enter'] },
  { id: 'handbrake', label: 'Handbrake', kind: 'held', group: 'Vehicles', mouse: ['Space'], classic: ['Space'] },
  { id: 'horn', label: 'Horn / siren', kind: 'edge', group: 'Vehicles', mouse: ['KeyH'], classic: ['KeyH'] },
  { id: 'climb', label: 'Helicopter climb', kind: 'held', group: 'Vehicles', mouse: ['Space'], classic: ['Space'] },
  { id: 'descend', label: 'Helicopter descend', kind: 'held', group: 'Vehicles', mouse: ['ShiftLeft'], classic: ['ShiftLeft'] },
  { id: 'turretLeft', label: 'Turret left', kind: 'held', group: 'Vehicles', mouse: [], classic: ['KeyA'], classicOnly: true },
  { id: 'turretRight', label: 'Turret right', kind: 'held', group: 'Vehicles', mouse: [], classic: ['KeyD'], classicOnly: true },
  { id: 'interact', label: 'Shop / property', kind: 'ui', group: 'Other', mouse: ['KeyE'], classic: ['KeyE'] },
  { id: 'chat', label: 'Chat', kind: 'ui', group: 'Other', mouse: ['KeyT'], classic: ['KeyT'] },
  { id: 'map', label: 'City map', kind: 'ui', group: 'Other', mouse: ['KeyM'], classic: ['KeyM'] },
  { id: 'scores', label: 'Scores (hold)', kind: 'ui', group: 'Other', mouse: ['Tab'], classic: ['Tab'] },
];

const STORE = 'gridlock.controls.v2';
const MAX_KEYS = 2;

/** Readable name for a key code or mouse button. */
export function keyName(code: string): string {
  if (code.startsWith('Mouse')) return ['Left click', 'Middle click', 'Right click', 'Mouse 4', 'Mouse 5'][Number(code.slice(5))] ?? code;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return `${code.slice(5)} arrow`;
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  const named: Record<string, string> = {
    ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl', ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift',
    AltLeft: 'Left Alt', AltRight: 'Right Alt', Space: 'Space', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace',
  };
  return named[code] ?? code;
}

export class Bindings {
  scheme: Scheme = 'mouse';
  private map = new Map<Action, string[]>();
  private byKey = new Map<string, Action[]>();

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null') as { scheme: Scheme; keys: Record<string, string[]> } | null;
      if (saved?.scheme === 'mouse' || saved?.scheme === 'classic') this.scheme = saved.scheme;
      this.defaults();
      if (saved) for (const a of ACTIONS) if (Array.isArray(saved.keys?.[a.id])) this.map.set(a.id, saved.keys[a.id].slice(0, MAX_KEYS));
    } catch { this.defaults(); }
    this.index();
  }

  keys(a: Action): string[] {
    return this.map.get(a) ?? [];
  }

  actionsFor(code: string): Action[] {
    return this.byKey.get(code) ?? [];
  }

  /** Binds `code` to `a` (dropping its oldest key if full). Twins that never apply at the same
   *  time may share a key; any other action using the key loses it. */
  bind(a: Action, code: string): void {
    for (const def of ACTIONS) {
      if (def.id === a || sharable(def.id, a)) continue;
      this.map.set(def.id, this.keys(def.id).filter((k) => k !== code));
    }
    const cur = this.keys(a).filter((k) => k !== code);
    this.map.set(a, [code, ...cur].slice(0, MAX_KEYS));
    this.save();
  }

  /** Switching style restores that style's default keys. */
  setScheme(s: Scheme): void {
    this.scheme = s;
    this.reset();
  }

  reset(): void {
    this.defaults();
    this.save();
  }

  private defaults(): void {
    for (const a of ACTIONS) this.map.set(a.id, [...a[this.scheme]]);
  }

  private save(): void {
    this.index();
    try { localStorage.setItem(STORE, JSON.stringify({ scheme: this.scheme, keys: Object.fromEntries(this.map) })); } catch { /* ignore */ }
  }

  private index(): void {
    this.byKey.clear();
    for (const [a, keys] of this.map) {
      for (const k of keys) {
        const list = this.byKey.get(k) ?? [];
        list.push(a);
        this.byKey.set(k, list);
      }
    }
  }
}

/** Pairs that never apply at the same time, so one key may serve both. */
const SHARED: [Action, Action][] = [['handbrake', 'climb'], ['sprint', 'descend']];
const sharable = (a: Action, b: Action) => SHARED.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
