// Esc pane: volume, invite link, graphics, controls (rebindable), leave.
import type { Sound } from '../audio/sound';
import { type Action, keyName } from '../game/controls';
import { PAD_ACTIONS, PAD_AXES, padButtonName, type PadAction } from '../game/gamepad';
import type { Input } from '../game/input';
import type { QualityGovernor } from '../game/quality';
import type { Quality } from '../render/scene';
import { openControls } from './controlsPane';
import type { Pane } from './pane';

const LEVELS: { q: Quality; label: string; sub: string }[] = [
  { q: 'high', label: 'High', sub: 'Sharp shadows, full resolution' },
  { q: 'medium', label: 'Medium', sub: 'Lighter shadows, reduced resolution' },
  { q: 'low', label: 'Low', sub: 'No shadows, lowest resolution' },
];

const SUMMARY: [Action[], string][] = [
  [['forward', 'back'], 'Run / drive'], [['left', 'right'], 'Turn / steer'], [['fire'], 'Fire (auto-aims ahead)'], [['jump'], 'Jump'],
  [['action'], 'Action: get in/out, carjack, shops, property'], [['handbrake'], 'Handbrake'],
  [['prevWeapon', 'nextWeapon'], 'Switch weapon'],
];

export interface MenuDeps { pane: Pane; sound: Sound; quality: QualityGovernor; input: Input; code: string; leave: () => void }

function keySummary(input: Input): string {
  const keysOf = (acts: Action[]) => acts.map((a) => keyName(input.bindings.keys(a)[0] ?? '—')).join(' / ');
  return SUMMARY.map(([a, label]) => `<kbd>${keysOf(a)}</kbd><span>${label}</span>`).join('') + '<kbd>1–9 · wheel</kbd><span>Pick weapon</span>';
}

function padSummary(input: Input): string {
  const btn = PAD_ACTIONS.filter((p) => SUMMARY_PAD.includes(p.id)).map((p) => [padButtonName(input.pad.buttonFor(p.id)), p.label]);
  return [...PAD_AXES, ...btn].map(([k, label]) => `<kbd>${k}</kbd><span>${label}</span>`).join('');
}
const SUMMARY_PAD: PadAction[] = ['action', 'jump', 'sprint', 'fire', 'prevWeapon', 'nextWeapon'];

export function openMenu(d: MenuDeps): void {
  const { pane, sound, quality, input, code } = d;
  pane.open(() => ({
    title: 'Paused',
    subtitle: `Room ${code} · the game keeps running`,
    html: `
      <div class="field">Volume <input type="range" id="vol" min="0" max="1" step="0.05" value="${sound.level}"></div>
      <div class="group">Invite friends</div>
      <div class="field"><span>${location.origin}/#${code}</span></div>
      <div class="group">Controls</div>
      <div class="keys">${input.pad.active ? padSummary(input) : keySummary(input)}</div>`,
    rows: [
      { name: 'Change controls…', sub: 'Keyboard, mouse and controller', group: 'Controls', onClick: () => openControls(pane, input, () => openMenu(d)) },
      ...LEVELS.map((l) => ({
        name: `${l.label}${quality.current === l.q ? '  ✓' : ''}`, sub: l.sub, group: 'Graphics',
        onClick: () => quality.choose(l.q),
      })),
      { name: 'Copy invite link', group: 'Game', onClick: () => { void navigator.clipboard?.writeText(`${location.origin}/#${code}`); } },
      { name: 'Resume', group: 'Game', onClick: () => pane.close() },
      { name: 'Leave game', group: 'Game', onClick: d.leave },
    ],
  }));
  // Delegated so it survives the pane re-rendering.
  pane.el.oninput = (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'vol') sound.setVolume(Number(t.value));
  };
}
