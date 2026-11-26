import type { CrimeKind, CrimeSpec, RoleCrew, ServiceCall, Squad, WantedLevel } from '../../shared/packs/types';
import type { Respect, Rules } from '../../shared/packs/defaults';

const patrol: Squad = { vehicle: 'police', crew: ['cop', 'cop'] };
const motor: Squad = { vehicle: 'police_bike', crew: ['cop'] };
const interceptor: Squad = { vehicle: 'police_suv', crew: ['cop', 'cop'] };
const swat: Squad = { vehicle: 'swat', crew: ['swat', 'swat', 'swat', 'swat'] };
const air: Squad = { vehicle: 'heli_police', crew: ['cop', 'swat'] };
const feds: Squad = { vehicle: 'federal', crew: ['agent', 'agent', 'agent'] };
const army: Squad = { vehicle: 'army_truck', crew: ['soldier', 'soldier', 'soldier', 'soldier'] };
const gunTruck: Squad = { vehicle: 'humvee_gun', crew: ['soldier', 'soldier', 'soldier'] };
const mrap: Squad = { vehicle: 'mrap_gun', crew: ['soldier', 'soldier', 'soldier', 'soldier'] };
const armor: Squad = { vehicle: 'tank', crew: ['soldier'] };
const gunship: Squad = { vehicle: 'gunship', crew: ['soldier'] };

/** Wanted levels 1..5 (index 0 = level 1). */
export const WANTED: WantedLevel[] = [
  { heat: 10, lethal: false, respond: 10, every: 9, squads: [{ squad: patrol, max: 3 }, { squad: motor, max: 1 }] },
  { heat: 40, lethal: true, respond: 7, every: 6, squads: [{ squad: patrol, max: 4 }, { squad: motor, max: 2 }, { squad: interceptor, max: 2 }] },
  { heat: 100, lethal: true, respond: 5, every: 4.5, squads: [{ squad: patrol, max: 3 }, { squad: interceptor, max: 2 }, { squad: swat, max: 2 }, { squad: air, max: 1 }] },
  { heat: 200, lethal: true, respond: 3, every: 3.5, squads: [{ squad: interceptor, max: 2 }, { squad: swat, max: 2 }, { squad: feds, max: 2 }, { squad: air, max: 1 }] },
  { heat: 350, lethal: true, respond: 3, every: 3.5, squads: [{ squad: feds, max: 2 }, { squad: army, max: 1 }, { squad: gunTruck, max: 2 }, { squad: mrap, max: 1 }, { squad: armor, max: 1 }, { squad: gunship, max: 1 }] },
];

/** Crimes: heat added when witnessed by a lawful unit (civilian witnesses report half), and the
 *  felony it puts on the offender's record (witnessed or not). `cooldown` stops one ongoing act
 *  (standing in a base, one blast) from being recorded many times. */
export const CRIMES: Record<CrimeKind, CrimeSpec> = {
  gunfire: { heat: 2 },
  assault: { heat: 6, felony: 'Assault' },
  assaultLaw: { heat: 25, felony: 'Assaulting an officer' },
  murder: { heat: 18, felony: 'Murder' },
  murderLaw: { heat: 60, felony: 'Murdering an officer' },
  vehicularHomicide: { heat: 18, felony: 'Vehicular homicide' },
  carjack: { heat: 8, felony: 'Carjacking' },
  vehicleTheft: { heat: 4, felony: 'Grand theft auto' },
  explosion: { heat: 15, felony: 'Arson', cooldown: 3 },
  trespass: { heat: 30, felony: 'Trespassing on a military base', cooldown: 60 },
  bankRobbery: { heat: 200, felony: 'Bank robbery', cooldown: 30 },
  robbery: { heat: 30, felony: 'Armed robbery', cooldown: 20 },
};

export const SERVICE_CALLS: { medic: ServiceCall; fire: ServiceCall } = {
  medic: { squad: { vehicle: 'ambulance', crew: ['paramedic', 'paramedic'] }, maxActive: 3 },
  fire: { squad: { vehicle: 'firetruck', crew: ['firefighter', 'firefighter'] }, maxActive: 2 },
};

/** Traffic drivers by vehicle role (first matching role wins); everything else is driven by a
 *  civilian of the zone. */
export const ROLE_CREWS: Record<string, RoleCrew> = {
  police: { driver: 'cop', partner: 'cop', partnerChance: 0.5, crew: true },
  military: { driver: 'soldier' },
};

/** Bayhaven plays on the engine's default tuning (packs/defaults.ts); these name its own ids. */
export const RULES: Partial<Rules> = {
  clerk: 'clerk',
  counterGun: { weapon: 'shotgun', ammo: 24 },
  startWeapons: [{ weapon: 'pistol', ammo: 60 }],
  citySeed: 1337,
};

export const RESPECT: Partial<Respect> = {};
