// Headless checks of the card games' rules (shared/games): hand ranking, poker tables (hold'em and
// draw) keeping every chip accounted for, and the AI's skill mattering. `npx tsx scripts/cards.ts`
export {};
const { Rng } = await import('../src/shared/rng');
const { score5, bestScore, handName } = await import('../src/shared/games/cards');
const { newTable, deal, act, pot } = await import('../src/shared/games/poker');
type Seat = import('../src/shared/games/poker').PokerSeat;
const { aiAct } = await import('../src/shared/games/pokerAi');

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };
// Cards by name: rank char + suit char (s h d c).
const C = (s: string) => s.split(' ').map((t) => '23456789TJQKA'.indexOf(t[0]) + 13 * 'shdc'.indexOf(t[1]));

check(score5(C('As Ks Qs Js Ts')) > score5(C('9h 9d 9c 9s Ah')), 'a royal flush beats four of a kind');
check(score5(C('Ah 2d 3c 4s 5h')) < score5(C('2h 3d 4c 5s 6h')), 'the wheel is the lowest straight');
check(score5(C('Kh Kd 7c 7s 2h')) > score5(C('Qh Qd Jc Js Ah')), 'two pair: the higher pair wins');
check(score5(C('Ah Ad 9c 5s 2h')) > score5(C('Ah Ad 9c 4s 3h')), 'kickers count');
check(handName(bestScore(C('Ah Kh 2c 7h 9h 3s Th'))) === 'Flush', 'best five of seven finds the flush');

const seat = (name: string, skill: number, stack: number): Seat => ({ name, stack, cards: [], bet: 0, total: 0, folded: false, allIn: false, acted: false, human: false, skill, sharp: false, cheated: false, out: false });

function play(variant: 'holdem' | 'draw' | 'stud', skills: number[], hands: number, seed: number) {
  const rng = new Rng(seed);
  const t = newTable(variant, skills.map((s, i) => seat(`P${i}`, s, 1000)), [5, 10], 2);
  let chips = 0, broke = false;
  for (let h = 0; h < hands; h++) {
    for (const s of t.seats) if (s.stack <= 0) s.stack = 1000; // rebuy
    chips = t.seats.reduce((a, s) => a + s.stack, 0);
    if (!deal(t, rng)) break;
    let guard = 0;
    while (t.street !== 'show' && guard++ < 500) {
      const a = aiAct(t, t.toAct, rng);
      const err = act(t, t.toAct, a);
      if (err) { broke = true; console.log(`  hand ${h}: ${err} (${JSON.stringify(a)}, ${t.street}, seat ${t.toAct})`); break; }
    }
    const after = t.seats.reduce((a, s) => a + s.stack, 0);
    if (after !== chips || guard >= 500) { broke = true; console.log(`  hand ${h}: chips ${chips} -> ${after}, guard ${guard}, street ${t.street}\n  ${t.log.slice(-8).join('\n  ')}`); break; }
    void pot;
  }
  return { t, broke };
}

const h = play('holdem', [0.2, 0.2, 0.9, 0.9], 400, 7);
check(!h.broke, 'hold\'em: 400 hands, every chip accounted for, every action legal');
const d = play('draw', [0.2, 0.2, 0.9, 0.9], 400, 11);
check(!d.broke, 'five-card draw: 400 hands, every chip accounted for');
const st = play('stud', [0.2, 0.2, 0.9, 0.9], 400, 13);
check(!st.broke, 'five-card stud: 400 hands, every chip accounted for');

// House games: a long run of each comes out in the house's favour, by a believable edge.
const { newBlackjack, bjDeal, bjAct, bjValue, spinRoulette, newDice, rollDice, pullSlots, newFaro, faroTurn } = await import('../src/shared/games/house');
{
  const rng = new Rng(21);
  const edge = (name: string, n: number, round: () => [number, number], lo: number, hi: number) => {
    let staked = 0, back = 0;
    for (let k = 0; k < n; k++) { const [s, b] = round(); staked += s; back += b; }
    const e = 1 - back / staked;
    check(e > lo && e < hi, `${name}: the house keeps ${(e * 100).toFixed(1)}% over ${n} rounds`);
  };
  for (const variant of ['blackjack', 'twentyone'] as const) {
    const g = newBlackjack(variant);
    edge(variant, 20000, () => {
      bjDeal(g, rng, 10);
      // A simple player: hit to 17 (12 against a weak dealer card), double on 11.
      let staked = 10;
      while (g.phase === 'play') {
        const h = g.hands[g.active], v = bjValue(h.cards).total, up = bjValue([g.dealer[1]]).total;
        if (v === 11 && h.cards.length === 2) { staked += h.bet; bjAct(g, rng, 'double'); } else bjAct(g, rng, v < 12 || (v < 17 && up >= 7) ? 'hit' : 'stand');
      }
      return [staked, g.paid];
    }, -0.04, 0.08);
  }
  edge('roulette (red)', 30000, () => [10, spinRoulette(rng, [{ on: 'red', amount: 10 }]).back[0]], 0.02, 0.09);
  edge('roulette (a number)', 60000, () => [10, spinRoulette(rng, [{ on: 'number', n: 17, amount: 10 }]).back[0]], -0.02, 0.13);
  for (const variant of ['craps', 'hazard'] as const) {
    const g = newDice(variant);
    edge(variant, 20000, () => { g.bet = 10; let r: number | null = null; while (r === null) r = rollDice(g, rng); return [10, r]; }, 0.0, 0.1);
  }
  edge('slots', 60000, () => [1, pullSlots(rng, 1).back], 0.02, 0.2);
  const f = newFaro(rng);
  edge('faro', 20000, () => { f.bets.set(5, 10); let back = 0; while (f.bets.size) back += faroTurn(f, rng); return [10, back]; }, 0.0, 0.06);
}
// Over many hands the sharks take the buddies' money (net of rebuys, tracked by final stacks + rebuys).
function edge(variant: 'holdem' | 'draw', seed: number): number {
  const rng = new Rng(seed);
  const t = newTable(variant, [0.15, 0.15, 0.9, 0.9].map((s, i) => seat(`P${i}`, s, 1000)), [5, 10], 2);
  const bought = [1000, 1000, 1000, 1000];
  for (let n = 0; n < 600; n++) {
    t.seats.forEach((s, i) => { if (s.stack <= 0) { s.stack = 1000; bought[i] += 1000; } });
    if (!deal(t, rng)) break;
    let g = 0;
    while (t.street !== 'show' && g++ < 500) act(t, t.toAct, aiAct(t, t.toAct, rng));
  }
  const net = t.seats.map((s, i) => s.stack - bought[i]);
  return (net[2] + net[3]) - (net[0] + net[1]);
}
const eh = edge('holdem', 3), ed = edge('draw', 5);
check(eh > 0 && ed > 0, `skill pays: sharks up on buddies by ${eh} (hold'em) and ${ed} (draw) over 600 hands at 5/10`);

console.log(failures ? `${failures} failed` : 'all ok');
process.exit(failures ? 1 : 0);
