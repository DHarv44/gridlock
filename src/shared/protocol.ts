// Wire protocol (JSON over WebSocket). Hot-path messages use compact arrays.
import type { CharacterProgress, CharacterSave, CharLook } from './packs/characters';

export const TICK_HZ = 30;
export const SNAP_EVERY = 2;             // snapshots at 15 Hz
export const INTERP_DELAY_MS = 120;
export const PROTOCOL_VERSION = 5;
/** Every Nth snapshot carries every entity in full (others list unchanged ones in `k`). */
export const FULL_SNAP_EVERY = 30;

// Input buttons (bitmask).
export const BTN = {
  fire: 1, handbrake: 2, sprint: 4, up: 8, down: 16,
  enter: 32, interact: 64, reload: 128, next: 256, prev: 512, horn: 1024, jump: 2048,
} as const;
/** Edge-triggered buttons must not repeat when the server re-uses a stale input. */
export const EDGE_BUTTONS = BTN.enter | BTN.interact | BTN.reload | BTN.next | BTN.prev;

/** [seq, mx, my, throttle, steer, aim, buttons, weaponWish] */
export type InputMsg = [number, number, number, number, number, number, number, number];

export type BuyKind = 'weapon' | 'ammo' | 'armor' | 'heal' | 'vehicle' | 'property' | 'garage' | 'respray' | 'chop' | 'sell';

export type C2S =
  /** `char`: the player's character from their browser; without it `name` plays an unsaved guest. */
  | { t: 'hello'; v: number; name: string; room: string; create: boolean; mode?: string; char?: CharacterSave }
  | { t: 'in'; i: InputMsg[] }
  | { t: 'job'; booth: number }
  | { t: 'buy'; kind: BuyKind; id: string; place: number }
  | { t: 'chat'; text: string }
  | { t: 'ping'; ts: number };

export const EK = { Ped: 0, Veh: 1, Proj: 2, Pickup: 3, Fire: 4 } as const;

export const PF = { dead: 1, fast: 2, aim: 4, burning: 8, down: 16, player: 32, busy: 64, jump: 128 } as const;
export const VF = { siren: 1, wreck: 2, burning: 4, brake: 8, lights: 16, driven: 32, smoke: 64, reverse: 128 } as const;
export const PK = { cash: 0, weapon: 1, health: 2, armor: 3, frenzy: 4 } as const;

export const FX = { Shot: 0, Boom: 1, Blood: 2, Swing: 3, Horn: 4, Splash: 5, Spark: 6, Throw: 7 } as const;
export const HIT = { none: 0, flesh: 1, metal: 2, wall: 3 } as const;

export const Mode = { Foot: 0, Driver: 1, Passenger: 2, Dead: 3, Busted: 4 } as const;
export type Mode = (typeof Mode)[keyof typeof Mode];

export interface YouState {
  pid: number;
  vid: number;
  mode: Mode;
  body: number[];          // [x, y, angle, vx, vy, av, alt]
  hp: number;
  ar: number;
  cash: number;
  wl: number;              // wanted level 0..5
  heat: number;
  w: number[][];           // [weaponIndex, ammo, clip]
  wi: number;              // index into w
  rl: number;              // reload time left
  vt: number;              // vehicle type index (-1 on foot)
  vhp: number;             // vehicle health fraction
  respawn: number;         // seconds until respawn while dead/busted
  rs: number[];            // respect per gang (GANGS order)
  mt: number[] | null;     // current mission objective position [x, y]
}

export interface MissionInfo {
  title: string;
  giver: string;           // faction id, or '' for crates
  brief: string;
  objective: string;       // what to do right now
  ends: number;            // server time (ms) the job runs out, 0 = no limit
  progress?: string;       // e.g. "5 / 12"
}

export interface PlayerInfo {
  id: number;
  name: string;
  color: string;
  pid: number;
  x: number; y: number;
  cash: number;
  felonies: number;        // total felonies on record
  deaths: number;
  wl: number;
  ping: number;
  frags: number;           // player kills this round
  earned: number;          // cash earned this round
  look?: CharLook;         // saved characters' chosen look (guests use the archetype look)
}

export interface Profile {
  garage: number[];        // vehicle type indexes
  owned: number[];         // property ids
  felonies?: Record<string, number>; // crime kind → times committed
}

export type S2C =
  | { t: 'welcome'; id: number; room: string; seed: number; maxPlayers: number }
  | { t: 'reject'; reason: string }
  /** e: changed/new entities; k: ids still in view and unchanged since the last snapshot. */
  | { t: 's'; st: number; ack: number; gt: number; you: YouState; e: number[][]; k: number[]; fx: number[][] }
  | { t: 'players'; list: PlayerInfo[] }
  | { t: 'owners'; list: [number, string | null][] }
  | { t: 'profile'; p: Profile }
  | { t: 'msg'; kind: 'info' | 'chat' | 'kill' | 'money' | 'warn'; text: string }
  | { t: 'mission'; m: MissionInfo | null; result?: 'passed' | 'failed' }
  | { t: 'mode'; mode: string; round: number }
  | { t: 'round'; mode: string; winner: string; standings: [string, number][] }
  | { t: 'pong'; ts: number; st: number }
  /** The character's progress, for the browser to save (sent every few seconds and after buys). */
  | { t: 'save'; id: string; p: CharacterProgress };

export interface RoomListing { code: string; players: number; max: number; names: string[] }

export const PLAYER_COLORS = ['#ff5a4f', '#4fa3ff', '#ffd34f', '#5fe07a', '#c77dff', '#ff9a3c', '#3ce0e0', '#ff6ec7'];
