// What a card or casino table's screen (hud/tableRoom.ts) shows: the table on the left (tableFelt.ts)
// and on the right the stakes, your money and your moves as buttons, the main one at the foot like a
// shop's Buy. Before you sit: the stakes, who can play, the buy-in. The server (systems/cardTables.ts)
// runs the game; this only shows it and sends your moves.
import { FRIENDS, RULES, TABLES } from '../../shared/packs';
import type { TableView, YouState } from '../../shared/protocol';
import { cardText } from '../../shared/games/cards';
import { rouletteName } from '../../shared/games/house';
import type { TableSpot } from '../../shared/world/tables';
import { type Act, joinFelt, money as $, playFelt, RANKS, type TableSend } from './tableFelt';
import { crapsFelt, crapsGroups } from './crapsTable';

export type { TableSend };

export interface TBtn { text: string; sub?: string; price?: string; on?: boolean; off?: boolean; act: () => void }
/** A set of buttons under a heading; `chips`: small ones in a row (bet sizes, ranks, cards). */
export interface TGroup { name: string; btns: TBtn[]; chips?: boolean }
export interface TableScreen { title: string; sub: string; money: string; felt: string; groups: TGroup[]; primary?: TBtn; log: string[] }

/** What you've picked but not sent yet: the chip, a roulette number, hazard's main, a faro rank,
 *  the cards you'll throw in at the draw, your buy-in. */
export const tableUi = { chip: 0, number: 17, main: 7, rank: 12, discard: new Set<number>(), buyIn: 0 };

/** Chip values for a table's stakes: the smallest bet and a few steps up, never over the top. */
function chipValues(lo: number, hi: number): number[] {
  const out = [lo, lo * 5, lo * 25, lo * 100].filter((v) => v <= hi);
  return out.length ? out : [lo];
}
function chipGroup(lo: number, hi: number): TGroup {
  const list = chipValues(lo, hi);
  tableUi.chip = Math.min(tableUi.chip, list.length - 1);
  return { name: 'Your chip', chips: true, btns: list.map((v, i) => ({ text: $(v), on: i === tableUi.chip, act: () => { tableUi.chip = i; } })) };
}
const betOf = (lo: number, hi: number) => chipValues(lo, hi)[tableUi.chip] ?? lo;
const isPoker = (game: string) => game === 'holdem' || game === 'draw' || game === 'stud';
const cashLine = (you: YouState, chips?: number) => [`Cash ${$(you.cash)}`, you.bank > 0 ? `Bank ${$(you.bank)}` : '', chips !== undefined ? `Chips ${$(chips)}` : ''].filter(Boolean).join(' · ');

function stakesOf(spot: TableSpot): string {
  const spec = TABLES[spot.spec];
  if (!isPoker(spec.game)) return spec.prop === 'slots' ? `${$(spec.stakes[0])} to ${$(spec.stakes[1])} a pull` : `Bets ${$(spec.stakes[0])} to ${$(spec.stakes[1])}`;
  return spec.game === 'holdem' ? `Blinds ${$(spec.stakes[0])}/${$(spec.stakes[1])}` : `Ante ${$(spec.stakes[0])}, bets from ${$(spec.stakes[1])}`;
}

/** Before you sit down: the game, its stakes, and whether you can play. */
export function joinScreen(spot: TableSpot, you: YouState, met: (key: string) => boolean, send: TableSend): TableScreen {
  const spec = TABLES[spot.spec];
  const stakes = stakesOf(spot);
  const friend = spot.friend ? FRIENDS.find((f) => f.id === spot.friend) : undefined;
  const note = spot.host === 'gang' ? 'A private game. Invite only.' : friend ? `${friend.name}'s game, when it's on.` : spec.prop === 'slots' ? 'One-armed bandit' : `${spec.players ?? 1} ${spec.players ? 'players' : 'dealer'} at the table`;
  const base = { title: spot.name, sub: stakes, money: cashLine(you), felt: joinFelt(spot, stakes, note), log: [] };
  if (friend && !met(`friend:${friend.id}`)) {
    return { ...base, groups: [], primary: { text: `Say hello to ${friend.name}`, act: () => send({ op: 'meet', table: spot.id }) } };
  }
  const can = you.cash + you.bank;
  if (isPoker(spec.game)) {
    const [lo, hi] = spec.buyIn ?? [spec.stakes[1] * 40, spec.stakes[1] * 100];
    const steps = [lo, Math.round((lo + hi) / 2 / lo) * lo, hi].filter((v, i, a) => a.indexOf(v) === i);
    tableUi.buyIn = Math.min(tableUi.buyIn, steps.length - 1);
    const want = steps[tableUi.buyIn];
    return { ...base, groups: [{ name: 'Buy-in', chips: true, btns: steps.map((v, i) => ({ text: $(v), on: i === tableUi.buyIn, act: () => { tableUi.buyIn = i; } })) }],
      primary: { text: 'Sit down', price: $(want), off: can < want, act: () => send({ op: 'sit', table: spot.id, n: want }) } };
  }
  return { ...base, groups: [], primary: { text: spec.prop === 'slots' ? 'Play this machine' : 'Take a seat', act: () => send({ op: 'sit', table: spot.id }) } };
}

