// What each service verb is, in one place. Verbs are engine behaviour (packs pick a verb for each
// service); these traits say how a verb's place is laid out and used, so world generation, the
// renderer and the client's interaction all agree. A new verb is one entry here.
import type { ServiceVerb } from './packs/types';

export interface VerbTraits {
  /** Where it goes: a building lot facing a street (`storefront`), a gas-station `forecourt`, an
   *  open lot cleared of its building (`clearing`: helipads), or a compound's pad lot (`compound`). */
  site: 'storefront' | 'forecourt' | 'clearing' | 'compound';
  /** A vehicle pad is carved out in front of the building (the lot must be deep enough). */
  pad?: boolean;
  /** The storefront is a wide garage door rather than a shop door. */
  garage?: boolean;
  /** Works by being there (the server handles it); there's nothing to press E for. */
  automatic?: boolean;
  /** Its pad can be used from the driver's seat (and on foot, close up). */
  driveUp?: boolean;
  /** E opens the shop pane on its stock (a showroom / counter with goods). */
  shop?: boolean;
}

export const VERBS: Record<ServiceVerb, VerbTraits> = {
  gunshop: { site: 'storefront', shop: true },
  dealer: { site: 'storefront', pad: true, garage: true, driveUp: true, shop: true },
  respray: { site: 'storefront', pad: true, garage: true, automatic: true },
  chopshop: { site: 'storefront', pad: true, garage: true, automatic: true },
  hospital: { site: 'storefront', pad: true },
  police: { site: 'storefront', pad: true, garage: true, automatic: true },
  fire: { site: 'storefront', pad: true, garage: true },
  military: { site: 'compound', automatic: true },
  helipad: { site: 'clearing', automatic: true },
  bank: { site: 'storefront' },
  gas: { site: 'forecourt', automatic: true },
};

/** Traits of a place's verb; places that aren't services (ATMs, lifts, properties) have none. */
export const verbOf = (verb: string): VerbTraits | undefined => VERBS[verb as ServiceVerb];
