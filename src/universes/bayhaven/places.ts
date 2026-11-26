import type { PropertySpec, ServiceSpec } from '../../shared/packs/types';

const ALL_GUNS = ['knife', 'bat', 'machete', 'pistol', 'revolver', 'smg', 'tac_smg', 'shotgun', 'sawnoff', 'auto_shotgun',
  'carbine', 'rifle', 'sniper', 'lmg', 'flamethrower', 'grenade', 'molotov', 'grenade_launcher', 'rpg', 'minigun'];

export const SERVICES: ServiceSpec[] = [
  { id: 'ammu', name: 'Lock & Load Guns', verb: 'gunshop', zones: ['commercial', 'midtown', 'barrio', 'projects'], count: 4, sign: '#c62a22', signText: 'GUNS',
    stock: ALL_GUNS, guards: [{ archetype: 'guard', count: 1 }], interior: 'shop', robbery: { till: 1800, fightBack: 0.6 } },
  { id: 'surplus', name: 'Army Surplus', verb: 'gunshop', zones: ['industrial'], count: 1, sign: '#5d7a3a', signText: 'SURPLUS', stock: ALL_GUNS, interior: 'shop',
    robbery: { till: 1400, fightBack: 0.6 } },
  { id: 'dealer', name: 'Prestige Motors', verb: 'dealer', zones: ['commercial', 'midtown', 'downtown'], count: 2, sign: '#2f6fb3', signText: 'MOTORS',
    stock: ['compact', 'hatchback', 'sedan', 'wagon', 'coupe', 'muscle', 'lowrider', 'pickup', 'suv', 'van', 'minivan', 'sports', 'supercar', 'limo', 'streetbike', 'dirtbike', 'boxtruck', 'semi', 'bus', 'heli_civil'] },
  { id: 'respray', name: 'Quick Coat Respray', verb: 'respray', zones: ['industrial', 'commercial', 'barrio', 'projects'], count: 4, sign: '#e3b30c', signText: 'RESPRAY', price: 500 },
  { id: 'chop', name: 'Salvage & Export', verb: 'chopshop', zones: ['docks', 'industrial'], count: 2, sign: '#d9661b', signText: 'SALVAGE' },
  { id: 'hospital', name: 'General Hospital', verb: 'hospital', zones: ['residential', 'midtown', 'downtown', 'suburbs'], count: 3, sign: '#f2f2ee', signText: 'HOSPITAL',
    spawns: [{ vehicle: 'ambulance', count: 1 }] },
  { id: 'precinct', name: 'Police Precinct', verb: 'police', zones: ['midtown', 'residential', 'commercial', 'downtown'], count: 3, sign: '#1d3557', signText: 'POLICE',
    spawns: [{ vehicle: 'police', count: 2 }], interior: 'precinct' },
  { id: 'firehouse', name: 'Fire Station', verb: 'fire', zones: ['residential', 'commercial', 'industrial'], count: 2, sign: '#9e1b32', signText: 'FIRE DEPT',
    spawns: [{ vehicle: 'firetruck', count: 1 }] },
  { id: 'helipad', name: 'Heliport', verb: 'helipad', zones: ['docks', 'downtown', 'industrial'], count: 2, sign: '#f2f2ee', signText: 'HELIPORT',
    spawns: [{ vehicle: 'heli_civil', count: 1 }, { vehicle: 'heli_news', count: 1 }] },
  { id: 'armory', name: 'Fort Calder Motor Pool', verb: 'military', zones: ['base'], count: 1, sign: '#5d7a3a', signText: 'MOTOR POOL',
    spawns: [{ vehicle: 'tank', count: 2 }, { vehicle: 'gunship', count: 1 }, { vehicle: 'army_truck', count: 1 }, { vehicle: 'jeep', count: 1 },
      { vehicle: 'humvee', count: 1 }, { vehicle: 'humvee_gun', count: 1 }, { vehicle: 'mrap', count: 1 }, { vehicle: 'mrap_gun', count: 1 }],
    guards: [{ archetype: 'soldier', count: 6 }] },
  { id: 'bank', name: 'Harbor Trust Bank', verb: 'bank', zones: ['downtown', 'midtown', 'commercial'], count: 3, sign: '#1e5a46', signText: 'BANK', atm: true, interior: 'bank' },
  { id: 'gas', name: 'Gas & Go', verb: 'gas', zones: ['commercial', 'residential', 'suburbs', 'industrial', 'midtown', 'barrio'], count: 6, sign: '#d8402f', signText: 'GAS & GO', atm: true, interior: 'kiosk',
    robbery: { till: 500, fightBack: 0.1 } },
];

export const PROPERTIES: PropertySpec[] = [
  { id: 'bungalow', name: 'Bungalow', kind: 'home', zones: ['suburbs'], count: 10, price: 45000, income: 0, garage: 2 },
  { id: 'family_home', name: 'Family Home', kind: 'home', zones: ['suburbs'], count: 6, price: 90000, income: 0, garage: 4 },
  { id: 'apartment', name: 'Apartment', kind: 'home', zones: ['residential', 'midtown', 'barrio'], count: 8, price: 30000, income: 0, garage: 1, interior: 'apartments' },
  { id: 'loft', name: 'Warehouse Loft', kind: 'home', zones: ['industrial'], count: 3, price: 65000, income: 0, garage: 6 },
  { id: 'penthouse', name: 'Penthouse', kind: 'home', zones: ['downtown'], count: 4, price: 350000, income: 0, garage: 8, interior: 'apartments' },
  { id: 'corner_store', name: 'Corner Store', kind: 'business', zones: ['commercial', 'residential', 'barrio', 'projects'], count: 8, price: 25000, income: 450, garage: 0, signText: '24/7', signColor: '#2bb34a', atm: true, interior: 'shop',
    robbery: { till: 700, fightBack: 0.15 } },
  { id: 'diner', name: 'Diner', kind: 'business', zones: ['commercial', 'midtown'], count: 4, price: 50000, income: 900, garage: 0, signText: 'DINER', signColor: '#e04e8c', atm: true, interior: 'diner',
    robbery: { till: 900, fightBack: 0.1 } },
  { id: 'car_wash', name: 'Car Wash', kind: 'business', zones: ['commercial', 'industrial'], count: 3, price: 70000, income: 1300, garage: 0, signText: 'CAR WASH', signColor: '#3ab0e0', atm: true, perk: 'wash' },
  { id: 'nightclub', name: 'Nightclub', kind: 'business', zones: ['midtown', 'downtown'], count: 3, price: 180000, income: 3500, garage: 0, signText: 'CLUB', signColor: '#a040ff', atm: true, perk: 'club', interior: 'club',
    robbery: { till: 2400, fightBack: 0.35 } },
  { id: 'warehouse', name: 'Warehouse', kind: 'business', zones: ['industrial', 'docks'], count: 4, price: 120000, income: 2200, garage: 0, signText: 'STORAGE', signColor: '#d9661b', perk: 'fence', interior: 'warehouse' },
  { id: 'office_tower', name: 'Office Tower', kind: 'business', zones: ['downtown'], count: 3, price: 600000, income: 11000, garage: 0, signText: 'OFFICES', signColor: '#9fb4c4', interior: 'tower' },
];
