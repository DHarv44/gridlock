// Esc pane: controls reference, volume, invite link, leave.
import type { Sound } from '../audio/sound';
import type { Pane } from './pane';

const KEYS: [string, string][] = [
  ['WASD', 'Move / drive'], ['Mouse', 'Aim'], ['Left click', 'Shoot'], ['Shift', 'Sprint · descend (heli)'],
  ['Space', 'Handbrake · climb (heli)'], ['F / Enter', 'Get in / out, carjack'], ['E', 'Shop / property'],
  ['R', 'Reload'], ['Q / X / wheel', 'Switch weapon'], ['1–9', 'Pick weapon'], ['H', 'Horn / siren'],
  ['T', 'Chat'], ['M', 'City map'], ['Tab', 'Scores'],
];

export function openMenu(pane: Pane, sound: Sound, code: string, leave: () => void): void {
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
      { name: 'Copy invite link', onClick: () => { void navigator.clipboard?.writeText(`${location.origin}/#${code}`); } },
      { name: 'Resume', onClick: () => pane.close() },
      { name: 'Leave game', onClick: leave },
    ],
  }));
  const vol = pane.el.querySelector<HTMLInputElement>('#vol');
  vol?.addEventListener('input', () => sound.setVolume(Number(vol.value)));
}
