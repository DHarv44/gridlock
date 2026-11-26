import type { WeaponMat, WeaponPart } from '../../shared/packs/types';

// Weapon models, at real size in metres. x runs along the barrel (+ = muzzle) with the hand's grip at
// 0, y is up, z to the right. Built from boxes and cylinders; keep each one recognisable from above
// (the street camera) and from the side (the gun shop's turntable).

/** Box from ranges. */
const B = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, mat: WeaponMat, tilt?: number): WeaponPart =>
  ({ shape: 'box', x: [x0, x1], y: [y0, y1], z: [z0, z1], mat, ...(tilt ? { tilt } : {}) });
/** Box centred across the width (half-width hw). */
const W = (x0: number, x1: number, y0: number, y1: number, hw: number, mat: WeaponMat, tilt?: number): WeaponPart =>
  B(x0, x1, y0, y1, -hw, hw, mat, tilt);
/** Cylinder along the barrel, centred at height cy (and cz across). */
const C = (x0: number, x1: number, cy: number, r: number, mat: WeaponMat, cz = 0): WeaponPart =>
  ({ shape: 'cyl', x: [x0, x1], y: [cy - r, cy + r], z: [cz - r, cz + r], mat });
/** Upright cylinder. */
const CY = (cx: number, y0: number, y1: number, r: number, mat: WeaponMat, cz = 0): WeaponPart =>
  ({ shape: 'cyl', axis: 'y', x: [cx - r, cx + r], y: [y0, y1], z: [cz - r, cz + r], mat });
/** Cylinder across (left to right). */
const CZ = (cx: number, cy: number, r: number, hw: number, mat: WeaponMat): WeaponPart =>
  ({ shape: 'cyl', axis: 'z', x: [cx - r, cx + r], y: [cy - r, cy + r], z: [-hw, hw], mat });

/** A pistol grip under the receiver, raked back like a real one. */
const grip = (x: number, len: number, mat: WeaponMat, hw = 0.016): WeaponPart => W(x - 0.022, x + 0.018, -len, 0.005, hw, mat, -0.28);
/** A trigger guard loop. */
const guard = (x: number, mat: WeaponMat = 'black'): WeaponPart[] => [W(x, x + 0.045, -0.026, -0.02, 0.005, mat), W(x + 0.04, x + 0.046, -0.026, 0, 0.005, mat)];

