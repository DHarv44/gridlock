import type { VehicleSpec } from '../../shared/packs/types';
import * as M from './vehicleModels';

type Base = Omit<VehicleSpec, 'id' | 'name' | 'model' | 'colors' | 'roles' | 'price'>;

// turnIn values follow GTA2's car data: sedans ~0.15, sports/police ~0.4, heavy vehicles 0.25.
// Plan-view body shapes (see BodyShape): how rounded the ends are and how much the cabin narrows.
const S = {
  saloon: { nose: 0.16, tail: 0.12, tumble: 0.24 },
  bubble: { nose: 0.3, tail: 0.24, tumble: 0.26, round: 0.24 },
  boxy: { nose: 0.1, tail: 0.05, tumble: 0.12 },
  coupe: { nose: 0.24, tail: 0.16, tumble: 0.32, round: 0.2, hips: 0.04 },
  gt: { nose: 0.34, tail: 0.24, tumble: 0.42, round: 0.26, hips: 0.08 },
  wedge: { nose: 0.42, tail: 0.14, tumble: 0.46, round: 0.32, hips: 0.1 },
  roadster: { nose: 0.32, tail: 0.24, tumble: 0.18, round: 0.26, hips: 0.07 },
  muscle: { nose: 0.1, tail: 0.08, tumble: 0.26, hips: 0.05 },
  mpv: { nose: 0.24, tail: 0.12, tumble: 0.2, round: 0.22 },
};

const car: Base = { movement: 'wheels', horn: 'horn', engine: 'engine_car', length: 4.6, width: 1.9, height: 1.45, mass: 1400, maxSpeed: 34, accel: 9, brake: 24, reverse: 9, grip: 8, turnRate: 2.5, turnIn: 0.15, hp: 350, seats: 4, shape: S.saloon };
const heavy: Base = { ...car, horn: 'horn_air', engine: 'engine_diesel', shape: undefined, length: 7.5, width: 2.5, height: 3.2, mass: 6000, maxSpeed: 24, accel: 4.5, brake: 14, reverse: 6, grip: 9, turnRate: 1.6, turnIn: 0.25, hp: 700, seats: 2 };
// Helicopters' cruising speed is accel / air drag (shared/sim/physics.ts HELI_DRAG): ~24 m/s here.
const chopper: Base = { movement: 'rotor', length: 11, width: 2.6, height: 3.2, mass: 2500, maxSpeed: 36, accel: 11, brake: 9, reverse: 10, grip: 1.2, turnRate: 1.9, hp: 650, seats: 4 };

// Boats: plan-view bow drawn to a point (BodyShape), and the 'moored' role (see the boats below).
const boat: Base & Pick<VehicleSpec, 'roles' | 'price'> = { movement: 'boat', length: 6, width: 2.2, height: 1.4, mass: 1500, maxSpeed: 25, accel: 6, brake: 5, reverse: 4, grip: 2, turnRate: 1.6, hp: 300, seats: 4, roles: ['moored'], price: 0,
  shape: { nose: 0.85, tail: 0.08, tumble: 0.1, round: 0.38 } };

