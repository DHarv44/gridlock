// Redrock Territory's rides: horses, and wagons (a team in harness pulling an articulated wagon, on
// the engine's trailer physics). All are `legs` (no wheels drawn, riders astride); horses and teams
// are `material: 'flesh'` (they bleed, go down and lie there; nothing smokes or burns), standing
// wagons `wood`. Box models (the Blender ones replace them) in fractions of each one's size.
import type { Paint, Part, VehicleSpec } from '../../shared/packs/types';

const b = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, paint: Paint, tag?: Part['tag']): Part =>
  ({ x: [x0, x1], y: [y0, y1], z: [z0, z1], paint, ...(tag ? { tag } : {}) });

/** A leg (swung by its gait from the top), front or rear, left or right (y < 0 is the left). */
const leg = (x0: number, x1: number, y0: number, y1: number, front: boolean): Part =>
  b(x0, x1, y0, y1, 0, 0.48, 'body', `leg_${front ? 'f' : 'r'}${y0 < 0 ? 'l' : 'r'}` as Part['tag']);

/** A horse seen from above and the side: barrel, neck, head, tail, four legs, saddle. */
function horse(saddle: Paint = '#5a3a20'): Part[] {
  return [
    b(-0.3, 0.24, -0.5, 0.5, 0.46, 0.78, 'body'),       // barrel
    b(0.18, 0.36, -0.3, 0.3, 0.62, 0.96, 'body'),       // neck
    b(0.33, 0.5, -0.24, 0.24, 0.76, 0.96, 'body'),      // head
    b(0.44, 0.5, -0.16, 0.16, 0.76, 0.86, 'dark'),      // muzzle
    b(0.2, 0.3, -0.1, 0.1, 0.92, 1.0, 'black'),         // mane
    b(-0.44, -0.29, -0.12, 0.12, 0.38, 0.72, 'black'),  // tail
    ...[0.13, -0.25].flatMap((x) => [-1, 1].map((s) => leg(x, x + 0.08, s > 0 ? 0.22 : -0.44, s > 0 ? 0.44 : -0.22, x > 0))),
    b(-0.12, 0.1, -0.54, 0.54, 0.76, 0.83, saddle),     // saddle and blanket
  ];
}

