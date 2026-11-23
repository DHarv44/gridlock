// A room: one shared city, up to RULES.maxPlayers players, its own fixed-rate simulation.
import { RULES, VEHICLES } from '../shared/packs';
import { type C2S, type InputMsg, Mode, PLAYER_COLORS, type S2C, SNAP_EVERY, TICK_HZ } from '../shared/protocol';
import { DT } from '../shared/sim/physics';
import { updateAi } from './game/ai/brain';
import type { Player } from './game/entities';
import { removeVehicle, unseatPed } from './game/factory';
import { resolveContacts } from './game/systems/contacts';
import { Dispatch } from './game/systems/dispatch';
import { Economy } from './game/systems/economy';
import { updateNpcPeds, updateVehicles } from './game/systems/movement';
import { equipStart, makeAvatar, processPlayers } from './game/systems/players';
import { updateFires, updateProjectiles } from './game/systems/projectiles';
import { buildSnapshot, playerList } from './game/systems/snapshot';
import { Population } from './game/systems/population';
import { updateWanted } from './game/systems/wanted';
import { World } from './game/world';
import { loadRoom, type RoomSave, type SavedProfile, saveRoom } from './persist';

export interface Conn {
  send(data: string): void;
  close(): void;
}

export class Room {
  readonly world: World;
  private pop: Population;
  private dispatch: Dispatch;
  readonly econ: Economy;
  private profiles: Record<string, SavedProfile>;
  private loop: ReturnType<typeof setInterval> | null = null;
  private tickCount = 0;
  private acc = 0;
  private lastT = 0;
  private saveT = 0;
  tickMs = 0;
  emptySince = Date.now();

  constructor(readonly code: string, seed: number) {
    const save = loadRoom(code);
    this.world = new World(save?.seed ?? seed);
    if (save) this.world.gameMinutes = save.gameMinutes;
    this.profiles = save?.profiles ?? {};
    this.pop = new Population(this.world);
    this.dispatch = new Dispatch(this.world);
    this.econ = new Economy(this.world);
    for (const [id, name] of save?.owners ?? []) this.econ.owners.set(id, name);
    this.econ.onChange = () => { this.sendOwners(); this.persist(); for (const pl of this.world.players.values()) this.sendProfile(pl); };
  }

  get size(): number {
    return this.world.players.size;
  }

  names(): string[] {
    return [...this.world.players.values()].map((p) => p.name);
  }

