// What a vehicle's material does, in one place (VehicleSpec.material is the noun; this is the verb):
// how a hit on it shows, whether it dents, smokes when hurt, burns and blows up at the end, and how
// it looks once it's done for. A new material is one entry.
import type { VehicleSpec } from './packs/types';
import { HIT } from './protocol';

export type Material = NonNullable<VehicleSpec['material']>;

export interface MaterialTraits {
  /** What a bullet hitting it shows (sparks off metal, dust off wood, blood from flesh). */
  hit: number;
  /** Bleeds where it's hit. */
  bleeds?: boolean;
  /** Takes dents (the crumple shader) and smokes from under the bonnet when badly hurt. */
  dents?: boolean;
  smokes?: boolean;
  /** At 0 hp it burns a few seconds and then blows up; otherwise it goes down where it is (riders
   *  thrown, nothing burns). */
  explodes?: boolean;
  /** A wreck is drawn burnt out (charred, smouldering); otherwise in its own colours. */
  charred?: boolean;
  /** Done for, it lies on its side (a horse); otherwise it stays upright. */
  liesDown?: boolean;
}

export const MATERIALS: Record<Material, MaterialTraits> = {
  metal: { hit: HIT.metal, dents: true, smokes: true, explodes: true, charred: true },
  wood: { hit: HIT.wall },
  flesh: { hit: HIT.flesh, bleeds: true, liesDown: true },
};

export const materialOf = (spec: VehicleSpec): MaterialTraits => MATERIALS[spec.material ?? 'metal'];
