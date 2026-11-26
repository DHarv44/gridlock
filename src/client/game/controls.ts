// Player actions and their key bindings: two slots per action, each rebindable. Every action is
// its own setting, grouped by where it applies (on foot, car, helicopter, tank, weapons, general);
// the same key can do different jobs in different groups (Space: jump / handbrake / climb). There
// is no cursor: holding Aim turns mouse motion into a 360° facing; mouse buttons bind like keys.

export type Action =
  | 'footUp' | 'footDown' | 'footLeft' | 'footRight' | 'jump' | 'sprint'
  | 'gas' | 'brake' | 'steerLeft' | 'steerRight' | 'handbrake' | 'horn'
  | 'heliForward' | 'heliBack' | 'heliLeft' | 'heliRight' | 'climb' | 'descend'
  | 'turretLeft' | 'turretRight'
  | 'fire' | 'aim' | 'prevWeapon' | 'nextWeapon'
  | 'action' | 'radio' | 'chat' | 'map' | 'scores' | 'phone' | 'driveMode';

export type ActionKind = 'held' | 'edge' | 'ui';

/** Where an action applies; keys only clash between actions whose contexts overlap. */
export type Context = 'foot' | 'car' | 'air' | 'tank' | 'any';

export interface ActionDef { id: Action; label: string; kind: ActionKind; context: Context; group: string; keys: string[] }

const A = (id: Action, label: string, kind: ActionKind, context: Context, group: string, keys: string[]): ActionDef => ({ id, label, kind, context, group, keys });

export const ACTIONS: ActionDef[] = [
  A('footUp', 'Move up', 'held', 'foot', 'On foot', ['KeyW', 'ArrowUp']),
  A('footDown', 'Move down', 'held', 'foot', 'On foot', ['KeyS', 'ArrowDown']),
  A('footLeft', 'Move left', 'held', 'foot', 'On foot', ['KeyA', 'ArrowLeft']),
  A('footRight', 'Move right', 'held', 'foot', 'On foot', ['KeyD', 'ArrowRight']),
  A('jump', 'Jump', 'held', 'foot', 'On foot', ['Space']),
  A('sprint', 'Sprint', 'held', 'foot', 'On foot', ['ShiftLeft']),
  A('gas', 'Accelerate', 'held', 'car', 'Car', ['KeyW', 'ArrowUp']),
  A('brake', 'Brake / reverse', 'held', 'car', 'Car', ['KeyS', 'ArrowDown']),
  A('steerLeft', 'Steer left', 'held', 'car', 'Car', ['KeyA', 'ArrowLeft']),
  A('steerRight', 'Steer right', 'held', 'car', 'Car', ['KeyD', 'ArrowRight']),
  A('handbrake', 'Handbrake', 'held', 'car', 'Car', ['Space']),
  A('horn', 'Horn / siren', 'edge', 'car', 'Car', ['KeyH']),
  A('driveMode', 'Driving mode: classic / point to drive', 'ui', 'car', 'Car', ['KeyV']),
  A('heliForward', 'Fly forward', 'held', 'air', 'Helicopter', ['KeyW', 'ArrowUp']),
  A('heliBack', 'Fly back', 'held', 'air', 'Helicopter', ['KeyS', 'ArrowDown']),
  A('heliLeft', 'Turn left', 'held', 'air', 'Helicopter', ['KeyA', 'ArrowLeft']),
  A('heliRight', 'Turn right', 'held', 'air', 'Helicopter', ['KeyD', 'ArrowRight']),
  A('climb', 'Climb', 'held', 'air', 'Helicopter', ['Space']),
  A('descend', 'Descend', 'held', 'air', 'Helicopter', ['ShiftLeft']),
  A('turretLeft', 'Turret left', 'held', 'tank', 'Tank', ['Comma']),
  A('turretRight', 'Turret right', 'held', 'tank', 'Tank', ['Period']),
  A('fire', 'Fire / swing', 'held', 'any', 'Weapons', ['Mouse0', 'ControlLeft']),
  A('aim', 'Aim (hold: the mouse turns you)', 'held', 'any', 'Weapons', ['Mouse2']),
  A('prevWeapon', 'Previous weapon', 'edge', 'any', 'Weapons', ['KeyZ']),
  A('nextWeapon', 'Next weapon', 'edge', 'any', 'Weapons', ['KeyX']),
  A('action', 'Action: get in/out, shops, property', 'ui', 'any', 'General', ['KeyE', 'KeyF']),
  A('radio', 'Radio station', 'ui', 'any', 'General', ['KeyR']),
  A('chat', 'Chat', 'ui', 'any', 'General', ['KeyT']),
  A('map', 'City map', 'ui', 'any', 'General', ['KeyM']),
  A('scores', 'Scores (hold)', 'ui', 'any', 'General', ['Tab']),
  A('phone', 'Phone', 'ui', 'any', 'General', ['KeyP']),
];

/** The order groups are shown in (keyboard and controller tabs). */
export const CONTROL_GROUPS = ['On foot', 'Car', 'Helicopter', 'Tank', 'Weapons', 'General'];

/** Do two contexts ever apply at once? (A tank is driven with the car controls.) */
export function overlaps(a: Context, b: Context): boolean {
  if (a === 'any' || b === 'any' || a === b) return true;
  return (a === 'car' && b === 'tank') || (a === 'tank' && b === 'car');
}

// Bumped when defaults change (v9: every action its own setting, grouped by context).
const STORE = 'gridlock.controls.v9';
export const MAX_KEYS = 2;

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

  /** Bound keys (empty slots skipped). */
  keys(a: Action): string[] {
    return this.slots(a).filter(Boolean);
  }

  /** Both slots in order; '' is an empty slot. */
  slots(a: Action): string[] {
    const s = this.map.get(a) ?? [];
    return Array.from({ length: MAX_KEYS }, (_, i) => s[i] ?? '');
  }

  actionsFor(code: string): Action[] {
    return this.byKey.get(code) ?? [];
  }

  /** Puts `code` in one slot of `a` ('' clears it). Actions in other contexts may share the key
   *  (Space can jump on foot and handbrake in a car); ones that could clash lose it. */
  setSlot(a: Action, slot: number, code: string): void {
    if (code) {
      const ctx = ACTIONS.find((d) => d.id === a)!.context;
      for (const def of ACTIONS) {
        if (def.id === a || !overlaps(def.context, ctx)) continue;
        this.map.set(def.id, this.slots(def.id).map((k) => (k === code ? '' : k)));
      }
    }
    const cur = this.slots(a).map((k) => (k === code ? '' : k));
    cur[slot] = code;
    this.map.set(a, cur);
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
        if (!k) continue;
        const list = this.byKey.get(k) ?? [];
        list.push(a);
        this.byKey.set(k, list);
      }
    }
  }
}
