// Redrock's fixtures (packs/types.ts FixtureSpec; placed by shared/world/fixtures.ts): the town's
// landmarks, the homesteads' outbuildings, and the desert's growth and bones. Parts are fractions of
// each one's size, front +x (a lot fixture's front faces the street).
import type { FixturePart, FixtureSpec } from '../../shared/packs/types';

const p = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, paint: FixturePart['paint'], shape?: FixturePart['shape'], spin?: boolean): FixturePart =>
  ({ x: [x0, x1], y: [y0, y1], z: [z0, z1], paint, ...(shape ? { shape } : {}), ...(spin ? { spin } : {}) });

const WOOD = '#6a4a2e', DARK = '#3e2c1a', SHINGLE = '#4a3a2a', IRON = '#3a3836', ROPE = '#a08a5a';

/** Four legs at the corners of [x0, x1] x [y0, y1], each `t` thick (fractions). */
const legs = (x0: number, x1: number, y0: number, y1: number, z1: number, t: number, paint: FixturePart['paint']): FixturePart[] =>
  [[x0, y0], [x0, y1 - t], [x1 - t, y0], [x1 - t, y1 - t]].map(([x, y]) => p(x, x + t, y, y + t, 0, z1, paint));

// ---------------------------------------------------------------- the town

/** A white board church end-on to the street, its steeple over the door. */
const church: FixtureSpec = {
  id: 'church', site: 'lot', zones: ['town'], chance: 0.35, most: 1, size: [16, 10], height: 15, solid: 'box',
  colors: ['#e8e0cc', '#dcd2bc', '#efe6d2'],
  parts: [
    p(-0.5, 0.32, -0.45, 0.45, 0, 0.3, 'body'),
    p(-0.52, 0.34, -0.5, 0.5, 0.3, 0.46, SHINGLE, 'gable'),
    p(0.32, 0.5, -0.17, 0.17, 0, 0.6, 'body'),
    p(0.33, 0.49, -0.15, 0.15, 0.6, 0.7, DARK),
    p(0.315, 0.505, -0.18, 0.18, 0.7, 0.73, 'body'),
    p(0.32, 0.5, -0.17, 0.17, 0.73, 1.0, SHINGLE, 'cone'),
    p(0.49, 0.51, -0.07, 0.07, 0, 0.19, DARK),
    // Tall windows down each side.
    ...[-0.35, -0.1, 0.15].flatMap((x) => [p(x, x + 0.07, -0.46, -0.45, 0.08, 0.24, DARK), p(x, x + 0.07, 0.45, 0.46, 0.08, 0.24, DARK)]),
  ],
};

/** A timber water tank on braced legs, a conical cap. */
const waterTower: FixtureSpec = {
  id: 'water_tower', site: 'lot', zones: ['town'], chance: 0.2, most: 1, size: [6, 6], height: 13, solid: 'box',
  colors: [WOOD],
  parts: [
    ...legs(-0.42, 0.42, -0.42, 0.42, 0.58, 0.09, DARK),
    p(-0.4, 0.4, -0.04, 0.04, 0.28, 0.31, DARK), p(-0.04, 0.04, -0.4, 0.4, 0.28, 0.31, DARK),
    p(-0.46, 0.46, -0.46, 0.46, 0.57, 0.6, DARK),
    p(-0.44, 0.44, -0.44, 0.44, 0.6, 0.88, 'body', 'cyl'),
    p(-0.45, 0.45, -0.45, 0.45, 0.7, 0.71, IRON, 'cyl'), p(-0.45, 0.45, -0.45, 0.45, 0.8, 0.81, IRON, 'cyl'),
    p(-0.48, 0.48, -0.48, 0.48, 0.88, 1.0, SHINGLE, 'cone'),
  ],
};

