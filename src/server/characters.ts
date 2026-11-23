// Character store. A player is identified by a random key their browser keeps; the server only
// stores a hash of it. Each key owns up to MAX_CHARACTERS characters, whose names are unique
// server-wide (property ownership in rooms is by name, so nobody can take a friend's name).
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type CharacterSummary, type CharLook, cleanLook, cleanName, MAX_CHARACTERS, RULES } from '../shared/packs';

export interface SavedCharacter {
  id: string;
  name: string;
  look: CharLook;
  created: number;
  lastPlayed: number;
  cash: number;
  garage: number[];
  felonies: Record<string, number>;
  deaths: number;
  respect: Record<string, number>;
}

interface OwnerFile { version: 1; characters: SavedCharacter[] }

const DIR = join(process.env.GRIDLOCK_DATA ?? join(process.cwd(), 'data'), 'players');
const NAMES = join(DIR, 'names.json');

export const validKey = (key: unknown): key is string => typeof key === 'string' && /^[a-f0-9]{32}$/.test(key);
const owner = (key: string) => createHash('sha256').update(key).digest('hex').slice(0, 32);
const ownerFile = (key: string) => join(DIR, `${owner(key)}.json`);

function readJson<T>(f: string): T | null {
  try { return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as T) : null; } catch (err) {
    console.warn(`[characters] could not read ${f}:`, err);
    return null;
  }
}

function writeJson(f: string, data: unknown): void {
  try {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(`${f}.tmp`, JSON.stringify(data));
    renameSync(`${f}.tmp`, f);
  } catch (err) {
    console.warn(`[characters] could not write ${f}:`, err);
  }
}

function load(key: string): SavedCharacter[] {
  const f = readJson<OwnerFile>(ownerFile(key));
  return f?.version === 1 ? f.characters : [];
}

const store = (key: string, list: SavedCharacter[]) => writeJson(ownerFile(key), { version: 1, characters: list } satisfies OwnerFile);
/** Lower-case name → owner hash. */
const names = (): Record<string, string> => readJson<Record<string, string>>(NAMES) ?? {};

/** Is this name registered to a saved character? (Guests may not use it.) */
export const nameTaken = (name: string): boolean => !!names()[name.toLowerCase()];

export const summary = (c: SavedCharacter): CharacterSummary =>
  ({ id: c.id, name: c.name, look: c.look, cash: c.cash, felonies: c.felonies ?? {}, deaths: c.deaths, cars: c.garage.length, lastPlayed: c.lastPlayed });

export function listCharacters(key: string): CharacterSummary[] {
  return load(key).sort((a, b) => b.lastPlayed - a.lastPlayed).map(summary);
}

export function createCharacter(key: string, rawName: unknown, rawLook: unknown): CharacterSummary | string {
  const name = cleanName(rawName);
  if (!name) return 'Names need 2–16 letters or digits.';
  const list = load(key);
  if (list.length >= MAX_CHARACTERS) return `You already have ${MAX_CHARACTERS} characters. Delete one first.`;
  const taken = names();
  if (taken[name.toLowerCase()]) return 'That name is taken.';
  const now = Date.now();
  const c: SavedCharacter = {
    id: randomBytes(6).toString('hex'), name, look: cleanLook(rawLook), created: now, lastPlayed: now,
    cash: RULES.startCash, garage: [], felonies: {}, deaths: 0, respect: {},
  };
  list.push(c);
  store(key, list);
  taken[name.toLowerCase()] = owner(key);
  writeJson(NAMES, taken);
  return summary(c);
}

export function deleteCharacter(key: string, id: string): boolean {
  const list = load(key);
  const c = list.find((x) => x.id === id);
  if (!c) return false;
  store(key, list.filter((x) => x !== c));
  const taken = names();
  if (taken[c.name.toLowerCase()] === owner(key)) { delete taken[c.name.toLowerCase()]; writeJson(NAMES, taken); }
  return true;
}

export function getCharacter(key: string, id: string): SavedCharacter | null {
  return load(key).find((c) => c.id === id) ?? null;
}

/** Writes a character's progress back (after play). */
export function saveCharacter(key: string, c: SavedCharacter): void {
  const list = load(key);
  const i = list.findIndex((x) => x.id === c.id);
  if (i < 0) return; // deleted meanwhile
  list[i] = c;
  store(key, list);
}
