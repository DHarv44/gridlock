// Player actions and their key bindings. Defaults follow the classic top-down layout:
// arrow keys turn and move relative to facing, Ctrl fires straight ahead, Enter gets in/out.

export type Action =
  | 'forward' | 'back' | 'left' | 'right' | 'fire' | 'enter' | 'handbrake' | 'sprint' | 'climb' | 'descend'
  | 'prevWeapon' | 'nextWeapon' | 'reload' | 'interact' | 'horn' | 'turretLeft' | 'turretRight'
  | 'chat' | 'map' | 'scores';

export type ActionKind = 'held' | 'edge' | 'ui';

export interface ActionDef { id: Action; label: string; kind: ActionKind; group: string; keys: string[] }

export const ACTIONS: ActionDef[] = [
  { id: 'forward', label: 'Forward / accelerate', kind: 'held', group: 'Movement', keys: ['ArrowUp'] },
  { id: 'back', label: 'Back / brake, reverse', kind: 'held', group: 'Movement', keys: ['ArrowDown'] },
  { id: 'left', label: 'Turn / steer left', kind: 'held', group: 'Movement', keys: ['ArrowLeft'] },
  { id: 'right', label: 'Turn / steer right', kind: 'held', group: 'Movement', keys: ['ArrowRight'] },
  { id: 'sprint', label: 'Sprint', kind: 'held', group: 'Movement', keys: ['ShiftLeft'] },
  { id: 'handbrake', label: 'Handbrake', kind: 'held', group: 'Vehicles', keys: ['Space'] },
  { id: 'enter', label: 'Get in / out', kind: 'edge', group: 'Vehicles', keys: ['Enter'] },
  { id: 'horn', label: 'Horn / siren', kind: 'edge', group: 'Vehicles', keys: ['KeyH'] },
  { id: 'climb', label: 'Helicopter climb', kind: 'held', group: 'Vehicles', keys: ['Space'] },
  { id: 'descend', label: 'Helicopter descend', kind: 'held', group: 'Vehicles', keys: ['ShiftLeft'] },
  { id: 'turretLeft', label: 'Turret left', kind: 'held', group: 'Vehicles', keys: ['KeyA'] },
  { id: 'turretRight', label: 'Turret right', kind: 'held', group: 'Vehicles', keys: ['KeyD'] },
  { id: 'fire', label: 'Fire', kind: 'held', group: 'Weapons', keys: ['ControlLeft', 'ControlRight'] },
  { id: 'prevWeapon', label: 'Previous weapon', kind: 'edge', group: 'Weapons', keys: ['KeyZ'] },
  { id: 'nextWeapon', label: 'Next weapon', kind: 'edge', group: 'Weapons', keys: ['KeyX'] },
  { id: 'reload', label: 'Reload', kind: 'edge', group: 'Weapons', keys: ['KeyR'] },
  { id: 'interact', label: 'Shop / property', kind: 'ui', group: 'Other', keys: ['KeyE'] },
  { id: 'chat', label: 'Chat', kind: 'ui', group: 'Other', keys: ['KeyT'] },
  { id: 'map', label: 'City map', kind: 'ui', group: 'Other', keys: ['KeyM'] },
  { id: 'scores', label: 'Scores (hold)', kind: 'ui', group: 'Other', keys: ['Tab'] },
];

const STORE = 'gridlock.keys.v1';
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
  private map = new Map<Action, string[]>();
  private byKey = new Map<string, Action[]>();

  constructor() {
    this.reset(false);
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Record<string, string[]> | null;
      if (saved) for (const a of ACTIONS) if (Array.isArray(saved[a.id])) this.map.set(a.id, saved[a.id].slice(0, MAX_KEYS));
    } catch { /* corrupt or unavailable storage: defaults */ }
    this.index();
  }

  keys(a: Action): string[] {
    return this.map.get(a) ?? [];
  }

  actionsFor(code: string): Action[] {
    return this.byKey.get(code) ?? [];
  }

  /** Binds `code` to `a` (replacing its oldest key if full). Movement/vehicle twins may share keys;
   *  any other action already using the key loses it. */
  bind(a: Action, code: string): void {
    for (const def of ACTIONS) {
      if (def.id === a || sharable(def.id, a)) continue;
      this.map.set(def.id, this.keys(def.id).filter((k) => k !== code));
    }
    const cur = this.keys(a).filter((k) => k !== code);
    this.map.set(a, [code, ...cur].slice(0, MAX_KEYS));
    this.save();
  }

  clear(a: Action): void {
    this.map.set(a, []);
    this.save();
  }

  reset(persist = true): void {
    for (const a of ACTIONS) this.map.set(a.id, [...a.keys]);
    if (persist) this.save();
    else this.index();
  }

  private save(): void {
    this.index();
    try { localStorage.setItem(STORE, JSON.stringify(Object.fromEntries(this.map))); } catch { /* ignore */ }
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
