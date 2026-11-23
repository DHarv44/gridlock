// Entry: lobby screen (name, create/join, open rooms), then hands the connection to the game.
import type { RoomListing } from '../shared/protocol';
import { Game } from './game/game';
import { Connection } from './net/connection';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const nameInput = $<HTMLInputElement>('name');
const codeInput = $<HTMLInputElement>('code');
const errorEl = $('lobby-error');
const lobby = $('lobby');
const loading = $('loading');

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

nameInput.value = store.get('gridlock.name') ?? '';
const hashCode = location.hash.replace('#', '').toUpperCase();
if (/^[A-Z]{4}$/.test(hashCode)) codeInput.value = hashCode;
(nameInput.value ? codeInput : nameInput).focus();

let busy = false;

function start(create: boolean, room: string): void {
  const name = nameInput.value.trim();
  if (!name) { errorEl.textContent = 'Pick a name first.'; nameInput.focus(); return; }
  if (!create && !/^[A-Z]{4}$/.test(room)) { errorEl.textContent = 'Room codes are 4 letters.'; codeInput.focus(); return; }
  if (busy) return;
  busy = true;
  errorEl.textContent = '';
  store.set('gridlock.name', name);
  const conn = new Connection(name, room, create);
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
        loading.hidden = true;
      }, 30);
    }
  });
}

$('create').addEventListener('click', () => start(true, ''));
$('join').addEventListener('click', () => start(false, codeInput.value.trim().toUpperCase()));
codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') start(false, codeInput.value.trim().toUpperCase()); });
nameInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (/^[A-Z]{4}$/i.test(codeInput.value)) start(false, codeInput.value.toUpperCase()); else start(true, '');
});

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
// ?play=Name joins the room in the hash straight away (or creates one).
const auto = new URLSearchParams(location.search).get('play');
if (auto) {
  nameInput.value = auto;
  if (/^[A-Z]{4}$/.test(codeInput.value)) start(false, codeInput.value); else start(true, '');
}
void refreshRooms();
setInterval(() => void refreshRooms(), 3000);
