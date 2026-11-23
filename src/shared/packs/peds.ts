import type { FactionSpec, PedArchetype } from './types';

export const SKIN = ['#f1c9a5', '#e0ac69', '#c68642', '#8d5524', '#5c3a21', '#ffdbac', '#a5704a'];
// Civilian clothes stay clear of the gang colours (lime, red, yellow) so gangs read at a glance.
const CIV_TOP = ['#5c7fa3', '#8a5a7a', '#e8e2d0', '#3f5e6e', '#8a6db0', '#a0775a', '#2d2d33', '#9aa5ad', '#d76f9c', '#4a90a8'];
export const HAIR = ['#1a1410', '#2b1d14', '#4a3020', '#6b4a2a', '#a07a4a', '#c9a76a', '#8a8a8a', '#d8d2c8', '#5a1e14'];
export const SHOES = ['#141414', '#2b2018', '#e8e6e0', '#3a3a40', '#5a3a24'];
const CIV_BOTTOM =['#2c3e57', '#3a3a3a', '#6b5a45', '#25324a', '#7a7466', '#1f1f22'];

export const FACTIONS: FactionSpec[] = [
  { id: 'civ', name: 'Civilians', color: '#9aa5ad', hostile: [] },
  { id: 'player', name: 'Players', color: '#ffffff', hostile: [] },
  { id: 'police', name: 'Bayhaven PD', color: '#2f6fb3', hostile: [], lawful: true },
  { id: 'military', name: 'National Guard', color: '#5d7a3a', hostile: [], lawful: true },
  { id: 'services', name: 'City Services', color: '#e8e2d0', hostile: [] },
  // Gangs: short street names (initials + number) and one symbol everybody knows on sight.
  // `tags` are what they write: initials, the number, the number in Roman numerals.
  { id: 'v22', name: 'Varrio 22', color: '#2bb34a', hostile: ['d9', 'oro7'], gang: true, carColor: 18,
    brand: { symbol: 'skull', accent: '#f2f2ee' }, tags: ['V22', '22', 'XXII'] },
  { id: 'd9', name: 'Diablos 9', color: '#c62a22', hostile: ['v22', 'oro7'], gang: true, carColor: 5,
    brand: { symbol: 'pitchfork', accent: '#16171a' }, tags: ['D9', '9', 'IX'] },
  { id: 'oro7', name: 'Oro 7', color: '#e3b30c', hostile: ['v22', 'd9'], gang: true, carColor: 11,
    brand: { symbol: 'dollar', accent: '#16171a' }, tags: ['O7', '7', 'VII'] },
  { id: 'street', name: 'Street Trade', color: '#e04e8c', hostile: [] },
];

const base = { hp: 100, armor: 0, walkSpeed: 1.5, runSpeed: 5.2, courage: 0.1, accuracy: 0.4, loadout: [], cash: [5, 60] as [number, number] };

