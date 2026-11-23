// Pack schemas. Packs hold nouns (content, numbers, names). The engine holds verbs and
// only ever refers to pack entries through these fields, never by a pack id.

/** A box in a vehicle/prop model, in fractions of the object's length (x), width (y), height (z). */
export interface Part {
  x: [number, number];   // -0.5..0.5 along length (+ = front)
  y: [number, number];   // -0.5..0.5 across width (+ = right side)
  z: [number, number];   // 0..1 of height
  paint: Paint;
  /** Optional side silhouette [x, z] points; when set the part is this outline extruded across y. */
  profile?: [number, number][];
  tag?: 'rotor' | 'tailrotor' | 'turret' | 'barrel' | 'siren' | 'headlight' | 'taillight';
}

export type Paint = 'body' | 'glass' | 'dark' | 'chrome' | 'trim' | 'headlight' | 'taillight'
  | 'red' | 'blue' | 'white' | 'black' | 'yellow' | 'olive' | 'tire' | `#${string}`;

export type Movement = 'wheels' | 'bike' | 'tracks' | 'rotor';

export interface CrimeSpec {
  heat: number;
  /** Label on the offender's felony record; crimes without one (gunfire) only add heat. */
  felony?: string;
  /** Seconds before the same felony is recorded again for one player. */
  cooldown?: number;
}

/** Fractions of the body width lost toward the ends and the top. */
export interface BodyShape {
  nose: number;     // width lost at the very front (rounded corners)
  tail: number;     // width lost at the very back
  tumble: number;   // width lost at the roof (cabin narrower than the body)
  round?: number;   // length fraction over which the ends curve in; default 0.16
  hips?: number;    // extra width over the rear wheels (sports cars), fraction of width
}

export interface VehicleSpec {
  id: string;
  name: string;
  movement: Movement;
  length: number; width: number; height: number;
  mass: number;
  maxSpeed: number;     // m/s
  accel: number;        // m/s^2
  brake: number;        // m/s^2
  reverse: number;      // max reverse speed m/s
  grip: number;         // lateral grip (1/s)
  turnIn?: number;      // oversteer when steering at speed, 0..0.5 (GTA2 turn_in); default 0.15
  turnRate: number;     // rad/s at full lock
  hp: number;
  seats: number;
  price: number;        // dealer price; also chop-shop value base
  colors: number[] | 'civil' | 'bright' | 'dull';
  roles: string[];      // spawn roles: traffic, parked, police, ambulance, fire, military, ...
  siren?: boolean;
  armored?: boolean;    // occupants immune to small arms
  openTop?: boolean;    // occupants can be shot
  crushes?: boolean;    // drives over cars
  weapons?: string[];   // vehicle weapon ids fired by the driver
  model: Part[];
  /** Plan-view body shaping (seen from above): without it the body is a straight-sided box. */
  shape?: BodyShape;
  /** Articulated trailer hitched at the back of the vehicle (semis). */
  trailer?: { length: number; width: number; height: number; model: Part[] };
}

export type WeaponKind = 'melee' | 'hitscan' | 'projectile' | 'thrown' | 'flame';

export interface WeaponSpec {
  id: string;
  name: string;
  kind: WeaponKind;
  slot: number;            // 0 melee .. 7 heavy
  damage: number;
  rate: number;            // shots per second
  range: number;
  spread: number;          // radians
  pellets?: number;
  auto: boolean;
  clip: number;            // 0 = no ammo (melee)
  reload: number;          // seconds
  vehicleMul: number;      // damage multiplier vs vehicles
  price: number;           // 0 = not sold
  ammoPrice: number;       // price per clip refill bundle
  ammoBundle: number;
  projectile?: { speed: number; fuse?: number; radius: number; blast: number; fire?: boolean; arc?: boolean };
  tracer: string;
  sound: string;
  hold: 'fist' | 'one' | 'two' | 'heavy' | 'throw';
  vehicleOnly?: boolean;
  driveBy?: boolean;       // usable from a car window
  /** Display length of the held mesh in metres. */
  size: number;
}

export interface LoadoutEntry { weapon: string; chance: number; ammo: number }

export type Behaviour = 'civilian' | 'gang' | 'police' | 'military' | 'medic' | 'firefighter'
  | 'dealer' | 'streetwalker' | 'guard' | 'player';

