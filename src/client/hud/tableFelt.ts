// The table itself, drawn large on the left of the table screen (hud/tableRoom.ts): the felt with
// the cards, the wheel's layout, the dice, the reels as each game has them. Parts you can bet on or
// pick (a roulette number, a faro rank, a card to throw in at the draw) are clickable: `a(fn)` gives
// an element the attribute that runs fn when it's clicked.
import { TABLES } from '../../shared/packs';
import type { TableView } from '../../shared/protocol';
import { cardText, isRed } from '../../shared/games/cards';
import { ROULETTE_REDS, rouletteName, SLOT_PAYS, SLOT_SYMBOLS } from '../../shared/games/house';
import type { TableSpot } from '../../shared/world/tables';

export type Act = (fn: () => void) => string;
export type TableSend = (m: { op: string; table?: number; n?: number; m?: number; k?: number[]; s?: string }) => void;

export const money = (n: number) => `$${n.toLocaleString('en-US')}`;
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/** A playing card: rank in the corner, the suit large. -1 is face down. */
export function pc(c: number, cls = '', attr = ''): string {
  if (c < 0) return `<span class="pc back ${cls}"${attr}></span>`;
  const t = cardText(c), suit = t.slice(-1), rank = t.slice(0, -1);
  return `<span class="pc${isRed(c) ? ' red' : ''} ${cls}"${attr}><b>${rank}</b><i>${suit}</i></span>`;
}
const hand = (cs: number[], cls = '') => `<span class="pcs">${cs.map((c) => pc(c, cls)).join('')}</span>`;
const chip = (n: number) => `<span class="tchip">${money(n)}</span>`;
const rnum = (n: number) => (n === 0 || n === 37 ? 'green' : ROULETTE_REDS.has(n) ? 'red' : 'black');

/** Before you sit: the empty table with its game and stakes lettered on the felt. */
export function joinFelt(spot: TableSpot, stakes: string, note: string): string {
  const spec = TABLES[spot.spec];
  return `<div class="felt ${spec.prop === 'slots' ? 'machine' : 'oval'}"><div class="felt-word">${esc(spec.name)}</div><div class="felt-line">${esc(stakes)}</div><div class="felt-note at">${esc(note)}</div></div>`;
}

/** The table as you play it; `bet` is the chip you've picked (what a click on the layout stakes). */
export function playFelt(v: TableView, a: Act, discard: Set<number>, bet: number, send: TableSend): string {
  if (v.poker) return poker(v, a, discard);
  if (v.bj) return blackjack(v);
  if (v.roulette) return roulette(v, a, bet, send);
  if (v.dice) return dice(v);
  if (v.slots) return slots(v);
  if (v.faro) return faro(v, a, bet, send);
  return '<div class="felt oval"></div>';
}

function poker(v: TableView, a: Act, discard: Set<number>): string {
  const p = v.poker!;
  const n = p.seats.length;
  const drawing = p.yourTurn && p.street === 'draw';
  const seats = p.seats.map((s, k) => {
    // You at the bottom, the others round the oval.
    const th = Math.PI / 2 + (k * 2 * Math.PI) / n;
    const x = 50 + 41 * Math.cos(th), y = 50 + 39 * Math.sin(th);
    const bx = 50 + 25 * Math.cos(th), by = 50 + 22 * Math.sin(th);
    const peek = v.peeked?.find(([seat]) => seat === k)?.[1];
    const shown = peek ?? s.cards;
    const tag = s.out ? 'Out' : s.folded ? 'Folded' : s.allIn ? 'All in' : k === p.acting && !p.between ? 'To act' : '';
    const cards = k === 0 && drawing
      ? `<span class="pcs">${shown.map((c, i) => pc(c, `${discard.has(i) ? 'thrown' : ''} pick`, ` ${a(() => { if (discard.has(i)) discard.delete(i); else discard.add(i); })}`)).join('')}</span>`
      : hand(shown, k === 0 ? '' : 'sm');
    return `<div class="tseat${k === 0 ? ' you' : ''}${k === p.acting && !p.between ? ' acting' : ''}${s.folded || s.out ? ' dim' : ''}" style="left:${x}%;top:${y}%">
      ${cards}<div class="tname">${esc(k === 0 ? 'You' : s.name)}${k === p.dealer ? '<i class="dbtn">D</i>' : ''}</div><div class="tstack">${money(s.stack)}${tag ? ` · ${tag}` : ''}${s.drew !== undefined ? ` · drew ${s.drew}` : ''}</div></div>
      ${s.bet ? `<div class="tbet" style="left:${bx}%;top:${by}%">${chip(s.bet)}</div>` : ''}`;
  }).join('');
  const centre = `<div class="tcentre">${p.board.length ? hand(p.board) : ''}<div class="tpot">${p.pot ? `Pot ${money(p.pot)}` : ''}</div><div class="tstreet">${esc(streetName(p.street))}</div></div>`;
  return `<div class="felt oval poker">${centre}${seats}</div>`;
}