/** The gallows on the square: a platform, steps, two uprights and a beam, and the rope. */
const gallows: FixtureSpec = {
  id: 'gallows', site: 'square', zones: ['town'], chance: 0.7, most: 1, size: [5, 4], height: 4.6, solid: 'box',
  colors: [WOOD],
  parts: [
    p(-0.2, 0.5, -0.5, 0.5, 0, 0.36, 'body'),
    p(-0.5, -0.2, -0.25, 0.25, 0, 0.12, 'body'), p(-0.35, -0.2, -0.25, 0.25, 0.12, 0.24, 'body'),
    p(0.12, 0.32, -0.2, 0.2, 0.355, 0.365, DARK),
    p(0.3, 0.36, -0.42, -0.34, 0.36, 1.0, DARK), p(0.3, 0.36, 0.34, 0.42, 0.36, 1.0, DARK),
    p(0.28, 0.38, -0.44, 0.44, 0.93, 1.0, DARK),
    p(0.32, 0.34, -0.01, 0.01, 0.62, 0.93, ROPE), p(0.3, 0.36, -0.03, 0.03, 0.6, 0.65, ROPE),
  ],
};

// ---------------------------------------------------------------- the homesteads

/** A barn: a tall plank body, a steep gable roof, big doors at the front and a hayloft door over them. */
const barn: FixtureSpec = {
  id: 'barn', site: 'yard', zones: ['homesteads'], chance: 0.55, size: [12, 9], height: 8.5, solid: 'box',
  colors: ['#7a2a20', '#8a3a28', '#6a5a48', '#7a6248'],
  parts: [
    p(-0.5, 0.5, -0.5, 0.5, 0, 0.55, 'body'),
    p(-0.53, 0.53, -0.56, 0.56, 0.55, 1.0, SHINGLE, 'gable'),
    p(0.495, 0.51, -0.22, 0.22, 0, 0.4, DARK),
    p(0.5, 0.515, -0.02, 0.02, 0, 0.4, '#e8e0cc'),
    p(0.495, 0.51, -0.1, 0.1, 0.45, 0.6, DARK),
  ],
};

/** A corral: a post-and-rail ring, the gate (a gap) at the front, a trough inside. */
const RAIL = '#7a5a3a';
const rails: FixturePart[] = [];
for (const z of [0.38, 0.72]) {
  rails.push(p(-0.5, 0.5, -0.5, -0.49, z, z + 0.08, RAIL), p(-0.5, 0.5, 0.49, 0.5, z, z + 0.08, RAIL), p(-0.5, -0.49, -0.5, 0.5, z, z + 0.08, RAIL));
  rails.push(p(0.49, 0.5, -0.5, -0.12, z, z + 0.08, RAIL), p(0.49, 0.5, 0.12, 0.5, z, z + 0.08, RAIL));
}
for (const x of [-0.5, -0.25, 0, 0.25, 0.49]) for (const y of [-0.5, 0.49]) rails.push(p(x, x + 0.012, y, y + 0.012, 0, 1, DARK));
for (const y of [-0.25, 0.25]) rails.push(p(-0.5, -0.488, y, y + 0.012, 0, 1, DARK));
for (const y of [-0.13, 0.12]) rails.push(p(0.49, 0.502, y, y + 0.012, 0, 1, DARK));
const corral: FixtureSpec = {
  id: 'corral', site: 'yard', zones: ['homesteads'], chance: 0.4, size: [16, 12], height: 1.6, solid: 'ring',
  parts: [...rails, p(-0.35, -0.15, -0.42, -0.36, 0, 0.35, WOOD)],
};

