import type { ServiceCall, Squad, WantedLevel } from './types';

const patrol: Squad = { vehicle: 'police', crew: ['cop', 'cop'] };
const interceptor: Squad = { vehicle: 'police_suv', crew: ['cop', 'cop'] };
const swat: Squad = { vehicle: 'swat', crew: ['swat', 'swat', 'swat', 'swat'] };
const air: Squad = { vehicle: 'heli_police', crew: ['cop', 'swat'] };
const feds: Squad = { vehicle: 'federal', crew: ['agent', 'agent', 'agent'] };
const army: Squad = { vehicle: 'army_truck', crew: ['soldier', 'soldier', 'soldier', 'soldier'] };
const armor: Squad = { vehicle: 'tank', crew: ['soldier'] };
const gunship: Squad = { vehicle: 'gunship', crew: ['soldier'] };

/** Wanted levels 1..5 (index 0 = level 1). */
export const WANTED: WantedLevel[] = [
  { heat: 10, lethal: false, squads: [{ squad: patrol, max: 2 }] },
  { heat: 40, lethal: true, squads: [{ squad: patrol, max: 3 }, { squad: interceptor, max: 1 }] },
  { heat: 100, lethal: true, squads: [{ squad: patrol, max: 2 }, { squad: interceptor, max: 2 }, { squad: swat, max: 1 }, { squad: air, max: 1 }] },
  { heat: 200, lethal: true, squads: [{ squad: interceptor, max: 2 }, { squad: swat, max: 2 }, { squad: feds, max: 2 }, { squad: air, max: 1 }] },
  { heat: 350, lethal: true, squads: [{ squad: feds, max: 2 }, { squad: army, max: 2 }, { squad: armor, max: 2 }, { squad: gunship, max: 1 }] },
];

/** Heat added per crime when witnessed by a lawful unit (civilian witnesses report half). */
export const CRIMES = {
  gunfire: 2,
  assault: 6,
  murder: 18,
  assaultLaw: 25,
  murderLaw: 60,
  carjack: 8,
  vehicleTheft: 4,
  explosion: 15,
  trespass: 30,
};

export const SERVICE_CALLS: { medic: ServiceCall; fire: ServiceCall } = {
  medic: { squad: { vehicle: 'ambulance', crew: ['paramedic', 'paramedic'] }, maxActive: 3 },
  fire: { squad: { vehicle: 'firetruck', crew: ['firefighter', 'firefighter'] }, maxActive: 2 },
};

export const RULES = {
  maxPlayers: 6,
  startCash: 2500,
  startWeapons: [{ weapon: 'pistol', ammo: 60 }],
  deathCashLoss: 0.15,       // fraction of carried cash dropped on death
  hospitalFee: 300,
  bustedFine: 0.2,           // fraction of cash paid when arrested
  loseWeaponsOnDeath: true,
  heatDecayPerSec: 2.2,      // when no lawful unit can see you
  heatSightRange: 70,
  witnessRange: 40,
  gameMinutesPerSecond: 1,   // a day lasts 24 real minutes
  armorPrice: 600,
  healPrice: 200,
  pedCap: 260,
  carCap: 140,
  vehicleCap: 300,           // all vehicles incl. parked
  pedCapPerPlayer: 55,
  carCapPerPlayer: 32,
  spawnRadius: [85, 165] as [number, number],
  despawnRadius: 210,
  interestRadius: 190,
  chopValue: 0.25,           // chop shop pays this fraction of a vehicle's price
  revivePayout: 0,
  killBounty: 0,
};