export interface PedArchetype {
  id: string;
  name: string;
  behaviour: Behaviour;
  faction: string;
  hp: number;
  armor: number;
  walkSpeed: number;
  runSpeed: number;
  courage: number;        // 0 flees from everything, 1 always fights back
  accuracy: number;       // 0..1
  loadout: LoadoutEntry[];
  cash: [number, number];
  look: { skin: string[]; top: string[]; bottom: string[]; hat?: string[]; hatChance?: number; build?: number };
}

export interface FactionSpec {
  id: string;
  name: string;
  color: string;
  hostile: string[];      // factions attacked on sight
  lawful?: boolean;       // reports/punishes crime
  gang?: boolean;         // has respect, payphones and missions
}

export type MissionKind = 'hit' | 'torch' | 'steal' | 'courier' | 'frenzy';

export interface MissionSpec {
  id: string;
  kind: MissionKind;
  /** Who offers it: a gang faction id, 'gang' (any gang's phone) or 'crate' (kill-frenzy crates). */
  giver: string;
  title: string;
  /** Brief with tokens: {target} {rival} {place} {vehicle} {count} {reward} {time}. */
  brief: string;
  reward: [number, number];
  respect: number;              // gained with the giver on success
  rivalRespect: number;         // lost with the target gang on success
  time: number;                 // seconds, 0 = no limit
  distance: [number, number];   // metres from the phone to the job
  target?: {
    vehicle?: string;           // steal: vehicle id; torch: vehicle id (else the rival's gang car)
    hpMul?: number;             // hit: toughness multiplier for the mark
    escorts?: number;           // hit/torch: rival members guarding the target
    count?: number;             // frenzy: kills needed
    weapon?: string;            // frenzy: weapon handed out for the duration
  };
}

export interface GameMode {
  id: string;
  name: string;
  /** 'none' free roam; 'frags' player kills; 'earned' cash earned this round. */
  score: 'none' | 'frags' | 'earned';
  target: number;
  blurb: string;
}

export interface WeightedId { id: string; weight: number }

export interface ZoneSpec {
  id: string;
  name: string;
  mapColor: string;
  ground: string;               // lot ground colour
  sidewalk: string;
  lot: { min: number; max: number; setback: [number, number]; height: [number, number]; coverage: number };
  layout: 'buildings' | 'houses' | 'park' | 'docks' | 'compound';
  wall: string[];               // building wall colours
  roof: string[];
  trees: number;                // trees per 1000 m2 of open ground
  parkingChance: number;
  plazaChance: number;
  pedDensity: number;           // peds per 10,000 m2
  peds: WeightedId[];
  trafficDensity: number;       // cars per 100 m of road
  traffic: WeightedId[];
  parked: WeightedId[];
  parkedDensity: number;        // parked cars per 100 m of curb
  roadDrop: number;             // chance a minor road segment is removed
  fenced?: boolean;
  windows: number;              // 0 no windows .. 1 glass towers
}

export interface DistrictSpec { name: string; zone: string; x: number; y: number; weight?: number }

export type ServiceVerb = 'gunshop' | 'dealer' | 'respray' | 'chopshop' | 'hospital' | 'police'
  | 'fire' | 'military' | 'helipad';

export interface ServiceSpec {
  id: string;
  name: string;
  verb: ServiceVerb;
  zones: string[];
  count: number;
  sign: string;
  signText: string;             // short text on the storefront sign
  stock?: string[];             // weapon ids (gunshop) or vehicle ids (dealer)
  spawns?: { vehicle: string; count: number }[];
  guards?: { archetype: string; count: number }[];
  price?: number;               // respray cost
}

export interface PropertySpec {
  id: string;
  name: string;
  kind: 'home' | 'business';
  zones: string[];
  count: number;
  price: number;
  income: number;               // dollars per game hour (businesses)
  garage: number;               // cars stored (homes)
  signText?: string;            // storefront sign (businesses)
  signColor?: string;
}

export interface Squad { vehicle: string; crew: string[] }

export interface WantedLevel {
  heat: number;                 // heat needed to reach this level
  squads: { squad: Squad; max: number }[];
  lethal: boolean;              // cops shoot instead of arresting
}

export interface ServiceCall { squad: Squad; maxActive: number }
