// Paint shop menu (GTA-style respray): pick a colour, see it on your car, pay to spray. A new coat
// also fixes the car and loses the cops.
import { PALETTE, PALETTE_NAMES, SERVICES } from '../../shared/packs';
import type { Place } from '../../shared/world/cityTypes';
import type { PaneContent } from './pane';
import type { Buy } from './places';

/** `current`: the car's colour now; `preview(i | null)` shows a colour on the car while browsing. */
export function paintContent(place: Place, cash: number, wanted: boolean, current: number, buy: Buy, preview: (color: number | null) => void, done: () => void): PaneContent {
  const price = SERVICES[place.spec].price ?? 500;
  const spray = (id: string) => () => { buy('respray', id, place.id); done(); };
  return {
    title: place.name,
    subtitle: cash < price ? `A respray is $${price}. You can't cover it.` : wanted ? `$${price}. New paint, repairs, and the cops lose you.` : `$${price}. New paint and repairs.`,
    swatches: PALETTE.map((hex, i) => ({
      color: hex, label: PALETTE_NAMES[i] ?? hex, on: i === current,
      onClick: spray(String(i)), onHover: (over) => preview(over ? i : null),
    })),
    rows: [{ name: 'Surprise me', sub: 'Any colour but this one', price: `$${price}`, affordable: cash >= price, onClick: spray('') }],
  };
}
