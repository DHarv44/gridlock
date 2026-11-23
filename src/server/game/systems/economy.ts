// Money: pickups, shops, dealers, garages, properties, respray, chop shop, business income.
import { dist } from '../../../shared/math';
import { PROPERTIES, RULES, SERVICES, VEHICLES, WEAPONS, paletteFor, vehicleIndex, weaponIndex } from '../../../shared/packs';
import { type BuyKind, Mode, PK } from '../../../shared/protocol';
import type { Place } from '../../../shared/world/cityTypes';
import type { Player } from '../entities';
import { giveWeapon, removeVehicle, spawnVehicle, unseatPed } from '../factory';
import type { World } from '../world';
import { clearHeat, lawCanSee } from './wanted';

export class Economy {
  /** property id -> owner name (lower-case key is the profile name). */
  readonly owners = new Map<number, string>();
  private lastHour = -1;
  onChange: () => void = () => {};

  constructor(private w: World) {}

  update(): void {
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
          pl.cash += pk.value;
          w.notify('money', `+$${pk.value}`, pl);
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
    for (const [pl, amount] of totals) {
      pl.cash += amount;
      w.notify('money', `+$${amount} business income`, pl);
    }
  }

  ownerList(): [number, string | null][] {
    return this.w.city.properties.map((p) => [p.id, this.owners.get(p.id) ?? null]);
  }

  /** Validates and performs a purchase. Returns an error message or null. */
  buy(pl: Player, kind: BuyKind, id: string, placeId: number): string | null {
    const w = this.w;
    const p = w.peds.get(pl.pid);
    if (!p || p.dead || pl.mode >= Mode.Dead) return 'Not now.';
    const isProperty = kind === 'property' || kind === 'garage';
    const place: Place | undefined = isProperty ? w.city.properties[placeId] : w.city.services[placeId];
    if (!place) return 'Nothing here.';
    const pos = w.pedPos(p);
    const reach = Math.min(dist(pos.x, pos.y, place.x, place.y), place.pad ? dist(pos.x, pos.y, place.pad.x, place.pad.y) : Infinity);
    if (reach > 12) return 'Too far away.';
    const pay = (price: number) => {
      if (pl.cash < price) return false;
      pl.cash -= price;
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
        if (!pay(price)) return 'Not enough cash.';
        const slot = giveWeapon(p, wi, ws.clip === 0 ? 0 : ws.ammoBundle);
        if (kind === 'weapon') p.wi = slot;
        return null;
      }
      case 'armor':
        if (SERVICES[place.spec].verb !== 'gunshop') return 'Not sold here.';
        if (!pay(RULES.armorPrice)) return 'Not enough cash.';
        p.armor = 100;
        return null;
      case 'heal':
        if (SERVICES[place.spec].verb !== 'hospital') return 'No doctors here.';
        if (!pay(RULES.healPrice)) return 'Not enough cash.';
        p.hp = p.spec.hp;
        return null;
      case 'vehicle': {
        const spec = SERVICES[place.spec];
        if (spec.verb !== 'dealer' || !spec.stock?.includes(id)) return 'Not sold here.';
        const vi = vehicleIndex(id);
        if (!pay(VEHICLES[vi].price)) return 'Not enough cash.';
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
        if (!pay(spec.price)) return 'Not enough cash.';
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
        if (!pay(spec.price ?? 500)) return 'Not enough cash.';
        const pal = paletteFor(v.spec.colors);
        v.color = pal[(pal.indexOf(v.color) + 1 + Math.floor(w.rng.next() * (pal.length - 1))) % pal.length];
        v.hp = v.spec.hp;
        clearHeat(pl);
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
        pl.cash += value;
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
