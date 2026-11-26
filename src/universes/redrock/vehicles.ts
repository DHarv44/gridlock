// Redrock Territory's rides: horses, and wagons (a team in harness pulling an articulated wagon, on
// the engine's trailer physics). All are `legs` (no wheels drawn, riders astride) and `wrecks:
// 'fall'` (they go down, riders thrown; nothing burns). Box models in fractions of each one's size.
import type { Paint, Part, VehicleSpec } from '../../shared/packs/types';

const b = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, paint: Paint): Part =>
  ({ x: [x0, x1], y: [y0, y1], z: [z0, z1], paint });

/** A horse seen from above and the side: barrel, neck, head, tail, four legs, saddle. */
function horse(saddle: Paint = '#5a3a20'): Part[] {
  return [
    b(-0.3, 0.24, -0.5, 0.5, 0.46, 0.78, 'body'),       // barrel
    b(0.18, 0.36, -0.3, 0.3, 0.62, 0.96, 'body'),       // neck
    b(0.33, 0.5, -0.24, 0.24, 0.76, 0.96, 'body'),      // head
    b(0.44, 0.5, -0.16, 0.16, 0.76, 0.86, 'dark'),      // muzzle
    b(0.2, 0.3, -0.1, 0.1, 0.92, 1.0, 'black'),         // mane
    b(-0.44, -0.29, -0.12, 0.12, 0.38, 0.72, 'black'),  // tail
    ...[0.13, -0.25].flatMap((x) => [-1, 1].map((s) => b(x, x + 0.08, s > 0 ? 0.22 : -0.44, s > 0 ? 0.44 : -0.22, 0, 0.48, 'body'))),
    ...[0.13, -0.25].flatMap((x) => [-1, 1].map((s) => b(x, x + 0.08, s > 0 ? 0.22 : -0.44, s > 0 ? 0.44 : -0.22, 0, 0.07, 'black'))), // hooves
    b(-0.12, 0.1, -0.54, 0.54, 0.76, 0.83, saddle),     // saddle and blanket
  ];
}

/** Two horses side by side in harness (the front of a wagon), in fractions of the team's size. */
function team(): Part[] {
  const one = (y0: number, y1: number): Part[] => [
    b(-0.3, 0.22, y0, y1, 0.46, 0.78, 'body'),
    b(0.16, 0.34, y0 + 0.08, y1 - 0.08, 0.62, 0.96, 'body'),
    b(0.32, 0.48, y0 + 0.1, y1 - 0.1, 0.76, 0.96, 'body'),
    b(0.12, 0.2, y0 + 0.02, y1 - 0.02, 0, 0.48, 'body'),
    b(-0.24, -0.16, y0 + 0.02, y1 - 0.02, 0, 0.48, 'body'),
    b(-0.42, -0.3, y0 + 0.16, y1 - 0.16, 0.38, 0.7, 'black'),
  ];
  return [...one(-0.5, -0.04), ...one(0.04, 0.5), b(-0.5, 0.2, -0.03, 0.03, 0.5, 0.56, '#4a3424')]; // the pole between them
}

/** A wagon body in fractions of the wagon's size: bed, four wheels, the driver's bench at the front. */
function wagon(bed: Paint, top?: Paint): Part[] {
  const wheels = [0.32, -0.32].flatMap((x) => [-1, 1].map((s) => b(x - 0.09, x + 0.09, s > 0 ? 0.44 : -0.52, s > 0 ? 0.52 : -0.44, 0, 0.42, '#2a2018')));
  const parts = [b(-0.5, 0.42, -0.44, 0.44, 0.28, 0.5, bed), b(0.3, 0.46, -0.42, 0.42, 0.5, 0.62, '#4a3424'), ...wheels];
  if (top) parts.push(b(-0.48, 0.28, -0.46, 0.46, 0.5, 1.0, top));
  return parts;
}

// A saddle horse canters at 60% of its top speed; held to a gallop (Sprint) it lasts ~12 s, then
// needs twice that to get its wind back. It comes to its rider's whistle.
const mount = { movement: 'legs' as const, wrecks: 'fall' as const, openTop: true, length: 2.5, width: 0.75, height: 1.7, mass: 500,
  stamina: { gallop: 12, canter: 0.6 }, comesWhenCalled: true,
  brake: 14, reverse: 1.5, grip: 10, turnIn: 0.05, turnRate: 3.0, seats: 2,
  saddles: [{ x: -0.05, z: 1.28, lean: 0.05 }, { x: -0.62, z: 1.24, lean: 0 }] };
const horses = [0, 1, 2, 3, 5, 6, 7]; // coat colours (palette.ts)

// A team in harness: a short burst at the whip (Sprint), mostly a steady canter.
const teamBase = { movement: 'legs' as const, wrecks: 'fall' as const, stamina: { gallop: 8, canter: 0.7 }, length: 2.8, width: 1.7, height: 1.7, mass: 1800,
  brake: 9, reverse: 1.2, grip: 9, turnIn: 0.02, turnRate: 1.8, minTurnRadius: 6, maxLateral: 3, rearAxle: 0 };

