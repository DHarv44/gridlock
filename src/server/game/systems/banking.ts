// Banking: moving money between your pocket and your bank at an ATM or a bank's counter. Banked
// money is safe from death and arrest; shops draw on it once cash runs out (economy.ts pay()).
import { dist } from '../../../shared/math';
import { SERVICES } from '../../../shared/packs';
import type { Atm } from '../../../shared/world/atms';
import type { Player } from '../entities';
import type { World } from '../world';

/** `place` < 0 is an ATM (-1 - its id); otherwise a bank's service id. `amount` is dollars or 'all'. */
export function bankMove(w: World, atms: Atm[], pl: Player, kind: 'deposit' | 'withdraw', amount: string, place: number): string | null {
  const p = w.peds.get(pl.pid);
  if (!p || p.dead || p.vehicle) return 'Not now.';
  const pos = w.pedPos(p);
  if (place < 0) {
    const atm = atms[-1 - place];
    if (!atm || dist(pos.x, pos.y, atm.x, atm.y) > 4) return 'Too far from the ATM.';
  } else {
    const bank = w.city.services[place];
    if (!bank || SERVICES[bank.spec].verb !== 'bank') return 'Not a bank.';
    if (dist(pos.x, pos.y, bank.x, bank.y) > 8) return 'Too far from the counter.';
  }
  const have = kind === 'deposit' ? pl.cash : pl.bank;
  const n = amount === 'all' ? have : Number(amount);
  if (!Number.isInteger(n) || n <= 0) return have > 0 ? 'Pick an amount.' : kind === 'deposit' ? 'No cash on you.' : 'Your account is empty.';
  if (n > have) return kind === 'deposit' ? "You don't have that much on you." : "There isn't that much in your account.";
  if (kind === 'deposit') { pl.cash -= n; pl.bank += n; } else { pl.bank -= n; pl.cash += n; }
  w.notify('money', `${kind === 'deposit' ? 'Deposited' : 'Withdrew'} $${n.toLocaleString('en-US')} · bank $${pl.bank.toLocaleString('en-US')}`, pl);
  return null;
}
