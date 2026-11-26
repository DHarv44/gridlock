// A card or casino table in the slide-in pane, the same pattern as the shops: the table drawn at the
// top (cards, the wheel, the dice, the reels), the plays as rows below. Before you sit: the stakes,
// who can play, the buy-in. The server (systems/cardTables.ts) runs the game; this only shows it
// and sends your moves.
import { FRIENDS, RULES, TABLES } from '../../shared/packs';
import type { TableView, YouState } from '../../shared/protocol';
import { cardText, isRed } from '../../shared/games/cards';
import { ROULETTE_REDS, rouletteName, SLOT_SYMBOLS } from '../../shared/games/house';
import type { TableSpot } from '../../shared/world/tables';
import type { PaneContent, PaneRow } from './pane';

export type TableSend = (m: { op: string; table?: number; n?: number; m?: number; k?: number[]; s?: string }) => void;

const $ = (n: number) => `$${n.toLocaleString('en-US')}`;
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
const card = (c: number) => (c < 0 ? '<span class="card back"></span>' : `<span class="card${isRed(c) ? ' red' : ''}">${esc(cardText(c))}</span>`);
const cards = (cs: number[]) => `<span class="cards">${cs.map(card).join('')}</span>`;
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/** What you've picked in the pane but not sent yet: the chip, a roulette number, hazard's main, a
 *  faro rank, the cards you'll throw in at the draw, your buy-in. */
export const tableUi = { chip: 0, number: 17, main: 7, rank: 12, discard: new Set<number>(), buyIn: 0 };

/** Chip values for a table's stakes: the smallest bet and a few steps up, never over the top. */
function chips(lo: number, hi: number): number[] {
  const out = [lo, lo * 5, lo * 25, lo * 100].filter((v) => v <= hi);
  return out.length ? out : [lo];
}

function chipRow(lo: number, hi: number): PaneRow {
  const list = chips(lo, hi);
  tableUi.chip = Math.min(tableUi.chip, list.length - 1);
  return { name: 'Bet', group: 'Your bet', slots: list.map((v, i) => ({ text: $(v), active: i === tableUi.chip, onClick: () => { tableUi.chip = i; } })) };
}
const bet = (lo: number, hi: number) => chips(lo, hi)[tableUi.chip] ?? lo;

/** Before you sit down: the game, its stakes, and whether you can play. */
export function joinContent(spot: TableSpot, you: YouState, met: (key: string) => boolean, send: TableSend): PaneContent {
  const spec = TABLES[spot.spec];
  const poker = spec.game === 'holdem' || spec.game === 'draw' || spec.game === 'stud';
  const rows: PaneRow[] = [];
  const money = you.cash + you.bank;
  const friend = spot.friend ? FRIENDS.find((f) => f.id === spot.friend) : undefined;
  if (friend && !met(`friend:${friend.id}`)) {
    rows.push({ name: `Say hello to ${friend.name}`, sub: 'They run a card game here', onClick: () => send({ op: 'meet', table: spot.id }) });
    return { title: spot.name, subtitle: `${friend.name}'s place`, rows };
  }
  const stakes = poker
    ? (spec.game === 'holdem' ? `Blinds ${$(spec.stakes[0])}/${$(spec.stakes[1])}` : `Ante ${$(spec.stakes[0])}, bets from ${$(spec.stakes[1])}`)
    : `Bets ${$(spec.stakes[0])} to ${$(spec.stakes[1])}`;
  if (poker) {
    const [lo, hi] = spec.buyIn ?? [spec.stakes[1] * 40, spec.stakes[1] * 100];
    const steps = [lo, Math.round((lo + hi) / 2 / lo) * lo, hi].filter((v, i, a) => a.indexOf(v) === i);
    tableUi.buyIn = Math.min(tableUi.buyIn, steps.length - 1);
    rows.push({ name: 'Buy-in', group: 'Sit down', slots: steps.map((v, i) => ({ text: $(v), active: i === tableUi.buyIn, onClick: () => { tableUi.buyIn = i; } })) });
    const want = steps[tableUi.buyIn];
    rows.push({ name: 'Sit down', sub: `${spec.players ?? 4} other players`, price: $(want), affordable: money >= want, group: 'Sit down',
      onClick: () => send({ op: 'sit', table: spot.id, n: want }) });
  } else {
    rows.push({ name: spec.prop === 'slots' ? 'Play this machine' : 'Take a seat', group: 'Sit down', onClick: () => send({ op: 'sit', table: spot.id }) });
  }
  const note = spot.host === 'gang' ? 'Invite only. They know who\'s welcome.' : spot.host === 'friend' ? `${friend?.name ?? 'A friend'}'s game. When it's on.` : stakes;
  return { title: spot.name, subtitle: `${stakes} · ${note === stakes ? `Cash ${$(you.cash)}` : note}`, rows };
}

