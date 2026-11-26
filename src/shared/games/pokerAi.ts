// The poker AI: how strong is my hand against this many opponents (dealt out at random, more times
// the better the player), what does the pot offer, then fold, call, bet, raise or bluff. Skill
// (0..1) sets how well it reads its odds and how tricky it is: a buddy in a garage calls too much
// and never bluffs; a mob game's regulars fold the junk, value-bet, and bluff now and then.
import type { Rng } from '../rng';
import { bestScore, type Card, rank, suit } from './cards';
import { options, pot, type PokerAction, type PokerTable } from './poker';

/** Chance my hand beats the others still in (Monte Carlo over what's unseen). */
export function equity(t: PokerTable, i: number, rng: Rng, iters: number): number {
  const me = t.seats[i];
  const opps = t.seats.filter((s, k) => k !== i && !s.out && !s.folded).length;
  if (!opps) return 1;
  const seen = new Set<Card>([...me.cards, ...t.board]);
  const unseen: Card[] = [];
  for (let c = 0; c < 52; c++) if (!seen.has(c)) unseen.push(c);
  const holdem = t.variant === 'holdem';
  let wins = 0;
  for (let n = 0; n < iters; n++) {
    // A partial shuffle: just the cards this deal needs.
    const need = opps * (holdem ? 2 : 5) + (holdem ? 5 - t.board.length : 0);
    for (let k = 0; k < need; k++) { const j = k + Math.floor(rng.next() * (unseen.length - k)); [unseen[k], unseen[j]] = [unseen[j], unseen[k]]; }
    let p = 0;
    const board = holdem ? [...t.board, ...unseen.slice(opps * 2, opps * 2 + 5 - t.board.length)] : [];
    const mine = bestScore([...me.cards, ...board]);
    let best = true, tie = 0;
    for (let o = 0; o < opps; o++) {
      const hand = holdem ? [unseen[p], unseen[p + 1]] : unseen.slice(p, p + 5);
      p += holdem ? 2 : 5;
      const s = bestScore([...hand, ...board]);
      if (s > mine) { best = false; break; }
      if (s === mine) tie++;
    }
    if (best) wins += tie ? 1 / (tie + 1) : 1;
  }
  return wins / iters;
}

const gauss = (rng: Rng) => (rng.next() + rng.next() + rng.next() - 1.5) / 0.5;

/** The AI's move for seat i. */
export function aiAct(t: PokerTable, i: number, rng: Rng): PokerAction {
  const s = t.seats[i];
  if (t.street === 'draw') return { kind: 'draw', discard: drawChoice(s.cards, s.skill) };
  const o = options(t, i);
  const sk = s.skill;
  const iters = Math.round(60 + sk * 240);
  // What it thinks it has: the sloppier the player, the noisier the read.
  const eq = Math.max(0, Math.min(1, equity(t, i, rng, iters) + gauss(rng) * 0.16 * (1 - sk)));
  const p = pot(t);
  const odds = o.toCall / Math.max(1, p + o.toCall);
  const opps = t.seats.filter((q, k) => k !== i && !q.out && !q.folded).length;
  // How good is "good" against this many: a fair share of the pot, and some.
  const fair = 1 / (opps + 1);
  const strong = fair + (1 - fair) * (0.45 - sk * 0.1);
  const raise = (frac: number): PokerAction => {
    const to = Math.round(t.currentBet + Math.max(o.minTo - t.currentBet, (p + o.toCall) * frac));
    return { kind: 'raise', to: Math.min(o.maxTo, Math.max(o.minTo, to)) };
  };
  // Monsters: bet them (a shark sometimes slow-plays one).
  if (eq > strong + 0.15) {
    if (sk > 0.6 && o.canCheck && rng.chance(0.25)) return { kind: 'check' };
    return raise(0.5 + rng.next() * 0.5 + (eq > 0.85 ? 0.3 : 0));
  }
  if (eq > strong) return o.canCheck || rng.chance(0.4 + sk * 0.2) ? raise(0.4 + rng.next() * 0.3) : { kind: 'call' };
  // Nothing much, checked to: the good ones bluff now and then.
  if (o.canCheck) return rng.chance(0.03 + sk * 0.1) ? raise(0.5) : { kind: 'check' };
  // Pricing a call: a buddy calls far too light; a shark wants the odds.
  const slack = 0.65 + (1 - sk) * 0.6;
  if (eq * slack * (1 + (1 - sk)) > odds) return { kind: 'call' };
  return { kind: 'fold' };
}

/** Five-card draw: which cards to throw in. Keeps made hands; four to a flush; otherwise the pair,
 *  or (a weaker player) the high cards. */
export function drawChoice(cs: Card[], skill: number): number[] {
  const byRank = new Map<number, number[]>();
  cs.forEach((c, k) => byRank.set(rank(c), [...(byRank.get(rank(c)) ?? []), k]));
  const groups = [...byRank.values()].sort((a, b) => b.length - a.length);
  const score = bestScore(cs), cat = Math.floor(score / 13 ** 5);
  if (cat >= 4) return []; // straight or better: stand pat
  const keepK = (ks: number[]) => cs.map((_, k) => k).filter((k) => !ks.includes(k));
  if (groups[0].length >= 2) {
    // Trips, two pair, a pair: keep the sets (a sloppy player keeps an ace kicker too).
    const keep = groups.filter((g) => g.length >= 2).flat();
    if (skill < 0.5 && groups[0].length === 2 && groups.length > 2) {
      const ace = cs.findIndex((c, k) => rank(c) === 12 && !keep.includes(k));
      if (ace >= 0) keep.push(ace);
    }
    return keepK(keep);
  }
  // Four to a flush.
  for (let su = 0; su < 4; su++) {
    const ks = cs.map((c, k) => (suit(c) === su ? k : -1)).filter((k) => k >= 0);
    if (ks.length === 4) return keepK(ks);
  }
  // Nothing: keep the highest card or two.
  // (Four new cards only behind an ace.)
  const order = cs.map((c, k) => [rank(c), k]).sort((a, b) => b[0] - a[0]);
  return keepK(order.slice(0, skill < 0.5 || order[0][0] !== 12 ? 2 : 1).map((x) => x[1]));
}
