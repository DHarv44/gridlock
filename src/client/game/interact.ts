// Finds the shop/property the player is standing at and drives its pane.
import { PROPERTIES, SERVICES } from '../../shared/packs';
import { Mode, type Profile, type YouState } from '../../shared/protocol';
import { atmsOf } from '../../shared/world/atms';
import type { City, Place } from '../../shared/world/cityTypes';
import type { Pane } from '../hud/pane';
import { type Buy, propertyContent, serviceContent } from '../hud/places';

// Respray and chop shop work like GTA2 garages: just drive in (handled by the server).
const DRIVE_IN = new Set(['dealer']);
const AUTOMATIC = new Set(['respray', 'chopshop', 'military', 'helipad', 'gas']); // gas: no counter (yet); its ATM works

export interface Spot { place: Place; property: boolean }

export class Interact {
  current: Spot | null = null;
  private openSpot: Spot | null = null;

  /** ATMs as places to walk up to (verb 'atm'; id -1 - the ATM's id, which the server expects). */
  private atms: Place[];

  constructor(private city: City, private pane: Pane) {
    this.atms = atmsOf(city).map((a) => ({ id: -1 - a.id, lot: -1, verb: 'atm', spec: -1, x: a.x, y: a.y, name: 'ATM' }));
  }

  /** Nearest usable place for the current position/mode, or null. */
  find(x: number, y: number, you: YouState): Spot | null {
    if (you.mode === Mode.Dead || you.mode === Mode.Busted || you.mode === Mode.Passenger) return null;
    const driving = you.mode === Mode.Driver;
    let best: Spot | null = null, bd = Infinity;
    const consider = (place: Place, property: boolean) => {
      const verb = property ? PROPERTIES[place.spec].kind : place.verb;
      const dDoor = Math.hypot(place.x - x, place.y - y);
      const dPad = place.pad ? Math.hypot(place.pad.x - x, place.pad.y - y) : Infinity;
      let d = Infinity;
      if (!driving && dDoor < 3.2) d = dDoor;
      if (driving && DRIVE_IN.has(verb) && dPad < 8) d = dPad;
      if (!driving && verb === 'dealer' && dPad < 5) d = dPad;
      if (d < bd) { bd = d; best = { place, property }; }
    };
    for (const s of this.city.services) if (!AUTOMATIC.has(SERVICES[s.spec].verb)) consider(s, false);
    for (const p of this.city.properties) consider(p, true);
    for (const a of this.atms) consider(a, false);
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

  /** Paint shop pad the menu last opened for; it opens once per visit, not again until you leave. */
  private visited = -1;

  /** GTA-style paint shop: stopping your car on the pad opens the colour menu. */
  paintShop(x: number, y: number, speed: number, you: YouState, open: (place: Place) => void): void {
    const place = you.mode === Mode.Driver
      ? this.city.services.find((s) => SERVICES[s.spec].verb === 'respray' && s.pad && Math.hypot(s.pad.x - x, s.pad.y - y) < 6)
      : undefined;
    if (!place) { this.visited = -1; return; }
    if (this.pane.isOpen || speed > 3 || this.visited === place.id) return;
    this.visited = place.id;
    this.openSpot = { place, property: false };
    open(place);
  }

  /** Closes the pane when the player walks away. */
  tick(x: number, y: number): void {
    if (!this.openSpot || !this.pane.isOpen) return;
    const p = this.openSpot.place;
    const d = Math.min(Math.hypot(p.x - x, p.y - y), p.pad ? Math.hypot(p.pad.x - x, p.pad.y - y) : Infinity);
    if (d > 11) this.pane.close();
  }
}