/** A windmill: a lattice tower, its wheel turning in the wind, a tail vane, a trough at its foot. */
const windmill: FixtureSpec = {
  id: 'windmill', site: 'yard', zones: ['homesteads'], chance: 0.3, size: [4, 4], height: 10, solid: 1.0,
  parts: [
    // The wheel (hub first: the others turn round its centre): two blades crossing.
    p(0.0, 0.1, -0.05, 0.05, 0.9, 0.95, IRON, undefined, true),
    p(0.02, 0.08, -0.32, 0.32, 0.9, 0.95, '#8a8478', undefined, true), p(0.02, 0.08, -0.025, 0.025, 0.82, 1.0, '#8a8478', undefined, true),
    ...legs(-0.25, 0.25, -0.25, 0.25, 0.86, 0.04, '#6a6258'),
    p(-0.2, 0.2, -0.2, 0.2, 0.86, 0.88, '#6a6258'),
    p(-0.45, -0.05, -0.01, 0.01, 0.88, 0.96, '#8a8478'),
    p(0.25, 0.5, 0.25, 0.5, 0, 0.08, WOOD),
  ],
};

/** A well: a round stone kerb, two posts and a little roof over the windlass. */
const well: FixtureSpec = {
  id: 'well', site: 'yard', zones: ['homesteads'], chance: 0.45, size: [2.4, 2.4], height: 3, solid: 1.0,
  parts: [
    p(-0.45, 0.45, -0.45, 0.45, 0, 0.28, '#8a8478', 'cyl'),
    p(-0.3, 0.3, -0.3, 0.3, 0.27, 0.29, '#1a1612', 'cyl'),
    p(-0.05, 0.05, -0.45, -0.38, 0, 0.75, WOOD), p(-0.05, 0.05, 0.38, 0.45, 0, 0.75, WOOD),
    p(-0.03, 0.03, -0.42, 0.42, 0.55, 0.6, DARK),
    p(-0.35, 0.35, -0.55, 0.55, 0.75, 1.0, SHINGLE, 'gable'),
  ],
};

/** A shed: a plank lean-to for tools and feed. */
const shed: FixtureSpec = {
  id: 'shed', site: 'yard', zones: ['homesteads'], chance: 0.35, size: [5, 4], height: 3.4, solid: 'box',
  colors: ['#7a6248', '#6a5a48', '#8a6a48'],
  parts: [p(-0.5, 0.5, -0.5, 0.5, 0, 0.75, 'body'), p(-0.53, 0.53, -0.55, 0.55, 0.75, 1.0, SHINGLE, 'gable'), p(0.495, 0.51, -0.15, 0.15, 0, 0.6, DARK)],
};

/** The outhouse, a short walk from the house, a crescent moon cut in its door. */
const outhouse: FixtureSpec = {
  id: 'outhouse', site: 'yard', zones: ['homesteads'], chance: 0.6, size: [1.5, 1.5], height: 2.6, solid: 'box',
  colors: ['#7a6248', '#6a5a48'],
  parts: [p(-0.5, 0.5, -0.5, 0.5, 0, 0.85, 'body'), p(-0.55, 0.55, -0.55, 0.55, 0.85, 1.0, SHINGLE, 'gable'), p(0.495, 0.51, -0.06, 0.06, 0.62, 0.7, DARK)],
};

/** A lone windmill and trough out on the range. */
const rangeWindmill: FixtureSpec = { ...windmill, id: 'range_windmill', site: 'wild', zones: ['prairie'], chance: 0.06 };

// ---------------------------------------------------------------- the desert

const CACTUS = '#4a6a3a', CACTUS_DARK = '#3e5a32', BONE = '#e8e0cc';

/** A saguaro: a ribbed column with its arms raised, one high and one low. */
const saguaro: FixtureSpec = {
  id: 'saguaro', site: 'wild', zones: ['badlands', 'prairie'], chance: 1.4, size: [2.2, 1.2], height: 6.5, solid: 0.35,
  parts: [
    p(-0.11, 0.11, -0.2, 0.2, 0, 1.0, CACTUS, 'cyl'),
    p(-0.1, 0.1, -0.21, 0.21, 0.98, 1.0, CACTUS_DARK, 'cyl'),
    p(0.08, 0.32, -0.08, 0.08, 0.5, 0.56, CACTUS, 'box'), p(0.26, 0.38, -0.12, 0.12, 0.5, 0.82, CACTUS, 'cyl'),
    p(-0.3, -0.08, -0.08, 0.08, 0.36, 0.42, CACTUS, 'box'), p(-0.36, -0.24, -0.12, 0.12, 0.36, 0.62, CACTUS, 'cyl'),
  ],
};
/** A young saguaro, no arms yet. */
const saguaroYoung: FixtureSpec = { ...saguaro, id: 'saguaro_young', chance: 1.0, size: [0.8, 0.8], height: 3, solid: 0.3, parts: [p(-0.32, 0.32, -0.32, 0.32, 0, 1, CACTUS, 'cyl')] };