export const WEAPON_MODELS: Record<string, WeaponPart[]> = {
  knife: [
    W(-0.06, 0.06, -0.016, 0.016, 0.013, 'black'),
    W(0.06, 0.072, -0.03, 0.03, 0.016, 'steel'),
    W(0.072, 0.21, -0.012, 0.022, 0.0025, 'chrome'),
    W(0.21, 0.255, -0.004, 0.018, 0.0025, 'chrome', -0.35),
  ],
  bat: [
    C(-0.12, -0.105, 0, 0.026, 'wood'),
    C(-0.105, 0.2, 0, 0.017, 'wood'),
    C(-0.08, 0.06, 0, 0.019, 'black'), // grip tape
    C(0.2, 0.42, 0, 0.026, 'wood'),
    C(0.42, 0.72, 0, 0.034, 'wood'),
  ],
  machete: [
    W(-0.07, 0.07, -0.017, 0.017, 0.014, 'black'),
    W(0.07, 0.08, -0.024, 0.024, 0.012, 'steel'),
    W(0.08, 0.5, -0.012, 0.035, 0.002, 'chrome'),
    W(0.5, 0.56, -0.004, 0.03, 0.002, 'chrome', -0.4),
  ],
  pistol: [
    W(-0.035, 0.155, 0.032, 0.066, 0.013, 'black'),            // slide
    W(-0.025, 0.12, 0.008, 0.034, 0.012, 'polymer'),           // frame
    grip(-0.01, 0.095, 'polymer'),
    ...guard(0.0),
    C(0.155, 0.162, 0.05, 0.006, 'steel'),                     // muzzle
    W(0.135, 0.145, 0.066, 0.072, 0.003, 'black'),             // front sight
  ],
  revolver: [
    C(0.035, 0.21, 0.048, 0.011, 'steel'),                     // barrel
    W(0.035, 0.21, 0.058, 0.066, 0.004, 'steel'),              // rib
    C(-0.005, 0.04, 0.038, 0.021, 'steel'),                    // cylinder
    W(-0.035, 0.04, 0.012, 0.062, 0.012, 'steel'),             // frame
    W(-0.045, -0.025, 0.05, 0.075, 0.005, 'steel', 0.5),       // hammer
    grip(-0.02, 0.1, 'wood', 0.018),
    ...guard(0.0, 'steel'),
  ],
  smg: [
    W(-0.07, 0.17, 0.0, 0.06, 0.022, 'black'),                 // receiver
    C(0.17, 0.225, 0.034, 0.009, 'steel'),
    W(-0.02, 0.022, -0.13, 0.0, 0.017, 'polymer'),             // grip with the magazine in it
    W(-0.012, 0.012, -0.17, -0.12, 0.013, 'black'),            // magazine base
    ...guard(0.03),
    W(-0.26, -0.07, 0.03, 0.04, 0.004, 'steel'),               // folding wire stock
    W(-0.27, -0.255, -0.03, 0.04, 0.015, 'steel'),
    W(0.1, 0.12, 0.06, 0.075, 0.005, 'black'),
  ],
  tac_smg: [
    W(-0.1, 0.2, 0.0, 0.065, 0.022, 'black'),                  // receiver
    W(0.12, 0.31, 0.004, 0.052, 0.024, 'polymer'),             // handguard
    C(0.31, 0.37, 0.032, 0.009, 'steel'),
    W(0.035, 0.075, -0.15, 0.0, 0.012, 'black', 0.18),         // curved magazine
    grip(-0.04, 0.1, 'polymer'),
    ...guard(-0.02),
    W(-0.34, -0.1, -0.02, 0.05, 0.016, 'polymer'),             // stock
    W(-0.36, -0.33, -0.04, 0.06, 0.02, 'black'),               // butt pad
    W(-0.06, 0.1, 0.065, 0.085, 0.01, 'black'),                // sight rail
  ],
  shotgun: [
    W(-0.12, 0.1, 0.0, 0.065, 0.024, 'black'),                 // receiver
    C(0.1, 0.62, 0.048, 0.012, 'steel'),                       // barrel
    C(0.1, 0.52, 0.02, 0.011, 'black'),                        // magazine tube
    W(0.22, 0.4, -0.004, 0.044, 0.026, 'wood'),                // pump
    W(-0.5, -0.12, -0.03, 0.05, 0.02, 'wood', -0.1),           // stock
    W(-0.52, -0.49, -0.06, 0.05, 0.024, 'black', -0.1),        // recoil pad
    grip(-0.12, 0.07, 'wood'),
    ...guard(-0.07),
    W(0.6, 0.61, 0.06, 0.068, 0.003, 'chrome'),                // bead sight
  ],
  sawnoff: [
    C(0.0, 0.32, 0.044, 0.012, 'steel', -0.012),
    C(0.0, 0.32, 0.044, 0.012, 'steel', 0.012),
    W(0.04, 0.2, 0.012, 0.035, 0.022, 'wood'),                 // forend
    W(-0.09, 0.02, 0.012, 0.06, 0.024, 'steel'),               // action
    W(-0.22, -0.07, -0.06, 0.035, 0.019, 'wood', -0.45),       // cut-down grip
    ...guard(-0.05, 'steel'),
  ],
  auto_shotgun: [
    W(-0.16, 0.3, -0.005, 0.085, 0.03, 'polymer'),             // box receiver
    C(0.3, 0.52, 0.05, 0.014, 'black'),
    CZ(0.07, -0.07, 0.075, 0.05, 'black'),                     // drum magazine
    grip(-0.07, 0.1, 'polymer', 0.018),
    ...guard(-0.05),
    W(-0.42, -0.16, 0.0, 0.07, 0.022, 'polymer'),              // stock
    W(-0.1, 0.2, 0.085, 0.1, 0.012, 'black'),                  // carry rail
    W(0.15, 0.22, -0.04, -0.005, 0.02, 'black'),               // foregrip
  ],
  carbine: [
    W(-0.1, 0.18, 0.0, 0.07, 0.022, 'black'),                  // receiver
    W(0.18, 0.42, 0.006, 0.062, 0.026, 'black'),               // handguard
    C(0.42, 0.55, 0.035, 0.008, 'steel'),
    W(0.4, 0.415, 0.062, 0.1, 0.005, 'black'),                 // front sight post
    W(-0.02, 0.11, 0.07, 0.105, 0.016, 'black'),               // optic
    W(0.025, 0.07, -0.16, 0.0, 0.013, 'black', 0.12),          // magazine
    grip(-0.06, 0.1, 'polymer'),
    ...guard(-0.03),
    W(-0.38, -0.1, -0.01, 0.06, 0.018, 'polymer'),             // stock
    W(-0.3, -0.1, 0.022, 0.04, 0.012, 'black'),                // buffer tube
  ],
  rifle: [
    W(-0.12, 0.2, 0.0, 0.062, 0.022, 'steel'),                 // receiver
    W(0.2, 0.42, 0.004, 0.052, 0.025, 'wood'),                 // handguard
    C(0.2, 0.4, 0.068, 0.009, 'steel'),                        // gas tube
    C(0.42, 0.6, 0.032, 0.008, 'steel'),
    W(0.56, 0.575, 0.04, 0.085, 0.004, 'steel'),               // front sight
    W(0.03, 0.085, -0.11, 0.0, 0.013, '#4a3a2a', 0.2),         // banana magazine, upper
    W(0.06, 0.115, -0.2, -0.09, 0.013, '#4a3a2a', 0.5),        //   and lower
    grip(-0.06, 0.1, 'wood'),
    ...guard(-0.03, 'steel'),
    W(-0.46, -0.12, -0.065, 0.045, 0.021, 'wood', -0.14),      // stock
  ],
  sniper: [
    W(-0.52, 0.3, -0.06, 0.05, 0.026, 'olive', -0.03),         // stock and forend
    W(-0.15, 0.12, 0.03, 0.07, 0.02, 'steel'),                 // action
    C(0.3, 0.78, 0.05, 0.011, 'steel'),                        // barrel
    C(-0.1, 0.22, 0.12, 0.021, 'black'),                       // scope tube
    C(0.16, 0.25, 0.12, 0.028, 'black'),                       // objective bell
    C(-0.14, -0.08, 0.12, 0.024, 'black'),                     // eyepiece
    W(-0.06, -0.04, 0.07, 0.1, 0.01, 'black'),                 // scope rings
    W(0.12, 0.14, 0.07, 0.1, 0.01, 'black'),
    CZ(-0.03, 0.055, 0.008, 0.05, 'steel'),                    // bolt handle
    grip(-0.12, 0.08, 'olive'),
    ...guard(-0.09),
    W(0.24, 0.26, -0.18, -0.05, 0.004, 'black', 0.3),          // bipod legs
  ],
  lmg: [
    W(-0.12, 0.26, -0.005, 0.09, 0.03, 'black'),               // receiver
    C(0.26, 0.62, 0.04, 0.011, 'steel'),
    W(0.26, 0.42, 0.03, 0.06, 0.016, 'black'),                 // heat shield
    W(0.0, 0.12, -0.13, -0.005, 0.08, 'olive'),                // ammo box
    W(-0.02, 0.1, 0.09, 0.13, 0.008, 'black'),                 // carry handle
    grip(-0.08, 0.1, 'polymer', 0.018),
    ...guard(-0.05),
    W(-0.42, -0.12, -0.02, 0.07, 0.024, 'polymer'),            // stock
    W(0.5, 0.52, -0.2, 0.04, 0.005, 'black', 0.35),            // bipod
  ],
  minigun: [
    ...[0, 1, 2, 3, 4, 5].map((k) => C(0.08, 0.66, 0.045 * Math.sin((k * Math.PI) / 3), 0.009, 'black', 0.045 * Math.cos((k * Math.PI) / 3))),
    C(0.6, 0.62, 0, 0.06, 'steel'),                            // barrel clamp
    C(0.18, 0.2, 0, 0.06, 'steel'),
    C(-0.26, 0.08, 0, 0.068, 'steel'),                         // motor housing
    W(-0.22, -0.02, 0.07, 0.1, 0.012, 'black'),                // top handle
    W(-0.08, 0.02, -0.15, -0.05, 0.12, 'olive'),               // ammo feed
    W(-0.3, -0.24, -0.06, 0.06, 0.08, 'black'),                // rear grips
  ],
  flamethrower: [
    C(-0.12, 0.42, 0.04, 0.026, 'steel'),                      // wand
    C(0.42, 0.52, 0.04, 0.018, 'black'),                       // nozzle
    C(0.5, 0.53, 0.04, 0.024, 'chrome'),
    C(-0.08, 0.32, -0.06, 0.05, 'red'),                        // fuel canister
    C(-0.12, -0.08, -0.06, 0.04, 'steel'),
    grip(-0.03, 0.11, 'black', 0.018),
    W(0.2, 0.25, -0.01, 0.02, 0.018, 'black'),                 // fore grip
    W(0.46, 0.5, 0.065, 0.08, 0.008, 'brass'),                 // pilot light
  ],
  grenade: [
    CY(0, -0.04, 0.045, 0.031, 'olive'),
    CY(0, 0.045, 0.06, 0.013, 'steel'),                        // fuse
    W(-0.006, 0.006, 0.0, 0.065, 0.034, 'steel'),              // spoon
    CZ(0.02, 0.064, 0.012, 0.003, 'steel'),                    // pin ring
  ],
  molotov: [
    CY(0, -0.07, 0.09, 0.034, 'glass'),                        // bottle
    CY(0, 0.09, 0.15, 0.012, 'glass'),                         // neck
    W(-0.012, 0.012, 0.14, 0.2, 0.012, 'cloth', 0.3),          // rag
  ],
  grenade_launcher: [
    C(0.0, 0.36, 0.045, 0.024, 'olive'),                       // fat barrel
    W(-0.06, 0.02, 0.01, 0.07, 0.024, 'steel'),                // breech
    W(0.04, 0.22, -0.002, 0.03, 0.026, 'wood'),                // forend
    W(-0.4, -0.06, -0.06, 0.045, 0.022, 'wood', -0.12),        // stock
    W(0.05, 0.1, 0.07, 0.1, 0.012, 'black'),                   // leaf sight
    ...guard(-0.04, 'steel'),
  ],
  rpg: [
    C(-0.5, 0.48, 0.05, 0.022, 'olive'),                       // launch tube
    C(-0.12, 0.14, 0.05, 0.03, 'wood'),                        // heat guard
    C(-0.6, -0.5, 0.05, 0.036, 'olive'),                       // flared back
    C(0.48, 0.58, 0.05, 0.026, 'olive'),                       // rocket motor
    C(0.58, 0.68, 0.05, 0.042, 'olive'),                       // warhead
    C(0.68, 0.74, 0.05, 0.02, 'olive'),                        // nose
    W(-0.02, 0.02, -0.08, 0.03, 0.015, 'black', -0.25),        // grips
    W(0.13, 0.17, -0.08, 0.03, 0.015, 'black', -0.25),
    W(0.05, 0.12, 0.072, 0.1, 0.012, 'black'),                 // optic
  ],
};

/** Body armour, for the gun shop's turntable: a plate carrier (x = front). */
export const ARMOR_MODEL: WeaponPart[] = [
  W(-0.03, 0.03, -0.22, 0.22, 0.19, 'olive'),                  // front panel
  W(-0.24, -0.18, -0.22, 0.22, 0.19, 'olive'),                 // back panel
  W(0.03, 0.045, -0.15, 0.14, 0.14, 'black'),                  // plate pocket
  B(-0.21, 0.0, 0.18, 0.23, -0.17, -0.09, 'olive'),            // shoulder straps
  B(-0.21, 0.0, 0.18, 0.23, 0.09, 0.17, 'olive'),
  B(-0.21, 0.0, -0.2, -0.1, -0.2, -0.17, 'olive'),             // side cummerbund
  B(-0.21, 0.0, -0.2, -0.1, 0.17, 0.2, 'olive'),
  B(0.045, 0.07, -0.19, -0.08, -0.15, -0.03, '#3c4428'),       // mag pouches
  B(0.045, 0.07, -0.19, -0.08, 0.03, 0.15, '#3c4428'),
];
