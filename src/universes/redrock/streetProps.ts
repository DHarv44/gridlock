// What stands along Redrock's town boardwalks, and goes over when a wagon or a galloping horse
// clips it: hitching rails, water troughs, barrels, crates. No lamp posts down the roads.
import type { StreetPropSpec } from '../../shared/packs/types';

export const STREET_PROPS: StreetPropSpec[] = [
  {
    id: 'hitching_rail', name: 'Hitching rail', radius: 0.3, knockSpeed: 5, carDamage: 8, slow: 0.88, along: 'kerb', perBlock: [1, 3], busyOnly: true,
    parts: [{ shape: 'box', w: 0.14, h: 1.0, d: 0.14, color: '#5a3a20' }, { shape: 'box', w: 0.12, h: 0.12, d: 2.4, y: 0.95, color: '#6b4a2e' }],
  },
  {
    id: 'trough', name: 'Water trough', radius: 0.45, knockSpeed: 6, carDamage: 10, slow: 0.85, along: 'kerb', perBlock: [0, 1], busyOnly: true, fx: 'water',
    parts: [{ shape: 'box', w: 0.8, h: 0.6, d: 2.0, color: '#6b4a2e' }, { shape: 'box', w: 0.6, h: 0.05, d: 1.8, y: 0.55, color: '#2f5a6a' }],
  },
  {
    id: 'barrel', name: 'Barrel', radius: 0.32, knockSpeed: 2, carDamage: 3, slow: 0.95, along: 'kerb', perBlock: [0, 2], busyOnly: true,
    parts: [{ shape: 'cyl', w: 0.6, h: 0.9, color: '#7a5a3a' }],
  },
  {
    id: 'crate', name: 'Crate', radius: 0.3, knockSpeed: 2, carDamage: 3, slow: 0.95, along: 'kerb', perBlock: [0, 2],
    parts: [{ shape: 'box', w: 0.6, h: 0.6, color: '#9a7a52' }],
  },
];
