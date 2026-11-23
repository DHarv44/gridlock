// Room game modes: free roam, frag race, money race and tag. Announces winners and starts a new round.
// Tag: one player is "it" (marked for everyone); when "it" kills another player, that player is it.
// Killing "it" only slows them down. The round runs for the mode's target seconds (while two or more
// play); least time spent it wins.
import { type GameMode, MODES } from '../shared/packs';
import type { S2C } from '../shared/protocol';
import type { Player } from './game/entities';
import type { World } from './game/world';

export class Rounds {
  readonly mode: GameMode;
  round = 1;
  /** Tag: who's it (player id, 0 = nobody yet) and when the round ends (world seconds). */
  it = 0;
  private ends = 0;

  constructor(modeId: string | undefined) {
    this.mode = MODES.find((m) => m.id === modeId) ?? MODES[0];
  }

  score(pl: Player): number {
    return this.mode.score === 'frags' ? pl.frags : this.mode.score === 'earned' ? pl.earned : this.mode.score === 'tag' ? Math.round(pl.itTime) : 0;
  }

  modeMsg(): S2C {
    return { t: 'mode', mode: this.mode.id, round: this.round, ...(this.mode.score === 'tag' ? { ends: Math.round(this.ends * 1000), it: this.it } : {}) };
  }

  /** Every tick: tag's clock and its "it". */
  tick(w: World, dt: number): void {
    if (this.mode.score !== 'tag') return;
    const players = [...w.players.values()];
    if (players.length < 2) {
      // Nobody to chase: the clock waits, and there's no it.
      this.ends = w.time + this.mode.target;
      if (this.it) { this.it = 0; w.broadcast(this.modeMsg()); }
      return;
    }
    if (!this.ends) this.ends = w.time + this.mode.target;
    const it = players.find((p) => p.id === this.it);
    if (!it) { this.pickIt(w, players); return; }
    it.itTime += dt;
    if (w.time >= this.ends) this.finish(w, players, [...players].sort((a, b) => a.itTime - b.itTime)[0]);
  }

  private pickIt(w: World, players: Player[]): void {
    const pl = players[Math.floor(w.rng.next() * players.length)];
    this.it = pl.id;
    w.notify('info', `${pl.name} is it!`);
    w.broadcast(this.modeMsg());
  }

  /** Tag: a kill by "it" passes it on. */
  onKill(w: World, killer: Player | undefined, victim: Player | undefined): void {
    if (this.mode.score !== 'tag' || !killer || !victim || killer === victim || killer.id !== this.it) return;
    this.it = victim.id;
    w.notify('kill', `${killer.name} tagged ${victim.name}. ${victim.name} is it!`);
    w.broadcast(this.modeMsg());
  }

  /** Races: ends the round when someone reaches the target. */
  check(w: World): void {
    if (this.mode.score === 'none' || this.mode.score === 'tag') return;
    const players = [...w.players.values()];
    const winner = players.find((p) => this.score(p) >= this.mode.target);
    if (winner) this.finish(w, players, winner);
  }

  private finish(w: World, players: Player[], winner: Player): void {
    const least = this.mode.score === 'tag';
    const standings = players.map((p) => [p.name, this.score(p)] as [string, number]).sort((a, b) => (least ? a[1] - b[1] : b[1] - a[1]));
    w.broadcast({ t: 'round', mode: this.mode.id, winner: winner.name, standings } satisfies S2C);
    for (const p of players) { p.frags = 0; p.earned = 0; p.itTime = 0; }
    this.round++;
    this.ends = 0;
    this.it = 0;
    w.broadcast(this.modeMsg());
  }
}
