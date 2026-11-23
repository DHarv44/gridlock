// Esc → Controls: tabs for Keyboard / Mouse (two key slots per action) and Controller (one button
// per action, plus the fixed stick and trigger layout). Click a slot, then press the new key or button.
import { type Action, ACTIONS, keyName, MAX_KEYS } from '../game/controls';
import { PAD_ACTIONS, PAD_AXES, padButtonName, type PadAction } from '../game/gamepad';
import type { Input } from '../game/input';
import type { Pane, PaneRow } from './pane';

type Tab = 'keys' | 'pad';
const CLEAR = new Set(['Backspace', 'Delete']);

export function openControls(pane: Pane, input: Input, back: () => void, tab: Tab = input.pad.active ? 'pad' : 'keys'): void {
  let waitKey: { a: Action; slot: number } | null = null;
  let waitPad: PadAction | null = null;
  const stop = () => { waitKey = null; waitPad = null; input.capture = null; input.pad.capture = null; };
  const goBack = () => { stop(); back(); };
  const show = (t: Tab) => { stop(); tab = t; pane.refresh(); };

  const listenKey = (a: Action, slot: number) => {
    stop();
    waitKey = { a, slot };
    input.capture = (code) => {
      if (code !== 'Escape') input.bindings.setSlot(a, slot, CLEAR.has(code) ? '' : code);
      stop();
      pane.refresh();
    };
    pane.refresh();
  };

  const listenPad = (a: PadAction) => {
    stop();
    waitPad = a;
    input.pad.capture = (b) => { input.pad.bind(a, b); stop(); pane.refresh(); };
    // The keyboard can still cancel (Esc) or unbind (Delete) while waiting.
    const keyCancel = (code: string) => {
      if (CLEAR.has(code)) input.pad.bind(a, -1);
      else if (code !== 'Escape') { input.capture = keyCancel; return; }
      stop();
      pane.refresh();
    };
    input.capture = keyCancel;
    pane.refresh();
  };

  const keyRows = (): PaneRow[] => ACTIONS.map((def) => ({
    name: def.label,
    group: def.group,
    slots: input.bindings.slots(def.id).slice(0, MAX_KEYS).map((code, i) => {
      const on = waitKey?.a === def.id && waitKey.slot === i;
      return { text: on ? 'press a key…' : code ? keyName(code) : '—', active: on, empty: !code && !on, onClick: () => listenKey(def.id, i) };
    }),
  }));

  const padRows = (): PaneRow[] => [
    ...PAD_ACTIONS.map((def): PaneRow => {
      const b = input.pad.buttonFor(def.id);
      const on = waitPad === def.id;
      return { name: def.label, group: 'Buttons', slots: [{ text: on ? 'press a button…' : padButtonName(b), active: on, empty: b < 0 && !on, onClick: () => listenPad(def.id) }] };
    }),
    ...PAD_AXES.map(([stick, use]): PaneRow => ({ name: use, group: 'Sticks and triggers', price: stick, affordable: true })),
  ];

  pane.onClose = stop;
  pane.open(() => {
    const keys = tab === 'keys';
    const rows = keys ? keyRows() : padRows();
    rows.push(
      { name: keys ? 'Reset keys to defaults' : 'Reset buttons to defaults', group: 'Done', onClick: () => { stop(); if (keys) input.bindings.reset(); else input.pad.reset(); pane.refresh(); } },
      { name: 'Back', group: 'Done', onClick: goBack },
    );
    const subtitle = keys
      ? 'Two keys per action. Delete clears a slot, Esc cancels.'
      : input.pad.connected ? 'Controller connected.' : 'No controller found: plug one in and press any button.';
    return {
      title: 'Controls',
      subtitle,
      wide: true,
      tabs: [
        { label: 'Keyboard / Mouse', active: keys, onClick: () => show('keys') },
        { label: 'Controller', active: !keys, onClick: () => show('pad') },
      ],
      rows,
      back: goBack,
    };
  });
}
