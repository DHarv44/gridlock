// Esc pane: controls reference, volume, invite link, leave.
import type { Sound } from '../audio/sound';
import type { QualityGovernor } from '../game/quality';
import type { Quality } from '../render/scene';
import type { Pane } from './pane';

const KEYS: [string, string][] = [
  ['WASD', 'Move / drive'], ['Mouse', 'Aim'], ['Left click', 'Shoot'], ['Shift', 'Sprint · descend (heli)'],
  ['Space', 'Handbrake · climb (heli)'], ['F / Enter', 'Get in / out, carjack'], ['E', 'Shop / property'],
  ['R', 'Reload'], ['Q / X / wheel', 'Switch weapon'], ['1–9', 'Pick weapon'], ['H', 'Horn / siren'],
  ['T', 'Chat'], ['M', 'City map'], ['Tab', 'Scores'],
];

const LEVELS: { q: Quality; label: string; sub: string }[] = [
  { q: 'high', label: 'High', sub: 'Sharp shadows, full resolution' },
  { q: 'medium', label: 'Medium', sub: 'Lighter shadows, reduced resolution' },
  { q: 'low', label: 'Low', sub: 'No shadows, lowest resolution' },
];

export function openMenu(pane: Pane, sound: Sound, quality: QualityGovernor, code: string, leave: () => void): void {
  pane.open(() => ({
    title: 'Paused',
    subtitle: `Room ${code} · the game keeps running`,
    html: `
      <div class="field">Volume <input type="range" id="vol" min="0" max="1" step="0.05" value="${sound.level}"></div>
      <div class="group">Invite friends</div>
      <div class="field"><span>${location.origin}/#${code}</span></div>
      <div class="group">Controls</div>
      <div class="keys">${KEYS.map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join('')}</div>
      <div class="group">&nbsp;</div>`,
    rows: [
      ...LEVELS.map((l) => ({
        name: `${l.label}${quality.current === l.q ? '  ✓' : ''}`, sub: l.sub, group: 'Graphics',
        onClick: () => quality.choose(l.q),
      })),
      { name: 'Copy invite link', group: 'Game', onClick: () => { void navigator.clipboard?.writeText(`${location.origin}/#${code}`); } },
      { name: 'Resume', group: 'Game', onClick: () => pane.close() },
      { name: 'Leave game', group: 'Game', onClick: leave },
    ],
  }));
  const vol = pane.el.querySelector<HTMLInputElement>('#vol');
  vol?.addEventListener('input', () => sound.setVolume(Number(vol.value)));
}
