// Gang turf: which district belongs to which gang, who hangs out on each block, and the gang's
// colours. Shared so the server's population and the client's map and graffiti agree.
import { DISTRICTS, FACTIONS, PEDS, ZONES } from '../packs';

/** Weight of the gang's own members among a turf block's street population. */
const MEMBER_WEIGHT = 4.5;

export const turfGang = (district: number): string | null => DISTRICTS[district]?.gang ?? null;

/** Archetype index of a gang's street soldiers. */
export function gangMember(gang: string): number {
  return PEDS.findIndex((p) => p.faction === gang && p.behaviour === 'gang');
}

/** Who walks a block's streets: the zone's people plus, on turf, the holding gang. */
export function pedPool(zone: number, district: number): { id: string; weight: number }[] {
  const base = ZONES[zone].peds;
  const gang = turfGang(district);
  if (!gang) return base;
  const m = gangMember(gang);
  return m >= 0 ? [...base, { id: PEDS[m].id, weight: MEMBER_WEIGHT }] : base;
}

export const gangCarColor = (gang: string): number | undefined => FACTIONS.find((f) => f.id === gang)?.carColor;

/** District indexes held by a gang. */
export const turfOf = (gang: string): number[] =>
  DISTRICTS.map((d, i) => (d.gang === gang ? i : -1)).filter((i) => i >= 0);
