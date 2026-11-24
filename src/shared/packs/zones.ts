import type { DistrictSpec, ZoneSpec } from './types';

const civTraffic = [
  { id: 'sedan', weight: 10 }, { id: 'compact', weight: 6 }, { id: 'hatchback', weight: 6 }, { id: 'wagon', weight: 3 },
  { id: 'suv', weight: 5 }, { id: 'minivan', weight: 3 }, { id: 'pickup', weight: 3 }, { id: 'coupe', weight: 3 },
  { id: 'taxi', weight: 4 }, { id: 'van', weight: 3 }, { id: 'muscle', weight: 1 }, { id: 'sports', weight: 1 },
  { id: 'streetbike', weight: 2 },
  // Patrols in the traffic (crewed by cops, who answer crimes they see).
  { id: 'police', weight: 3.5 }, { id: 'police_suv', weight: 1 }, { id: 'police_bike', weight: 1 },
];

const civParked = [
  { id: 'sedan', weight: 10 }, { id: 'compact', weight: 6 }, { id: 'hatchback', weight: 6 }, { id: 'suv', weight: 5 },
  { id: 'minivan', weight: 3 }, { id: 'pickup', weight: 3 }, { id: 'coupe', weight: 3 }, { id: 'van', weight: 2 },
  { id: 'muscle', weight: 1 }, { id: 'sports', weight: 0.6 }, { id: 'supercar', weight: 0.15 }, { id: 'streetbike', weight: 1.5 },
];

const civPeds = [{ id: 'civilian', weight: 10 }, { id: 'business', weight: 2 }, { id: 'elder', weight: 1.5 }, { id: 'tourist', weight: 0.6 }];