export const VEHICLES: VehicleSpec[] = [
  { ...car, horn: 'horn_small', id: 'compact', name: 'Bolt Compact', length: 3.7, width: 1.7, height: 1.45, mass: 1000, maxSpeed: 30, accel: 8, price: 6000, colors: 'bright', roles: ['traffic', 'parked'], shape: S.bubble, model: M.compact() },
  { ...car, id: 'sedan', name: 'Regent Sedan', price: 11000, colors: 'civil', roles: ['traffic', 'parked'], model: M.sedan() },
  { ...car, horn: 'horn_small', id: 'hatchback', name: 'Kestrel Hatch', length: 4.1, maxSpeed: 33, accel: 9.5, price: 9000, colors: 'civil', roles: ['traffic', 'parked'], model: M.hatch() },
  { ...car, id: 'wagon', name: 'Homestead Wagon', length: 4.9, maxSpeed: 31, price: 10000, colors: 'dull', roles: ['traffic', 'parked'], model: M.wagon() },
  { ...car, engine: 'engine_sport', id: 'coupe', name: 'Vesper Coupe', turnIn: 0.3, length: 4.4, height: 1.3, maxSpeed: 40, accel: 11.5, grip: 8.5, turnRate: 2.7, price: 24000, colors: 'bright', roles: ['traffic', 'parked'], shape: S.coupe, model: M.coupe() },
  { ...car, engine: 'engine_sport', id: 'sports', name: 'Arrow GT', turnIn: 0.4, length: 4.5, height: 1.2, mass: 1300, maxSpeed: 47, accel: 14, brake: 28, grip: 9.5, turnRate: 2.8, hp: 300, seats: 2, price: 65000, colors: 'bright', roles: ['traffic', 'parked'], shape: S.gt, model: M.gt() },
  { ...car, engine: 'engine_sport', id: 'supercar', name: 'Zephyr X', turnIn: 0.4, length: 4.6, width: 2.0, height: 1.1, mass: 1350, maxSpeed: 55, accel: 17, brake: 32, grip: 10, turnRate: 2.9, hp: 280, seats: 2, price: 180000, colors: 'bright', roles: ['parked'], shape: S.wedge, model: M.supercar() },
  { ...car, horn: 'horn_deep', engine: 'engine_muscle', id: 'muscle', name: 'Brute', turnIn: 0.42, length: 4.9, maxSpeed: 44, accel: 13, grip: 6.5, turnRate: 2.5, price: 32000, colors: 'bright', roles: ['traffic', 'parked', 'gang'], shape: S.muscle, model: M.muscle() },
  { ...car, engine: 'engine_muscle', id: 'lowrider', name: 'Lowrider', length: 5.2, height: 1.3, maxSpeed: 32, accel: 8, grip: 7, price: 18000, colors: [15, 17, 16, 23, 10, 0], roles: ['gang', 'parked'], model: [...M.sedan(), ...M.stripe('chrome', 0.18, 0.22)] },
  { ...car, horn: 'horn_deep', engine: 'engine_suv', id: 'pickup', name: 'Haymaker Pickup', length: 5.2, width: 2.0, height: 1.7, mass: 2000, maxSpeed: 32, accel: 8.5, hp: 450, price: 16000, colors: 'dull', roles: ['traffic', 'parked'], shape: S.boxy, model: M.pickup() },
  { ...car, horn: 'horn_deep', engine: 'engine_suv', id: 'suv', name: 'Bastion SUV', length: 4.9, width: 2.0, height: 1.8, mass: 2200, maxSpeed: 35, accel: 9, hp: 480, price: 28000, colors: 'civil', roles: ['traffic', 'parked'], model: M.suv() },
  { ...car, horn: 'horn_deep', engine: 'engine_suv', id: 'van', name: 'Courier Van', length: 5.2, width: 2.0, height: 2.2, mass: 2400, maxSpeed: 29, accel: 7, hp: 500, price: 14000, colors: [0, 21, 2, 3, 6], roles: ['traffic', 'parked'], shape: S.boxy, model: M.van() },
  { ...car, horn: 'horn_deep', engine: 'engine_suv', id: 'minivan', name: 'Nestor Minivan', length: 5.0, width: 1.95, height: 1.8, mass: 1900, maxSpeed: 31, accel: 8, price: 13000, colors: 'civil', roles: ['traffic', 'parked'], shape: S.mpv, model: M.minivan() },
  { ...car, id: 'taxi', name: 'Cab', price: 12000, colors: [11], roles: ['traffic'], model: [...M.sedan(), ...M.roofSign('white')] },
  { ...car, id: 'limo', name: 'Stretch Limo', length: 7.6, width: 2.0, mass: 2600, maxSpeed: 33, accel: 7.5, turnRate: 2.0, hp: 500, seats: 6, price: 70000, colors: [1, 0, 22], roles: ['traffic'], model: M.limo() },
  { ...car, horn: 'horn_icecream', engine: 'engine_diesel', id: 'icecream', name: 'Ice Cream Van', length: 5.4, width: 2.1, height: 2.5, mass: 2600, maxSpeed: 26, accel: 6, hp: 500, price: 15000, colors: [0], roles: ['traffic'], shape: S.boxy, model: [...M.van(), ...M.stripe('#ff8fc8', 0.6, 0.75), ...M.roofSign('#ff8fc8')] },
  { ...heavy, horn: 'horn_bus', id: 'bus', name: 'City Bus', length: 11.5, width: 2.6, height: 3.2, mass: 11000, maxSpeed: 22, seats: 8, hp: 900, price: 60000, colors: [7, 0, 5], roles: ['traffic'], model: M.bus() },
  { ...heavy, id: 'boxtruck', name: 'Box Truck', price: 30000, colors: [0, 5, 7, 3], roles: ['traffic', 'parked'], model: M.boxTruck() },
  // A tractor turns like a truck: pivots on its rear axle, a 6.5 m turning radius at a crawl and
  // a cap on cornering force, so it takes a street corner up to ~45 km/h but not at speed
  // (scripts/semi.ts); the fifth wheel sits just ahead of the rear axle so the trailer follows
  // inside the turn.
  { ...heavy, id: 'semi', name: 'Hauler Rig', length: 6.6, width: 2.5, height: 3.2, maxSpeed: 26, mass: 9000, turnRate: 1.9, hp: 1000, price: 85000, colors: [5, 7, 1, 0, 12], roles: ['traffic', 'parked'], model: M.semiTractor(),
    rearAxle: 2.1, minTurnRadius: 6.5, maxLateral: 9,
    trailer: { length: 11, width: 2.55, height: 3.6, model: M.boxTrailer(), hitch: 1.85 } },
  { ...heavy, id: 'garbage', name: 'Garbage Truck', length: 8.5, mass: 9000, maxSpeed: 20, price: 35000, colors: [18, 9, 0], roles: ['traffic'], model: M.garbage() },
  { ...car, horn: 'horn_small', engine: 'engine_bike', id: 'streetbike', name: 'Streetbike', movement: 'bike', length: 2.1, width: 0.8, height: 1.2, mass: 220, maxSpeed: 46, accel: 15, brake: 22, grip: 10, turnRate: 3.2, hp: 150, seats: 2, openTop: true, price: 14000, colors: 'bright', roles: ['traffic', 'parked'], shape: undefined, model: M.bike(),
    saddles: [{ x: -0.22, z: 0.92, lean: 0.45 }, { x: -0.55, z: 0.98, lean: 0.2 }] },
  { ...car, horn: 'horn_small', engine: 'engine_bike', id: 'dirtbike', name: 'Dirt Bike', movement: 'bike', length: 2.0, width: 0.8, height: 1.2, mass: 120, maxSpeed: 36, accel: 13, brake: 18, grip: 8, turnRate: 3.4, hp: 120, seats: 1, openTop: true, price: 7000, colors: [12, 5, 18, 7], roles: ['parked'], shape: undefined, model: M.bike(),
    saddles: [{ x: -0.25, z: 1.0, lean: 0.2 }] },

  // Emergency services
  { ...car, engine: 'engine_muscle', id: 'police', name: 'Police Cruiser', turnIn: 0.43, maxSpeed: 41, accel: 12, hp: 420, price: 0, colors: [1], roles: ['police'], siren: true, model: [...M.sedan(), ...M.stripe('white', 0.25, 0.5), ...M.lightbar()] },
  { ...car, engine: 'engine_suv', id: 'police_suv', name: 'Police Interceptor', turnIn: 0.35, length: 4.9, width: 2.0, height: 1.8, mass: 2200, maxSpeed: 42, accel: 12, hp: 520, price: 0, colors: [0], roles: ['police'], siren: true, model: [...M.suv(), ...M.stripe('#1d3557', 0.3, 0.45), ...M.lightbar()] },
  { ...heavy, id: 'swat', name: 'SWAT Van', length: 6.2, width: 2.3, height: 2.6, maxSpeed: 32, accel: 7, hp: 1100, seats: 4, armored: true, price: 0, colors: [1], roles: ['police'], siren: true, model: [...M.van(), ...M.lightbar(0.2)] },
  { ...car, engine: 'engine_suv', id: 'federal', name: 'Federal SUV', turnIn: 0.35, length: 5.0, width: 2.0, height: 1.8, mass: 2400, maxSpeed: 44, accel: 12, hp: 600, price: 0, colors: [1], roles: ['police'], siren: true, model: [...M.suv(), ...M.lightbar(0.1)] },
  { ...heavy, id: 'ambulance', name: 'Ambulance', length: 6.2, width: 2.2, height: 2.7, mass: 3500, maxSpeed: 34, accel: 8, hp: 600, seats: 2, price: 0, colors: [0], roles: ['ambulance'], siren: true, model: [...M.boxTruck('white'), ...M.stripe('red', 0.45, 0.55), ...M.crossMark('red'), ...M.lightbar(0.35)] },
  { ...heavy, id: 'firetruck', name: 'Fire Truck', length: 9, width: 2.5, height: 3, mass: 12000, maxSpeed: 30, accel: 6, hp: 1200, seats: 2, price: 0, colors: [5], roles: ['fire'], siren: true, model: [...M.boxTruck('body'), ...M.ladder(), ...M.lightbar(0.35)] },

  // Military
  { ...car, horn: 'horn_deep', engine: 'engine_suv', id: 'jeep', name: 'Army Jeep', length: 4.3, width: 2.0, height: 1.7, mass: 1900, maxSpeed: 36, accel: 10, grip: 8.5, hp: 500, openTop: true, price: 0, colors: [20, 19], roles: ['military'], model: [...M.pickup()],
    saddles: [{ x: -0.2, y: -0.42, z: 0.8, lean: -0.12 }, { x: -0.2, y: 0.42, z: 0.8, lean: -0.12 }, { x: -1.4, y: -0.42, z: 0.8, lean: -0.12 }, { x: -1.4, y: 0.42, z: 0.8, lean: -0.12 }] },
  { ...heavy, id: 'army_truck', name: 'Army Truck', length: 7.8, mass: 8000, maxSpeed: 26, hp: 900, seats: 6, price: 0, colors: [19, 20], roles: ['military'], model: [...M.boxTruck('olive'), ...M.canopy()] },
  { ...heavy, id: 'tank', name: 'Battle Tank', movement: 'tracks', length: 7.6, width: 3.6, height: 2.6, mass: 50000, maxSpeed: 14, accel: 4, brake: 12, reverse: 6, grip: 20, turnRate: 1.1, hp: 3000, seats: 1, armored: true, crushes: true, weapons: ['tank_cannon'], turret: 1.4, price: 0, colors: [20, 19], roles: ['military'], model: M.tank() },

  // Aircraft
  { ...chopper, id: 'heli_police', name: 'Police Chopper', maxSpeed: 38, hp: 700, price: 0, colors: [1], roles: ['police_air'], siren: true, model: M.heli('white') },
  { ...chopper, id: 'heli_news', name: 'News Chopper', price: 0, colors: [0, 7], roles: ['helipad'], model: M.heli('red') },
  { ...chopper, id: 'heli_civil', name: 'Sky Lark', length: 9, width: 2.2, maxSpeed: 34, hp: 500, price: 220000, colors: 'bright', roles: ['helipad'], model: M.heli('white') },
  { ...chopper, id: 'gunship', name: 'Gunship', length: 13, width: 3, maxSpeed: 42, accel: 13, turnRate: 2.1, hp: 1800, seats: 2, armored: true, weapons: ['heli_gun', 'heli_rockets'], price: 0, colors: [19, 3], roles: ['military_air'], model: M.attackHeli() },

  // Added later: appended so existing type indices (saved garages) keep their meaning.
  { ...car, engine: 'engine_sport', id: 'roadster', name: 'Spyder', turnIn: 0.4, length: 4.2, width: 1.85, height: 1.15, mass: 1150, maxSpeed: 44, accel: 13.5, brake: 28, grip: 9.5, turnRate: 2.8, hp: 260, seats: 2, openTop: true, price: 48000, colors: 'bright', roles: ['traffic', 'parked'], shape: S.roadster, model: M.roadster(),
    saddles: [{ x: -0.45, y: -0.39, z: 0.66, lean: -0.15 }, { x: -0.45, y: 0.39, z: 0.66, lean: -0.15 }] },

  // Military utility vehicles: the Humvee and the MRAP, each also as a gun truck whose driver
  // aims a roof machine gun.
  { ...car, horn: 'horn_deep', engine: 'engine_diesel', id: 'humvee', name: 'Humvee', shape: undefined, turnIn: 0.25, length: 4.9, width: 2.2, height: 1.85, mass: 2500, maxSpeed: 33, accel: 9, grip: 8.5, hp: 650, seats: 4, price: 0, colors: [20, 19], roles: ['military'], model: M.suv() },
  { ...car, horn: 'horn_deep', engine: 'engine_diesel', id: 'humvee_gun', name: 'Humvee Gun Truck', shape: undefined, turnIn: 0.25, length: 4.9, width: 2.2, height: 1.85, mass: 2700, maxSpeed: 32, accel: 8.5, grip: 8.5, hp: 750, seats: 4, weapons: ['mounted_mg'], turret: 2.4, price: 0, colors: [20, 19], roles: ['military'], model: [...M.suv(), ...M.gunRing()] },
  { ...heavy, id: 'mrap', name: 'MRAP', length: 6.4, width: 2.55, height: 2.9, mass: 14000, maxSpeed: 27, accel: 5.5, brake: 13, hp: 1600, seats: 6, armored: true, price: 0, colors: [20, 19], roles: ['military'], model: M.boxTruck('olive') },
  { ...heavy, id: 'mrap_gun', name: 'MRAP Gunner', length: 6.4, width: 2.55, height: 2.9, mass: 14500, maxSpeed: 26, accel: 5.2, brake: 13, hp: 1700, seats: 6, armored: true, weapons: ['mounted_mg'], turret: 2.0, price: 0, colors: [20, 19], roles: ['military'], model: [...M.boxTruck('olive'), ...M.gunRing(0.15, 1.0)] },

  // More motorbikes: a long, low chopper (you sit back in it) and the police motorcycle.
  { ...car, horn: 'horn_deep', engine: 'engine_bike', id: 'chopper', name: 'Hellcat Chopper', movement: 'bike', length: 2.6, width: 0.95, height: 1.2, mass: 300, maxSpeed: 40, accel: 11, brake: 17, grip: 8.5, turnRate: 2.6, hp: 180, seats: 2, openTop: true, price: 22000, colors: 'bright', roles: ['traffic', 'parked'], shape: undefined, model: M.bike(),
    saddles: [{ x: -0.3, z: 0.74, lean: -0.08 }, { x: -0.68, z: 0.86, lean: -0.05 }] },
  { ...car, horn: 'horn_small', engine: 'engine_bike', id: 'police_bike', name: 'Police Motorcycle', movement: 'bike', length: 2.3, width: 1.0, height: 1.45, mass: 330, maxSpeed: 44, accel: 13, brake: 22, grip: 9.5, turnRate: 3.0, hp: 200, seats: 1, openTop: true, siren: true, price: 0, colors: [0], roles: ['police'], shape: undefined, model: [...M.bike(), ...M.lightbar(-0.35, 0.75)],
    saddles: [{ x: -0.2, z: 0.9, lean: 0.12 }] },

  // Boats: moored along the river and round the coast (role 'moored', not for sale: they'd be
  // delivered to a street). Low grip: they slide through their turns.
  { ...boat, engine: 'engine_sport', horn: 'horn_small', id: 'speedboat', name: 'Riptide Speedboat', length: 6.4, width: 2.3, height: 1.4, mass: 1500, maxSpeed: 30, accel: 7.5, brake: 6, reverse: 4, grip: 2.2, turnRate: 1.7, hp: 320, seats: 4, openTop: true, colors: 'bright', model: M.speedboat(),
    saddles: [{ x: -0.2, y: -0.6, z: 0.95, lean: -0.1 }, { x: -0.2, y: 0.6, z: 0.95, lean: -0.1 }, { x: -1.5, y: -0.5, z: 0.95, lean: -0.1 }, { x: -1.5, y: 0.5, z: 0.95, lean: -0.1 }] },
  { ...boat, engine: 'engine_bike', id: 'skiff', name: 'Gull Skiff', length: 4.2, width: 1.7, height: 0.9, mass: 400, maxSpeed: 14, accel: 4.5, brake: 4, reverse: 3, grip: 3, turnRate: 1.9, hp: 160, seats: 3, openTop: true, colors: 'dull', model: M.skiff(),
    saddles: [{ x: -1.55, z: 0.72, lean: -0.05 }, { x: -0.3, z: 0.72, lean: -0.05 }, { x: 0.9, z: 0.72, lean: -0.05 }] },
  { ...boat, engine: 'engine_diesel', horn: 'horn_air', id: 'cruiser', name: 'Harbourmaster Cruiser', length: 9.5, width: 3.1, height: 2.6, mass: 9000, maxSpeed: 18, accel: 3.5, brake: 4, reverse: 3, grip: 1.6, turnRate: 0.95, hp: 900, seats: 6, colors: 'dull', model: M.cruiser(),
    shape: { nose: 0.8, tail: 0.06, tumble: 0.12, round: 0.32 } },

  // Monster truck: a pickup shell on 1.7 m tyres. It rolls over cars like the tank does (`crushes`),
  // shrugs off crashes, and is quick but tall and wide, so it corners like a truck. Sold at the
  // dealer; now and then one sits parked somewhere.
  { ...car, horn: 'horn_air', engine: 'engine_muscle', id: 'monster', name: 'Earthshaker', shape: undefined, turnIn: 0.3, length: 5.8, width: 3.3, height: 3.4, mass: 4800, maxSpeed: 36, accel: 11, brake: 18, reverse: 8, grip: 9, turnRate: 2.1, hp: 1400, seats: 2, crushes: true, price: 120000, colors: 'bright', roles: ['parked'], model: M.monster() },
];