/** Two horses side by side in harness (the front of a wagon), in fractions of the team's size. */
function team(): Part[] {
  const one = (y0: number, y1: number): Part[] => [
    b(-0.3, 0.22, y0, y1, 0.46, 0.78, 'body'),
    b(0.16, 0.34, y0 + 0.08, y1 - 0.08, 0.62, 0.96, 'body'),
    b(0.32, 0.48, y0 + 0.1, y1 - 0.1, 0.76, 0.96, 'body'),
    leg(0.12, 0.2, y0 + 0.02, y1 - 0.02, true),
    leg(-0.24, -0.16, y0 + 0.02, y1 - 0.02, false),
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

type Gaits = NonNullable<VehicleSpec['gaits']>;
/** Gaits (sim/mount.ts): walk, trot, canter, gallop (m/s); pick-up and let-go (m/s²); turn rate
 *  standing and at a gallop (rad/s); backing up (m/s). The gallop is also its top speed. Real
 *  speeds: a walk ~1.7, a trot ~4, a canter ~6.5 (about a man sprinting); the gallop a little
 *  quicker than life (14-17 for a saddle horse) so a chase feels like one. */
const G = (walk: number, trot: number, canter: number, gallop: number, accel: number, slow: number, turnSlow: number, turnFast: number, back: number): { gaits: Gaits; maxSpeed: number } =>
  ({ gaits: { walk, trot, canter, gallop, accel, slow, turnSlow, turnFast, back }, maxSpeed: gallop });

// A saddle horse: a canter on the throttle, a gallop on Sprint for ~12 s, then twice that to get
// its wind back. Turns on the spot standing, wide at a gallop. It comes to its rider's whistle.
const mount = { movement: 'legs' as const, material: 'flesh' as const, openTop: true, mass: 500,
  stamina: { gallop: 12 }, comesWhenCalled: true, temper: { nerve: 0.55, buck: 0.3, lame: 0.4 }, ...G(1.7, 3.8, 6.5, 14, 4.5, 5, 3.0, 1.5, 1.2),
  accel: 4.5, brake: 14, reverse: 1.2, grip: 10, turnRate: 3.0, seats: 2 };
/** A saddle horse's size (m: nose to tail, across, to the ears), with the saddle and the seat
 *  behind it placed to match (a pony's rider sits lower, a draft's higher). */
const size = (length: number, width: number, height: number) => ({
  length, width, height,
  saddles: [{ x: -0.02 * length, z: 0.753 * height, lean: 0.05 }, { x: -0.248 * length, z: 0.73 * height, lean: 0 }],
});
const horses = [0, 1, 2, 3, 5, 6, 7]; // coat colours (palette.ts)

// A team in harness: slow to pick up and to turn (it can't pivot with a wagon behind), a short
// burst at the whip (Sprint), mostly a steady canter.
const teamBase = { movement: 'legs' as const, material: 'flesh' as const, stamina: { gallop: 8 },
  // A team in harness can't rear free or throw a driver off the box, but it can bolt with the wagon.
  temper: { nerve: 0.6, buck: 0, lame: 0.35 }, length: 2.8, width: 1.7, height: 1.7, mass: 1800,
  ...G(1.6, 3.5, 5.5, 10, 2.5, 4, 0.9, 0.5, 0.8), accel: 2.5, brake: 9, reverse: 0.8, grip: 9, turnRate: 1.8 };

type Wagon = NonNullable<VehicleSpec['trailer']>;
const BUCKBOARD: Wagon = { length: 3.6, width: 1.7, height: 1.2, hitch: 1.2, model: wagon('#8a6a4a') };
const COVERED: Wagon = { length: 5, width: 1.9, height: 2.6, hitch: 1.2, model: wagon('#7a5a3a', '#e8e0cc') };
const COACH: Wagon = { length: 4.2, width: 1.9, height: 2.4, hitch: 1.2, model: [...wagon('#7a2a20', '#7a2a20'), b(0.3, 0.46, -0.42, 0.42, 1.0, 1.08, '#b8902e')] };

/** A wagon standing without its team: seatless (nobody can drive it), it hitches back as `as`. */
const standing = (id: string, name: string, w: Wagon, hp: number, as: string): VehicleSpec => ({
  id, name, movement: 'legs', material: 'wood', length: w.length, width: w.width, height: w.height, mass: 900,
  // A nominal top speed (the physics divides by it); with no seat it's never driven.
  maxSpeed: 1, accel: 0, brake: 6, reverse: 0, grip: 12, turnRate: 0, hp, seats: 0, price: 0, colors: horses,
  roles: [], model: w.model, hitchAs: as,
});

export const VEHICLES: VehicleSpec[] = [
  // Like the cars, each breed is its own ride: speed, wind, pick-up, turning, size, toughness, price.
  // Mustang: hardy and nimble, a long wind. Quarter horse: the sprinter, quickest off the mark and
  // round a corner. Morgan: compact, steady at everything. Arabian: light and quick with the longest
  // wind. Thoroughbred: tall, the fastest gallop, the shortest wind, turns wide. Indian pony: small,
  // the nimblest turn, cheap. Draft: big, slow and strong. Mule: no speed at all, but it goes all day
  // and nothing frightens it (it kicks, though).
  // Temperament: the trained law and army horses, the draft and the mule hold steady under fire; the
  // thoroughbred and the Arabian are hot and throw riders; the mustang has spirit.
  { ...mount, id: 'mustang', name: 'Mustang', ...size(2.4, 0.74, 1.62), temper: { nerve: 0.55, buck: 0.4, lame: 0.4 }, ...G(1.8, 4, 6.8, 14.5, 4.8, 5, 3.2, 1.6, 1.2), hp: 180, price: 120, stamina: { gallop: 15 }, colors: horses, roles: ['traffic', 'parked'], model: horse() },
  { ...mount, id: 'quarter_horse', name: 'Quarter Horse', ...size(2.45, 0.8, 1.64), mass: 530, temper: { nerve: 0.65, buck: 0.25, lame: 0.4 }, ...G(1.7, 3.8, 6.5, 15, 6.5, 6, 3.4, 1.8, 1.4), hp: 220, price: 90, stamina: { gallop: 9 }, colors: horses, roles: ['traffic', 'parked'], model: horse() },
  { ...mount, id: 'draft_horse', name: 'Draft Horse', ...size(2.8, 0.9, 1.85), mass: 800, temper: { nerve: 0.85, buck: 0.1, lame: 0.3 }, ...G(1.5, 3.2, 5, 10, 2.8, 4, 2.3, 1.0, 1.0), hp: 380, price: 70, stamina: { gallop: 8 }, colors: [2, 3, 6], roles: ['parked'], model: horse('#3a2a1a') },
  { ...mount, id: 'thoroughbred', name: 'Thoroughbred', ...size(2.65, 0.72, 1.76), mass: 520, temper: { nerve: 0.3, buck: 0.55, lame: 0.45 }, ...G(1.8, 4.2, 7.2, 17, 5, 5, 2.7, 1.2, 1.1), hp: 160, price: 400, stamina: { gallop: 10 }, colors: [0, 1, 2], roles: ['parked'], model: horse('#2a1a12') },
  // The law's and the army's horses don't come to a stranger's whistle.
  { ...mount, id: 'law_horse', name: "Lawman's Horse", ...size(2.5, 0.75, 1.7), temper: { nerve: 0.88, buck: 0.1, lame: 0.35 }, ...G(1.8, 4, 6.8, 15, 5, 5, 3.1, 1.5, 1.2), hp: 240, price: 0, colors: [2, 0], roles: ['police'], comesWhenCalled: false, model: horse('#1a1612') },
  { ...mount, id: 'cavalry_horse', name: 'Cavalry Horse', ...size(2.55, 0.76, 1.72), temper: { nerve: 0.9, buck: 0.08, lame: 0.35 }, ...G(1.8, 4, 6.8, 15, 5, 5, 3.1, 1.5, 1.2), hp: 260, price: 0, colors: [0, 1], roles: ['military'], comesWhenCalled: false, model: horse('#28324a') },

  { ...teamBase, id: 'buckboard', name: 'Buckboard', ...G(1.6, 3.5, 5.5, 10, 2.8, 4, 1.0, 0.55, 0.8), hp: 400, seats: 2, openTop: true, price: 160, colors: horses,
    roles: ['traffic', 'parked'], model: team(), saddles: [{ x: -1.9, z: 1.3, lean: 0 }, { x: -1.9, y: 0.5, z: 1.3, lean: 0 }],
    trailer: BUCKBOARD, hitch: { team: 'team', wagon: 'buckboard_standing' } },
  { ...teamBase, id: 'covered_wagon', name: 'Covered Wagon', ...G(1.4, 3, 4.5, 7.7, 1.8, 3.5, 0.8, 0.45, 0.6), hp: 600, seats: 2, openTop: true, price: 260, colors: [2, 3, 6],
    roles: ['traffic'], model: team(), saddles: [{ x: -1.9, z: 1.3, lean: 0 }, { x: -1.9, y: 0.5, z: 1.3, lean: 0 }],
    trailer: COVERED, hitch: { team: 'team', wagon: 'covered_standing' } },
  { ...teamBase, id: 'stagecoach', name: 'Stagecoach', ...G(1.6, 3.6, 5.8, 10.5, 2.5, 4, 0.85, 0.5, 0.7), hp: 700, seats: 6, price: 0, colors: [0, 1],
    roles: ['traffic'], model: team(), trailer: COACH, hitch: { team: 'team', wagon: 'coach_standing' } },

  // A team out of harness (what's left driving when you unhitch), and the wagons left standing:
  // back a team up to one's pole and hitch on (G).
  { ...teamBase, id: 'team', name: 'Team of Horses', ...G(1.7, 3.8, 6, 11, 3.5, 4.5, 1.8, 0.9, 1.0), hp: 360, seats: 2, openTop: true, price: 0, colors: horses,
    roles: [], model: team(), saddles: [{ x: -0.2, z: 1.3, lean: 0.05 }, { x: -0.2, y: 0.5, z: 1.3, lean: 0.05 }] },
  standing('buckboard_standing', 'Buckboard (unhitched)', BUCKBOARD, 400, 'buckboard'),
  standing('covered_standing', 'Covered Wagon (unhitched)', COVERED, 600, 'covered_wagon'),
  standing('coach_standing', 'Stagecoach (unhitched)', COACH, 700, 'stagecoach'),
  { ...teamBase, id: 'doctor_buggy', name: "Doctor's Buggy", length: 2.5, width: 0.8, ...G(1.7, 3.8, 6, 11, 3.5, 4.5, 1.3, 0.7, 0.8), hp: 300, seats: 2, openTop: true, price: 0, colors: [2],
    roles: ['ambulance'], model: horse('#1a1612'), trailer: { length: 2.6, width: 1.5, height: 1.4, hitch: 1.0, model: wagon('#16171a', '#16171a') } },
  { ...teamBase, id: 'water_wagon', name: 'Water Wagon', ...G(1.5, 3.2, 5, 8.3, 2, 3.5, 0.85, 0.45, 0.6), hp: 500, seats: 2, openTop: true, price: 0, colors: [3],
    roles: ['fire'], model: team(), saddles: [{ x: -1.9, z: 1.3, lean: 0 }, { x: -1.9, y: 0.5, z: 1.3, lean: 0 }],
    trailer: { length: 3.8, width: 1.7, height: 1.8, hitch: 1.2, model: [...wagon('#7a2a20'), b(-0.45, 0.25, -0.38, 0.38, 0.5, 0.95, '#5a4632')] } },
  { ...teamBase, id: 'gatling_wagon', name: 'Gatling Wagon', ...G(1.5, 3.3, 5.2, 8.8, 2.5, 4, 0.85, 0.45, 0.7), hp: 900, seats: 3, openTop: true, price: 0, colors: [1],
    roles: ['military'], weapons: ['gatling'], turret: 1.4, model: team(), saddles: [{ x: -1.9, z: 1.3, lean: 0 }, { x: -3.2, z: 1.3, lean: 0 }],
    trailer: { length: 3.6, width: 1.7, height: 1.6, hitch: 1.2, model: [...wagon('#28324a'), b(-0.3, 0.2, -0.12, 0.12, 0.5, 0.75, 'chrome')] } },

  // More saddle breeds (at the end: saves keep vehicles by their place in this list).
  { ...mount, id: 'morgan', name: 'Morgan', ...size(2.35, 0.78, 1.58), mass: 480, temper: { nerve: 0.7, buck: 0.2, lame: 0.4 }, ...G(1.8, 4.1, 6.8, 14.5, 5.5, 5.5, 3.3, 1.7, 1.3), hp: 210, price: 150, stamina: { gallop: 13 }, colors: [0, 1, 2], roles: ['traffic', 'parked'], model: horse('#3a2a1a') },
  { ...mount, id: 'arabian', name: 'Arabian', ...size(2.35, 0.68, 1.58), mass: 420, temper: { nerve: 0.35, buck: 0.45, lame: 0.45 }, ...G(1.9, 4.2, 7, 16, 5.5, 5, 3.1, 1.5, 1.2), hp: 150, price: 320, stamina: { gallop: 18 }, colors: [3, 4, 1], roles: ['parked'], model: horse('#7a2a20') },
  { ...mount, id: 'indian_pony', name: 'Indian Pony', ...size(2.1, 0.66, 1.42), mass: 360, temper: { nerve: 0.6, buck: 0.35, lame: 0.4 }, ...G(1.7, 3.8, 6.2, 12.5, 5.5, 6, 3.8, 2.1, 1.3), hp: 150, price: 60, stamina: { gallop: 14 }, colors: [7, 6, 5, 4], roles: ['traffic', 'parked'], model: horse('#8a4a24') },
  { ...mount, id: 'mule', name: 'Mule', ...size(2.35, 0.7, 1.56), mass: 430, temper: { nerve: 0.92, buck: 0.35, lame: 0.3 }, ...G(1.6, 3.4, 5.2, 10.5, 3.5, 5, 2.9, 1.5, 1.2), hp: 260, price: 50, stamina: { gallop: 20 }, colors: [6, 7, 2], roles: ['traffic', 'parked'], model: horse('#4a3424') },
];