/** At the table. */
export function tableScreen(spot: TableSpot, v: TableView, you: YouState, send: TableSend, a: Act): TableScreen {
  const spec = TABLES[spot.spec];
  const [lo, hi] = spec.stakes;
  const bet = betOf(lo, hi), can = you.cash + you.bank;
  const groups: TGroup[] = [];
  let primary: TBtn | undefined;
  let chips: number | undefined;
  if (v.poker) {
    const p = v.poker;
    chips = v.chips;
    if (p.yourTurn && p.street === 'draw') {
      groups.push({ name: 'Throw in (click your cards)', chips: true, btns: p.seats[0].cards.map((c, i) => ({ text: cardText(c), on: tableUi.discard.has(i), act: () => { if (tableUi.discard.has(i)) tableUi.discard.delete(i); else tableUi.discard.add(i); } })) });
      primary = { text: tableUi.discard.size ? `Draw ${tableUi.discard.size}` : 'Stand pat', act: () => { send({ op: 'draw', k: [...tableUi.discard] }); tableUi.discard.clear(); } };
    } else if (p.yourTurn) {
      const moves: TBtn[] = [{ text: 'Fold', act: () => send({ op: 'fold' }) }];
      if (p.maxTo > p.minTo || (p.maxTo === p.minTo && p.maxTo > 0)) {
        const half = Math.round(p.pot / 2), sizes = [p.minTo, p.minTo + half, p.minTo + p.pot, p.maxTo].map((x) => Math.min(p.maxTo, Math.max(p.minTo, x)));
        const labels = ['Min', '½ pot', 'Pot', 'All in'];
        groups.push({ name: p.toCall ? 'Raise to' : 'Bet', chips: true, btns: sizes.filter((x, i) => sizes.indexOf(x) === i).map((x) => ({ text: labels[sizes.indexOf(x)], sub: $(x), act: () => send({ op: 'raise', n: x }) })) });
      }
      groups.unshift({ name: 'Your move', btns: moves });
      primary = p.toCall ? { text: 'Call', price: $(Math.min(p.toCall, v.chips)), act: () => send({ op: 'call' }) } : { text: 'Check', act: () => send({ op: 'check' }) };
    } else if (p.between && v.chips <= 0) {
      const [blo] = spec.buyIn ?? [spec.stakes[1] * 40];
      primary = { text: 'Buy back in', price: $(blo), off: can < blo, act: () => send({ op: 'rebuy' }) };
    } else primary = { text: p.between ? 'Next hand coming…' : 'Waiting on the others…', off: true, act: () => {} };
    if (v.cheats?.length && RULES.cardCheats) {
      const C: Record<string, string> = { peek: 'Peek at your neighbours', ace: 'Slip in an ace', stack: 'Stack the deck (your deal)' };
      const btns = v.cheats.filter((c) => C[c]).map((c) => ({ text: C[c], act: () => send({ op: 'cheat', s: c }) }));
      if (btns.length) groups.push({ name: 'Cheat · if they see it…', btns });
      if (v.cheats.includes('callout')) {
        const who = p.seats.map((s, k) => ({ s, k })).filter(({ s, k }) => k > 0 && !s.out);
        if (who.length) groups.push({ name: 'Call out a cheat · wrong, and it\'s a gunfight', chips: true, btns: who.map(({ s, k }) => ({ text: s.name, act: () => send({ op: 'callout', n: k }) })) });
      }
    }
  } else if (v.bj) {
    const b = v.bj;
    if (b.phase === 'play') {
      const h = b.hands[b.active];
      const moves: TBtn[] = [{ text: 'Hit', act: () => send({ op: 'hit' }) }];
      if (h?.cards.length === 2) {
        moves.push({ text: 'Double down', price: $(h.bet), off: can < h.bet, act: () => send({ op: 'double' }) });
        const val = (c: number) => Math.min(10, (c % 13) + 2);
        if (v.game === 'blackjack' && b.hands.length === 1 && val(h.cards[0]) === val(h.cards[1])) moves.push({ text: 'Split', price: $(h.bet), off: can < h.bet, act: () => send({ op: 'split' }) });
      }
      groups.push({ name: 'Your move', btns: moves });
      primary = { text: 'Stand', act: () => send({ op: 'stand' }) };
    } else {
      groups.push(chipGroup(lo, hi));
      primary = { text: 'Deal', price: $(bet), off: can < bet, act: () => send({ op: 'deal', n: bet }) };
    }
  } else if (v.roulette) {
    groups.push(chipGroup(lo, hi));
    const on = (text: string, s: string): TBtn => ({ text, act: () => send({ op: 'spin', n: bet, s }) });
    groups.push({ name: 'Even money', chips: true, btns: [on('Red', 'red'), on('Black', 'black'), on('Odd', 'odd'), on('Even', 'even'), on('1–18', 'low'), on('19–36', 'high')] });
    groups.push({ name: 'Dozens · 2 to 1', chips: true, btns: [1, 2, 3].map((k) => on(['1st 12', '2nd 12', '3rd 12'][k - 1], `dozen${k}`)) });
    groups.push({ name: 'Straight up · 35 to 1', chips: true, btns: [
      { text: '−', act: () => { tableUi.number = (tableUi.number + 37) % 38; } },
      { text: rouletteName(tableUi.number), on: true, act: () => {} },
      { text: '+', act: () => { tableUi.number = (tableUi.number + 1) % 38; } },
    ] });
    primary = { text: `Spin on ${rouletteName(tableUi.number)}`, price: $(bet), off: can < bet, act: () => send({ op: 'spin', n: bet, s: 'number', m: tableUi.number }) };
  } else if (v.craps) {
    groups.push(chipGroup(lo, hi));
    const c = crapsGroups(v.craps, you, bet, send);
    groups.push(...c.groups);
    primary = c.primary;
  } else if (v.dice) {
    const d = v.dice;
    if (d.bet) primary = { text: 'Roll', act: () => send({ op: 'roll' }) };
    else {
      groups.push(chipGroup(lo, hi));
      groups.push({ name: 'Your main', chips: true, btns: [5, 6, 7, 8, 9].map((m) => ({ text: String(m), on: tableUi.main === m, act: () => { tableUi.main = m; } })) });
      primary = { text: `Cast · main ${tableUi.main}`, price: $(bet), off: can < bet, act: () => send({ op: 'bet', n: bet, m: tableUi.main }) };
    }
  } else if (v.slots) {
    groups.push(chipGroup(lo, hi));
    primary = { text: 'Pull', price: $(bet), off: can < bet, act: () => send({ op: 'pull', n: bet }) };
  } else if (v.faro) {
    groups.push(chipGroup(lo, hi));
    groups.push({ name: 'Stake a rank', chips: true, btns: RANKS.map((r, i) => ({ text: r, on: tableUi.rank === i, act: () => { tableUi.rank = i; } })) });
    groups.push({ name: 'The layout', btns: [{ text: `Bet on the ${RANKS[tableUi.rank]}`, price: $(bet), off: can < bet, act: () => send({ op: 'bet', n: bet, m: tableUi.rank }) }] });
    primary = { text: 'Deal a turn', act: () => send({ op: 'turn' }) };
  }
  return { title: spot.name, sub: stakesOf(spot), money: cashLine(you, chips), felt: v.craps ? crapsFelt(v.craps, a, bet, send) : playFelt(v, a, tableUi.discard, bet, send), groups, primary, log: v.log.slice(-4) };
}
