import type { VehicleSpec } from './types';
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

const car: Base = { movement: 'wheels', length: 4.6, width: 1.9, height: 1.45, mass: 1400, maxSpeed: 34, accel: 9, brake: 24, reverse: 9, grip: 8, turnRate: 2.5, turnIn: 0.15, hp: 350, seats: 4, shape: S.saloon };
const heavy: Base = { ...car, shape: undefined, length: 7.5, width: 2.5, height: 3.2, mass: 6000, maxSpeed: 24, accel: 4.5, brake: 14, reverse: 6, grip: 9, turnRate: 1.6, turnIn: 0.25, hp: 700, seats: 2 };
const chopper: Base = { movement: 'rotor', length: 11, width: 2.6, height: 3.2, mass: 2500, maxSpeed: 36, accel: 9, brake: 9, reverse: 10, grip: 1.2, turnRate: 1.9, hp: 650, seats: 4 };

export const VEHICLES: VehicleSpec[] = [
  { ...car, id: 'compact', name: 'Bolt Compact', length: 3.7, width: 1.7, height: 1.45, mass: 1000, maxSpeed: 30, accel: 8, price: 6000, colors: 'bright', roles: ['traffic', 'parked'], shape: S.bubble, model: M.compact() },
  { ...car, id: 'sedan', name: 'Regent Sedan', price: 11000, colors: 'civil', roles: ['traffic', 'parked'], model: M.sedan() },
  { ...car, id: 'hatchback', name: 'Kestrel Hatch', length: 4.1, maxSpeed: 33, accel: 9.5, price: 9000, colors: 'civil', roles: ['traffic', 'parked'], model: M.hatch() },
  { ...car, id: 'wagon', name: 'Homestead Wagon', length: 4.9, maxSpeed: 31, price: 10000, colors: 'dull', roles: ['traffic', 'parked'], model: M.wagon() },
  { ...car, id: 'coupe', name: 'Vesper Coupe', turnIn: 0.3, length: 4.4, height: 1.3, maxSpeed: 40, accel: 11.5, grip: 8.5, turnRate: 2.7, price: 24000, colors: 'bright', roles: ['traffic', 'parked'], shape: S.coupe, model: M.coupe() },
  { ...car, id: 'sports', name: 'Arrow GT', turnIn: 0.4, length: 4.5, height: 1.2, mass: 1300, maxSpeed: 47, accel: 14, brake: 28, grip: 9.5, turnRate: 2.8, hp: 300, seats: 2, price: 65000, colors: 'bright', roles: ['traffic', 'parked'], shape: S.gt, model: M.gt() },
  { ...car, id: 'supercar', name: 'Zephyr X', turnIn: 0.4, length: 4.6, width: 2.0, height: 1.1, mass: 1350, maxSpeed: 55, accel: 17, brake: 32, grip: 10, turnRate: 2.9, hp: 280, seats: 2, price: 180000, colors: 'bright', roles: ['parked'], shape: S.wedge, model: M.supercar() },
  { ...car, id: 'muscle', name: 'Brute', turnIn: 0.42, length: 4.9, maxSpeed: 44, accel: 13, grip: 6.5, turnRate: 2.5, price: 32000, colors: 'bright', roles: ['traffic', 'parked', 'gang'], shape: S.muscle, model: M.muscle() },
  { ...car, id: 'lowrider', name: 'Lowrider', length: 5.2, height: 1.3, maxSpeed: 32, accel: 8, grip: 7, price: 18000, colors: [15, 17, 16, 23, 10, 0], roles: ['gang', 'parked'], model: [...M.sedan(), ...M.stripe('chrome', 0.18, 0.22)] },
  { ...car, id: 'pickup', name: 'Haymaker Pickup', length: 5.2, width: 2.0, height: 1.7, mass: 2000, maxSpeed: 32, accel: 8.5, hp: 450, price: 16000, colors: 'dull', roles: ['traffic', 'parked'], shape: S.boxy, model: M.pickup() },
  { ...car, id: 'suv', name: 'Bastion SUV', length: 4.9, width: 2.0, height: 1.8, mass: 2200, maxSpeed: 35, accel: 9, hp: 480, price: 28000, colors: 'civil', roles: ['traffic', 'parked'], model: M.suv() },
  { ...car, id: 'van', name: 'Courier Van', length: 5.2, width: 2.0, height: 2.2, mass: 2400, maxSpeed: 29, accel: 7, hp: 500, price: 14000, colors: [0, 21, 2, 3, 6], roles: ['traffic', 'parked'], shape: S.boxy, model: M.van() },
  { ...car, id: 'minivan', name: 'Nestor Minivan', length: 5.0, width: 1.95, height: 1.8, mass: 1900, maxSpeed: 31, accel: 8, price: 13000, colors: 'civil', roles: ['traffic', 'parked'], shape: S.mpv, model: M.minivan() },
  { ...car, id: 'taxi', name: 'Cab', price: 12000, colors: [11], roles: ['traffic'], model: [...M.sedan(), ...M.roofSign('white')] },
  { ...car, id: 'limo', name: 'Stretch Limo', length: 7.6, width: 2.0, mass: 2600, maxSpeed: 33, accel: 7.5, turnRate: 2.0, hp: 500, seats: 6, price: 70000, colors: [1, 0, 22], roles: ['traffic'], model: M.limo() },
  { ...car, id: 'icecream', name: 'Ice Cream Van', length: 5.4, width: 2.1, height: 2.5, mass: 2600, maxSpeed: 26, accel: 6, hp: 500, price: 15000, colors: [0], roles: ['traffic'], shape: S.boxy, model: [...M.van(), ...M.stripe('#ff8fc8', 0.6, 0.75), ...M.roofSign('#ff8fc8')] },
  { ...heavy, id: 'bus', name: 'City Bus', length: 11.5, width: 2.6, height: 3.2, mass: 11000, maxSpeed: 22, seats: 8, hp: 900, price: 60000, colors: [7, 0, 5], roles: ['traffic'], model: M.bus() },
  { ...heavy, id: 'boxtruck', name: 'Box Truck', price: 30000, colors: [0, 5, 7, 3], roles: ['traffic', 'parked'], model: M.boxTruck() },
  // A tractor turns like a truck: pivots on its rear axle, 11 m turning circle at a crawl, and
  // no more cornering force than a loaded rig can take; the fifth wheel sits just ahead of the
  // rear axle so the trailer follows inside the turn.
  { ...heavy, id: 'semi', name: 'Hauler Rig', length: 6.6, width: 2.5, height: 3.2, maxSpeed: 26, mass: 9000, turnRate: 1.9, hp: 1000, price: 85000, colors: [5, 7, 1, 0, 12], roles: ['traffic', 'parked'], model: M.semiTractor(),
    rearAxle: 2.1, minTurnRadius: 11, maxLateral: 3.5,
    trailer: { length: 11, width: 2.55, height: 3.6, model: M.boxTrailer(), hitch: 1.85 } },
  { ...heavy, id: 'garbage', name: 'Garbage Truck', length: 8.5, mass: 9000, maxSpeed: 20, price: 35000, colors: [18, 9, 0], roles: ['traffic'], model: M.garbage() },
  { ...car, id: 'streetbike', name: 'Streetbike', movement: 'bike', length: 2.1, width: 0.8, height: 1.2, mass: 220, maxSpeed: 46, accel: 15, brake: 22, grip: 10, turnRate: 3.2, hp: 150, seats: 2, openTop: true, price: 14000, colors: 'bright', roles: ['traffic', 'parked'], shape: undefined, model: M.bike() },
  { ...car, id: 'dirtbike', name: 'Dirt Bike', movement: 'bike', length: 2.0, width: 0.8, height: 1.2, mass: 120, maxSpeed: 36, accel: 13, brake: 18, grip: 8, turnRate: 3.4, hp: 120, seats: 1, openTop: true, price: 7000, colors: [12, 5, 18, 7], roles: ['parked'], shape: undefined, model: M.bike() },

  // Emergency services
  { ...car, id: 'police', name: 'Police Cruiser', turnIn: 0.43, maxSpeed: 41, accel: 12, hp: 420, price: 0, colors: [1], roles: ['police'], siren: true, model: [...M.sedan(), ...M.stripe('white', 0.25, 0.5), ...M.lightbar()] },
  { ...car, id: 'police_suv', name: 'Police Interceptor', turnIn: 0.35, length: 4.9, width: 2.0, height: 1.8, mass: 2200, maxSpeed: 42, accel: 12, hp: 520, price: 0, colors: [0], roles: ['police'], siren: true, model: [...M.suv(), ...M.stripe('#1d3557', 0.3, 0.45), ...M.lightbar()] },
  { ...heavy, id: 'swat', name: 'SWAT Van', length: 6.2, width: 2.3, height: 2.6, maxSpeed: 32, accel: 7, hp: 1100, seats: 4, armored: true, price: 0, colors: [1], roles: ['police'], siren: true, model: [...M.van(), ...M.lightbar(0.2)] },
  { ...car, id: 'federal', name: 'Federal SUV', turnIn: 0.35, length: 5.0, width: 2.0, height: 1.8, mass: 2400, maxSpeed: 44, accel: 12, hp: 600, price: 0, colors: [1], roles: ['police'], siren: true, model: [...M.suv(), ...M.lightbar(0.1)] },
  { ...heavy, id: 'ambulance', name: 'Ambulance', length: 6.2, width: 2.2, height: 2.7, mass: 3500, maxSpeed: 34, accel: 8, hp: 600, seats: 2, price: 0, colors: [0], roles: ['ambulance'], siren: true, model: [...M.boxTruck('white'), ...M.stripe('red', 0.45, 0.55), ...M.crossMark('red'), ...M.lightbar(0.35)] },
  { ...heavy, id: 'firetruck', name: 'Fire Truck', length: 9, width: 2.5, height: 3, mass: 12000, maxSpeed: 30, accel: 6, hp: 1200, seats: 2, price: 0, colors: [5], roles: ['fire'], siren: true, model: [...M.boxTruck('body'), ...M.ladder(), ...M.lightbar(0.35)] },

  // Military
  { ...car, id: 'jeep', name: 'Army Jeep', length: 4.3, width: 2.0, height: 1.7, mass: 1900, maxSpeed: 36, accel: 10, grip: 8.5, hp: 500, openTop: true, price: 0, colors: [20, 19], roles: ['military'], model: [...M.pickup()] },
  { ...heavy, id: 'army_truck', name: 'Army Truck', length: 7.8, mass: 8000, maxSpeed: 26, hp: 900, seats: 6, price: 0, colors: [19, 20], roles: ['military'], model: [...M.boxTruck('olive'), ...M.canopy()] },
  { ...heavy, id: 'tank', name: 'Battle Tank', movement: 'tracks', length: 7.6, width: 3.6, height: 2.6, mass: 50000, maxSpeed: 14, accel: 4, brake: 12, reverse: 6, grip: 20, turnRate: 1.1, hp: 3000, seats: 1, armored: true, crushes: true, weapons: ['tank_cannon'], price: 0, colors: [20, 19], roles: ['military'], model: M.tank() },

  // Aircraft
  { ...chopper, id: 'heli_police', name: 'Police Chopper', maxSpeed: 38, hp: 700, price: 0, colors: [1], roles: ['police_air'], siren: true, model: M.heli('white') },
  { ...chopper, id: 'heli_news', name: 'News Chopper', price: 0, colors: [0, 7], roles: ['helipad'], model: M.heli('red') },
  { ...chopper, id: 'heli_civil', name: 'Sky Lark', length: 9, width: 2.2, maxSpeed: 34, hp: 500, price: 220000, colors: 'bright', roles: ['helipad'], model: M.heli('white') },
  { ...chopper, id: 'gunship', name: 'Gunship', length: 13, width: 3, maxSpeed: 42, accel: 11, turnRate: 2.1, hp: 1800, seats: 2, armored: true, weapons: ['heli_gun', 'heli_rockets'], price: 0, colors: [19, 3], roles: ['military_air'], model: M.attackHeli() },

  // Added later: appended so existing type indices (saved garages) keep their meaning.
  { ...car, id: 'roadster', name: 'Spyder', turnIn: 0.4, length: 4.2, width: 1.85, height: 1.15, mass: 1150, maxSpeed: 44, accel: 13.5, brake: 28, grip: 9.5, turnRate: 2.8, hp: 260, seats: 2, openTop: true, price: 48000, colors: 'bright', roles: ['traffic', 'parked'], shape: S.roadster, model: M.roadster() },
];