export const PEDS: PedArchetype[] = [
  { ...base, id: 'player', name: 'Player', behaviour: 'player', faction: 'player', runSpeed: 5.6, courage: 1, accuracy: 1, cash: [0, 0],
    look: { skin: SKIN, top: ['#ffffff'], bottom: ['#2c3e57', '#3a3a3a'] } },

  { ...base, id: 'civilian', name: 'Civilian', behaviour: 'civilian', faction: 'civ',
    loadout: [{ weapon: 'pistol', chance: 0.03, ammo: 15 }, { weapon: 'knife', chance: 0.04, ammo: 0 }],
    look: { skin: SKIN, top: CIV_TOP, bottom: CIV_BOTTOM, hat: ['#2d2d33', '#c94b4b', '#e8e2d0'], hatChance: 0.15 } },
  { ...base, id: 'business', name: 'Office Worker', behaviour: 'civilian', faction: 'civ', cash: [40, 250],
    loadout: [{ weapon: 'pistol', chance: 0.04, ammo: 15 }],
    look: { skin: SKIN, top: ['#2d2d33', '#25324a', '#4a4a50', '#e8e2d0'], bottom: ['#1f1f22', '#25324a'] } },
  { ...base, id: 'elder', name: 'Retiree', behaviour: 'civilian', faction: 'civ', walkSpeed: 1.0, runSpeed: 3.2, hp: 70,
    look: { skin: SKIN, top: ['#b8a88a', '#9aa5ad', '#8a6db0', '#d4d0c4'], bottom: ['#6b5a45', '#7a7466'], hat: ['#6b5a45', '#d4d0c4'], hatChance: 0.5 } },
  { ...base, id: 'worker', name: 'Laborer', behaviour: 'civilian', faction: 'civ', courage: 0.35, hp: 120,
    loadout: [{ weapon: 'bat', chance: 0.25, ammo: 0 }],
    look: { skin: SKIN, top: ['#d9661b', '#e3b30c', '#5c7fa3'], bottom: ['#25324a', '#3a3a3a'], hat: ['#e3b30c', '#f2f2ee'], hatChance: 0.8 } },
  { ...base, id: 'tourist', name: 'Tourist', behaviour: 'civilian', faction: 'civ', cash: [80, 300],
    look: { skin: SKIN, top: ['#f28fb0', '#7fd1e8', '#ffffff'], bottom: ['#e8e2d0', '#5c7fa3'], hat: ['#ffffff', '#7fd1e8'], hatChance: 0.6 } },

  { ...base, id: 'v22_soldier', name: 'Varrio 22 soldier', behaviour: 'gang', faction: 'v22', courage: 0.85, accuracy: 0.45, hp: 110, cash: [20, 160],
    loadout: [{ weapon: 'pistol', chance: 0.6, ammo: 45 }, { weapon: 'smg', chance: 0.3, ammo: 96 }, { weapon: 'bat', chance: 0.3, ammo: 0 }, { weapon: 'machete', chance: 0.15, ammo: 0 }, { weapon: 'molotov', chance: 0.06, ammo: 2 }],
    look: { skin: SKIN, top: ['#2bb34a'], bottom: ['#16171a'], hat: ['#2bb34a'], hatChance: 0.9 } },
  { ...base, id: 'd9_soldier', name: 'Diablos 9 soldier', behaviour: 'gang', faction: 'd9', courage: 0.9, accuracy: 0.4, hp: 120, cash: [20, 140],
    loadout: [{ weapon: 'pistol', chance: 0.5, ammo: 45 }, { weapon: 'shotgun', chance: 0.25, ammo: 24 }, { weapon: 'sawnoff', chance: 0.2, ammo: 20 }, { weapon: 'bat', chance: 0.4, ammo: 0 }],
    look: { skin: SKIN, top: ['#c62a22'], bottom: ['#16171a'], hat: ['#16171a'], hatChance: 0.85 } },
  { ...base, id: 'oro7_soldier', name: 'Oro 7 soldier', behaviour: 'gang', faction: 'oro7', courage: 0.8, accuracy: 0.5, hp: 110, cash: [40, 220],
    loadout: [{ weapon: 'pistol', chance: 0.6, ammo: 45 }, { weapon: 'smg', chance: 0.4, ammo: 96 }, { weapon: 'rifle', chance: 0.12, ammo: 90 }, { weapon: 'grenade', chance: 0.05, ammo: 2 }],
    look: { skin: SKIN, top: ['#e3b30c'], bottom: ['#e8e2d0'], hat: ['#e3b30c'], hatChance: 0.8 } },
  { ...base, id: 'dealer', name: 'Dealer', behaviour: 'dealer', faction: 'street', courage: 0.75, accuracy: 0.45, cash: [200, 900],
    loadout: [{ weapon: 'pistol', chance: 0.7, ammo: 45 }, { weapon: 'revolver', chance: 0.25, ammo: 18 }, { weapon: 'sawnoff', chance: 0.15, ammo: 10 }],
    look: { skin: SKIN, top: ['#16171a', '#5a2a6e', '#3a3a3a'], bottom: ['#16171a', '#25324a'], hat: ['#16171a'], hatChance: 0.7 } },
  { ...base, id: 'streetwalker', name: 'Streetwalker', behaviour: 'streetwalker', faction: 'street', walkSpeed: 1.1, courage: 0.2, cash: [50, 320],
    loadout: [{ weapon: 'knife', chance: 0.3, ammo: 0 }],
    look: { skin: SKIN, top: ['#e04e8c', '#9e1b32', '#5a2a6e', '#f2f2ee', '#16171a'], bottom: ['#16171a', '#e04e8c', '#9e1b32'] } },

  { ...base, id: 'cop', name: 'Police Officer', behaviour: 'police', faction: 'police', courage: 1, accuracy: 0.55, hp: 110, armor: 25, cash: [30, 120],
    loadout: [{ weapon: 'pistol', chance: 1, ammo: 90 }, { weapon: 'carbine', chance: 0.4, ammo: 120 }],
    look: { skin: SKIN, top: ['#1d3557'], bottom: ['#16171a'], hat: ['#16171a'], hatChance: 0.9 } },
  { ...base, id: 'swat', name: 'SWAT', behaviour: 'police', faction: 'police', courage: 1, accuracy: 0.65, hp: 120, armor: 100, runSpeed: 5, cash: [40, 150],
    loadout: [{ weapon: 'carbine', chance: 1, ammo: 180 }, { weapon: 'auto_shotgun', chance: 0.3, ammo: 36 }, { weapon: 'pistol', chance: 1, ammo: 45 }],
    look: { skin: SKIN, top: ['#22252a'], bottom: ['#22252a'], hat: ['#16171a'], hatChance: 1, build: 1.1 } },
  { ...base, id: 'agent', name: 'Federal Agent', behaviour: 'police', faction: 'police', courage: 1, accuracy: 0.7, hp: 120, armor: 60, cash: [60, 200],
    loadout: [{ weapon: 'tac_smg', chance: 1, ammo: 180 }, { weapon: 'pistol', chance: 1, ammo: 45 }],
    look: { skin: SKIN, top: ['#16171a'], bottom: ['#16171a'] } },
  { ...base, id: 'soldier', name: 'Soldier', behaviour: 'military', faction: 'military', courage: 1, accuracy: 0.7, hp: 130, armor: 100, runSpeed: 5.4, cash: [20, 100],
    loadout: [{ weapon: 'rifle', chance: 1, ammo: 240 }, { weapon: 'grenade', chance: 0.3, ammo: 3 }, { weapon: 'rpg', chance: 0.1, ammo: 3 }, { weapon: 'lmg', chance: 0.12, ammo: 200 }],
    look: { skin: SKIN, top: ['#575b3c'], bottom: ['#3c3f2e'], hat: ['#3c3f2e'], hatChance: 1, build: 1.05 } },
  { ...base, id: 'guard', name: 'Security Guard', behaviour: 'guard', faction: 'civ', courage: 0.9, accuracy: 0.5, hp: 110, armor: 30, cash: [30, 90],
    loadout: [{ weapon: 'pistol', chance: 1, ammo: 45 }],
    look: { skin: SKIN, top: ['#4a4f55'], bottom: ['#16171a'], hat: ['#16171a'], hatChance: 0.8 } },
  { ...base, id: 'paramedic', name: 'Paramedic', behaviour: 'medic', faction: 'services', courage: 0.3, cash: [10, 60],
    look: { skin: SKIN, top: ['#f2f2ee'], bottom: ['#25324a'] } },
  { ...base, id: 'firefighter', name: 'Firefighter', behaviour: 'firefighter', faction: 'services', courage: 0.5, hp: 140, armor: 40, cash: [10, 60],
    look: { skin: SKIN, top: ['#c9a227'], bottom: ['#3a3a3a'], hat: ['#c62a22'], hatChance: 1, build: 1.1 } },
];
