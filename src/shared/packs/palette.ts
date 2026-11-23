// Vehicle paint palette. Vehicles reference colours by index so snapshots stay small.

export const PALETTE: string[] = [
  '#f2f2ee', // 0 white
  '#16171a', // 1 black
  '#8c9196', // 2 silver
  '#4a4f55', // 3 graphite
  '#7a1414', // 4 dark red
  '#c62a22', // 5 red
  '#1d3557', // 6 navy
  '#2f6fb3', // 7 blue
  '#1f4d34', // 8 forest green
  '#5d7a3a', // 9 olive green
  '#c9a227', // 10 mustard
  '#e3b30c', // 11 taxi yellow
  '#d9661b', // 12 orange
  '#6b3a2a', // 13 brown
  '#b8a88a', // 14 beige
  '#5a2a6e', // 15 purple
  '#0f8c8c', // 16 teal
  '#e04e8c', // 17 pink
  '#2bb34a', // 18 lime green
  '#3c3f2e', // 19 army drab
  '#575b3c', // 20 army olive
  '#d4d0c4', // 21 off-white
  '#272c36', // 22 midnight
  '#9e1b32', // 23 crimson
];

/** Names shown in the paint shop, by palette index. */
export const PALETTE_NAMES = [
  'White', 'Black', 'Silver', 'Graphite', 'Dark red', 'Red', 'Navy', 'Blue', 'Forest green', 'Olive', 'Mustard',
  'Taxi yellow', 'Orange', 'Brown', 'Beige', 'Purple', 'Teal', 'Pink', 'Lime', 'Army drab', 'Army olive', 'Off-white',
  'Midnight', 'Crimson',
];

export const CIVIL = [0, 1, 2, 3, 4, 6, 7, 8, 13, 14, 21, 22, 2, 0, 1];
export const BRIGHT = [5, 7, 10, 12, 15, 16, 17, 18, 23, 0, 1, 11];
export const DULL = [2, 3, 13, 14, 21, 9, 0, 6];

export function paletteFor(colors: number[] | 'civil' | 'bright' | 'dull'): number[] {
  if (colors === 'civil') return CIVIL;
  if (colors === 'bright') return BRIGHT;
  if (colors === 'dull') return DULL;
  return colors;
}
