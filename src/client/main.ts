// Entry: lobby screen (character, create/join, open rooms), then hands the connection to the game.
import { MODES } from '../shared/packs';
import type { RoomListing } from '../shared/protocol';
import { Game } from './game/game';
import { CharacterPicker } from './lobby/characters';
import { Connection } from './net/connection';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const codeInput = $<HTMLInputElement>('code');
const errorEl = $('lobby-error');
const lobby = $('lobby');
const loading = $('loading');

const picker = new CharacterPicker($('chars'));
picker.onMode = (creating) => {
  $('play').hidden = creating;
  document.querySelector('.lobby-card')?.classList.toggle('wide', creating);
  errorEl.textContent = '';
};
/** ?play=Name joins as an unsaved guest (dev and testing). */
const guest = new URLSearchParams(location.search).get('play');

// Game mode picker (used when creating a room).
const modeSelect = $<HTMLSelectElement>('mode');
const modeBlurb = $('mode-blurb');
for (const m of MODES) {
  const o = document.createElement('option');
  o.value = m.id;
  o.textContent = m.name;
  modeSelect.appendChild(o);
}
const showBlurb = () => { modeBlurb.textContent = MODES.find((m) => m.id === modeSelect.value)?.blurb ?? ''; };
modeSelect.addEventListener('change', showBlurb);
showBlurb();
const hashCode = location.hash.replace('#', '').toUpperCase();
if (/^[A-Z]{4}$/.test(hashCode)) codeInput.value = hashCode;

let busy = false;

function start(create: boolean, room: string): void {
  const ch = picker.selected;
  const name = guest ?? ch?.name ?? '';
  if (!name) { errorEl.textContent = 'Create a character first.'; return; }
  if (!create && !/^[A-Z]{4}$/.test(room)) { errorEl.textContent = 'Room codes are 4 letters.'; codeInput.focus(); return; }
  if (busy) return;
  busy = true;
  errorEl.textContent = '';
  const conn = new Connection(guest ?? { key: picker.key, char: ch!.id }, room, create, modeSelect.value);
  let started = false;
  conn.onClose = (reason) => {
    busy = false;
    if (started) { alert(reason); location.reload(); return; }
    errorEl.textContent = reason;
  };
  const off = conn.on((m) => {
    if (m.t === 'reject') { errorEl.textContent = m.reason; busy = false; conn.close(); off(); }
    if (m.t === 'welcome') {
      started = true;
      off();
      history.replaceState(null, '', `#${m.room}`);
      lobby.hidden = true;
      loading.hidden = false;
      // Let the loading screen paint before the city builds.
      setTimeout(() => {
        const game = new Game(conn, m.id, name, m.room, m.seed, () => { location.hash = ''; location.reload(); });
        (window as unknown as { __game: Game }).__game = game; // dev/debug hook
        // The loading screen stays up until the first snapshot arrives (Game hides it).
      }, 30);
    }
  });
}

$('create').addEventListener('click', () => start(true, ''));
$('join').addEventListener('click', () => start(false, codeInput.value.trim().toUpperCase()));
codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') start(false, codeInput.value.trim().toUpperCase()); });

async function refreshRooms(): Promise<void> {
  if (lobby.hidden) return;
  try {
    const list = (await (await fetch('/api/rooms')).json()) as RoomListing[];
    const box = $('rooms');
    box.innerHTML = '';
    for (const r of list) {
      const row = document.createElement('div');
      row.className = 'room';
      row.innerHTML = `<div><b></b> <span></span></div>`;
      row.querySelector('b')!.textContent = r.code;
      row.querySelector('span')!.textContent = `${r.players}/${r.max} · ${r.names.join(', ')}`;
      const btn = document.createElement('button');
      btn.textContent = 'Join';
      btn.disabled = r.players >= r.max;
      btn.addEventListener('click', () => start(false, r.code));
      row.appendChild(btn);
      box.appendChild(row);
    }
  } catch { /* server not reachable yet */ }
}
// ?play=Name joins the room in the hash straight away (or creates one) as a guest.
if (guest) {
  if (/^[A-Z]{4}$/.test(codeInput.value)) start(false, codeInput.value); else start(true, '');
}
void refreshRooms();
setInterval(() => void refreshRooms(), 3000);
