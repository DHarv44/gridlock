// Redrock Territory's people: townsfolk and ranch hands, three outlaw outfits, the law (county
// deputies and federal marshals), the cavalry at the fort, and the doctor and fire volunteers.
import type { FactionSpec, PedArchetype } from '../../shared/packs/types';

export const SKIN = ['#f1c9a5', '#e0ac69', '#c68642', '#8d5524', '#5c3a21', '#ffdbac', '#a5704a'];
export const HAIR = ['#1a1410', '#2b1d14', '#4a3020', '#6b4a2a', '#a07a4a', '#c9a76a', '#8a8a8a', '#d8d2c8', '#5a1e14'];
export const SHOES = ['#2b2018', '#3a2a1a', '#1a1612', '#5a3a24'];
const SHIRT = ['#e6dcc0', '#c9b48a', '#8a6a4a', '#5a6a7a', '#7a3a2a', '#d8cfc0', '#4a5a3a', '#9a8a6a'];
const TROUSERS = ['#3a3024', '#4a3a2a', '#2a2a30', '#5a4a3a', '#6a5a44'];
const HATS = ['#4a3a2a', '#2a2018', '#8a6a4a', '#c9b48a', '#1a1612'];

export const FACTIONS: FactionSpec[] = [
  { id: 'folk', name: 'Townsfolk', color: '#c9b48a', hostile: [], witness: true },
  { id: 'player', name: 'Players', color: '#ffffff', hostile: [] },
  { id: 'law', name: 'County Law', color: '#c9a227', hostile: [], lawful: true },
  { id: 'cavalry', name: 'Fort Garnet Cavalry', color: '#28324a', hostile: [], lawful: true },
  { id: 'services', name: 'Doctor & Volunteers', color: '#e6dcc0', hostile: [] },
  // Outlaw outfits: each has its own colour (bandanas, flags on its job posts) and its territory.
  { id: 'dry_creek', name: 'Dry Creek Outfit', color: '#b8442a', hostile: ['vultures', 'lantern'], gang: true, carColor: 1 },
  { id: 'vultures', name: 'Vulture Ridge Gang', color: '#2a2018', hostile: ['dry_creek', 'lantern'], gang: true, carColor: 2 },
  { id: 'lantern', name: 'Lantern Men', color: '#d9a62b', hostile: ['dry_creek', 'vultures'], gang: true, carColor: 5 },
  { id: 'cardsharps', name: 'Card Sharps', color: '#5a3a6a', hostile: [] },
];

const base = { hp: 100, armor: 0, walkSpeed: 1.4, runSpeed: 5.0, courage: 0.15, accuracy: 0.4, loadout: [], cash: [1, 6] as [number, number] };
const folkLook = { skin: SKIN, top: SHIRT, bottom: TROUSERS, hat: HATS, hatChance: 0.75 };

