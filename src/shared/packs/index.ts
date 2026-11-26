// Pack registry: id -> index lookups shared by client and server. Index order is the wire format.
import { FACTIONS, PEDS } from './peds';
export { HAIR, SHOES } from './peds';
import { PROPERTIES, SERVICES } from './places';
import type { Behaviour, FactionSpec, PedArchetype, PropertySpec, ServiceSpec, VehicleSpec, WeaponSpec, ZoneSpec } from './types';
import { VEHICLES } from './vehicles';
import { WEAPONS } from './weapons';
import { DISTRICTS, ZONES } from './zones';

export { CRIMES, type CrimeKind, FELONIES, ROLE_CREWS, RULES, SERVICE_CALLS, WANTED } from './rules';
export { MARK_NAMES, MISSIONS, MODES, RESPECT } from './missions';
export { CALLERS, CALLS, type Caller, type CallSituation, cleanVoice, MENTOR_CALLER, namedClip, PEOPLE_CONTACTS, DEFAULT_VOICE, GANG_CALLERS, genderOf, PLAYER_LINES, PLAYER_SAYS, PLAYER_VOICES, type PlayerSituation, type Turn, type Voice, VOICE_SAMPLE, WELCOME_CALLER, YOU, youLineId } from './calls';
export { PALETTE, PALETTE_NAMES, paletteFor } from './palette';
export { RADIO, type RadioStation } from './radio';
export { ARMOR_MODEL } from './weaponModels';
export { INTERIOR_PLANS } from './interiorPlans';
export { CHARACTER_LOOKS, type CharacterLast, type CharacterProgress, type CharacterSave, type CharLook, cleanLook, cleanName, DEFAULT_LOOK, LOOK_PARTS, type LookPart, MAX_CHARACTERS, NAME_PARTS } from './characters';
export { DISTRICTS, FACTIONS, PEDS, PROPERTIES, SERVICES, VEHICLES, WEAPONS, ZONES };
export type * from './types';

function indexer<T extends { id: string }>(list: T[], kind: string) {
  const map = new Map<string, number>();
  list.forEach((e, i) => {
    if (map.has(e.id)) throw new Error(`duplicate ${kind} id ${e.id}`);
    map.set(e.id, i);
  });
  return (id: string): number => {
    const i = map.get(id);
    if (i === undefined) throw new Error(`unknown ${kind} id "${id}"`);
    return i;
  };
}

export const weaponIndex = indexer(WEAPONS, 'weapon');
export const vehicleIndex = indexer(VEHICLES, 'vehicle');
export const pedIndex = indexer(PEDS, 'ped');
export const zoneIndex = indexer(ZONES, 'zone');
export const factionIndex = indexer(FACTIONS, 'faction');
export const serviceIndex = indexer(SERVICES, 'service');
export const propertyIndex = indexer(PROPERTIES, 'property');

export const weapon = (id: string): WeaponSpec => WEAPONS[weaponIndex(id)];
export const vehicle = (id: string): VehicleSpec => VEHICLES[vehicleIndex(id)];
export const ped = (id: string): PedArchetype => PEDS[pedIndex(id)];
export const zone = (id: string): ZoneSpec => ZONES[zoneIndex(id)];
export const faction = (id: string): FactionSpec => FACTIONS[factionIndex(id)];
export const service = (id: string): ServiceSpec => SERVICES[serviceIndex(id)];
export const property = (id: string): PropertySpec => PROPERTIES[propertyIndex(id)];

/** Factions with respect, phones and missions. */
export const GANGS = FACTIONS.filter((f) => f.gang).map((f) => f.id);

/** Archetype used for player avatars (the one whose behaviour is 'player'). */
export const PLAYER_ARCHETYPE = PEDS.findIndex((p) => p.behaviour === 'player');
/** Weapon a ped always has (melee, no ammo, price 0). */
export const UNARMED = WEAPONS.findIndex((w) => w.kind === 'melee' && w.price === 0);

/** The first ped archetype with this behaviour (-1 if the pack has none). */
export const pedWith = (b: Behaviour): number => PEDS.findIndex((p) => p.behaviour === b);

/** Factions whose members enforce the law (`lawful`). */
const LAWFUL_FACTIONS = new Set(FACTIONS.filter((f) => f.lawful).map((f) => f.id));
export const lawfulFaction = (id: string): boolean => LAWFUL_FACTIONS.has(id);
const WITNESS_FACTIONS = new Set(FACTIONS.filter((f) => f.witness).map((f) => f.id));
export const witnessFaction = (id: string): boolean => WITNESS_FACTIONS.has(id);

export function hostile(a: string, b: string): boolean {
  return faction(a).hostile.includes(b) || faction(b).hostile.includes(a);
}