export const ZONES: ZoneSpec[] = [
  {
    id: 'downtown', name: 'Downtown', mapColor: '#4b4f5c', ground: '#8b8d90', sidewalk: '#a4a5a6',
    lot: { min: 26, max: 60, setback: [2, 5], height: [22, 32], coverage: 0.9 }, layout: 'buildings',
    wall: ['#5b6a7a', '#3d4a5a', '#7d8a96', '#4a5560', '#6e7d70', '#8a8f99'], roof: ['#3a3d42', '#4a4d52', '#55585e'],
    trees: 0.05, parkingChance: 0.05, plazaChance: 0.12, pedDensity: 9,
    peds: [{ id: 'business', weight: 8 }, { id: 'civilian', weight: 6 }, { id: 'tourist', weight: 2 }, { id: 'guard', weight: 0.4 }, { id: 'cop', weight: 1.2 }],
    trafficDensity: 1.4, traffic: [...civTraffic, { id: 'limo', weight: 1.5 }, { id: 'bus', weight: 1.2 }, { id: 'taxi', weight: 6 }],
    parked: civParked, parkedDensity: 0.4, roadDrop: 0.02, windows: 1,
  },
  {
    id: 'midtown', name: 'Midtown', mapColor: '#5b5560', ground: '#8f8c88', sidewalk: '#a8a6a2',
    lot: { min: 20, max: 40, setback: [1, 4], height: [12, 22], coverage: 0.85 }, layout: 'buildings',
    wall: ['#8a6f5a', '#6f5f55', '#9a8a76', '#5f6670', '#a39070', '#7a6a6a'], roof: ['#45423f', '#55504a'],
    trees: 0.1, parkingChance: 0.08, plazaChance: 0.08, pedDensity: 7,
    peds: [...civPeds, { id: 'streetwalker', weight: 0.4 }, { id: 'cop', weight: 0.9 }],
    trafficDensity: 1.2, traffic: [...civTraffic, { id: 'bus', weight: 1 }, { id: 'boxtruck', weight: 1 }],
    parked: civParked, parkedDensity: 0.6, roadDrop: 0.04, windows: 0.8,
  },
  {
    id: 'commercial', name: 'Commercial', mapColor: '#6a5d4a', ground: '#8e8a82', sidewalk: '#aaa69c',
    lot: { min: 14, max: 30, setback: [0, 3], height: [6, 16], coverage: 0.75 }, layout: 'buildings',
    wall: ['#c8b89a', '#a87a5a', '#d6d0c0', '#8fa3a8', '#b85c4a', '#e0c890', '#7f9a7a'], roof: ['#5e5a55', '#6b665e', '#4f4b47'],
    trees: 0.15, parkingChance: 0.22, plazaChance: 0.04, pedDensity: 5,
    peds: [...civPeds, { id: 'worker', weight: 1 }, { id: 'streetwalker', weight: 0.5 }, { id: 'dealer', weight: 0.15 }, { id: 'cop', weight: 0.7 }],
    trafficDensity: 1.0, traffic: [...civTraffic, { id: 'icecream', weight: 0.4 }, { id: 'boxtruck', weight: 1.5 }, { id: 'garbage', weight: 0.5 }],
    parked: civParked, parkedDensity: 0.8, roadDrop: 0.06, windows: 0.5,
  },
  {
    id: 'residential', name: 'Residential', mapColor: '#6e5048', ground: '#7d8b6a', sidewalk: '#a8a69e',
    lot: { min: 16, max: 26, setback: [2, 5], height: [8, 16], coverage: 0.65 }, layout: 'buildings',
    wall: ['#a0563f', '#b87a5a', '#c9a27a', '#8a4a3a', '#d6c4a0', '#9a8a7a'], roof: ['#3f3a37', '#4f4744', '#5a4a40'],
    trees: 0.6, parkingChance: 0.1, plazaChance: 0.03, pedDensity: 4,
    peds: [...civPeds, { id: 'dealer', weight: 0.1 }, { id: 'cop', weight: 0.35 }],
    trafficDensity: 0.7, traffic: [...civTraffic, { id: 'garbage', weight: 0.4 }, { id: 'icecream', weight: 0.3 }],
    parked: civParked, parkedDensity: 1.0, roadDrop: 0.08, windows: 0.4,
  },
  {
    id: 'suburbs', name: 'Suburbs', mapColor: '#4e6a45', ground: '#6f8f4e', sidewalk: '#b4b2a8',
    lot: { min: 16, max: 22, setback: [4, 6], height: [4.5, 7.5], coverage: 0.5 }, layout: 'houses',
    wall: ['#e8e2d0', '#d6c8a8', '#b8c4c8', '#c8a888', '#e0d4b8', '#a8b898', '#d0b0a0'], roof: ['#5a3a30', '#3f4a55', '#4a4a4a', '#6b4a3a', '#2f3a40'],
    trees: 3.2, parkingChance: 0, plazaChance: 0, pedDensity: 1.6,
    peds: [{ id: 'civilian', weight: 8 }, { id: 'elder', weight: 3 }],
    trafficDensity: 0.4, traffic: civTraffic, parked: civParked, parkedDensity: 0.7, roadDrop: 0.22, windows: 0.3,
  },
  {
    id: 'projects', name: 'Projects', mapColor: '#5a4a4a', ground: '#7d7a68', sidewalk: '#9e9b92',
    lot: { min: 18, max: 30, setback: [3, 6], height: [9, 16], coverage: 0.55 }, layout: 'buildings',
    wall: ['#8a6a5a', '#7a6f66', '#9a8670', '#6a5a52'], roof: ['#3f3a37', '#4a4440'],
    trees: 0.3, parkingChance: 0.12, plazaChance: 0.1, pedDensity: 4.5,
    peds: [{ id: 'civilian', weight: 5 }, { id: 'dealer', weight: 1.2 }, { id: 'streetwalker', weight: 1 }, { id: 'cop', weight: 0.4 }],
    trafficDensity: 0.6, traffic: [...civTraffic, { id: 'lowrider', weight: 3 }, { id: 'muscle', weight: 2 }],
    parked: [...civParked, { id: 'lowrider', weight: 3 }], parkedDensity: 1.0, roadDrop: 0.08, windows: 0.3,
  },
  {
    id: 'barrio', name: 'Barrio', mapColor: '#6a5a3a', ground: '#9a8a62', sidewalk: '#b0a68a',
    lot: { min: 14, max: 22, setback: [1, 4], height: [5, 11], coverage: 0.6 }, layout: 'buildings',
    wall: ['#d9a066', '#c9785a', '#e8c890', '#8fb8a8', '#d6a8b8', '#e0e0c0'], roof: ['#7a4a30', '#6b5040', '#5a5040'],
    trees: 0.4, parkingChance: 0.08, plazaChance: 0.05, pedDensity: 4,
    peds: [{ id: 'civilian', weight: 5 }, { id: 'dealer', weight: 0.8 }, { id: 'elder', weight: 1 }, { id: 'cop', weight: 0.35 }],
    trafficDensity: 0.6, traffic: [...civTraffic, { id: 'lowrider', weight: 4 }],
    parked: [...civParked, { id: 'lowrider', weight: 4 }], parkedDensity: 1.0, roadDrop: 0.1, windows: 0.3,
  },
  {
    id: 'industrial', name: 'Industrial', mapColor: '#5a5a4a', ground: '#7d7a72', sidewalk: '#96938a',
    lot: { min: 26, max: 50, setback: [4, 8], height: [7, 14], coverage: 0.6 }, layout: 'buildings',
    wall: ['#7a7f80', '#8f8578', '#6a7070', '#a39a85', '#5f6a5a', '#9a6a4a'], roof: ['#5a5f62', '#6a6a66', '#4f5558'],
    trees: 0.05, parkingChance: 0.3, plazaChance: 0, pedDensity: 1.2,
    peds: [{ id: 'worker', weight: 8 }, { id: 'civilian', weight: 2 }, { id: 'dealer', weight: 0.3 }],
    trafficDensity: 0.6, traffic: [{ id: 'boxtruck', weight: 5 }, { id: 'semi', weight: 4 }, { id: 'pickup', weight: 4 }, { id: 'van', weight: 4 }, { id: 'sedan', weight: 3 }, { id: 'garbage', weight: 1 }],
    parked: [{ id: 'boxtruck', weight: 3 }, { id: 'semi', weight: 2 }, { id: 'pickup', weight: 4 }, { id: 'van', weight: 4 }, { id: 'sedan', weight: 2 }, { id: 'dirtbike', weight: 0.5 }],
    parkedDensity: 0.8, roadDrop: 0.15, windows: 0.1,
  },
  {
    id: 'docks', name: 'Docks', mapColor: '#4a5560', ground: '#77746e', sidewalk: '#8f8c86',
    lot: { min: 30, max: 55, setback: [3, 6], height: [8, 13], coverage: 0.5 }, layout: 'docks',
    wall: ['#6a7a8a', '#8a7a6a', '#7a8070'], roof: ['#55606a', '#5a5a5a'],
    trees: 0, parkingChance: 0.1, plazaChance: 0, pedDensity: 0.8,
    peds: [{ id: 'worker', weight: 8 }, { id: 'dealer', weight: 0.5 }],
    trafficDensity: 0.5, traffic: [{ id: 'semi', weight: 6 }, { id: 'boxtruck', weight: 3 }, { id: 'pickup', weight: 3 }, { id: 'van', weight: 2 }],
    parked: [{ id: 'semi', weight: 3 }, { id: 'pickup', weight: 3 }, { id: 'boxtruck', weight: 2 }], parkedDensity: 0.5, roadDrop: 0.2, windows: 0,
  },
  {
    id: 'park', name: 'Park', mapColor: '#3f6a3a', ground: '#5f8a45', sidewalk: '#b4b2a8',
    lot: { min: 999, max: 999, setback: [0, 0], height: [0, 0], coverage: 0 }, layout: 'park',
    wall: ['#888'], roof: ['#666'],
    trees: 3.5, parkingChance: 0, plazaChance: 0, pedDensity: 2.2,
    peds: [{ id: 'civilian', weight: 6 }, { id: 'elder', weight: 2 }, { id: 'tourist', weight: 1 }, { id: 'dealer', weight: 0.4 }, { id: 'cop', weight: 0.4 }],
    trafficDensity: 0.4, traffic: civTraffic, parked: civParked, parkedDensity: 0.3, roadDrop: 0.5, windows: 0,
  },
  {
    id: 'base', name: 'Fort Calder', mapColor: '#4a5238', ground: '#7d7a62', sidewalk: '#8f8c7a',
    lot: { min: 24, max: 40, setback: [5, 8], height: [6, 10], coverage: 0.4 }, layout: 'compound',
    wall: ['#6b6e52', '#7a7a60', '#5f6450'], roof: ['#4a4e3a', '#55584a'],
    trees: 0.1, parkingChance: 0.3, plazaChance: 0, pedDensity: 2,
    peds: [{ id: 'soldier', weight: 10 }],
    trafficDensity: 0.3, traffic: [{ id: 'jeep', weight: 3 }, { id: 'humvee', weight: 4 }, { id: 'army_truck', weight: 3 }, { id: 'mrap', weight: 1 }],
    parked: [{ id: 'jeep', weight: 2 }, { id: 'humvee', weight: 3 }, { id: 'army_truck', weight: 3 }, { id: 'mrap', weight: 2 }], parkedDensity: 0.6, roadDrop: 0, fenced: true, windows: 0.1,
  },
];

