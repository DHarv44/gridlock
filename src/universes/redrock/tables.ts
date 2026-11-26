// Redrock's card and dice games (shared/games; world/tables.ts places them on the saloons' card
// tables). Honest odds: the house's edge is each game's own rules. Stakes in frontier dollars, and
// the higher the stakes, the sharper the company and the more of them deal from the bottom. Get
// caught cheating and the man across the table stands up and shoots you.
import type { TableSpec, VenueSpec } from '../../shared/packs/types';

export const TABLES: TableSpec[] = [
  // Five-card draw, the saloon's game, from a friendly game to the sharks' table.
  { id: 'draw_low', name: 'Five-card draw, $1/$2', game: 'draw', stakes: [1, 2], buyIn: [10, 60], players: 4, skill: 0.25, rake: [0.05, 5], sharps: 0.05, caught: 'shoot' },
  { id: 'draw_dollar', name: 'Five-card draw, $2/$5', game: 'draw', stakes: [2, 5], buyIn: [40, 200], players: 4, skill: 0.5, rake: [0.05, 15], sharps: 0.08, caught: 'shoot' },
  { id: 'draw_high', name: 'High-stakes draw, $10/$25', game: 'draw', stakes: [10, 25], buyIn: [200, 1000], players: 3, skill: 0.8, rake: [0.05, 40], sharps: 0.12, caught: 'shoot' },
  { id: 'stud', name: 'Five-card stud, $1/$3', game: 'stud', stakes: [1, 3], buyIn: [20, 120], players: 4, skill: 0.4, rake: [0.05, 10], sharps: 0.07, caught: 'shoot' },
  // The house games: the dealer behind the table, the bank's money on it.
  { id: 'twentyone', name: 'Twenty-one', game: 'twentyone', stakes: [1, 25] },
  { id: 'faro', name: 'Faro', game: 'faro', stakes: [1, 50] },
  { id: 'hazard', name: 'Hazard', game: 'hazard', stakes: [1, 25] },
  // An outfit's back-room game: invite only, outlaws at the table, and they shoot.
  { id: 'outfit_draw', name: 'Outlaws\' draw, $25/$50', game: 'draw', stakes: [25, 50], buyIn: [500, 2500], players: 3, skill: 0.88, sharps: 0.2, caught: 'shoot' },
];

export const VENUES: VenueSpec[] = [
  // Each saloon deals its own few of these (a bigger room, more tables, more of them); draw most.
  { at: { layout: 'saloon' }, tables: ['draw_low', 'draw_dollar', 'faro', 'stud', 'twentyone', 'draw_low', 'hazard', 'draw_high'], mix: true },
  { at: { backroom: true }, tables: ['outfit_draw'] },
];
