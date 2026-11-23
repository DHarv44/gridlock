// Runtime entity records for the server simulation.
import type { PedArchetype, VehicleSpec } from '../../shared/packs';
import type { InputMsg, Mode } from '../../shared/protocol';
import type { Body, Controls } from '../../shared/sim/physics';

export interface HeldWeapon { w: number; ammo: number; clip: number }

export type TaskName = 'wander' | 'stand' | 'flee' | 'attack' | 'arrest' | 'drive' | 'pursue' | 'respond'
  | 'revive' | 'extinguish' | 'return' | 'cower' | 'guard' | 'none';

export interface DriveState {
  pts: { x: number; y: number; stop?: number; axis?: 'h' | 'v' }[];
  seg: number; dir: 1 | -1; lane: number;
  route: number[];          // node ids remaining (route mode)
  routeT: number;
  stuckT: number;
  reverseT: number;
  honkT: number;
  blockT: number;           // time spent blocked by something ahead
  bypassT: number;          // > 0 while steering around a blockage
}

export interface Ai {
  task: TaskName;
  t: number;                // time spent in task
  think: number;            // countdown to next perception tick
  target: number;           // entity id
  tx: number; ty: number;   // goal point
  block: number; corner: number; cdir: 1 | -1; crossing: boolean;
  drive: DriveState | null;
  post: { x: number; y: number; angle: number } | null;
  squad: number;            // dispatch squad id, 0 none
  crew: number;             // vehicle this ped crews (cops, medics), 0 none
  panicT: number;
  enemy: number;            // ped id this ped holds a grudge against
  enemyT: number;
  stuckT: number;
  sideT: number; sideDir: number;
  workT: number;
}

export interface Ped {
  id: number;
  kind: 'ped';
  arch: number;
  spec: PedArchetype;
  faction: string;
  body: Body;
  ctl: Controls;
  hp: number; armor: number;
  dead: boolean; deadT: number;
  down: number;             // knocked-down timer
  burning: number;          // seconds left on fire
  weapons: HeldWeapon[];
  wi: number;
  fireCd: number; reloadT: number;
  trigger: boolean; triggerPrev: boolean;
  aim: number;
  cash: number;
  vehicle: number; seat: number;
  player: Player | null;
  ai: Ai | null;
  lastHitBy: number; lastHitT: number;
  persistent: boolean;
  revived: boolean;
  bodyCalled: boolean;
  swimT: number;
}

export interface Vehicle {
  id: number;
  kind: 'veh';
  type: number;
  spec: VehicleSpec;
  body: Body;
  ctl: Controls;
  color: number;
  hp: number;
  burning: number;          // -1 not burning, else seconds on fire
  wrecked: boolean; wreckT: number;
  seats: number[];          // ped ids, 0 = empty; seat 0 drives
  siren: boolean;
  turret: number;           // absolute angle
  fireCd: number;
  vw: number;               // selected vehicle weapon
  owner: number;            // player id for garage cars
  persistent: boolean;
  sinkT: number;
  idleT: number;
  spot: number;             // parking/fixed spot key that spawned it, -1 none
  stolenBy: number;         // player id who stole it (for chop shop)
  fireCalled: boolean;
  horn: boolean;
}

export interface Projectile {
  id: number;
  kind: 'proj';
  weapon: number;
  owner: number;            // ped id
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  angle: number;
  life: number;
  fuse: number;
}

export interface Pickup {
  id: number;
  kind: 'pickup';
  type: number;             // PK.*
  x: number; y: number;
  value: number;            // cash amount or ammo
  weapon: number;
  life: number;
}

export interface Fire {
  id: number;
  kind: 'fire';
  x: number; y: number; r: number;
  life: number;
  owner: number;
  called: boolean;
}

export interface Player {
  id: number;
  name: string;
  color: string;
  pid: number;              // avatar ped id
  mode: Mode;
  queue: InputMsg[];
  last: InputMsg;
  ack: number;
  cash: number;
  kills: number; deaths: number;
  heat: number; wanted: number; seenT: number; lethal: boolean;
  respawnT: number;
  garage: number[];
  owned: number[];
  garageCar: number;        // vehicle id spawned from garage
  ping: number;
  send: (msg: unknown) => void;
  sendRaw: (data: string) => void;
  spawnCdT: number;
  bustT: number;
  lastPlace: number;
  gunCrimeT: number;
  seenCheckT: number;
}

export interface Squad {
  id: number;
  player: number;           // target player id
  key: string;              // which wanted-level squad slot it fills
  vehicle: number;
  members: number[];
}

export type Entity = Ped | Vehicle | Projectile | Pickup | Fire;
