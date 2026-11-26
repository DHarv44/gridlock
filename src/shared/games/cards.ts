// Playing cards: a card is 0..51 (rank = c % 13, 0 = deuce .. 12 = ace; suit = c / 13), poker hand
// ranking (best five of any number), and names for the table's chat.
import type { Rng } from '../rng';

export type Card = number;
export const rank = (c: Card): number => c % 13;
export const suit = (c: Card): number => Math.floor(c / 13);

const RANKS = '23456789TJQKA';
const SUITS = '♠♥♦♣';
export const cardText = (c: Card): string => `${RANKS[rank(c)] === 'T' ? '10' : RANKS[rank(c)]}${SUITS[suit(c)]}`;
export const isRed = (c: Card): boolean => suit(c) === 1 || suit(c) === 2;

/** A fresh shuffled deck (Fisher-Yates on the room's RNG). */
export function deck(rng: Rng): Card[] {
  const d = Array.from({ length: 52 }, (_, i) => i);
  return rng.shuffle(d);
}

export const HAND_NAMES = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];

/** Score of exactly five cards: higher is better; category in the top digit (base 13^5). */
export function score5(cs: Card[]): number {
  const r = cs.map(rank).sort((a, b) => b - a);
  const flush = cs.every((c) => suit(c) === suit(cs[0]));
  const counts = new Map<number, number>();
  for (const x of r) counts.set(x, (counts.get(x) ?? 0) + 1);
  // Ranks ordered by how many, then by rank: the order kickers are compared in.
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const uniq = [...new Set(r)];
  // Fewer than five (a hold'em hand nobody saw a flop for): just the groups and high cards.
  if (cs.length < 5) {
    const cat = groups[0]?.[1] === 3 ? 3 : groups[0]?.[1] === 2 ? (groups[1]?.[1] === 2 ? 2 : 1) : 0;
    return [cat, ...groups.map((g) => g[0]), 0, 0, 0, 0].slice(0, 6).reduce((acc, k) => acc * 13 + k, 0);
  }
  let straightHigh = -1;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 12 && uniq[1] === 3) straightHigh = 3; // the wheel: A-2-3-4-5
  }
  const pack = (cat: number, ks: number[]) => ks.reduce((acc, k) => acc * 13 + k, cat) * 13 ** (5 - ks.length);
  if (straightHigh >= 0 && flush) return pack(8, [straightHigh]);
  if (groups[0][1] === 4) return pack(7, [groups[0][0], groups[1][0]]);
  if (groups[0][1] === 3 && groups[1][1] === 2) return pack(6, [groups[0][0], groups[1][0]]);
  if (flush) return pack(5, r);
  if (straightHigh >= 0) return pack(4, [straightHigh]);
  if (groups[0][1] === 3) return pack(3, groups.map((g) => g[0]));
  if (groups[0][1] === 2 && groups[1][1] === 2) return pack(2, groups.map((g) => g[0]));
  if (groups[0][1] === 2) return pack(1, groups.map((g) => g[0]));
  return pack(0, r);
}

/** Best five of five to seven cards. */
export function bestScore(cs: Card[]): number {
  if (cs.length <= 5) return score5(cs);
  let best = -1;
  const n = cs.length;
  const pick: Card[] = [];
  const rec = (from: number) => {
    if (pick.length === 5) { const s = score5(pick); if (s > best) best = s; return; }
    for (let i = from; i <= n - (5 - pick.length); i++) { pick.push(cs[i]); rec(i + 1); pick.pop(); }
  };
  rec(0);
  return best;
}

export const handName = (score: number): string => HAND_NAMES[Math.floor(score / 13 ** 5)] ?? 'High card';
