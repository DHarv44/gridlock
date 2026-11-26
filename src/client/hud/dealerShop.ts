// The dealership's showroom (hud/showroom.ts runs it): every vehicle in stock on a card with its
// picture, the picked one turning on the paint shop's turntable, its numbers as bars. Bought cars go
// to your garage and are delivered outside.
import { paletteFor, VEHICLES, vehicleIndex } from '../../shared/packs';
import { onLegs } from '../../shared/sim/kinds';
import type { YouState } from '../../shared/protocol';
import { GarageScene } from '../render/garageScene';
import { vehicleThumbs } from '../render/vehicleThumbs';
import { $, type Offer, type ShopSpec, type ShowItem, statBars } from './showroom';

export interface DealerVisit {
  shop: string;
  stock: string[];               // vehicle ids on sale
  you: () => YouState | null;
  buy: (id: string) => void;
  close: () => void;
}

interface CarItem extends ShowItem { type: number; color: number }

/** Each model's showroom colour: one of its own paints, picked by name so it never changes. */
const showColor = (id: string, colors: Parameters<typeof paletteFor>[0]) => {
  const pal = paletteFor(colors);
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pal[h % pal.length];
};

const KIND = (t: number) => {
  const v = VEHICLES[t];
  if (v.movement === 'bike') return 'Motorbikes';
  if (onLegs(v)) return v.trailer ? 'Wagons' : 'Horses';
  if (v.length > 6) return 'Trucks & buses';
  if (v.maxSpeed >= 42) return 'Sports';
  if (v.height >= 1.7) return 'Utility';
  return 'Cars';
};

export function dealerShop(v: DealerVisit): ShopSpec<CarItem> {
  const raw = v.stock.map((id) => { const type = vehicleIndex(id); return { key: id, name: VEHICLES[type].name, group: KIND(type), type, color: showColor(id, VEHICLES[type].colors) }; });
  raw.sort((a, b) => VEHICLES[a.type].price - VEHICLES[b.type].price);
  const thumbs = vehicleThumbs(raw);
  const byKey = new Map(raw.map((r) => [r.key, r]));
  const sold = raw.map((r) => VEHICLES[r.type]);
  const max = (f: (x: (typeof sold)[number]) => number) => Math.max(...sold.map(f));
  const offer = (it: CarItem): Offer => {
    const you = v.you(), price = VEHICLES[it.type].price;
    return { label: 'Buy', price, can: !!you && you.cash + you.bank >= price, note: '', owned: false };
  };
  return {
    title: v.shop,
    sub: 'Bought vehicles go to your garage and are delivered here.',
    items: raw.map((r) => ({ ...r, thumb: thumbs.get(r.key) ?? '' })),
    stage: (canvas) => {
      const g = new GarageScene(canvas);
      return { show: (k) => { const c = byKey.get(k)!; g.setCar(c.type, c.color); }, render: (dt) => g.render(dt), spinBy: (r) => g.spinBy(r), dispose: () => g.dispose() };
    },
    offer,
    details: (it) => {
      const s = VEHICLES[it.type];
      return statBars([
        ['Top speed', s.maxSpeed, max((x) => x.maxSpeed), `${Math.round(s.maxSpeed * 3.6)} km/h`],
        ['Acceleration', s.accel, max((x) => x.accel), `${s.accel}`],
        ['Handling', s.grip * s.turnRate, max((x) => x.grip * x.turnRate), ''],
        ['Toughness', s.hp, max((x) => x.hp), `${s.hp}`],
        ['Seats', s.seats, max((x) => x.seats), `${s.seats}`],
      ]);
    },
    money: () => { const y = v.you(); return !y ? '' : y.bank > 0 ? `Cash ${$(y.cash)} · Bank ${$(y.bank)}` : `Cash ${$(y.cash)}`; },
    buy: (it) => v.buy(it.key),
    close: v.close,
  };
}