export const PEDS: PedArchetype[] = [
  { ...base, id: 'player', name: 'Player', behaviour: 'player', faction: 'player', runSpeed: 6.2, courage: 1, accuracy: 1, cash: [0, 0],
    look: { skin: SKIN, top: ['#e6dcc0'], bottom: TROUSERS } },

  { ...base, id: 'townsfolk', name: 'Townsfolk', behaviour: 'civilian', faction: 'folk', talker: 'townsfolk',
    loadout: [{ weapon: 'derringer', chance: 0.04, ammo: 4 }, { weapon: 'knife', chance: 0.05, ammo: 0 }], look: folkLook },
  { ...base, id: 'rancher', name: 'Rancher', behaviour: 'civilian', faction: 'folk', talker: 'settler', courage: 0.45, hp: 120, cash: [2, 12],
    loadout: [{ weapon: 'lever_rifle', chance: 0.25, ammo: 24 }, { weapon: 'revolver', chance: 0.2, ammo: 12 }],
    look: { ...folkLook, top: ['#8a6a4a', '#7a3a2a', '#5a6a7a', '#c9b48a'], hatChance: 1 } },
  { ...base, id: 'prospector', name: 'Prospector', behaviour: 'civilian', faction: 'folk', talker: 'prospector', walkSpeed: 1.1, runSpeed: 3.8, cash: [0, 20],
    loadout: [{ weapon: 'hatchet', chance: 0.4, ammo: 0 }], look: { ...folkLook, top: ['#6a5a44', '#4a3a2a'], hatChance: 0.9 } },
  { ...base, id: 'homesteader', name: 'Homesteader', behaviour: 'civilian', faction: 'folk', talker: 'settler', cash: [1, 8],
    loadout: [{ weapon: 'shotgun', chance: 0.1, ammo: 6 }], look: { ...folkLook, top: ['#d8cfc0', '#9a8a6a', '#7a5a52'] } },

  { ...base, id: 'dry_creek_rider', name: 'Dry Creek outlaw', behaviour: 'gang', faction: 'dry_creek', talker: 'dry_creek_hand', courage: 0.85, accuracy: 0.45, hp: 110, cash: [3, 25],
    loadout: [{ weapon: 'revolver', chance: 0.9, ammo: 24 }, { weapon: 'shotgun', chance: 0.25, ammo: 10 }, { weapon: 'dynamite', chance: 0.05, ammo: 1 }],
    look: { skin: SKIN, top: ['#b8442a'], bottom: ['#3a3024'], hat: ['#4a3a2a'], hatChance: 1 } },
  { ...base, id: 'vulture', name: 'Vulture Ridge outlaw', behaviour: 'gang', faction: 'vultures', talker: 'vulture_hand', courage: 0.9, accuracy: 0.5, hp: 115, cash: [3, 25],
    loadout: [{ weapon: 'revolver', chance: 0.8, ammo: 24 }, { weapon: 'lever_rifle', chance: 0.35, ammo: 24 }],
    look: { skin: SKIN, top: ['#2a2018'], bottom: ['#2a2a30'], hat: ['#1a1612'], hatChance: 1 } },
  { ...base, id: 'lantern_man', name: 'Lantern Man', behaviour: 'gang', faction: 'lantern', talker: 'lantern_hand', courage: 0.8, accuracy: 0.45, hp: 105, cash: [5, 35],
    loadout: [{ weapon: 'revolver', chance: 0.8, ammo: 24 }, { weapon: 'lamp_oil', chance: 0.15, ammo: 2 }, { weapon: 'hatchet', chance: 0.3, ammo: 0 }],
    look: { skin: SKIN, top: ['#d9a62b'], bottom: ['#4a3a2a'], hat: ['#8a6a4a'], hatChance: 0.9 } },
  { ...base, id: 'gambler', name: 'Gambler', behaviour: 'dealer', faction: 'cardsharps', talker: 'gambler', courage: 0.6, accuracy: 0.5, cash: [20, 80],
    loadout: [{ weapon: 'derringer', chance: 0.8, ammo: 6 }, { weapon: 'revolver', chance: 0.3, ammo: 12 }],
    look: { skin: SKIN, top: ['#5a3a6a', '#1a1612', '#7a2a20'], bottom: ['#1a1612'], hat: ['#1a1612'], hatChance: 0.9 } },

  { ...base, id: 'deputy', name: 'Deputy', behaviour: 'police', faction: 'law', talker: 'lawman', courage: 1, accuracy: 0.55, hp: 110, cash: [2, 10],
    loadout: [{ weapon: 'revolver', chance: 1, ammo: 36 }, { weapon: 'lever_rifle', chance: 0.4, ammo: 24 }],
    look: { skin: SKIN, top: ['#8a6a4a', '#5a6a7a'], bottom: ['#3a3024'], hat: ['#2a2018'], hatChance: 1 } },
  { ...base, id: 'marshal', name: 'Federal Marshal', behaviour: 'police', faction: 'law', talker: 'lawman', courage: 1, accuracy: 0.7, hp: 130, armor: 20, cash: [5, 20],
    loadout: [{ weapon: 'revolver', chance: 1, ammo: 36 }, { weapon: 'shotgun', chance: 0.6, ammo: 12 }, { weapon: 'long_rifle', chance: 0.2, ammo: 6 }],
    look: { skin: SKIN, top: ['#1a1612'], bottom: ['#2a2a30'], hat: ['#1a1612'], hatChance: 1 } },
  { ...base, id: 'trooper', name: 'Cavalry Trooper', behaviour: 'military', faction: 'cavalry', talker: 'trooper', courage: 1, accuracy: 0.65, hp: 130, cash: [1, 6], runSpeed: 5.2,
    loadout: [{ weapon: 'lever_rifle', chance: 1, ammo: 48 }, { weapon: 'revolver', chance: 1, ammo: 18 }, { weapon: 'dynamite', chance: 0.1, ammo: 1 }],
    look: { skin: SKIN, top: ['#28324a'], bottom: ['#3a4a6a'], hat: ['#28324a'], hatChance: 1, build: 1.05 } },

  // Behind shop counters and the bank's: hold the post, defend the till.
  { ...base, id: 'clerk', name: 'Storekeeper', behaviour: 'guard', faction: 'folk', talker: 'storekeeper', courage: 0.55, accuracy: 0.35, hp: 90, cash: [2, 10],
    loadout: [{ weapon: 'derringer', chance: 0.4, ammo: 4 }], look: { skin: SKIN, top: ['#e6dcc0', '#d8cfc0'], bottom: TROUSERS, hat: HATS, hatChance: 0.2 } },
  { ...base, id: 'guard', name: 'Bank Guard', behaviour: 'guard', faction: 'folk', talker: 'bank_guard', courage: 0.9, accuracy: 0.5, hp: 110, cash: [2, 8],
    loadout: [{ weapon: 'shotgun', chance: 1, ammo: 12 }], look: { skin: SKIN, top: ['#4a4f55'], bottom: ['#2a2a30'], hat: ['#2a2018'], hatChance: 0.8 } },
  { ...base, id: 'doctor', name: 'Doctor', behaviour: 'medic', faction: 'services', courage: 0.3, cash: [3, 15],
    look: { skin: SKIN, top: ['#1a1612'], bottom: ['#2a2a30'], hat: ['#1a1612'], hatChance: 1 } },
  { ...base, id: 'volunteer', name: 'Fire Volunteer', behaviour: 'firefighter', faction: 'services', courage: 0.5, hp: 130, cash: [1, 5],
    look: { skin: SKIN, top: ['#7a2a20'], bottom: ['#3a3024'], hat: ['#2a2018'], hatChance: 0.8 } },
];