const streetName = (s: string) => ({ pre: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River', show: 'Showdown', draw: 'The draw', deal: 'Dealing' } as Record<string, string>)[s] ?? s.replace(/^\w/, (c) => c.toUpperCase());

function blackjack(v: TableView): string {
  const b = v.bj!;
  const dealer = `<div class="tdealer"><div class="tname">Dealer${b.dealer.length ? ` · ${b.dealerTotal}${b.phase === 'play' ? '' : ''}` : ''}</div>${hand(b.dealer)}</div>`;
  const hands = b.hands.map((h, i) => `<div class="thand${i === b.active && b.phase === 'play' ? ' acting' : ''}">${hand(h.cards)}
    <div class="tname">${b.hands.length > 1 ? `Hand ${i + 1}` : 'You'} · ${h.total}</div>${chip(h.bet)}${b.outcome[i] ? `<div class="tout">${esc(b.outcome[i])}</div>` : ''}</div>`).join('');
  const rule = v.game === 'blackjack' ? 'Blackjack pays 3 to 2' : 'Twenty-one';
  return `<div class="felt half"><div class="felt-arc">${rule}</div>${dealer}<div class="thands">${hands || '<div class="felt-note">Place your bet</div>'}</div></div>`;
}

function roulette(v: TableView, a: Act, bet: number, send: TableSend): string {
  const r = v.roulette!;
  const num = (n: number) => `<button class="rc ${rnum(n)}${n === r.last ? ' hit' : ''}" ${a(() => send({ op: 'spin', n: bet, s: 'number', m: n }))}>${rouletteName(n)}</button>`;
  const rows = [3, 2, 1].map((row) => Array.from({ length: 12 }, (_, c) => num(c * 3 + row)).join('')).join('');
  const out = (label: string, s: string, cls = '') => `<button class="ro ${cls}" ${a(() => send({ op: 'spin', n: bet, s }))}>${label}</button>`;
  const last = r.last >= 0 ? `<span class="rball ${rnum(r.last)}">${rouletteName(r.last)}</span>` : '<span class="rball">—</span>';
  return `<div class="felt roulette"><div class="rtop">${last}<span class="rhist">${r.history.slice(1, 12).map((n) => `<span class="rh ${rnum(n)}">${rouletteName(n)}</span>`).join('')}</span><span class="felt-note">Click the layout to bet ${money(bet)}</span></div>
    <div class="rgrid"><div class="rzero">${num(0)}${num(37)}</div><div class="rnums">${rows}</div></div>
    <div class="rdoz">${out('1st 12', 'dozen1')}${out('2nd 12', 'dozen2')}${out('3rd 12', 'dozen3')}</div>
    <div class="routs">${out('1–18', 'low')}${out('Even', 'even')}${out('Red', 'red', 'red')}${out('Black', 'black', 'black')}${out('Odd', 'odd')}${out('19–36', 'high')}</div></div>`;
}

/** Hazard: the caster's main and chance chalked on the board, the two dice thrown. */
function dice(v: TableView): string {
  const d = v.dice!;
  const face = (n: number) => `<span class="tdie">${Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[n - 1].includes(i) ? 'on' : ''}"></i>`).join('')}</span>`;
  const betLine = d.bet ? `Main ${d.main} · ${money(d.bet)} down` : 'No bet down';
  return `<div class="felt dicefelt hazard"><div class="felt-arc">Hazard</div><div class="hboard"><span><em>Main</em>${d.bet ? d.main : '—'}</span><span><em>Chance</em>${d.point || '—'}</span></div>
    <div class="tdice">${d.last ? face(d.last[0]) + face(d.last[1]) : ''}</div><div class="tsaid">${esc(d.said || 'Call your main.')}</div><div class="felt-note">${betLine}</div></div>`;
}
const PIPS = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];

function slots(v: TableView): string {
  const s = v.slots!;
  const reels = (s.reels ?? [6, 6, 6]).map((r) => `<span class="treel${SLOT_SYMBOLS[r].length > 2 ? ' word' : ''}">${SLOT_SYMBOLS[r]}</span>`).join('');
  return `<div class="felt machine"><div class="tmachine"><div class="treels">${reels}<i class="tline"></i></div><div class="twon${s.won ? ' on' : ''}">${s.won ? `Paid ${money(s.won)}` : s.reels ? 'No win' : 'Pull to play'}</div></div>
    <div class="tpay">${SLOT_PAYS.map((k, i) => `<span>${SLOT_SYMBOLS[i]} ${SLOT_SYMBOLS[i]} ${SLOT_SYMBOLS[i]} <b>${k}×</b></span>`).reverse().join('')}<span>${SLOT_SYMBOLS[0]} ${SLOT_SYMBOLS[0]} <b>2×</b></span></div></div>`;
}

function faro(v: TableView, a: Act, bet: number, send: TableSend): string {
  const f = v.faro!;
  const on = new Map(f.bets);
  // The layout: the spade suit in two rows round the dealer's box, as it was enamelled on the board.
  const tile = (r: number) => `<button class="frank${on.has(r) ? ' staked' : ''}" ${a(() => send({ op: 'bet', n: bet, m: r }))}>${pc(r, 'sm')}${on.has(r) ? chip(on.get(r)!) : ''}</button>`;
  const top = [5, 4, 3, 2, 1, 0].map(tile).join(''), bottom = [7, 8, 9, 10, 11, 12].map(tile).join('');
  return `<div class="felt faro"><div class="frow">${top}</div><div class="fmid">${tile(6)}<div class="fbox"><div class="tname">The box · ${f.left} left</div>${f.turn ? `<div class="fturn"><span><em>Loses</em>${pc(f.turn[0])}</span><span><em>Wins</em>${pc(f.turn[1])}</span></div>` : '<div class="felt-note">No turn yet</div>'}<div class="tsaid">${esc(f.said)}</div></div></div><div class="frow">${bottom}</div>
    <div class="felt-note">Click a card to stake ${money(bet)} on its rank</div></div>`;
}
