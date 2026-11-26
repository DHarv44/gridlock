// Player characters: how many a player may keep and what their look can be made of.
// A look stores indices into these palettes, so changing a colour here restyles everyone using it.
import { HAIR, SKIN } from './peds';

export const MAX_CHARACTERS = 5;

/** This pack set's universe: room saves and characters are tagged with it and only load where it
 *  matches. (Engine phase 2 moves it to the universe manifest as UNIVERSE.id.) */
export const UNIVERSE_ID = 'bayhaven';

export const CHARACTER_LOOKS = {
  skin: SKIN,
  hair: HAIR,
  /** Hair styles: short, long, shaved. */
  hairStyle: ['Short', 'Long', 'Shaved'],
  top: ['#f2f2ee', '#16171a', '#c62a22', '#1f5bff', '#2bb34a', '#e3b30c', '#8a6db0', '#e04e8c', '#d9661b', '#5c7fa3', '#6b5a45', '#9aa5ad'],
  bottom: ['#2c3e57', '#16171a', '#3a3a3a', '#6b5a45', '#e8e2d0', '#25324a', '#7a7466', '#5a1e14'],
  /** Hat colours; index 0 is no hat. */
  hat: ['', '#16171a', '#c62a22', '#1f5bff', '#e8e2d0', '#e3b30c', '#3c3f2e'],
};

/** Parts the creator's random names are rolled from (kept short: names cap at 16 characters). */
export const NAME_PARTS = {
  first: ['Ace', 'Benny', 'Carmen', 'Dax', 'Eddie', 'Frankie', 'Gigi', 'Hector', 'Ivy', 'Jojo', 'Kat', 'Lou', 'Mack', 'Nico',
    'Ozzy', 'Pia', 'Quinn', 'Rocco', 'Sal', 'Tess', 'Vinnie', 'Wren', 'Yuri', 'Zed', 'Remy', 'Lola', 'Marco', 'Dina', 'Tito', 'Bea'],
  last: ['Moretti', 'Kane', 'Vega', 'Doyle', 'Sloane', 'Petrov', 'Reyes', 'Malone', 'Okafor', 'Brandt', 'Falco', 'Quill', 'Hale',
    'Navarro', 'Cruz', 'Byrne', 'Kovac', 'Laine', 'Price', 'Russo', 'Stone', 'Tran', 'Voss', 'Wilde', 'Ziegler', 'Marsh'],
};

export type LookPart = keyof typeof CHARACTER_LOOKS;
export const LOOK_PARTS = Object.keys(CHARACTER_LOOKS) as LookPart[];

/** Indices into CHARACTER_LOOKS, one per part. */
export type CharLook = Record<LookPart, number>;

export const DEFAULT_LOOK: CharLook = { skin: 0, hair: 1, hairStyle: 0, top: 0, bottom: 0, hat: 0 };

/** Clamps untrusted look data to valid palette indices. */
export function cleanLook(raw: unknown): CharLook {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_LOOK };
  for (const k of LOOK_PARTS) {
    const v = Number(src[k]);
    if (Number.isInteger(v) && v >= 0 && v < CHARACTER_LOOKS[k].length) out[k] = v;
  }
  return out;
}

/** Character names: letters, digits, space, - . _ ; 2–16 characters. Empty string if invalid. */
export function cleanName(raw: unknown): string {
  const n = String(raw ?? '').replace(/[^\w \-.]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return n.length >= 2 ? n : '';
}

/** Where a character was when they last played: they pick up there, in that vehicle. */
export interface CharacterLast {
  room: string;              // room code, for "Continue"
  x: number; y: number; angle: number;
  vehicle?: { type: number; color: number };
}

/** What playing changes on a character; the server sends it back for the browser to save. */
export interface CharacterProgress {
  cash: number;
  /** Money in the bank: safe from death and arrest; shops draw on it once cash runs out. */
  bank: number;
  garage: number[];          // vehicle type indexes
  /** Crime kind → times committed. */
  felonies: Record<string, number>;
  deaths: number;
  respect: Record<string, number>;
  /** Callers (packs/calls.ts) who've introduced themselves: their first call isn't repeated. */
  met?: string[];
  last?: CharacterLast;
}

/** A character as the player's browser keeps it (local storage); brought along to every game. */
export interface CharacterSave extends CharacterProgress {
  id: string;
  /** The universe (pack set and city) the character lives in: UNIVERSE_ID. Characters from another
   *  universe aren't listed or let into this one's rooms. */
  universe: string;
  name: string;
  look: CharLook;
  /** Their voice on the phone (packs/calls.ts PLAYER_VOICES); older characters have none yet. */
  voice?: string;
  created: number;
  lastPlayed: number;
}
