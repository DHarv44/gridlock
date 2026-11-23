// Esc → Controls: control style, then every action with its keys; click a row and press a key or
// mouse button to rebind.
import { type Action, ACTIONS, keyName, type Scheme } from '../game/controls';
import type { Input } from '../game/input';
import type { Pane, PaneRow } from './pane';

const STYLES: { s: Scheme; label: string; sub: string }[] = [
  { s: 'classic', label: 'Classic (GTA2-style)', sub: 'Turn and run where you face, shots auto-aim at whoever is ahead of you' },
  { s: 'mouse', label: 'Mouse aim', sub: 'WASD moves up/down/left/right on screen, you face the cursor, click to shoot' },
];

export function openControls(pane: Pane, input: Input, back: () => void): void {
  let waiting: Action | null = null;
  const listen = (a: Action) => {
    waiting = a;
    pane.refresh();
    input.capture = (code) => {
      waiting = null;
      if (code !== 'Escape') input.bindings.bind(a, code);
      pane.refresh();
    };
  };
  pane.onClose = () => { input.capture = null; };
  pane.open(() => {
    const b = input.bindings;
    const rows: PaneRow[] = STYLES.map((st) => ({
      name: `${st.label}${b.scheme === st.s ? '  ✓' : ''}`, sub: st.sub, group: 'Style',
      onClick: () => { if (b.scheme !== st.s) { b.setScheme(st.s); pane.refresh(); } },
    }));
    for (const def of ACTIONS) {
      if (def.classicOnly && b.scheme !== 'classic') continue;
      const keys = b.keys(def.id);
      rows.push({
        name: def.label,
        group: def.group,
        price: waiting === def.id ? 'press a key…' : keys.length ? keys.map(keyName).join(' / ') : 'unbound',
        affordable: waiting === def.id || keys.length > 0,
        onClick: () => listen(def.id),
      });
    }
    rows.push(
      { name: 'Reset keys to defaults', group: 'Done', onClick: () => { b.reset(); pane.refresh(); } },
      { name: 'Back', group: 'Done', onClick: () => { input.capture = null; back(); } },
    );
    return { title: 'Controls', subtitle: 'Click an action, then press a key or mouse button (Esc cancels). Up to two keys each.', rows };
  });
}
