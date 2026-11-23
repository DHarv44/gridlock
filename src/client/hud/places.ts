// What each place's pane offers. Content comes from the packs; this only maps verbs to rows.
import { PROPERTIES, RULES, SERVICES, VEHICLES, WEAPONS, vehicleIndex, weaponIndex } from '../../shared/packs';
import { type BuyKind, Mode, type Profile, type YouState } from '../../shared/protocol';
import type { Place } from '../../shared/world/cityTypes';
import type { PaneContent, PaneRow } from './pane';

export type Buy = (kind: BuyKind, id: string, place: number) => void;

const $ = (n: number) => `$${n.toLocaleString('en-US')}`;

export function serviceContent(place: Place, you: YouState, buy: Buy): PaneContent {
  const spec = SERVICES[place.spec];
  const cash = you.cash;
  const rows: PaneRow[] = [];
  const driving = you.mode === Mode.Driver;
  switch (spec.verb) {
    case 'gunshop': {
      rows.push({ name: 'Body Armor', sub: 'Full armor plate', price: $(RULES.armorPrice), affordable: cash >= RULES.armorPrice, group: 'Protection', onClick: () => buy('armor', '', place.id) });
      for (const id of spec.stock ?? []) {
        const wi = weaponIndex(id), w = WEAPONS[wi];
        const owned = you.w.some((h) => h[0] === wi);
        const group = ['Melee', 'Pistols', 'SMGs', 'Shotguns', 'Rifles', 'Sniper', 'Heavy', 'Heavy', 'Throwables', 'Launchers'][w.slot];
        if (owned && w.clip === 0) { rows.push({ name: w.name, sub: 'Owned', group, disabled: true }); continue; }
        const price = owned ? w.ammoPrice : w.price;
        rows.push({ name: w.name, sub: owned ? `+${w.ammoBundle} ammo` : `${w.damage ? `${w.damage}${w.pellets ? `×${w.pellets}` : ''} dmg` : 'explosive'}${w.clip ? ` · ${w.clip} rnd` : ''}`,
          price: $(price), affordable: cash >= price, group, onClick: () => buy(owned ? 'ammo' : 'weapon', id, place.id) });
      }
      break;
    }
    case 'dealer':
      for (const id of spec.stock ?? []) {
        const v = VEHICLES[vehicleIndex(id)];
        rows.push({ name: v.name, sub: `${Math.round(v.maxSpeed * 3.6)} km/h · ${v.seats} seats`, price: $(v.price), affordable: cash >= v.price, onClick: () => buy('vehicle', id, place.id) });
      }
      return { title: place.name, subtitle: 'Bought vehicles go to your garage and are delivered here.', rows };
    case 'hospital':
      rows.push({ name: 'Patch me up', sub: 'Restore full health', price: $(RULES.healPrice), affordable: cash >= RULES.healPrice, onClick: () => buy('heal', '', place.id) });
      break;
    case 'respray':
      rows.push(driving
        ? { name: 'Respray & repair', sub: 'New paint, repaired, wanted level cleared', price: $(spec.price ?? 500), affordable: cash >= (spec.price ?? 500), onClick: () => buy('respray', '', place.id) }
        : { name: 'Drive a vehicle onto the pad', disabled: true });
      break;
    case 'chopshop':
      rows.push(driving && you.vt >= 0
        ? { name: `Sell this ${VEHICLES[you.vt].name}`, sub: 'Cash for stolen vehicles, paid by condition', price: `~${$(Math.round(VEHICLES[you.vt].price * RULES.chopValue * Math.max(0.2, you.vhp)))}`, onClick: () => buy('chop', '', place.id) }
        : { name: 'Bring us a vehicle', disabled: true });
      break;
    default:
      rows.push({ name: 'Nothing for sale here', disabled: true });
  }
  return { title: place.name, rows };
}

export function propertyContent(place: Place, you: YouState, profile: Profile, owner: string | null, myName: string, buy: Buy): PaneContent {
  const spec = PROPERTIES[place.spec];
  const mine = owner === myName.toLowerCase();
  const rows: PaneRow[] = [];
  const info = spec.kind === 'home'
    ? `Home · garage for ${spec.garage} · respawn point`
    : `Business · earns ${$(spec.income)} every game hour`;
  if (!owner) {
    rows.push({ name: `Buy ${spec.name}`, sub: info, price: $(spec.price), affordable: you.cash >= spec.price, onClick: () => buy('property', '', place.id) });
  } else if (!mine) {
    rows.push({ name: `Owned by ${owner}`, sub: info, disabled: true });
  } else {
    rows.push({ name: 'You own this', sub: info, disabled: true });
    if (spec.kind === 'home') {
      const seen = new Set<number>();
      for (const vi of profile.garage) {
        if (seen.has(vi)) continue;
        seen.add(vi);
        rows.push({ name: VEHICLES[vi].name, sub: 'Bring it out', group: 'Garage', onClick: () => buy('garage', String(vi), place.id) });
      }
      if (!seen.size) rows.push({ name: 'Garage is empty', sub: 'Buy vehicles at a dealer', group: 'Garage', disabled: true });
    }
  }
  return { title: place.name, subtitle: spec.kind === 'home' ? 'Residence' : 'Business', rows };
}
