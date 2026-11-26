// Characters live in the players' browsers (local storage) and come along when they join. The
// server only checks what it's handed is sane before playing it, and sends progress back.
import { CALLERS, type CharacterLast, type CharacterProgress, type CharacterSave, CRIMES, cleanLook, cleanName, GANGS, PALETTE, UNIVERSE_ID, VEHICLES } from '../shared/packs';
import { MAP_SIZE } from '../shared/world/cityTypes';
import type { Player } from './game/entities';

const MAX_CASH = 1_000_000_000;
const MAX_CARS = 60;

const int = (v: unknown, lo: number, hi: number, dflt = 0): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
};

/** Counts keyed by known ids only, each clamped. */
function tally(raw: unknown, keys: readonly string[], lo: number, hi: number): Record<string, number> {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const k of keys) if (src[k] !== undefined) out[k] = int(src[k], lo, hi);
  return out;
}

/** A character from a browser, made safe to play; null if it isn't a character at all. */
export function sanitizeCharacter(raw: unknown): CharacterSave | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const name = cleanName(c.name);
  const id = String(c.id ?? '').replace(/[^\w-]/g, '').slice(0, 40);
  if (!name || !id || c.universe !== UNIVERSE_ID) return null; // another universe's character
  // Unknown vehicle types are dropped, not clamped (clamping would hand out a real car).
  const garage = (Array.isArray(c.garage) ? c.garage : []).map(Number)
    .filter((v) => Number.isInteger(v) && v >= 0 && v < VEHICLES.length).slice(0, MAX_CARS);
  return {
    id, universe: UNIVERSE_ID, name, look: cleanLook(c.look),
    created: int(c.created, 0, 8.64e15), lastPlayed: int(c.lastPlayed, 0, 8.64e15),
    cash: int(c.cash, 0, MAX_CASH), bank: int(c.bank, 0, MAX_CASH), garage,
    felonies: tally(c.felonies, Object.keys(CRIMES), 0, 1_000_000),
    deaths: int(c.deaths, 0, 1_000_000),
    respect: tally(c.respect, GANGS, -100, 100),
    met: (Array.isArray(c.met) ? c.met : []).map(String).filter((id) => CALLERS.some((k) => k.id === id)),
    ...(cleanLast(c.last) ? { last: cleanLast(c.last)! } : {}),
  };
}

/** A saved last spot: a real room code, a point in the city, a real vehicle type and paint. */
function cleanLast(raw: unknown): CharacterLast | null {
  if (!raw || typeof raw !== 'object') return null;
  const l = raw as Record<string, unknown>;
  const room = String(l.room ?? '');
  const x = Number(l.x), y = Number(l.y), angle = Number(l.angle);
  if (!/^[A-Z]{4}$/.test(room) || ![x, y, angle].every(Number.isFinite) || x < 0 || y < 0 || x > MAP_SIZE || y > MAP_SIZE) return null;
  const v = l.vehicle as { type?: unknown; color?: unknown } | undefined;
  const type = Number(v?.type), color = Number(v?.color);
  const vehicle = v && Number.isInteger(type) && type >= 0 && type < VEHICLES.length
    ? { type, color: Number.isInteger(color) && color >= 0 && color < PALETTE.length ? color : 0 } : undefined;
  return { room, x, y, angle, ...(vehicle ? { vehicle } : {}) };
}

/** What the player's browser should save now. */
export const progressOf = (pl: Player): CharacterProgress =>
  ({ cash: pl.cash, bank: pl.bank, garage: [...pl.garage], felonies: { ...pl.felonies }, deaths: pl.deaths, respect: { ...pl.respect }, met: [...pl.met] });
