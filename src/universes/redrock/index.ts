// Redrock Territory: an original frontier territory in the 1870s. Three timber towns on wide dirt
// streets, homesteads, open prairie and red badlands walled in by cliffs, a river with two
// crossings; horses and wagons; three outlaw outfits; deputies, marshals and the cavalry.
// No cast of its own yet: the outfits post their work on job posts (with a brief, no voiced call),
// and the player's own lines are the shared ones.
import player from '../../../content/player/player.json';
import { INTERIOR_PLANS } from '../bayhaven/interiorPlans';
import type { PlayerFile, Universe, WeaponPart } from '../../shared/packs/types';
import { MARK_NAMES, MISSIONS, MODES } from './missions';
import { FACTIONS, HAIR, PEDS, SHOES, SKIN } from './peds';
import { PROPERTIES, SERVICES } from './places';
import { CRIMES, RESPECT, ROLE_CREWS, RULES, SERVICE_CALLS, WANTED } from './rules';
import { STREET_PROPS } from './streetProps';
import { VEHICLES } from './vehicles';
import { WEAPONS } from './weapons';
import { DISTRICTS, ZONES } from './zones';

/** Paint (index = colour id): horse coats first, then wagon paint. */
const COLORS = ['#6b3e22', '#8a4a24', '#1c1a18', '#8f8f8a', '#e8e4d8', '#c9a05a', '#a88a5e', '#7a5a52',
  '#3e5a3a', '#7a2a20', '#8a7356', '#28324a', '#b8902e'];
const NAMES = ['Bay', 'Chestnut', 'Black', 'Grey', 'White', 'Palomino', 'Dun', 'Roan',
  'Wagon green', 'Barn red', 'Weathered', 'Navy', 'Coach yellow'];

/** The bank (vault) and the lockup use Bayhaven's floor plans, staffed with Redrock's people: the
 *  sheriff's desk by a deputy, the bank by its guard. */
const PLANS = Object.fromEntries(Object.entries(INTERIOR_PLANS).map(([k, p]) => [k, {
  ...p, clerkArch: p.clerkArch === 'cop' ? 'deputy' : p.clerkArch,
  guards: p.guards?.map((g) => ({ ...g, arch: g.arch === 'cop' ? 'deputy' : g.arch })),
}])) as typeof INTERIOR_PLANS;

/** A leather vest, for the gunsmith's armour rack. */
const VEST: WeaponPart[] = [
  { shape: 'box', x: [-0.18, 0.18], y: [0, 0.5], z: [-0.2, 0.2], mat: '#5a3a20' },
  { shape: 'box', x: [-0.02, 0.02], y: [0.05, 0.48], z: [-0.21, 0.21], mat: 'brass' },
];

export const REDROCK: Universe = {
  id: 'redrock',
  name: 'Redrock Territory',
  blurb: 'An 1870s frontier territory: timber towns, prairie and badlands, horses, outlaws and the law.',
  contentDir: 'content/redrock',
  world: {
    size: 2560, margin: 60, edge: 'cliffs', river: { at: 0.42, width: 40 },
    spacing: { near: 84, far: 150 }, arterialEvery: 3, ground: '#c4a274', modern: false,
  },
  vehicles: VEHICLES,
  weapons: WEAPONS,
  peds: PEDS,
  factions: FACTIONS,
  zones: ZONES,
  districts: DISTRICTS,
  services: SERVICES,
  properties: PROPERTIES,
  interiorPlans: PLANS,
  missions: MISSIONS,
  modes: MODES,
  markNames: MARK_NAMES,
  wanted: WANTED,
  crimes: CRIMES,
  serviceCalls: SERVICE_CALLS,
  roleCrews: ROLE_CREWS,
  rules: RULES,
  respect: RESPECT,
  radio: [],
  palette: { colors: COLORS, names: NAMES, civil: [0, 1, 2, 3, 6, 7], bright: [4, 5, 8, 9, 12], dull: [2, 3, 6, 10] },
  pedColors: { hair: HAIR, shoes: SHOES },
  looks: {
    skin: SKIN,
    hair: HAIR,
    hairStyle: ['Short', 'Long', 'Shaved'],
    top: ['#e6dcc0', '#c9b48a', '#8a6a4a', '#5a6a7a', '#7a3a2a', '#1a1612', '#4a5a3a', '#9a8a6a', '#d9a62b', '#28324a'],
    bottom: ['#3a3024', '#4a3a2a', '#2a2a30', '#5a4a3a', '#6a5a44', '#1a1612'],
    hat: ['', '#4a3a2a', '#2a2018', '#8a6a4a', '#c9b48a', '#1a1612', '#e6dcc0'],
  },
  defaultLook: { skin: 0, hair: 1, hairStyle: 0, top: 1, bottom: 0, hat: 1 },
  nameParts: {
    first: ['Abe', 'Clem', 'Cora', 'Eli', 'Etta', 'Hattie', 'Jeb', 'Josiah', 'Lottie', 'Mabel', 'Ned', 'Orrin', 'Percy', 'Ruth',
      'Silas', 'Tobias', 'Wade', 'Zeke', 'Nell', 'Amos', 'Belle', 'Cyrus', 'Dell', 'Ezra', 'Ida', 'Luke', 'Mattie', 'Rufus'],
    last: ['Bright', 'Dunn', 'Fairbanks', 'Grady', 'Holt', 'Keene', 'Larkin', 'Pruitt', 'Sutter', 'Tate', 'Vance', 'Wheeler',
      'Yancey', 'Corbin', 'Ashby', 'Pike', 'Hatch', 'Merritt', 'Coley', 'Bram', 'Starling', 'Thorne'],
  },
  armorModel: VEST,
  streetProps: STREET_PROPS,
  cast: [],
  player: player as unknown as PlayerFile,
};
