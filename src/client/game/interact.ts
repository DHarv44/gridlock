// Finds the shop/property the player is standing at and drives its pane.
import { PROPERTIES, SERVICES } from '../../shared/packs';
import { Mode, type Profile, type YouState } from '../../shared/protocol';
import type { City, Place } from '../../shared/world/cityTypes';
import type { Pane } from '../hud/pane';
import { type Buy, propertyContent, serviceContent } from '../hud/places';

const DRIVE_IN = new Set(['respray', 'chopshop', 'dealer']);

export interface Spot { place: Place; property: boolean }

export class Interact {
  current: Spot | null = null;
  private openSpot: Spot | null = null;

  constructor(private city: City, private pane: Pane) {}

  /** Nearest usable place for the current position/mode, or null. */
  find(x: number, y: number, you: YouState): Spot | null {
    if (you.mode === Mode.Dead || you.mode === Mode.Busted || you.mode === Mode.Passenger) return null;
    const driving = you.mode === Mode.Driver;
    let best: Spot | null = null, bd = Infinity;
    const consider = (place: Place, property: boolean) => {
      const verb = property ? PROPERTIES[place.spec].kind : SERVICES[place.spec].verb;
      const dDoor = Math.hypot(place.x - x, place.y - y);
      const dPad = place.pad ? Math.hypot(place.pad.x - x, place.pad.y - y) : Infinity;
      let d = Infinity;
      if (!driving && dDoor < 3.2) d = dDoor;
      if (driving && DRIVE_IN.has(verb) && dPad < 8) d = dPad;
      if (!driving && verb === 'dealer' && dPad < 5) d = dPad;
      if (d < bd) { bd = d; best = { place, property }; }
    };
    for (const s of this.city.services) if (SERVICES[s.spec].verb !== 'military' && SERVICES[s.spec].verb !== 'helipad') consider(s, false);
    for (const p of this.city.properties) consider(p, true);
    return best;
  }

  promptText(s: Spot | null, owners: Map<number, string>, myName: string): string | null {
    if (!s) return null;
    if (!s.property) return s.place.name;
    const owner = owners.get(s.place.id);
    const spec = PROPERTIES[s.place.spec];
    if (!owner) return `${s.place.name} · for sale $${spec.price.toLocaleString('en-US')}`;
    return owner === myName.toLowerCase() ? `${s.place.name} · yours` : `${s.place.name} · owned by ${owner}`;
  }

  toggle(you: () => YouState, profile: () => Profile, owners: Map<number, string>, myName: string, buy: Buy): void {
    if (this.pane.isOpen && this.openSpot) { this.pane.close(); return; }
    const s = this.current;
    if (!s) return;
    this.openSpot = s;
    this.pane.onClose = () => { this.openSpot = null; };
    this.pane.open(() => s.property
      ? propertyContent(s.place, you(), profile(), owners.get(s.place.id) ?? null, myName, buy)
      : serviceContent(s.place, you(), buy));
  }

  /** Closes the pane when the player walks away. */
  tick(x: number, y: number): void {
    if (!this.openSpot || !this.pane.isOpen) return;
    const p = this.openSpot.place;
    const d = Math.min(Math.hypot(p.x - x, p.y - y), p.pad ? Math.hypot(p.pad.x - x, p.pad.y - y) : Infinity);
    if (d > 11) this.pane.close();
  }
}
