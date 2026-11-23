// Room game modes: free roam, frag race, money race. Announces winners and starts a new round.
import { type GameMode, MODES } from '../shared/packs';
import type { S2C } from '../shared/protocol';
import type { Player } from './game/entities';
import type { World } from './game/world';

export class Rounds {
  readonly mode: GameMode;
  round = 1;

  constructor(modeId: string | undefined) {
    this.mode = MODES.find((m) => m.id === modeId) ?? MODES[0];
  }

  score(pl: Player): number {
    return this.mode.score === 'frags' ? pl.frags : this.mode.score === 'earned' ? pl.earned : 0;
  }

  modeMsg(): S2C {
    return { t: 'mode', mode: this.mode.id, round: this.round };
  }

  /** Ends the round when someone reaches the target. */
  check(w: World): void {
    if (this.mode.score === 'none') return;
    const players = [...w.players.values()];
    const winner = players.find((p) => this.score(p) >= this.mode.target);
    if (!winner) return;
    const standings = players.map((p) => [p.name, this.score(p)] as [string, number]).sort((a, b) => b[1] - a[1]);
    w.broadcast({ t: 'round', mode: this.mode.id, winner: winner.name, standings } satisfies S2C);
    for (const p of players) { p.frags = 0; p.earned = 0; }
    this.round++;
    w.broadcast(this.modeMsg());
  }
}