// The city's districts. Each block takes the zone of its nearest district (x, y are 0..1).
// A district with a `gang` is that gang's turf: its members hang out there and tag the walls.
// Turf is the rough side of town: Varrio 22 runs both housing projects, Diablos 9 the
// industrial east, Oro 7 the barrio and the docks it smuggles through.
export const DISTRICTS: DistrictSpec[] = [
  { name: 'Crown Center', zone: 'downtown', x: 0.5, y: 0.42 },
  { name: 'Exchange Row', zone: 'downtown', x: 0.58, y: 0.36 },
  { name: 'Midtown', zone: 'midtown', x: 0.42, y: 0.32 },
  { name: 'Lantern Square', zone: 'midtown', x: 0.62, y: 0.5 },
  { name: 'Halcyon Park', zone: 'park', x: 0.4, y: 0.5, weight: 0.65 },
  { name: 'Market Street', zone: 'commercial', x: 0.3, y: 0.42 },
  { name: 'Old Quarter', zone: 'commercial', x: 0.55, y: 0.22 },
  { name: 'Tannery Flats', zone: 'commercial', x: 0.7, y: 0.62, gang: 'd9' },
  { name: 'Northgate', zone: 'residential', x: 0.36, y: 0.14 },
  { name: 'Brickfield', zone: 'residential', x: 0.22, y: 0.26 },
  { name: 'Larchmont', zone: 'suburbs', x: 0.12, y: 0.12 },
  { name: 'Willow Heights', zone: 'suburbs', x: 0.1, y: 0.42 },
  { name: 'Cedar Glen', zone: 'park', x: 0.2, y: 0.1, weight: 0.5 },
  { name: 'Fort Calder', zone: 'base', x: 0.86, y: 0.1, weight: 0.85 },
  { name: 'Ironworks', zone: 'industrial', x: 0.74, y: 0.24 },
  { name: 'Foundry Lane', zone: 'industrial', x: 0.82, y: 0.42, gang: 'd9' },
  { name: 'Pier Nine', zone: 'docks', x: 0.9, y: 0.6 },
  { name: 'Saltmarsh Docks', zone: 'docks', x: 0.88, y: 0.82, gang: 'oro7' },
  { name: 'The Pits', zone: 'projects', x: 0.24, y: 0.76, gang: 'v22' },
  { name: 'Ashgrove', zone: 'projects', x: 0.38, y: 0.86, gang: 'v22' },
  { name: 'San Isidro', zone: 'barrio', x: 0.58, y: 0.8, gang: 'oro7' },
  { name: 'Cobalt Bay', zone: 'suburbs', x: 0.1, y: 0.88 },
  { name: 'Riverside', zone: 'residential', x: 0.5, y: 0.68 },
  { name: 'Delancey', zone: 'residential', x: 0.72, y: 0.84 },
  { name: 'Shoreline Park', zone: 'park', x: 0.1, y: 0.66, weight: 0.7 },
];
