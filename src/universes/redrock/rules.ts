// Redrock Territory's law: deputies on horseback first, then a posse, federal marshals, and at
// the top the cavalry with its gatling wagon. Crimes are worded for the territory; prices and
// wages in frontier dollars.
import type { Respect, Rules } from '../../shared/packs/defaults';
import type { CrimeKind, CrimeSpec, RoleCrew, ServiceCall, Squad, WantedLevel } from '../../shared/packs/types';

const deputy: Squad = { vehicle: 'law_horse', crew: ['deputy'] };
const deputies: Squad = { vehicle: 'law_horse', crew: ['deputy', 'deputy'] };
const marshal: Squad = { vehicle: 'law_horse', crew: ['marshal'] };
const posse: Squad = { vehicle: 'buckboard', crew: ['deputy', 'marshal'] };
const troopers: Squad = { vehicle: 'cavalry_horse', crew: ['trooper', 'trooper'] };
const gatling: Squad = { vehicle: 'gatling_wagon', crew: ['trooper', 'trooper', 'trooper'] };

export const WANTED: WantedLevel[] = [
  { heat: 10, lethal: false, respond: 14, every: 12, squads: [{ squad: deputy, max: 2 }] },
  { heat: 40, lethal: true, respond: 10, every: 8, squads: [{ squad: deputy, max: 3 }, { squad: deputies, max: 1 }] },
  { heat: 100, lethal: true, respond: 7, every: 6, squads: [{ squad: deputies, max: 3 }, { squad: posse, max: 1 }, { squad: marshal, max: 1 }] },
  { heat: 200, lethal: true, respond: 5, every: 5, squads: [{ squad: deputies, max: 3 }, { squad: marshal, max: 3 }, { squad: posse, max: 2 }] },
  { heat: 350, lethal: true, respond: 5, every: 4.5, squads: [{ squad: marshal, max: 3 }, { squad: troopers, max: 3 }, { squad: gatling, max: 1 }] },
];

export const CRIMES: Record<CrimeKind, CrimeSpec> = {
  gunfire: { heat: 2 },
  assault: { heat: 6, felony: 'Assault' },
  assaultLaw: { heat: 25, felony: 'Assaulting a lawman' },
  murder: { heat: 18, felony: 'Murder' },
  murderLaw: { heat: 60, felony: 'Killing a lawman' },
  vehicularHomicide: { heat: 18, felony: 'Trampling a man' },
  carjack: { heat: 8, felony: 'Highway robbery' },
  vehicleTheft: { heat: 6, felony: 'Horse theft' },
  explosion: { heat: 15, felony: 'Arson', cooldown: 3 },
  trespass: { heat: 30, felony: 'Trespassing on the fort', cooldown: 60 },
  bankRobbery: { heat: 200, felony: 'Bank robbery', cooldown: 30 },
  robbery: { heat: 30, felony: 'Armed robbery', cooldown: 20 },
};

export const SERVICE_CALLS: { medic: ServiceCall; fire: ServiceCall } = {
  medic: { squad: { vehicle: 'doctor_buggy', crew: ['doctor'] }, maxActive: 2 },
  fire: { squad: { vehicle: 'water_wagon', crew: ['volunteer', 'volunteer'] }, maxActive: 1 },
};

export const ROLE_CREWS: Record<string, RoleCrew> = {
  police: { driver: 'deputy', crew: true },
  military: { driver: 'trooper' },
};

export const RULES: Partial<Rules> = {
  cellPhone: false,
  jobPost: 'post',
  graffiti: false,
  clerk: 'clerk',
  counterGun: { weapon: 'shotgun', ammo: 6 },
  citySeed: 1876,
  startCash: 40,
  startWeapons: [{ weapon: 'revolver', ammo: 18 }],
  hospitalFee: 5,
  armorPrice: 30,
  healPrice: 3,
  vaultCash: [150, 300],
  chopValue: 0.3,
  // Riders thrown from a galloping horse: hurt above a canter, killed only by a full gallop into the ground.
  bailFall: 8,
  bailDie: 22,
};

export const RESPECT: Partial<Respect> = {
  phonesPerGang: 4,
};
