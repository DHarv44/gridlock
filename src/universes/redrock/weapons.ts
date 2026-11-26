// Redrock Territory's arms: what a frontier general store or gunsmith would have on the rack.
// Models at real size in metres (x along the barrel, + = muzzle, grip at 0; y up; z right).
import type { WeaponMat, WeaponPart, WeaponSpec } from '../../shared/packs/types';

const B = (x0: number, x1: number, y0: number, y1: number, hw: number, mat: WeaponMat, tilt?: number): WeaponPart =>
  ({ shape: 'box', x: [x0, x1], y: [y0, y1], z: [-hw, hw], mat, ...(tilt ? { tilt } : {}) });
const C = (x0: number, x1: number, cy: number, r: number, mat: WeaponMat, cz = 0): WeaponPart =>
  ({ shape: 'cyl', x: [x0, x1], y: [cy - r, cy + r], z: [cz - r, cz + r], mat });

const revolverModel: WeaponPart[] = [
  B(-0.03, 0.02, -0.11, 0, 0.016, 'wood', -0.35),   // grip
  B(-0.01, 0.08, -0.01, 0.035, 0.018, 'steel'),      // frame
  C(0.02, 0.075, 0.015, 0.022, 'steel'),            // cylinder
  C(0.075, 0.24, 0.022, 0.009, 'steel'),            // barrel
];
const MODELS: Record<string, WeaponPart[]> = {
  knife: [B(-0.06, 0.05, -0.015, 0.015, 0.013, 'wood'), B(0.05, 0.23, -0.01, 0.022, 0.003, 'chrome')],
  hatchet: [B(-0.2, 0.25, -0.014, 0.014, 0.014, 'wood'), B(0.18, 0.26, -0.01, 0.09, 0.006, 'steel')],
  derringer: [B(-0.025, 0.015, -0.07, 0, 0.013, 'wood', -0.35), B(-0.01, 0.06, -0.005, 0.03, 0.013, 'brass'), C(0.03, 0.11, 0.018, 0.008, 'steel')],
  revolver: revolverModel,
  shotgun: [B(-0.35, 0, -0.07, 0.02, 0.022, 'wood', -0.12), B(0, 0.1, -0.02, 0.03, 0.022, 'steel'),
    C(0.1, 0.72, 0.012, 0.012, 'steel', -0.012), C(0.1, 0.72, 0.012, 0.012, 'steel', 0.012), B(0.1, 0.45, -0.025, 0, 0.02, 'wood')],
  lever_rifle: [B(-0.36, 0, -0.07, 0.02, 0.02, 'wood', -0.1), B(0, 0.14, -0.02, 0.035, 0.016, 'brass'),
    B(0.02, 0.12, -0.06, -0.02, 0.004, 'steel'), C(0.14, 0.8, 0.02, 0.009, 'steel'), C(0.14, 0.6, 0.0, 0.009, 'steel'), B(0.14, 0.5, -0.02, 0.01, 0.018, 'wood')],
  long_rifle: [B(-0.4, 0, -0.08, 0.02, 0.02, 'wood', -0.1), B(0, 0.16, -0.02, 0.03, 0.016, 'steel'),
    C(0.16, 1.0, 0.012, 0.01, 'steel'), B(0.05, 0.4, 0.04, 0.06, 0.012, 'black'), B(0.16, 0.75, -0.025, 0.005, 0.018, 'wood')],
  dynamite: [C(-0.1, 0.1, 0, 0.018, 'red'), C(0.1, 0.16, 0, 0.002, 'cloth')],
  lamp_oil: [C(-0.06, 0.08, 0, 0.04, 'glass'), C(0.08, 0.14, 0, 0.012, 'cloth')],
};

const W = (w: WeaponSpec): WeaponSpec => ({ ...w, model: MODELS[w.id] });

