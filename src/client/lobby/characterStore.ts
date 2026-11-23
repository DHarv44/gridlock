// The player's characters, kept in this browser's local storage: looks, cash, cars, record,
// respect. Taken along when joining a game; the server sends progress back to save here.
import { type CharacterProgress, type CharacterSave, cleanLook, cleanName, MAX_CHARACTERS, RULES } from '../../shared/packs';

const KEY = 'gridlock.characters.v1';

export function loadCharacters(): CharacterSave[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(raw) ? (raw as CharacterSave[]).filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string') : [];
  } catch {
    return [];
  }
}

function store(list: CharacterSave[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* full or blocked: nothing we can do */ }
}

/** Makes a new character, or returns why it can't. */
export function createCharacter(rawName: string, look: unknown): CharacterSave | string {
  const name = cleanName(rawName);
  if (!name) return 'Names need 2–16 letters or digits.';
  const list = loadCharacters();
  if (list.length >= MAX_CHARACTERS) return `You already have ${MAX_CHARACTERS} characters. Delete one first.`;
  if (list.some((c) => c.name.toLowerCase() === name.toLowerCase())) return 'You already have a character with that name.';
  const now = Date.now();
  const id = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const c: CharacterSave = { id, name, look: cleanLook(look), created: now, lastPlayed: now, cash: RULES.startCash, garage: [], felonies: {}, deaths: 0, respect: {} };
  store([c, ...list]);
  return c;
}

export function deleteCharacter(id: string): void {
  store(loadCharacters().filter((c) => c.id !== id));
}

/** Saves progress the server sent for a character. */
export function saveProgress(id: string, p: CharacterProgress): void {
  const list = loadCharacters();
  const c = list.find((x) => x.id === id);
  if (!c) return; // deleted meanwhile
  Object.assign(c, { cash: p.cash, garage: p.garage, felonies: p.felonies, deaths: p.deaths, respect: p.respect, lastPlayed: Date.now() });
  // No spot while dead or busted: keep the last good one.
  if (p.last) c.last = p.last;
  store(list);
}
