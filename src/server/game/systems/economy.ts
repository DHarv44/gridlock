// Money: pickups, shops, dealers, garages, properties, respray, chop shop, business income.
import { dist } from '../../../shared/math';
import { PALETTE, PROPERTIES, RULES, SERVICES, VEHICLES, WEAPONS, paletteFor, vehicleIndex, weaponIndex } from '../../../shared/packs';
import { type BuyKind, Mode, PK } from '../../../shared/protocol';
import { type Atm, atmsOf } from '../../../shared/world/atms';
import type { Place } from '../../../shared/world/cityTypes';
import { bankMove } from './banking';
import { textTo } from '../missions/cell';
import type { Player } from '../entities';
import { giveWeapon, removeVehicle, spawnVehicle, unseatPed } from '../factory';
import type { World } from '../world';
import { clearHeat, lawCanSee } from './wanted';

export class Economy {
  /** property id -> owner name (lower-case key is the profile name). */
  readonly owners = new Map<number, string>();
  private lastHour = -1;
  onChange: () => void = () => {};

  /** Every ATM in the city (shared/world/atms.ts: the clients work out the same list). */
  readonly atms: Atm[];

  constructor(private w: World) {
    this.atms = atmsOf(w.city);
  }

  /** Player id -> service place the player's car is currently sitting on (-1 none). */
  private onPad = new Map<number, number>();

  /** GTA2 garages: driving onto a chop-shop pad does the job, no menu. (Paint shops open a
   *  colour menu on the client and buy through `buy('respray', colour)`.) */
  private garages(): void {
    const w = this.w;
    for (const pl of w.players.values()) {
      const p = w.peds.get(pl.pid);
      const v = p?.vehicle && p.seat === 0 ? w.vehicles.get(p.vehicle) : undefined;
      if (!v) { this.onPad.delete(pl.id); continue; }
      let on = -1;
      for (const s of w.city.services) {
        const verb = SERVICES[s.spec].verb;
        if (verb === 'chopshop' && s.pad && dist(v.body.x, v.body.y, s.pad.x, s.pad.y) < 6) on = s.id;
      }
      const was = this.onPad.get(pl.id) ?? -1;
      // Too fast: don't count as arrived yet, so it triggers once the car slows down on the pad.
      this.onPad.set(pl.id, on >= 0 && Math.hypot(v.body.vx, v.body.vy) > 8 ? -1 : on);
      if (on < 0 || on === was || this.onPad.get(pl.id) !== on) continue;
      const err = this.buy(pl, 'chop', '', on);
      if (err) w.notify('warn', err, pl);
    }
  }

  update(): void {
    this.garages();
    this.pickups();
    const hour = Math.floor(this.w.gameMinutes / 60);
    if (this.lastHour >= 0 && hour !== this.lastHour) this.payIncome();
    this.lastHour = hour;
  }

  private pickups(): void {
    const w = this.w;
    for (const pk of w.pickups.values()) {
      pk.life -= 1 / 30;
      if (pk.life <= 0) { w.pickups.delete(pk.id); continue; }
    }
    for (const pl of w.players.values()) {
      const p = w.peds.get(pl.pid);
      if (!p || p.dead || pl.mode >= Mode.Dead) continue;
      const pos = w.pedPos(p);
      const reach = p.vehicle ? 3 : 1.4;
      for (const pk of w.pickups.values()) {
        if (Math.abs(pk.x - pos.x) > reach || Math.abs(pk.y - pos.y) > reach) continue;
        if (pk.type === PK.cash) {
          w.earn(pl, pk.value);
          w.notify('money', `+$${pk.value}`, pl);
        } else if (pk.type === PK.frenzy) {
          if (p.vehicle || pl.mission) continue;
          w.onCrate(pl, pk);
        } else if (pk.type === PK.weapon) {
          if (p.vehicle) continue;
          const spec = WEAPONS[pk.weapon];
          giveWeapon(p, pk.weapon, Math.max(pk.value, spec.clip));
          w.notify('info', `Picked up ${spec.name}`, pl);
        } else if (pk.type === PK.health) p.hp = p.spec.hp;
        else if (pk.type === PK.armor) p.armor = 100;
        w.pickups.delete(pk.id);
      }
    }
  }

  private payIncome(): void {
    const w = this.w;
    const byName = new Map<string, Player>();
    for (const pl of w.players.values()) byName.set(pl.name.toLowerCase(), pl);
    const totals = new Map<Player, number>();
    for (const [propId, owner] of this.owners) {
      const spec = PROPERTIES[w.city.properties[propId].spec];
      const pl = byName.get(owner);
      if (!pl || spec.income <= 0) continue;
      totals.set(pl, (totals.get(pl) ?? 0) + spec.income);
    }
    // Business income is paid into the bank, where it's safe, and the bank texts you about it.
    for (const [pl, amount] of totals) {
      w.earnToBank(pl, amount);
      textTo(pl, 'Harbor Trust', `Your businesses paid $${amount.toLocaleString('en-US')} into your account. Balance $${pl.bank.toLocaleString('en-US')}.`);
    }
  }

  ownerList(): [number, string | null][] {
    return this.w.city.properties.map((p) => [p.id, this.owners.get(p.id) ?? null]);
  }

