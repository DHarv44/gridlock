// The cell phone. Payphones are how you get in with a gang; once a gang respects you enough
// (RESPECT.cellAt) it texts you its number. From then on its people call you with work every few
// minutes while you're free (answer, decline, or miss it), and you can ring them to ask. Work by
// phone pays a little better (RESPECT.cellPay). Texts also carry news, like business income.
import { GANGS, RESPECT } from '../../../shared/packs';
import { Mode, type S2C } from '../../../shared/protocol';
import type { Player } from '../entities';
import type { World } from '../world';
import type { Missions } from './engine';
import { factionName } from './helpers';

/** Sends a text message to a player's phone. */
export function textTo(pl: Player, from: string, body: string): void {
  pl.send({ t: 'text', from, body } satisfies S2C);
}

export function newCell(w: World, respect: Record<string, number>): Player['cell'] {
  return { next: w.time + callGap(w), ringing: '', ringEnds: 0, dialCd: {}, known: new Set(GANGS.filter((g) => (respect[g] ?? 0) >= RESPECT.cellAt)) };
}

const callGap = (w: World) => RESPECT.cellCallEvery[0] + w.rng.next() * (RESPECT.cellCallEvery[1] - RESPECT.cellCallEvery[0]);

export class Cell {
  constructor(private w: World, private missions: Missions) {}

  /** Gangs whose number you have. */
  contacts(pl: Player): string[] {
    return GANGS.filter((g) => (pl.respect[g] ?? 0) >= RESPECT.cellAt);
  }

  update(): void {
    const w = this.w;
    for (const pl of w.players.values()) {
      const c = pl.cell;
      const contacts = this.contacts(pl);
      // Newly trusted: they text their number. Fall out of favour and you lose it.
      for (const g of contacts) {
        if (c.known.has(g)) continue;
        c.known.add(g);
        textTo(pl, factionName(g), `It's the ${factionName(g)}. You've been useful. Keep this number, we'll call when there's work.`);
      }
      for (const g of [...c.known]) if (!contacts.includes(g)) c.known.delete(g);
      if (c.ringing) {
        if (w.time < c.ringEnds) continue;
        pl.send({ t: 'call', gang: c.ringing, state: 'missed' } satisfies S2C);
        textTo(pl, factionName(c.ringing), 'Missed call.');
        c.ringing = '';
        c.next = w.time + callGap(w);
        continue;
      }
      const free = !pl.mission && pl.mode !== Mode.Dead && pl.mode !== Mode.Busted;
      if (!free) { c.next = Math.max(c.next, w.time + 30); continue; }
      if (w.time < c.next || !contacts.length) continue;
      c.ringing = contacts[Math.floor(w.rng.next() * contacts.length)];
      c.ringEnds = w.time + RESPECT.cellRing;
      pl.send({ t: 'call', gang: c.ringing, state: 'ring' } satisfies S2C);
    }
  }

  /** The player answered (or declined) the call that's ringing. */
  answer(pl: Player, accept: boolean): string | null {
    const c = pl.cell, g = c.ringing;
    if (!g) return null;
    c.ringing = '';
    c.next = this.w.time + callGap(this.w);
    if (!accept) { pl.send({ t: 'call', gang: g, state: 'end' } satisfies S2C); return null; }
    if (pl.mission) { pl.send({ t: 'call', gang: g, state: 'end', text: 'Busy, huh? Another time.' } satisfies S2C); return null; }
    pl.send({ t: 'call', gang: g, state: 'end', text: 'Got something for you. Details coming through.' } satisfies S2C);
    this.missions.offer(pl, g, RESPECT.cellPay);
    return null;
  }

  /** The player rings a contact to ask for work. */
  dial(pl: Player, gang: string): string | null {
    const w = this.w, c = pl.cell;
    if (!this.contacts(pl).includes(gang)) return "You don't have that number.";
    if (pl.mode === Mode.Dead || pl.mode === Mode.Busted) return 'Not now.';
    if (pl.mission) { pl.send({ t: 'call', gang, state: 'end', text: "You're already working. Finish that first." } satisfies S2C); return null; }
    if ((c.dialCd[gang] ?? 0) > w.time) { pl.send({ t: 'call', gang, state: 'end', text: "Nothing right now. We'll call you." } satisfies S2C); return null; }
    c.dialCd[gang] = w.time + RESPECT.cellDialCooldown;
    c.next = Math.max(c.next, w.time + callGap(w));
    pl.send({ t: 'call', gang, state: 'end', text: 'Good timing. Details coming through.' } satisfies S2C);
    this.missions.offer(pl, gang, RESPECT.cellPay);
    return null;
  }
}