  join(name: string, conn: Conn): Player | string {
    const w = this.world;
    if (w.players.size >= RULES.maxPlayers) return 'Room is full.';
    if ([...w.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase())) return 'That name is already playing in this room.';
    const key = name.toLowerCase();
    const prof = this.profiles[key] ?? { cash: RULES.startCash, garage: [], owned: [], kills: 0, deaths: 0 };
    const used = new Set([...w.players.values()].map((p) => p.color));
    const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0];
    const pl: Player = {
      id: w.id(), name, color, pid: 0, mode: Mode.Foot, queue: [], last: [0, 0, 0, 0, 0, 0, 0, -1], ack: 0,
      cash: prof.cash, kills: prof.kills, deaths: prof.deaths, heat: 0, wanted: 0, seenT: 0, lethal: false,
      respawnT: 0, garage: [...prof.garage].filter((v) => v < VEHICLES.length), owned: [...prof.owned].filter((id) => this.econ.owners.get(id) === key),
      garageCar: 0, ping: 0, send: (m) => conn.send(JSON.stringify(m)), sendRaw: (s) => conn.send(s),
      spawnCdT: 0, bustT: 0, lastPlace: -1, gunCrimeT: -9, seenCheckT: 0,
    };
    const spawn = this.spawnPoint(pl);
    const ped = makeAvatar(w, pl, spawn.x, spawn.y);
    equipStart(ped);
    w.players.set(pl.id, pl);
    pl.send({ t: 'welcome', id: pl.id, room: this.code, seed: w.seed, maxPlayers: RULES.maxPlayers } satisfies S2C);
    this.sendProfile(pl);
    this.sendOwners();
    w.notify('info', `${name} joined`);
    this.start();
    return pl;
  }

  /** New players meet at the hospital nearest the city centre; owners start at home. */
  private spawnPoint(pl: Player): { x: number; y: number } {
    const w = this.world;
    const home = pl.owned.map((id) => w.city.properties[id]).find((p) => p.verb === 'home');
    if (home) return home;
    const hospitals = w.city.services.filter((s) => s.verb === 'hospital');
    hospitals.sort((a, b) => Math.hypot(a.x - 1024, a.y - 1024) - Math.hypot(b.x - 1024, b.y - 1024));
    return hospitals[0] ?? { x: 1024, y: 1024 };
  }

  leave(pl: Player): void {
    const w = this.world;
    this.storeProfile(pl);
    const p = w.peds.get(pl.pid);
    if (p) {
      if (p.vehicle) unseatPed(w, p, false);
      w.peds.delete(p.id);
    }
    const car = pl.garageCar ? w.vehicles.get(pl.garageCar) : undefined;
    if (car && !car.seats.some((s) => s)) removeVehicle(w, car);
    w.players.delete(pl.id);
    w.notify('info', `${pl.name} left`);
    this.persist();
    if (!w.players.size) { this.emptySince = Date.now(); this.stop(); }
  }

  onMessage(pl: Player, msg: C2S): void {
    switch (msg.t) {
      case 'in':
        for (const i of msg.i) if (Array.isArray(i) && i.length === 8 && i.every((n) => typeof n === 'number' && Number.isFinite(n))) pl.queue.push(sanitize(i));
        if (pl.queue.length > 30) pl.queue.splice(0, pl.queue.length - 30);
        break;
      case 'buy': {
        const err = this.econ.buy(pl, msg.kind, String(msg.id), Number(msg.place));
        if (err) pl.send({ t: 'msg', kind: 'warn', text: err } satisfies S2C);
        else this.sendProfile(pl);
        break;
      }
      case 'chat': {
        const text = String(msg.text ?? '').replace(/[\u0000-\u001f]/g, '').slice(0, 160).trim();
        if (text) this.world.broadcast({ t: 'msg', kind: 'chat', text: `${pl.name}: ${text}` } satisfies S2C);
        break;
      }
      case 'ping':
        pl.send({ t: 'pong', ts: msg.ts, st: Math.round(this.world.time * 1000) } satisfies S2C);
        break;
    }
  }

  setPing(pl: Player, ms: number): void {
    pl.ping = Math.round(ms);
  }

  private sendProfile(pl: Player): void {
    pl.send({ t: 'profile', p: { garage: pl.garage, owned: pl.owned } } satisfies S2C);
  }

  private sendOwners(): void {
    this.world.broadcast({ t: 'owners', list: this.econ.ownerList() } satisfies S2C);
  }

  private storeProfile(pl: Player): void {
    this.profiles[pl.name.toLowerCase()] = { cash: pl.cash, garage: pl.garage, owned: pl.owned, kills: pl.kills, deaths: pl.deaths };
  }

  persist(): void {
    for (const pl of this.world.players.values()) this.storeProfile(pl);
    const save: RoomSave = { version: 1, seed: this.world.seed, gameMinutes: this.world.gameMinutes, owners: [...this.econ.owners.entries()], profiles: this.profiles };
    saveRoom(this.code, save);
  }

  start(): void {
    if (this.loop) return;
    this.lastT = performance.now();
    this.acc = 0;
    this.loop = setInterval(() => this.frame(), 1000 / TICK_HZ / 2);
  }

  stop(): void {
    if (this.loop) clearInterval(this.loop);
    this.loop = null;
  }

  private frame(): void {
    const now = performance.now();
    this.acc += now - this.lastT;
    this.lastT = now;
    const step = 1000 / TICK_HZ;
    let n = 0;
    while (this.acc >= step && n < 4) {
      this.acc -= step;
      n++;
      const t0 = performance.now();
      this.tick();
      this.tickMs = this.tickMs * 0.95 + (performance.now() - t0) * 0.05;
    }
    if (this.acc > step * 8) this.acc = 0;
  }

  tick(): void {
    const w = this.world;
    w.time += DT;
    w.gameMinutes = (w.gameMinutes + RULES.gameMinutesPerSecond * DT) % 1440;
    w.rebuildHashes();
    processPlayers(w, DT);
    updateAi(w, DT);
    updateNpcPeds(w, DT);
    updateVehicles(w, DT);
    w.rebuildHashes();
    resolveContacts(w);
    updateProjectiles(w, DT);
    updateFires(w, DT);
    updateWanted(w, DT);
    this.dispatch.update(DT);
    this.pop.update(DT);
    this.econ.update();
    this.tickCount++;
    if (this.tickCount % SNAP_EVERY === 0) {
      for (const pl of w.players.values()) pl.sendRaw(JSON.stringify(buildSnapshot(w, pl)));
      w.fx = [];
    }
    if (this.tickCount % TICK_HZ === 0) w.broadcast({ t: 'players', list: playerList(w) } satisfies S2C);
    this.saveT += DT;
    if (this.saveT > 30) { this.saveT = 0; this.persist(); }
  }
}

function sanitize(i: number[]): InputMsg {
  const c = (v: number) => Math.max(-1, Math.min(1, v));
  return [i[0], c(i[1]), c(i[2]), c(i[3]), c(i[4]), i[5], i[6] | 0, i[7] | 0];
}
