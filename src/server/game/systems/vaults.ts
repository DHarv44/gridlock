// The bank job. A bank's vault door (world/interiors.ts) is a gate in the collision world: an
// explosion against it blows it open, cash piles lie on the vault floor, the alarm goes off across
// the city and the robber is wanted at RULES.vaultWanted stars at least (on the record as a bank
// robbery). After RULES.vaultReset seconds, once nobody is inside, the door shuts and it restocks.
import { dist } from '../../../shared/math';
import { RULES, WANTED } from '../../../shared/packs';
import { PK } from '../../../shared/protocol';
import { dropPickup } from '../combat/damage';
import type { World } from '../world';
import { addHeat, crime } from './wanted';

export class Vaults {
  /** Interior index -> when it shuts again (world seconds), for the open ones. */
  private openUntil = new Map<number, number>();
  /** Gates changed: tell everyone (the clients mirror open gates for prediction and drawing). */
  onChange: () => void = () => {};

  constructor(private w: World) {}

  /** Open vault doors (interior indexes), for clients. */
  open(): number[] { return [...this.w.statics.openGates]; }

  /** An explosion went off: does it blow a vault door? */
  explosion(x: number, y: number, radius: number, attackerId: number): void {
    const w = this.w;
    w.city.interiors.forEach((i, k) => {
      if (!i.vault || w.statics.openGates.has(k)) return;
      const d = i.vault.door;
      const cx = (d.x0 + d.x1) / 2, cy = (d.y0 + d.y1) / 2;
      if (dist(x, y, cx, cy) > radius + 1.2) return;
      this.blow(k, attackerId);
    });
  }

  private blow(k: number, attackerId: number): void {
    const w = this.w, i = w.city.interiors[k], v = i.vault!;
    w.statics.openGates.add(k);
    this.openUntil.set(k, w.time + RULES.vaultReset);
    for (const c of v.cash) {
      dropPickup(w, PK.cash, c.x, c.y, Math.round((RULES.vaultCash[0] + w.rng.next() * (RULES.vaultCash[1] - RULES.vaultCash[0])) / 50) * 50, -1);
    }
    // The cash waits for whoever gets there (pickups normally fade in 90 s).
    for (const pk of w.pickups.values()) if (pk.type === PK.cash && v.cash.some((c) => Math.abs(c.x - pk.x) < 0.01 && Math.abs(c.y - pk.y) < 0.01)) pk.life = RULES.vaultReset;
    const robber = w.peds.get(attackerId);
    if (robber?.player) {
      crime(w, robber, 'bankRobbery', v.door.x0, v.door.y0);
      const need = WANTED[RULES.vaultWanted - 1].heat;
      if (robber.player.heat < need) addHeat(robber.player, need - robber.player.heat);
    }
    w.notify('warn', `Alarm at ${i.place.name}: the vault's been blown!`);
    this.onChange();
  }

  update(): void {
    const w = this.w;
    for (const [k, until] of this.openUntil) {
      if (w.time < until) continue;
      const room = w.city.interiors[k].vault!.room;
      let busy = false;
      w.pedsNear((room.x0 + room.x1) / 2, (room.y0 + room.y1) / 2, 6, (p) => {
        if (p.body.x > room.x0 - 0.5 && p.body.x < room.x1 + 0.5 && p.body.y > room.y0 - 0.5 && p.body.y < room.y1 + 0.5) busy = true;
      });
      if (busy) continue;
      // Shut and restock: any cash still lying there goes back in the vault.
      for (const pk of [...w.pickups.values()]) {
        if (pk.type === PK.cash && pk.x > room.x0 && pk.x < room.x1 && pk.y > room.y0 && pk.y < room.y1) w.pickups.delete(pk.id);
      }
      w.statics.openGates.delete(k);
      this.openUntil.delete(k);
      this.onChange();
    }
  }
}