/** At the table. */
export function tableContent(spot: TableSpot, v: TableView, you: YouState, send: TableSend): PaneContent {
  const spec = TABLES[spot.spec];
  const [lo, hi] = spec.stakes;
  const rows: PaneRow[] = [];
  let html = '';
  const log = `<div class="tlog">${v.log.slice(-5).map((l) => `<div>${esc(l)}</div>`).join('')}</div>`;
  const leave = (): PaneRow => ({ name: 'Leave the table', group: ' ', onClick: () => send({ op: 'leave' }) });
  let sub = `Cash ${$(you.cash)}`;
  if (v.poker) {
    const p = v.poker;
    sub = `Chips ${$(v.chips)} · Pot ${$(p.pot)}`;
    html += p.board.length ? `<div class="board">${cards(p.board)}</div>` : '';
    html += '<div class="seats">' + p.seats.map((s, k) => {
      const tag = s.out ? 'out' : s.folded ? 'folded' : s.allIn ? 'all in' : k === p.acting ? 'to act' : s.bet ? $(s.bet) : '';
      const peek = v.peeked?.find(([seat]) => seat === k);
      return `<div class="seat${k === 0 ? ' you' : ''}${k === p.acting ? ' acting' : ''}${s.folded || s.out ? ' dim' : ''}"><b>${esc(k === 0 ? 'You' : s.name)}${k === p.dealer ? ' <i>D</i>' : ''}</b><span>${$(s.stack)}</span>${cards(peek ? peek[1] : s.cards)}<em>${esc(tag)}${s.drew !== undefined ? ` · drew ${s.drew}` : ''}</em></div>`;
    }).join('') + '</div>';
    if (p.yourTurn && p.street === 'draw') {
      const mine = p.seats[0].cards;
      rows.push({ name: 'Throw in', sub: 'Pick up to three (four behind an ace)', group: 'The draw', slots: mine.map((c, i) => ({ text: cardText(c), active: tableUi.discard.has(i), onClick: () => { if (tableUi.discard.has(i)) tableUi.discard.delete(i); else tableUi.discard.add(i); } })) });
      rows.push({ name: tableUi.discard.size ? `Draw ${tableUi.discard.size}` : 'Stand pat', group: 'The draw', onClick: () => { send({ op: 'draw', k: [...tableUi.discard] }); tableUi.discard.clear(); } });
    } else if (p.yourTurn) {
      rows.push({ name: 'Fold', group: 'Your move', onClick: () => send({ op: 'fold' }) });
      rows.push(p.toCall ? { name: `Call ${$(Math.min(p.toCall, v.chips))}`, group: 'Your move', onClick: () => send({ op: 'call' }) } : { name: 'Check', group: 'Your move', onClick: () => send({ op: 'check' }) });
      if (p.maxTo > p.minTo || (p.maxTo === p.minTo && p.maxTo > 0)) {
        const half = Math.round(p.pot / 2), sizes = [p.minTo, p.minTo + half, p.minTo + p.pot, p.maxTo].map((x) => Math.min(p.maxTo, Math.max(p.minTo, x)));
        const labels = ['Min', '½ pot', 'Pot', 'All in'];
        rows.push({ name: p.toCall ? 'Raise to' : 'Bet', group: 'Your move', slots: sizes.filter((x, i) => sizes.indexOf(x) === i).map((x) => ({ text: `${labels[sizes.indexOf(x)]} ${$(x)}`, onClick: () => send({ op: 'raise', n: x }) })) });
      }
    } else if (p.between && v.chips <= 0) {
      const [blo] = spec.buyIn ?? [spec.stakes[1] * 40];
      rows.push({ name: 'Buy back in', price: $(blo), affordable: you.cash + you.bank >= blo, group: 'Your move', onClick: () => send({ op: 'rebuy' }) });
    } else rows.push({ name: p.between ? 'Next hand coming…' : 'Waiting on the others…', group: 'Your move', disabled: true });
    if (v.cheats?.length && RULES.cardCheats) {
      const C: Record<string, [string, string]> = {
        peek: ['Peek at your neighbours\' cards', 'A quick look either side'],
        ace: ['Slip an ace into your hand', 'Up your sleeve, into your hand'],
        stack: ['Stack the deck', 'It\'s your deal next: run up a hand for yourself'],
      };
      for (const c of v.cheats) if (C[c]) rows.push({ name: C[c][0], sub: `${C[c][1]}. If they see it…`, group: 'Cheat', onClick: () => send({ op: 'cheat', s: c }) });
      if (v.cheats.includes('callout')) {
        const who = p.seats.map((s, k) => ({ s, k })).filter(({ s, k }) => k > 0 && !s.out);
        if (who.length) rows.push({ name: 'Call out a cheat', sub: 'Right, you draw first. Wrong, it\'s a gunfight.', group: 'Cheat', slots: who.map(({ s, k }) => ({ text: s.name, onClick: () => send({ op: 'callout', n: k }) })) });
      }
    }
  } else if (v.bj) {
    const b = v.bj;
    html += `<div class="hand"><b>Dealer</b>${cards(b.dealer)}<em>${b.dealerTotal}${b.phase === 'play' ? '+' : ''}</em></div>`;
    html += b.hands.map((h, i) => `<div class="hand${i === b.active && b.phase === 'play' ? ' acting' : ''}"><b>${b.hands.length > 1 ? `Hand ${i + 1}` : 'You'}</b>${cards(h.cards)}<em>${h.total} · ${$(h.bet)}</em></div>`).join('');
    if (b.phase === 'play') {
      rows.push({ name: 'Hit', group: 'Your move', onClick: () => send({ op: 'hit' }) }, { name: 'Stand', group: 'Your move', onClick: () => send({ op: 'stand' }) });
      const h = b.hands[b.active];
      if (h?.cards.length === 2) {
        rows.push({ name: 'Double down', sub: 'One more card, twice the bet', group: 'Your move', onClick: () => send({ op: 'double' }) });
        if (v.game === 'blackjack' && b.hands.length === 1 && h.cards.length === 2 && Math.min(10, (h.cards[0] % 13) + 2) === Math.min(10, (h.cards[1] % 13) + 2)) rows.push({ name: 'Split', group: 'Your move', onClick: () => send({ op: 'split' }) });
      }
    } else {
      rows.push(chipRow(lo, hi));
      rows.push({ name: 'Deal', price: $(bet(lo, hi)), affordable: you.cash + you.bank >= bet(lo, hi), group: 'Your bet', onClick: () => send({ op: 'deal', n: bet(lo, hi) }) });
    }
  } else if (v.roulette) {
    const r = v.roulette;
    const num = (n: number) => `<span class="rnum ${n === 0 || n === 37 ? 'green' : ROULETTE_REDS.has(n) ? 'red' : 'black'}">${rouletteName(n)}</span>`;
    html += `<div class="wheel">${r.last >= 0 ? num(r.last) : '<span class="rnum">—</span>'}<span class="hist">${r.history.slice(1).map(num).join('')}</span></div>`;
    rows.push(chipRow(lo, hi));
    const on = (name: string, s: string): PaneRow => ({ name, group: 'Spin on', onClick: () => send({ op: 'spin', n: bet(lo, hi), s }) });
    rows.push(on('Red', 'red'), on('Black', 'black'), on('Odd', 'odd'), on('Even', 'even'), on('1 to 18', 'low'), on('19 to 36', 'high'));
    rows.push({ name: 'Dozen (pays 2 to 1)', group: 'Spin on', slots: [1, 2, 3].map((k) => ({ text: ['1st 12', '2nd 12', '3rd 12'][k - 1], onClick: () => send({ op: 'spin', n: bet(lo, hi), s: `dozen${k}` }) })) });
    rows.push({ name: `Number ${rouletteName(tableUi.number)} (pays 35 to 1)`, group: 'Spin on', slots: [
      { text: '−', onClick: () => { tableUi.number = (tableUi.number + 37) % 38; } },
      { text: '+', onClick: () => { tableUi.number = (tableUi.number + 1) % 38; } },
      { text: 'Spin', onClick: () => send({ op: 'spin', n: bet(lo, hi), s: 'number', m: tableUi.number }) },
    ] });
  } else if (v.dice) {
    const d = v.dice;
    const pips = d.last ? `<span class="die">${'⚀⚁⚂⚃⚄⚅'[d.last[0] - 1]}</span><span class="die">${'⚀⚁⚂⚃⚄⚅'[d.last[1] - 1]}</span>` : '';
    html += `<div class="dice">${pips}<em>${esc(d.said || (d.variant === 'craps' ? 'Come-out roll.' : 'Call your main.'))}</em></div>`;
    if (d.bet) {
      html += `<div class="note">${d.variant === 'craps' ? (d.side === 'pass' ? 'Pass line' : 'Don\'t pass') : `Main ${d.main}`}${d.point ? ` · ${d.variant === 'craps' ? 'point' : 'chance'} ${d.point}` : ''} · ${$(d.bet)} down</div>`;
      rows.push({ name: 'Roll', group: 'Your move', onClick: () => send({ op: 'roll' }) });
    } else {
      rows.push(chipRow(lo, hi));
      if (d.variant === 'craps') {
        rows.push({ name: 'Pass line', sub: '7 or 11 wins, then make the point before a 7', price: $(bet(lo, hi)), group: 'Your bet', onClick: () => send({ op: 'bet', n: bet(lo, hi), s: 'pass' }) });
        rows.push({ name: 'Don\'t pass', sub: 'Against the shooter', price: $(bet(lo, hi)), group: 'Your bet', onClick: () => send({ op: 'bet', n: bet(lo, hi), s: 'dont' }) });
      } else {
        rows.push({ name: 'Your main', group: 'Your bet', slots: [5, 6, 7, 8, 9].map((m) => ({ text: String(m), active: tableUi.main === m, onClick: () => { tableUi.main = m; } })) });
        rows.push({ name: `Cast with main ${tableUi.main}`, price: $(bet(lo, hi)), group: 'Your bet', onClick: () => send({ op: 'bet', n: bet(lo, hi), m: tableUi.main }) });
      }
    }
  } else if (v.slots) {
    const s = v.slots;
    html += `<div class="reels">${(s.reels ?? [6, 6, 6]).map((r) => `<span class="reel">${SLOT_SYMBOLS[r]}</span>`).join('')}</div>${s.won ? `<div class="note">Paid ${$(s.won)}</div>` : ''}`;
    rows.push(chipRow(lo, hi));
    rows.push({ name: 'Pull', price: $(bet(lo, hi)), affordable: you.cash + you.bank >= bet(lo, hi), group: 'Your bet', onClick: () => send({ op: 'pull', n: bet(lo, hi) }) });
  } else if (v.faro) {
    const f = v.faro;
    html += `<div class="hand"><b>Box</b>${f.turn ? cards(f.turn) : ''}<em>${esc(f.said)} · ${f.left} left</em></div>`;
    if (f.bets.length) html += `<div class="note">On the layout: ${f.bets.map(([r, a]) => `${RANKS[r]} ${$(a)}`).join(', ')}</div>`;
    rows.push(chipRow(lo, hi));
    rows.push({ name: 'Stake a card', group: 'The layout', slots: RANKS.map((r, i) => ({ text: r, active: tableUi.rank === i, onClick: () => { tableUi.rank = i; } })) });
    rows.push({ name: `Bet ${$(bet(lo, hi))} on the ${RANKS[tableUi.rank]}`, group: 'The layout', onClick: () => send({ op: 'bet', n: bet(lo, hi), m: tableUi.rank }) });
    rows.push({ name: 'Deal a turn', sub: 'First card loses, second wins', group: 'The layout', onClick: () => send({ op: 'turn' }) });
  }
  rows.push(leave());
  return { title: spot.name, subtitle: sub, html: `<div class="cardtable">${html}${log}</div>`, rows, wide: !!v.poker };
}
