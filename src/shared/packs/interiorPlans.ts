import type { InteriorLayout, InteriorPlan } from './types';

// Hand-made ground floors (shared/world/interiors.ts places them behind the street door). Metres:
// `a` across from the left, `d` in from the front wall (its outside face); rects are [a0, a1, d0, d1].

export const INTERIOR_PLANS: Partial<Record<InteriorLayout, InteriorPlan>> = {
  // Harbor Trust: a lobby with benches, the tellers' counter (a staff gap at the left end), the
  // manager's office behind, and the vault in the back right behind a thick wall and a steel door.
  bank: {
    w: 14, d: 15,
    walls: [
      { r: [0.3, 1.3, 10.4, 10.7], h: 2.8 }, { r: [2.5, 7.2, 10.4, 10.7], h: 2.8 },   // partition, door at 1.3-2.5
      { r: [7.2, 7.8, 10.4, 11.6], h: 3.2 }, { r: [7.2, 7.8, 13.2, 14.7], h: 3.2 },   // vault wall (door at 11.6-13.2)
      { r: [7.2, 13.7, 10.4, 11.0], h: 3.2 },                                          // vault front wall
    ],
    props: [
      { r: [1.5, 13.7, 7.0, 7.8], h: 1.15, kind: 'counter' },
      { r: [1.0, 3.2, 2.6, 3.1], h: 0.5, kind: 'bench' }, { r: [10.8, 13.0, 2.6, 3.1], h: 0.5, kind: 'bench' },
      { r: [2.0, 4.2, 12.6, 13.4], h: 0.8, kind: 'desk' },
      { r: [8.2, 13.3, 14.0, 14.6], h: 2.2, kind: 'rack' },
    ],
    counter: [7, 6.1],
    clerk: [7, 8.9],
    guards: [{ at: [12.4, 1.6], arch: 'guard' }],
    vault: { door: [7.2, 7.8, 11.6, 13.2], room: [7.8, 13.7, 11.0, 14.7], cash: [[9, 11.9], [10.7, 11.9], [12.4, 11.9], [9, 13.2], [10.7, 13.2], [12.4, 13.2]] },
  },
  // Police precinct: a waiting area, the front desk with the desk sergeant, three barred cells along
  // the back, and an office.
  precinct: {
    w: 18, d: 10.5,
    walls: [
      // Cell bars along d 7.2 (a gap into each cell), and the walls between cells.
      { r: [0.3, 1.2, 7.1, 7.3], h: 2.6 }, { r: [2.1, 4.4, 7.1, 7.3], h: 2.6 }, { r: [5.3, 7.6, 7.1, 7.3], h: 2.6 }, { r: [8.5, 10.0, 7.1, 7.3], h: 2.6 },
      { r: [3.4, 3.6, 7.3, 10.2], h: 2.6 }, { r: [6.6, 6.8, 7.3, 10.2], h: 2.6 }, { r: [9.8, 10.0, 7.3, 10.2], h: 2.6 },
      { r: [10.0, 11.2, 7.1, 7.3], h: 2.8 }, { r: [12.4, 17.7, 7.1, 7.3], h: 2.8 },  // office wall, door at 11.2-12.4
    ],
    props: [
      { r: [5.0, 13.0, 4.5, 5.3], h: 1.1, kind: 'counter' },
      { r: [0.6, 1.1, 1.4, 4.4], h: 0.5, kind: 'bench' }, { r: [16.9, 17.4, 1.4, 4.4], h: 0.5, kind: 'bench' },
      { r: [0.6, 2.6, 9.4, 9.9], h: 0.45, kind: 'bench' }, { r: [3.9, 5.9, 9.4, 9.9], h: 0.45, kind: 'bench' }, { r: [7.1, 9.1, 9.4, 9.9], h: 0.45, kind: 'bench' },
      { r: [13.0, 15.0, 8.6, 9.4], h: 0.8, kind: 'desk' }, { r: [15.6, 17.6, 7.6, 8.1], h: 1.9, kind: 'shelf' },
    ],
    counter: [9, 3.7],
    clerk: [9, 6.2],
    clerkArch: 'cop',
  },
};
