// Esc → Controls: every action with its keys; click a row and press a key or mouse button to rebind.
import { type Action, ACTIONS, keyName } from '../game/controls';
import type { Input } from '../game/input';
import type { Pane, PaneRow } from './pane';

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
    const rows: PaneRow[] = ACTIONS.map((def) => {
      const keys = input.bindings.keys(def.id);
      return {
        name: def.label,
        group: def.group,
        price: waiting === def.id ? 'press a key…' : keys.length ? keys.map(keyName).join(' / ') : 'unbound',
        affordable: waiting === def.id || keys.length > 0,
        onClick: () => listen(def.id),
      };
    });
    rows.push(
      { name: 'Reset to classic defaults', group: 'Done', onClick: () => { input.bindings.reset(); pane.refresh(); } },
      { name: 'Back', group: 'Done', onClick: () => { input.capture = null; back(); } },
    );
    return {
      title: 'Controls',
      subtitle: 'Click an action, then press a key or mouse button. Esc cancels. Each action keeps up to two keys.',
      rows,
    };
  });
}
