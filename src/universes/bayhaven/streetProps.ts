// Street furniture a vehicle can knock over: what it's like (size, how it's drawn), how hard it is
// to knock down, what it does to the car, and where the city puts it (world/breakables.ts reads
// `along`: lamp posts down the roads, the rest on the kerbs of each block).
import type { StreetPropSpec } from '../../shared/packs/types';

export const STREET_PROPS: StreetPropSpec[] = [
  {
    id: 'lamp', name: 'Lamp post', radius: 0.16, knockSpeed: 3, carDamage: 14, slow: 0.86, along: 'road', every: 34, fx: 'spark',
    parts: [
      { shape: 'cyl', w: 0.22, h: 7, color: '#2d3035' },
      { shape: 'box', w: 0.12, h: 0.12, d: 2.2, y: 6.8, out: 1.1, color: '#2d3035' },
      { shape: 'box', w: 0.4, h: 0.2, d: 0.8, y: 6.6, out: 2.1, color: '#e8e2c8', lamp: true },
    ],
  },
  {
    // The lights themselves (their colours, the glow) are drawn live over the head: render/streetProps.ts.
    id: 'signal', name: 'Traffic light', radius: 0.2, knockSpeed: 6, carDamage: 25, slow: 0.8, along: 'signal', fx: 'spark',
    parts: [
      { shape: 'cyl', w: 0.24, h: 6, color: '#24272b' },
      { shape: 'box', w: 0.16, h: 0.16, y: 5.6, span: 'arm', color: '#24272b' },
      { shape: 'box', w: 0.55, h: 1.1, d: 0.55, y: 4.6, span: 'end', color: '#1a1c1f' },
    ],
  },
  {
    id: 'hydrant', name: 'Fire hydrant', radius: 0.18, knockSpeed: 4, carDamage: 10, slow: 0.9, along: 'kerb', perBlock: [1, 2], fx: 'water',
    parts: [{ shape: 'cyl', w: 0.32, h: 0.65, color: '#c0281e' }, { shape: 'cyl', w: 0.22, h: 0.14, y: 0.65, color: '#d8d2c0' }],
  },
  {
    id: 'bin', name: 'Trash can', radius: 0.32, knockSpeed: 2, carDamage: 3, slow: 0.96, along: 'kerb', perBlock: [0, 2], busyOnly: true,
    parts: [{ shape: 'cyl', w: 0.6, h: 0.95, color: '#2f4a3a' }],
  },
  {
    id: 'newsbox', name: 'Newspaper box', radius: 0.28, knockSpeed: 2, carDamage: 4, slow: 0.95, along: 'kerb', perBlock: [0, 1], busyOnly: true,
    parts: [{ shape: 'box', w: 0.5, h: 1.1, color: '#2a4f9a' }],
  },
  {
    id: 'mailbox', name: 'Mailbox', radius: 0.26, knockSpeed: 3, carDamage: 6, slow: 0.93, along: 'kerb', perBlock: [0, 1], busyOnly: true,
    parts: [{ shape: 'box', w: 0.45, h: 1.0, color: '#b0302a' }],
  },
];