export const VEHICLES: VehicleSpec[] = [
  { ...mount, id: 'mustang', name: 'Mustang', maxSpeed: 20, accel: 8, turnRate: 3.3, hp: 180, price: 120, stamina: { gallop: 15, canter: 0.6 }, colors: horses, roles: ['traffic', 'parked'], model: horse() },
  { ...mount, id: 'quarter_horse', name: 'Quarter Horse', maxSpeed: 19, accel: 9, hp: 220, price: 90, colors: horses, roles: ['traffic', 'parked'], model: horse() },
  { ...mount, id: 'draft_horse', name: 'Draft Horse', length: 2.8, width: 0.9, height: 1.85, mass: 800, maxSpeed: 13, accel: 5, turnRate: 2.4, hp: 380, price: 70, stamina: { gallop: 8, canter: 0.72 }, colors: [2, 3, 6], roles: ['parked'], model: horse('#3a2a1a') },
  { ...mount, id: 'thoroughbred', name: 'Thoroughbred', maxSpeed: 23, accel: 10, turnRate: 3.1, hp: 160, price: 400, stamina: { gallop: 10, canter: 0.55 }, colors: [0, 1, 2], roles: ['parked'], model: horse('#2a1a12') },
  // The law's and the army's horses don't come to a stranger's whistle.
  { ...mount, id: 'law_horse', name: "Lawman's Horse", maxSpeed: 21, accel: 9, hp: 240, price: 0, colors: [2, 0], roles: ['police'], comesWhenCalled: false, model: horse('#1a1612') },
  { ...mount, id: 'cavalry_horse', name: 'Cavalry Horse', maxSpeed: 21, accel: 9, hp: 260, price: 0, colors: [0, 1], roles: ['military'], comesWhenCalled: false, model: horse('#28324a') },

  { ...teamBase, id: 'buckboard', name: 'Buckboard', maxSpeed: 14, accel: 5, hp: 400, seats: 2, openTop: true, price: 160, colors: horses,
    roles: ['traffic', 'parked'], model: team(), saddles: [{ x: -1.9, z: 1.3, lean: 0 }, { x: -1.9, y: 0.5, z: 1.3, lean: 0 }],
    trailer: { length: 3.6, width: 1.7, height: 1.2, hitch: 1.2, model: wagon('#8a6a4a') } },
  { ...teamBase, id: 'covered_wagon', name: 'Covered Wagon', maxSpeed: 11, accel: 3.5, hp: 600, seats: 2, openTop: true, price: 260, colors: [2, 3, 6],
    roles: ['traffic'], model: team(), saddles: [{ x: -1.9, z: 1.3, lean: 0 }, { x: -1.9, y: 0.5, z: 1.3, lean: 0 }],
    trailer: { length: 5, width: 1.9, height: 2.6, hitch: 1.2, model: wagon('#7a5a3a', '#e8e0cc') } },
  { ...teamBase, id: 'stagecoach', name: 'Stagecoach', maxSpeed: 15, accel: 4.5, hp: 700, seats: 6, price: 0, colors: [0, 1],
    roles: ['traffic'], model: team(),
    trailer: { length: 4.2, width: 1.9, height: 2.4, hitch: 1.2, model: [...wagon('#7a2a20', '#7a2a20'), b(0.3, 0.46, -0.42, 0.42, 1.0, 1.08, '#b8902e')] } },
  { ...teamBase, id: 'doctor_buggy', name: "Doctor's Buggy", length: 2.5, width: 0.8, maxSpeed: 15, accel: 5.5, hp: 300, seats: 2, openTop: true, price: 0, colors: [2],
    roles: ['ambulance'], model: horse('#1a1612'), trailer: { length: 2.6, width: 1.5, height: 1.4, hitch: 1.0, model: wagon('#16171a', '#16171a') } },
  { ...teamBase, id: 'water_wagon', name: 'Water Wagon', maxSpeed: 12, accel: 4, hp: 500, seats: 2, openTop: true, price: 0, colors: [3],
    roles: ['fire'], model: team(), saddles: [{ x: -1.9, z: 1.3, lean: 0 }, { x: -1.9, y: 0.5, z: 1.3, lean: 0 }],
    trailer: { length: 3.8, width: 1.7, height: 1.8, hitch: 1.2, model: [...wagon('#7a2a20'), b(-0.45, 0.25, -0.38, 0.38, 0.5, 0.95, '#5a4632')] } },
  { ...teamBase, id: 'gatling_wagon', name: 'Gatling Wagon', maxSpeed: 13, accel: 4.5, hp: 900, seats: 3, openTop: true, price: 0, colors: [1],
    roles: ['military'], weapons: ['gatling'], turret: 1.4, model: team(), saddles: [{ x: -1.9, z: 1.3, lean: 0 }, { x: -3.2, z: 1.3, lean: 0 }],
    trailer: { length: 3.6, width: 1.7, height: 1.6, hitch: 1.2, model: [...wagon('#28324a'), b(-0.3, 0.2, -0.12, 0.12, 0.5, 0.75, 'chrome')] } },
];