/** Prickly pear: a clump of flat pads every which way, knee high (you can push through, painfully). */
const pads: FixturePart[] = [];
for (const [x, y, z, along] of [[-0.2, -0.1, 0, true], [0.15, 0.1, 0, false], [0, -0.25, 0.25, false], [-0.25, 0.2, 0.2, true], [0.25, -0.2, 0.3, true], [0.05, 0.25, 0.45, false]] as [number, number, number, boolean][]) {
  pads.push(along ? p(x - 0.22, x + 0.22, y - 0.03, y + 0.03, z, z + 0.45, CACTUS) : p(x - 0.03, x + 0.03, y - 0.22, y + 0.22, z, z + 0.45, CACTUS));
}
const pricklyPear: FixtureSpec = { id: 'prickly_pear', site: 'wild', zones: ['badlands', 'prairie'], chance: 3, size: [1.6, 1.6], height: 1.1, parts: pads };

/** A steer's skull, bleached, horns and all, lying where it fell. */
const skull: FixtureSpec = {
  id: 'skull', site: 'wild', zones: ['badlands', 'prairie'], chance: 0.8, size: [0.6, 1.2], height: 0.25,
  parts: [p(-0.5, 0.2, -0.16, 0.16, 0, 0.9, BONE), p(0.2, 0.5, -0.1, 0.1, 0, 0.6, BONE), p(-0.35, -0.2, -0.5, 0.5, 0.5, 1.0, BONE), p(-0.1, 0.0, -0.12, -0.04, 0.6, 0.92, '#2a2018'), p(-0.1, 0.0, 0.04, 0.12, 0.6, 0.92, '#2a2018')],
};

// ---------------------------------------------------------------- the railroad

/** A depot beside the station, its front to the track: a long timber building under a deep roof that
 *  reaches out over the platform on posts, the telegrapher's bay window looking up the line. */
const depot: FixtureSpec = {
  id: 'depot', site: 'station', zones: ['town'], chance: 1, size: [9, 16], height: 6.5, solid: 'box',
  colors: ['#c9a05a', '#b8902e', '#8a6a48'],
  parts: [
    p(-0.5, 0.15, -0.48, 0.48, 0, 0.62, 'body'),
    p(-0.55, 0.2, -0.52, 0.52, 0.62, 0.92, SHINGLE, 'gable'),
    p(0.15, 0.5, -0.5, 0.5, 0.6, 0.64, SHINGLE),
    ...[-0.45, -0.15, 0.15, 0.45].map((y) => p(0.44, 0.48, y - 0.01, y + 0.01, 0, 0.6, DARK)),
    p(0.15, 0.28, -0.12, 0.12, 0, 0.5, 'body'), p(0.27, 0.285, -0.08, 0.08, 0.22, 0.42, DARK),
    p(0.145, 0.16, 0.25, 0.32, 0, 0.42, DARK), p(0.145, 0.16, -0.32, -0.25, 0, 0.42, DARK),
  ],
};
/** The railroad's water tower by the depot, where the locomotives take on water. */
const railTower: FixtureSpec = { ...waterTower, id: 'rail_water_tower', site: 'station', chance: 0.7 };

export const FIXTURES: FixtureSpec[] = [church, waterTower, gallows, barn, corral, windmill, well, shed, outhouse, rangeWindmill,
  saguaro, saguaroYoung, pricklyPear, skull, depot, railTower];