  /** Validates and performs a purchase. Returns an error message or null. */
  buy(pl: Player, kind: BuyKind, id: string, placeId: number): string | null {
    if (kind === 'deposit' || kind === 'withdraw') return bankMove(this.w, this.atms, pl, kind, id, placeId);
    const w = this.w;
    const p = w.peds.get(pl.pid);
    if (!p || p.dead || pl.mode >= Mode.Dead) return 'Not now.';
    const isProperty = kind === 'property' || kind === 'garage';
    const place: Place | undefined = isProperty ? w.city.properties[placeId] : w.city.services[placeId];
    if (!place) return 'Nothing here.';
    const pos = w.pedPos(p);
    const reach = Math.min(dist(pos.x, pos.y, place.x, place.y), place.pad ? dist(pos.x, pos.y, place.pad.x, place.pad.y) : Infinity);
    if (reach > 12) return 'Too far away.';
    // Carried cash first; the bank covers the rest.
    const pay = (price: number) => {
      if (pl.cash + pl.bank < price) return false;
      const fromCash = Math.min(pl.cash, price);
      pl.cash -= fromCash;
      pl.bank -= price - fromCash;
      return true;
    };

    switch (kind) {
      case 'weapon': case 'ammo': {
        const spec = SERVICES[place.spec];
        if (spec.verb !== 'gunshop' || !spec.stock?.includes(id)) return 'Not sold here.';
        const wi = weaponIndex(id), ws = WEAPONS[wi];
        const owned = p.weapons.some((h) => h.w === wi);
        if (kind === 'ammo' && !owned) return 'Buy the weapon first.';
        const price = kind === 'weapon' && !owned ? ws.price : ws.ammoPrice;
        if (!pay(price)) return 'Not enough money.';
        const slot = giveWeapon(p, wi, ws.clip === 0 ? 0 : ws.ammoBundle);
        if (kind === 'weapon') p.wi = slot;
        return null;
      }
      case 'armor':
        if (SERVICES[place.spec].verb !== 'gunshop') return 'Not sold here.';
        if (!pay(RULES.armorPrice)) return 'Not enough money.';
        p.armor = 100;
        return null;
      case 'heal':
        if (SERVICES[place.spec].verb !== 'hospital') return 'No doctors here.';
        if (!pay(RULES.healPrice)) return 'Not enough money.';
        p.hp = p.spec.hp;
        return null;
      case 'vehicle': {
        const spec = SERVICES[place.spec];
        if (spec.verb !== 'dealer' || !spec.stock?.includes(id)) return 'Not sold here.';
        const vi = vehicleIndex(id);
        if (!pay(VEHICLES[vi].price)) return 'Not enough money.';
        pl.garage.push(vi);
        this.deliver(pl, vi, place);
        this.onChange();
        return null;
      }
      case 'garage': {
        if (!pl.owned.includes(place.id) || PROPERTIES[place.spec].kind !== 'home') return 'Not your garage.';
        const vi = Number(id);
        if (!pl.garage.includes(vi)) return 'You do not own that vehicle.';
        this.deliver(pl, vi, place);
        return null;
      }
      case 'property': {
        if (this.owners.has(place.id)) return 'Already owned.';
        const spec = PROPERTIES[place.spec];
        if (!pay(spec.price)) return 'Not enough money.';
        this.owners.set(place.id, pl.name.toLowerCase());
        pl.owned.push(place.id);
        w.notify('info', `${pl.name} bought ${place.name}`);
        this.onChange();
        return null;
      }
      case 'respray': {
        const spec = SERVICES[place.spec];
        const v = p.vehicle ? w.vehicles.get(p.vehicle) : undefined;
        if (spec.verb !== 'respray' || !v || p.seat !== 0) return 'Drive in first.';
        if (lawCanSee(w, pos.x, pos.y, 50)) return 'Lose the cops first.';
        // `id`: a palette index chosen in the paint shop, or '' for a surprise colour.
        const chosen = id === '' ? -1 : Number(id);
        if (id !== '' && !(Number.isInteger(chosen) && chosen >= 0 && chosen < PALETTE.length)) return 'No such colour.';
        const price = spec.price ?? 500;
        if (!pay(price)) return 'Not enough money.';
        const pal = paletteFor(v.spec.colors);
        v.color = chosen >= 0 ? chosen : pal[(pal.indexOf(v.color) + 1 + Math.floor(w.rng.next() * (pal.length - 1))) % pal.length];
        v.hp = v.spec.hp;
        const wanted = pl.wanted > 0;
        clearHeat(pl);
        w.notify('money', `${wanted ? 'Resprayed. Heat is off' : 'Resprayed'} · -$${price}`, pl);
        return null;
      }
      case 'chop': {
        const v = p.vehicle ? w.vehicles.get(p.vehicle) : undefined;
        if (SERVICES[place.spec].verb !== 'chopshop' || !v || p.seat !== 0) return 'Drive in first.';
        if (v.owner === pl.id) return 'We do not take owned cars.';
        if (v.spec.price <= 0) return 'Too hot to handle.';
        const value = Math.round(v.spec.price * RULES.chopValue * Math.max(0.2, v.hp / v.spec.hp));
        unseatPed(w, p, true);
        removeVehicle(w, v);
        w.earn(pl, value);
        w.notify('money', `+$${value} for the ${v.spec.name}`, pl);
        return null;
      }
      default:
        return 'Unknown purchase.';
    }
  }

  /** Spawns an owned vehicle at a place's pad, replacing the previous garage car. */
  private deliver(pl: Player, vi: number, place: Place): void {
    const w = this.w;
    const old = pl.garageCar ? w.vehicles.get(pl.garageCar) : undefined;
    if (old && !old.seats.some((s) => s)) removeVehicle(w, old);
    const pad = place.pad ?? { x: place.x, y: place.y, angle: 0 };
    const v = spawnVehicle(w, vi, pad.x, pad.y, pad.angle);
    w.statics.resolveObb(v.body, v.spec.length / 2, v.spec.width / 2);
    v.owner = pl.id;
    v.persistent = true;
    pl.garageCar = v.id;
  }
}
