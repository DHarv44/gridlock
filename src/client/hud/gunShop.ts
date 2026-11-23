// The gun shop's counter (hud/showroom.ts runs it): body armour and every weapon in stock, each on a
// card with its picture; the picked one turns on the lit turntable. Owned guns sell ammo instead.
import { ARMOR_MODEL, RULES, WEAPONS, type WeaponPart, weaponIndex } from '../../shared/packs';
import type { BuyKind, YouState } from '../../shared/protocol';
import { WeaponStage, weaponThumbs } from '../render/weaponStage';
import { $, type Offer, type ShopSpec, type ShowItem, statBars } from './showroom';

export interface GunShopVisit {
  shop: string;
  stock: string[];                 // weapon ids on sale
  you: () => YouState | null;      // read live: cash, weapons, armour change as you buy
  buy: (kind: BuyKind, id: string) => void;
  close: () => void;
}

interface GunItem extends ShowItem { parts: WeaponPart[]; wi: number }

const GROUPS = ['Melee', 'Pistols', 'SMGs', 'Shotguns', 'Rifles', 'Sniper', 'Heavy', 'Heavy', 'Throwables', 'Launchers'];

export function gunShop(v: GunShopVisit): ShopSpec<GunItem> {
  const items: Omit<GunItem, 'thumb'>[] = [{ key: 'armor', name: 'Body Armor', group: 'Protection', parts: ARMOR_MODEL, wi: -1 }];
  for (const id of v.stock) {
    const wi = weaponIndex(id), w = WEAPONS[wi];
    if (w.model) items.push({ key: w.id, name: w.name, group: GROUPS[w.slot] ?? 'Other', parts: w.model, wi });
  }
  const thumbs = weaponThumbs(items.map((i) => ({ key: i.key, parts: i.parts })));
  const parts = new Map(items.map((i) => [i.key, i.parts]));
  const none: Offer = { label: '', price: 0, can: false, note: '', owned: false };
  const offer = (it: GunItem): Offer => {
    const you = v.you();
    if (!you) return none;
    const money = you.cash + you.bank; // cash first, then the bank
    if (it.wi < 0) {
      const full = you.ar >= 100;
      return { label: full ? 'Armor full' : 'Buy armor', price: RULES.armorPrice, can: !full && money >= RULES.armorPrice, note: `Armor ${Math.round(you.ar)} / 100`, owned: false };
    }
    const w = WEAPONS[it.wi];
    const owned = you.w.some((h) => h[0] === it.wi);
    if (owned && w.clip === 0) return { label: 'Owned', price: 0, can: false, note: 'You have one', owned: true };
    if (owned) return { label: `Ammo +${w.ammoBundle}`, price: w.ammoPrice, can: money >= w.ammoPrice, note: 'Owned', owned: true };
    return { label: 'Buy', price: w.price, can: money >= w.price, note: '', owned: false };
  };
  return {
    title: v.shop,
    sub: 'Guns, ammo and body armor.',
    items: items.map((i) => ({ ...i, thumb: thumbs.get(i.key) ?? '' })),
    start: 1,
    stage: (canvas) => {
      const st = new WeaponStage(canvas);
      return { show: (k) => st.show(k, parts.get(k)!), render: (dt) => st.render(dt), spinBy: (r) => st.spinBy(r), dispose: () => st.dispose() };
    },
    offer,
    details: (it) => (it.wi < 0 ? '' : stats(it.wi)),
    money: () => { const y = v.you(); return !y ? '' : y.bank > 0 ? `Cash ${$(y.cash)} · Bank ${$(y.bank)}` : `Cash ${$(y.cash)}`; },
    buy: (it) => { const o = offer(it); v.buy(it.wi < 0 ? 'armor' : o.label === 'Buy' ? 'weapon' : 'ammo', it.wi < 0 ? '' : it.key); },
    close: v.close,
  };
}

/** Damage, fire rate, range and magazine against the strongest sold weapon. */
function stats(wi: number): string {
  const w = WEAPONS[wi];
  const sold = WEAPONS.filter((x) => x.price > 0);
  const dmg = (x: typeof w) => x.projectile ? x.projectile.blast * 1.2 : x.damage * (x.pellets ?? 1);
  const rows: [string, number, number, string][] = [
    ['Damage', dmg(w), Math.max(...sold.map(dmg)), w.projectile ? 'explosive' : `${w.damage}${w.pellets ? ` ×${w.pellets}` : ''}`],
    ['Fire rate', w.rate, Math.max(...sold.map((x) => x.rate)), `${w.rate}/s`],
    ['Range', w.range, Math.max(...sold.map((x) => x.range)), `${w.range} m`],
  ];
  if (w.clip) rows.push(['Magazine', Math.min(w.clip, 100), 100, `${w.clip}`]);
  return statBars(rows);
}
