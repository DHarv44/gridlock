import type { CrimeSpec, ServiceCall, Squad, WantedLevel } from './types';

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

/** Crimes: heat added when witnessed by a lawful unit (civilian witnesses report half), and the
 *  felony it puts on the offender's record (witnessed or not). `cooldown` stops one ongoing act
 *  (standing in a base, one blast) from being recorded many times. */
export const CRIMES = {
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
} satisfies Record<string, CrimeSpec>;

export type CrimeKind = keyof typeof CRIMES;

/** Felonies in record order (the order of CRIMES). */
export const FELONIES: { kind: CrimeKind; label: string }[] = (Object.entries(CRIMES) as [CrimeKind, CrimeSpec][])
  .filter(([, c]) => c.felony).map(([kind, c]) => ({ kind, label: c.felony! }));

export const SERVICE_CALLS: { medic: ServiceCall; fire: ServiceCall } = {
  medic: { squad: { vehicle: 'ambulance', crew: ['paramedic', 'paramedic'] }, maxActive: 3 },
  fire: { squad: { vehicle: 'firetruck', crew: ['firefighter', 'firefighter'] }, maxActive: 2 },
};

export const RULES = {
  maxPlayers: 6,
  /** Every room is the same city, so a character's last spot means the same place in any room. */
  citySeed: 1337,
  /** Soldiers leave players alone unless they're inside a fenced compound (a base), wanted at
   *  least this badly (the level the army is called in at), or attacked a soldier lately. */
  militaryWanted: 5,
  militaryGrudgeS: 30,
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
  // Businesses (server/game/systems/business.ts). Income piles up in each business's safe, up to
  // this many game hours of it; whatever's left at midnight goes to the bank, less the fee.
  safeHours: 8,
  safeSweepFee: 0.1,
  // Once a game day, a gang that respects you less than this may lean on a business on its turf.
  troubleBelow: 15,
  troubleChance: 0.5,
  troubleCrew: 3,
  troubleSeconds: 150,       // deal with them by then or they empty the safe
  payoffHours: 4,            // paying them off costs this many hours of the place's income...
  payoffRespect: 6,          // ...and they think better of you for it
  fenceMul: 1.6,             // your warehouse pays this much over the chop shop for a stolen car
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