export const WEAPONS: WeaponSpec[] = [
  W({ id: 'fists', name: 'Fists', kind: 'melee', slot: 0, damage: 9, rate: 2.5, range: 1.3, spread: 0.9, auto: true, clip: 0, reload: 0, vehicleMul: 0.1, price: 0, ammoPrice: 0, ammoBundle: 0, tracer: '#fff', sound: 'punch', hold: 'fist', size: 0 }),
  W({ id: 'knife', name: 'Bowie Knife', kind: 'melee', slot: 0, damage: 34, rate: 2.2, range: 1.4, spread: 0.8, auto: true, clip: 0, reload: 0, vehicleMul: 0.1, price: 3, ammoPrice: 0, ammoBundle: 0, tracer: '#fff', sound: 'slash', hold: 'one', size: 0.25 }),
  W({ id: 'hatchet', name: 'Hatchet', kind: 'melee', slot: 0, damage: 44, rate: 1.4, range: 1.6, spread: 1.0, auto: true, clip: 0, reload: 0, vehicleMul: 0.4, price: 2, ammoPrice: 0, ammoBundle: 0, tracer: '#fff', sound: 'swing', hold: 'one', size: 0.45 }),

  W({ id: 'derringer', name: 'Pocket Pistol', kind: 'hitscan', slot: 1, damage: 40, rate: 2, range: 20, spread: 0.06, auto: false, clip: 2, reload: 1.8, vehicleMul: 0.3, price: 8, ammoPrice: 1, ammoBundle: 12, tracer: '#ffd27a', sound: 'pistol', hold: 'one', size: 0.12, driveBy: true }),
  W({ id: 'revolver', name: 'Six-Shooter', kind: 'hitscan', slot: 1, damage: 48, rate: 1.8, range: 55, spread: 0.03, auto: false, clip: 6, reload: 2.6, vehicleMul: 0.6, price: 16, ammoPrice: 1, ammoBundle: 24, tracer: '#ffd27a', sound: 'revolver', hold: 'one', size: 0.26, driveBy: true }),
  W({ id: 'shotgun', name: 'Double-Barrel', kind: 'hitscan', slot: 3, damage: 15, pellets: 9, rate: 1.6, range: 24, spread: 0.26, auto: false, clip: 2, reload: 2.2, vehicleMul: 0.7, price: 25, ammoPrice: 1, ammoBundle: 12, tracer: '#ffc070', sound: 'shotgun', hold: 'two', size: 0.8, driveBy: true }),
  W({ id: 'lever_rifle', name: 'Lever-Action Rifle', kind: 'hitscan', slot: 4, damage: 42, rate: 2.2, range: 85, spread: 0.02, auto: false, clip: 12, reload: 3.4, vehicleMul: 0.7, price: 40, ammoPrice: 2, ammoBundle: 36, tracer: '#fff0b0', sound: 'rifle', hold: 'two', size: 0.95, driveBy: true }),
  W({ id: 'long_rifle', name: 'Buffalo Rifle', kind: 'hitscan', slot: 5, damage: 150, rate: 0.6, range: 170, spread: 0.004, auto: false, clip: 1, reload: 2.2, vehicleMul: 1, price: 75, ammoPrice: 2, ammoBundle: 10, tracer: '#ffffff', sound: 'sniper', hold: 'two', size: 1.15 }),
  W({ id: 'dynamite', name: 'Dynamite', kind: 'thrown', slot: 7, damage: 0, rate: 0.8, range: 30, spread: 0.05, auto: false, clip: 1, reload: 0.8, vehicleMul: 1, price: 6, ammoPrice: 4, ammoBundle: 2, tracer: '#fff', sound: 'throw', hold: 'throw', size: 0.2,
    projectile: { speed: 17, fuse: 3, radius: 7, blast: 220, arc: true } }),
  W({ id: 'lamp_oil', name: 'Lamp Oil', kind: 'thrown', slot: 7, damage: 0, rate: 0.8, range: 26, spread: 0.05, auto: false, clip: 1, reload: 0.8, vehicleMul: 1, price: 2, ammoPrice: 1, ammoBundle: 2, tracer: '#fff', sound: 'throw', hold: 'throw', size: 0.2,
    projectile: { speed: 16, radius: 3.5, blast: 25, fire: true, arc: true } }),

  W({ id: 'gatling', name: 'Gatling Gun', kind: 'hitscan', slot: 6, damage: 26, rate: 9, range: 85, spread: 0.06, auto: true, clip: 0, reload: 0, vehicleMul: 1, price: 0, ammoPrice: 0, ammoBundle: 0, tracer: '#ffdf80', sound: 'minigun', hold: 'heavy', size: 0, vehicleOnly: true }),
];
