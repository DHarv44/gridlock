import type { Rect } from '../math';
import type { Interior } from './interiors';
import type { Way } from './wayTypes';
import type { Railway } from './railgen';

/** Map size and the land's edges come from the installed universe (worldSpec.ts). */
export { LAND0, LAND1, MAP_SIZE } from './worldSpec';
export const LANE_W = 3.6;
export const PARK_W = 2.4;
export const SIDEWALK_W = 3;
export const RIVER_W = 76;

/** Facing directions for lot fronts. */
export const Dir = { N: 0, E: 1, S: 2, W: 3 } as const;
export type Dir = 0 | 1 | 2 | 3;
export const DIR_VEC: ReadonlyArray<[number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export interface RoadLine {
  pos: number;          // centre coordinate (x for vertical lines, y for horizontal)
  width: number;
  lanes: number;        // per direction
  parking: boolean;     // parking lane on each curb
  arterial: boolean;
  /** A highway runs over this avenue (world/waygen.ts): it's widened for the ramp lanes. */
  highway?: boolean;
}

export interface RoadNode {
  id: number;
  i: number; j: number;
  x: number; y: number;
  segs: number[];
  lights: boolean;
  wv: number;           // width of the vertical road through this node
  wh: number;           // width of the horizontal road through this node
  /** On a way's deck (its strip, world/levels.ts); x, y are still the ground point under it. */
  level?: number;
}

export interface Segment {
  id: number;
  axis: 'h' | 'v';      // h runs along x, v runs along y
  a: number; b: number; // node ids; a is west/north of b
  x0: number; y0: number; x1: number; y1: number;
  width: number;
  lanes: number;
  parking: boolean;
  bridge: boolean;
  /** A trail through open country: a dirt road, no markings (roadgen.ts). */
  trail?: boolean;
  /** Part of a way (world/waygen.ts): its index. A deck segment has `level` (the way's strip); a
   *  ramp has a `path` (its lane, in driving order, ground coordinates) and runs one way, a to b. */
  way?: number;
  level?: number;
  oneway?: boolean;
  path?: { x: number; y: number }[];
}

/** `wild`: open country (zone layout 'wild'): ground, rock formations, ponds. */
export type LotUse = 'building' | 'parking' | 'plaza' | 'yard' | 'park' | 'containers' | 'pad' | 'wild';

export interface Building {
  rect: Rect;
  h: number;
  wall: string;
  roof: string;
  kind: 'block' | 'tower' | 'house' | 'warehouse' | 'hangar';
  windows: number;
  sign?: string;
  lot: number;
}

export interface Lot {
  id: number;
  rect: Rect;
  block: number;
  zone: number;
  use: LotUse;
  building?: Building;
  front: Dir | -1;      // side facing a street, -1 for interior lots
  door?: { x: number; y: number };
  pad?: { x: number; y: number; angle: number };
  service?: number;     // SERVICES index
  property?: number;    // PROPERTIES index
  propertyId?: number;  // index into City.properties
  name?: string;
}

export interface Block {
  id: number;
  rect: Rect;           // curb outline (sidewalk outer edge)
  zone: number;
  district: number;
  lots: number[];
}

export interface Tree { x: number; y: number; r: number }

/** Rock in open country (solid, round in plan): a butte or mesa's columns (`mesa`: sheer sides,
 *  flat top), or a lump or boulder; `v` picks one of the drawn shapes. */
export interface Rock { x: number; y: number; r: number; h: number; color: string; mesa: boolean; v: number }

export interface Obstacle {
  rect: Rect;
  h: number;
  color: string;
  // pump islands, sign poles: gas stations; rock: open country's buttes and outcrops, cliffs at the edge
  kind: 'container' | 'fence' | 'wall' | 'crane' | 'pump' | 'pole' | 'rock';
}

export interface ParkSpot { x: number; y: number; angle: number; zone: number; lot?: number }

export interface Place {
  id: number;
  lot: number;
  verb: string;
  spec: number;         // SERVICES or PROPERTIES index
  x: number; y: number; // door / trigger point
  pad?: { x: number; y: number; angle: number };
  name: string;
  /** Walk-in places: where you stand inside to do business (instead of at the door). */
  counter?: { x: number; y: number };
}

export interface City {
  seed: number;
  xs: RoadLine[];       // vertical roads (pos = x)
  ys: RoadLine[];       // horizontal roads (pos = y)
  riverRow: number;     // cell row index that is river (-1: no river)
  /** Still water in open country (ponds): water like the river. */
  ponds: Rect[];
  /** What lies past the land: sea all round, or cliffs (solid). */
  edge: 'sea' | 'cliffs';
  cellZone: Int16Array; // zone per cell, -1 water
  cellDistrict: Int16Array;
  cellBlock: Int32Array;
  nodes: RoadNode[];
  segs: Segment[];
  blocks: Block[];
  lots: Lot[];
  buildings: Building[];
  obstacles: Obstacle[];
  /** Open country's rock: buttes, mesas, outcrops and boulders (world/landforms.ts). */
  rocks: Rock[];
  trees: Tree[];
  parking: ParkSpot[];
  services: Place[];
  properties: Place[];
  bridges: Rect[];
  /** Walk-in ground floors (world/interiors.ts). */
  interiors: Interior[];
  /** Raised and sunken ways: highways (world/waygen.ts), and an elevated railway's viaduct. */
  ways: Way[];
  /** The railway, if the universe has one (world/railgen.ts). */
  railway?: Railway;
}
