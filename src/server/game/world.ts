// World: all runtime state of one room's simulation, plus small shared helpers.
import { dist2 } from '../../shared/math';
import { Rng } from '../../shared/rng';
import { CityMap, generateCity } from '../../shared/world/city';
import type { City } from '../../shared/world/cityTypes';
import { StaticWorld } from '../../shared/world/collision';
import type { Fire, Pickup, Ped, Player, Projectile, Squad, Vehicle } from './entities';
import { SpatialHash } from './spatial';

export class World {
  readonly city: City;
  readonly map: CityMap;
  readonly statics: StaticWorld;
  readonly rng: Rng;
  time = 0;                 // seconds since room start
  gameMinutes = 9 * 60;     // in-game clock (starts 09:00)

  readonly peds = new Map<number, Ped>();
  readonly vehicles = new Map<number, Vehicle>();
  readonly projectiles = new Map<number, Projectile>();
  readonly pickups = new Map<number, Pickup>();
  readonly fires = new Map<number, Fire>();
  readonly players = new Map<number, Player>();
  readonly squads = new Map<number, Squad>();

  readonly pedHash = new SpatialHash<Ped>();
  readonly vehHash = new SpatialHash<Vehicle>();

  /** FX events since the last snapshot: [type, ...data]. */
  fx: number[][] = [];
  /** Event hooks wired by the room (missions, respect, frags). */
  onKill: (killer: Ped | null, victim: Ped) => void = () => {};
  onCrate: (pl: Player, pickup: Pickup) => void = () => {};
  /** A felony went on a player's record. */
  onFelony: (pl: Player) => void = () => {};
  /** Adds money to a player (counts toward money-race rounds). */
  earn: (pl: Player, amount: number) => void = (pl, amount) => { pl.cash += amount; };
  /** Adds money straight to a player's bank (business income); counts toward money races too. */
  earnToBank: (pl: Player, amount: number) => void = (pl, amount) => { pl.bank += amount; };
  private nextId = 1;

  constructor(readonly seed: number) {
    this.city = generateCity(seed);
    this.map = new CityMap(this.city);
    this.statics = new StaticWorld(this.city);
    this.rng = new Rng(seed ^ 0x5eed);
  }

  id(): number {
    return this.nextId++;
  }

  rebuildHashes(): void {
    this.pedHash.clear();
    this.vehHash.clear();
    for (const p of this.peds.values()) if (!p.vehicle) this.pedHash.insert(p, p.body.x, p.body.y);
    for (const v of this.vehicles.values()) this.vehHash.insert(v, v.body.x, v.body.y);
  }

  pedsNear(x: number, y: number, r: number, fn: (p: Ped) => void): void {
    const r2 = r * r;
    this.pedHash.query(x, y, r, (p) => { if (dist2(x, y, p.body.x, p.body.y) <= r2) fn(p); });
  }

  vehiclesNear(x: number, y: number, r: number, fn: (v: Vehicle) => void): void {
    const r2 = r * r;
    this.vehHash.query(x, y, r + 8, (v) => { if (dist2(x, y, v.body.x, v.body.y) <= r2) fn(v); });
  }

  /** Position of a ped, or of its vehicle when seated. */
  pedPos(p: Ped): { x: number; y: number } {
    if (p.vehicle) {
      const v = this.vehicles.get(p.vehicle);
      if (v) return v.body;
    }
    return p.body;
  }

  nearestPlayerDist2(x: number, y: number): number {
    let best = Infinity;
    for (const pl of this.players.values()) {
      const p = this.peds.get(pl.pid);
      if (!p) continue;
      const pos = this.pedPos(p);
      best = Math.min(best, dist2(x, y, pos.x, pos.y));
    }
    return best;
  }

  emit(...e: number[]): void {
    this.fx.push(e);
  }

  broadcast(msg: unknown): void {
    const s = JSON.stringify(msg);
    for (const p of this.players.values()) p.sendRaw(s);
  }

  notify(kind: 'info' | 'kill' | 'money' | 'warn', text: string, to?: Player): void {
    if (to) to.send({ t: 'msg', kind, text });
    else this.broadcast({ t: 'msg', kind, text });
  }

  playerOfPed(pedId: number): Player | null {
    return this.peds.get(pedId)?.player ?? null;
  }
}
