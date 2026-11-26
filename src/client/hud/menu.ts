// Esc pane: volume, invite link, graphics, controls (rebindable), leave.
import { FELONIES } from '../../shared/packs';
import type { Sound } from '../audio/sound';
import { type Action, keyName } from '../game/controls';
import { PAD_ACTIONS, padAxes, padButtonName, type PadAction } from '../game/gamepad';
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
  [['footUp', 'footLeft', 'footDown', 'footRight'], 'Move'], [['jump'], 'Jump'], [['sprint'], 'Sprint'],
  [['gas', 'brake'], 'Accelerate / brake'], [['steerLeft', 'steerRight'], 'Steer'], [['handbrake'], 'Handbrake'],
  [['fire'], 'Fire / swing (auto-aims ahead)'], [['aim'], 'Aim: hold, then the mouse turns you'],
  [['action'], 'Action: get in/out, carjack, shops, property'], [['prevWeapon', 'nextWeapon'], 'Switch weapon'],
];

export interface MenuDeps { pane: Pane; sound: Sound; quality: QualityGovernor; input: Input; code: string; record: () => Record<string, number>; leave: () => void }

/** The felony record, in CRIMES pack order; crimes never committed are left out. */
function recordHtml(record: Record<string, number>): string {
  const rows = FELONIES.filter((f) => record[f.kind]).map((f) => `<kbd>${record[f.kind]}</kbd><span>${f.label}</span>`);
  return rows.length ? `<div class="keys">${rows.join('')}</div>` : '<div class="field">Clean record</div>';
}

function keySummary(input: Input): string {
  const keysOf = (acts: Action[]) => acts.map((a) => keyName(input.bindings.keys(a)[0] ?? '—')).join(' / ');
  return SUMMARY.map(([a, label]) => `<kbd>${keysOf(a)}</kbd><span>${label}</span>`).join('') + '<kbd>1–9 · wheel</kbd><span>Pick weapon</span>';
}

function padSummary(input: Input): string {
  const btn = PAD_ACTIONS.filter((p) => SUMMARY_PAD.includes(p.id)).map((p) => [padButtonName(input.pad.buttonFor(p.id)), p.label]);
  const sticks = padAxes().filter((a) => a.group === 'On foot' || a.group === 'Car').map((a) => [a.input, `${a.use} (${a.group.toLowerCase()})`]);
  return [...sticks, ...btn].map(([k, label]) => `<kbd>${k}</kbd><span>${label}</span>`).join('');
}
const SUMMARY_PAD: PadAction[] = ['action', 'jump', 'sprint', 'handbrake', 'fire', 'prevWeapon', 'nextWeapon'];

/** A 1–100 volume slider with its number. */
const slider = (id: string, label: string, value: number) =>
  `<div class="field volume"><span>${label}</span><input type="range" id="${id}" min="1" max="100" step="1" value="${value}"><b id="${id}-n">${value}</b></div>`;

export function openMenu(d: MenuDeps): void {
  const { pane, sound, quality, input, code } = d;
  // Values as of opening: putting the live value in the markup would re-render the pane (and
  // drop the slider out from under the pointer) on every move. The numbers update in place.
  const game = sound.gamePercent, music = sound.musicPercent;
  pane.open(() => ({
    title: 'Paused',
    subtitle: `Room ${code} · the game keeps running`,
    html: `
      <div class="group">Volume</div>
      ${slider('vol-game', 'Game', game)}
      ${slider('vol-music', 'Music', music)}
      <div class="group">Felony record</div>
      ${recordHtml(d.record())}
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
    if (t.id === 'vol-game') sound.setGame(Number(t.value));
    else if (t.id === 'vol-music') sound.setMusic(Number(t.value));
    else return;
    const n = pane.el.querySelector(`#${t.id}-n`);
    if (n) n.textContent = t.value;
  };
}
