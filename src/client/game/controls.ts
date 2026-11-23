// Player actions and their key bindings. GTA2-style keyboard layout by default (WASD or arrows
// turn and move where you face, Ctrl fires ahead); every action can be rebound. The mouse pointer
// position never matters; mouse buttons can be bound like keys.

export type Action =
  | 'forward' | 'back' | 'left' | 'right' | 'fire' | 'action' | 'handbrake' | 'jump' | 'sprint' | 'climb' | 'descend'
  | 'prevWeapon' | 'nextWeapon' | 'horn' | 'turretLeft' | 'turretRight'
  | 'chat' | 'map' | 'scores';

export type ActionKind = 'held' | 'edge' | 'ui';

export interface ActionDef { id: Action; label: string; kind: ActionKind; group: string; keys: string[] }

export const ACTIONS: ActionDef[] = [
  { id: 'forward', label: 'Forward / accelerate', kind: 'held', group: 'Movement', keys: ['KeyW', 'ArrowUp'] },
  { id: 'back', label: 'Back / brake, reverse', kind: 'held', group: 'Movement', keys: ['KeyS', 'ArrowDown'] },
  { id: 'left', label: 'Turn / steer left', kind: 'held', group: 'Movement', keys: ['KeyA', 'ArrowLeft'] },
  { id: 'right', label: 'Turn / steer right', kind: 'held', group: 'Movement', keys: ['KeyD', 'ArrowRight'] },
  { id: 'jump', label: 'Jump', kind: 'held', group: 'Movement', keys: ['Space'] },
  { id: 'sprint', label: 'Sprint', kind: 'held', group: 'Movement', keys: ['ShiftLeft'] },
  { id: 'fire', label: 'Fire', kind: 'held', group: 'Weapons', keys: ['ControlLeft', 'ControlRight'] },
  { id: 'prevWeapon', label: 'Previous weapon', kind: 'edge', group: 'Weapons', keys: ['KeyZ'] },
  { id: 'nextWeapon', label: 'Next weapon', kind: 'edge', group: 'Weapons', keys: ['KeyX'] },
  { id: 'action', label: 'Action: get in/out, shops, properties', kind: 'ui', group: 'Movement', keys: ['KeyE', 'KeyF'] },
  { id: 'handbrake', label: 'Handbrake', kind: 'held', group: 'Vehicles', keys: ['Space'] },
  { id: 'horn', label: 'Horn / siren', kind: 'edge', group: 'Vehicles', keys: ['KeyH'] },
  { id: 'climb', label: 'Helicopter climb', kind: 'held', group: 'Vehicles', keys: ['Space'] },
  { id: 'descend', label: 'Helicopter descend', kind: 'held', group: 'Vehicles', keys: ['ShiftLeft'] },
  { id: 'turretLeft', label: 'Tank turret left', kind: 'held', group: 'Vehicles', keys: ['Comma'] },
  { id: 'turretRight', label: 'Tank turret right', kind: 'held', group: 'Vehicles', keys: ['Period'] },
  { id: 'chat', label: 'Chat', kind: 'ui', group: 'Other', keys: ['KeyT'] },
  { id: 'map', label: 'City map', kind: 'ui', group: 'Other', keys: ['KeyM'] },
  { id: 'scores', label: 'Scores (hold)', kind: 'ui', group: 'Other', keys: ['Tab'] },
];

// New key: drops settings saved while the old mouse-aim style existed.
const STORE = 'gridlock.controls.v7';
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
    Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']',
  };
  return named[code] ?? code;
}

export class Bindings {
  private map = new Map<Action, string[]>();
  private byKey = new Map<string, Action[]>();

  constructor() {
    this.defaults();
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

  reset(): void {
    this.defaults();
    this.save();
  }

  private defaults(): void {
    for (const a of ACTIONS) this.map.set(a.id, [...a.keys]);
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
const SHARED: [Action, Action][] = [['handbrake', 'climb'], ['jump', 'handbrake'], ['jump', 'climb'], ['sprint', 'descend']];
const sharable = (a: Action, b: Action) => SHARED.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
