// Response squads: police/military for wanted players, ambulances for bodies, fire trucks for fires.
import { dist2 } from '../../../shared/math';
import { SERVICE_CALLS, type Squad as SquadSpec, VEHICLES, WANTED, pedIndex, vehicleIndex } from '../../../shared/packs';
import { Mode } from '../../../shared/protocol';
import { BEHAVIOURS } from '../ai/behaviours';
import { setTask } from '../ai/tasks';
import type { Squad } from '../entities';
import { seatPed, spawnPed, spawnVehicle } from '../factory';
import type { World } from '../world';
import { laneSpawn } from './spawnPoints';

export class Dispatch {
  private timer = 0;
  private lastSpawn = new Map<number, number>();
  /** Player id -> the wanted level they last rose to, and when. */
  private reached = new Map<number, { level: number; t: number }>();

  constructor(private w: World) {}

  update(dt: number): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 1;
    this.cleanup();
    for (const pl of this.w.players.values()) {
      // When each player reached their current level: its units take a while to get going.
      const at = this.reached.get(pl.id);
      if (pl.wanted <= 0) this.reached.delete(pl.id);
      else if (!at || pl.wanted > at.level) this.reached.set(pl.id, { level: pl.wanted, t: this.w.time });
      else if (pl.wanted < at.level) at.level = pl.wanted; // cooling off: no fresh delay
      if (pl.wanted > 0 && pl.mode < Mode.Dead) this.wanted(pl.id, pl.wanted);
    }
    this.medics();
    this.fireCrews();
  }

  private spawnSquad(spec: SquadSpec, key: string, player: number, near: { x: number; y: number }, task: (driver: number) => void): Squad | null {
    const w = this.w;
    const type = vehicleIndex(spec.vehicle);
    const vs = VEHICLES[type];
    let x: number, y: number, angle: number, alt = 0;
    if (vs.movement === 'rotor') {
      const a = w.rng.next() * Math.PI * 2;
      x = near.x + Math.cos(a) * 170; y = near.y + Math.sin(a) * 170;
      angle = a + Math.PI; alt = 30;
    } else {
      const s = laneSpawn(w, near.x, near.y, 120, 175, near);
      if (!s) return null;
      ({ x, y, angle } = s);
    }
    const v = spawnVehicle(w, type, x, y, angle);
    v.body.alt = alt;
    v.persistent = true;
    v.siren = !!vs.siren;
    const squad: Squad = { id: w.id(), player, key, vehicle: v.id, members: [] };
    spec.crew.forEach((arch, i) => {
      if (i >= v.seats.length) return;
      const p = spawnPed(w, pedIndex(arch), x, y, angle);
      p.persistent = true;
      seatPed(w, p, v, i);
      p.ai!.squad = squad.id;
      p.ai!.crew = v.id;
      setTask(p, 'none');
      squad.members.push(p.id);
    });
    if (squad.members[0]) task(squad.members[0]);
    w.squads.set(squad.id, squad);
    return squad;
  }

  private wanted(playerId: number, level: number): void {
    const w = this.w;
    const pl = w.players.get(playerId)!;
    const target = w.peds.get(pl.pid);
    if (!target) return;
    const spec = WANTED[level - 1];
    if (w.time - (this.reached.get(playerId)?.t ?? w.time) < spec.respond) return;
    if (w.time - (this.lastSpawn.get(playerId) ?? -99) < spec.every) return;
    const pos = w.pedPos(target);
    let total = 0;
    for (const s of w.squads.values()) if (s.player === playerId) total++;
    if (total >= spec.squads.reduce((a, b) => a + b.max, 0)) return;
    for (const [k, slot] of spec.squads.entries()) {
      const key = `w${level}:${k}`;
      let active = 0;
      for (const s of w.squads.values()) if (s.player === playerId && s.key === key) active++;
      if (active >= slot.max) continue;
      const sq = this.spawnSquad(slot.squad, key, playerId, pos, (d) => setTask(w.peds.get(d)!, 'pursue', target.id));
      if (sq) { this.lastSpawn.set(playerId, w.time); return; }
    }
  }

  private countKey(key: string): number {
    let n = 0;
    for (const s of this.w.squads.values()) if (s.key === key) n++;
    return n;
  }

  private medics(): void {
    const w = this.w;
    const call = SERVICE_CALLS.medic;
    for (const p of w.peds.values()) {
      if (this.countKey('medic') >= call.maxActive) return;
      if (!p.dead || p.player || p.bodyCalled || p.deadT < 3 || p.revived) continue;
      if (w.nearestPlayerDist2(p.body.x, p.body.y) > 150 * 150) continue;
      p.bodyCalled = true;
      const pos = { x: p.body.x, y: p.body.y };
      this.spawnSquad(call.squad, 'medic', 0, pos, (d) => setTask(w.peds.get(d)!, 'respond', p.id, pos.x, pos.y));
    }
  }

  private fireCrews(): void {
    const w = this.w;
    const call = SERVICE_CALLS.fire;
    const send = (x: number, y: number) => {
      if (this.countKey('fire') >= call.maxActive) return false;
      if (w.nearestPlayerDist2(x, y) > 150 * 150) return false;
      this.spawnSquad(call.squad, 'fire', 0, { x, y }, (d) => setTask(w.peds.get(d)!, 'respond', 0, x, y));
      return true;
    };
    for (const f of w.fires.values()) {
      if (f.called || f.life < 4) continue;
      f.called = true;
      // One truck covers nearby fires.
      for (const o of w.fires.values()) if (dist2(o.x, o.y, f.x, f.y) < 30 * 30) o.called = true;
      if (!send(f.x, f.y)) return;
    }
    for (const v of w.vehicles.values()) {
      if (v.burning < 0 || v.fireCalled) continue;
      v.fireCalled = true;
      if (!send(v.body.x, v.body.y)) return;
    }
  }

  /** Drops dead squads and stands down units whose target is no longer wanted. */
  private cleanup(): void {
    const w = this.w;
    for (const s of w.squads.values()) {
      const alive = s.members.filter((id) => { const p = w.peds.get(id); return p && !p.dead; });
      const v = w.vehicles.get(s.vehicle);
      const pl = s.player ? w.players.get(s.player) : undefined;
      const standDown = s.player !== 0 && (!pl || pl.wanted === 0 || pl.mode >= Mode.Dead);
      const gone = !alive.length && (!v || v.wrecked);
      const serviceDone = s.player === 0 && servicesDone(w, s);
      if (!gone && !standDown && !serviceDone) continue;
      for (const id of s.members) {
        const p = w.peds.get(id);
        if (!p) continue;
        p.persistent = false;
        if (p.ai && !p.dead) {
          p.ai.squad = 0;
          if (standDown) BEHAVIOURS[p.spec.behaviour].idle(w, p);
        }
      }
      if (v) { v.persistent = false; v.siren = false; }
      w.squads.delete(s.id);
    }
  }
}

/** A service squad is done once its crew is back aboard and driving. */
function servicesDone(w: World, s: Squad): boolean {
  const driver = w.peds.get(s.members[0]);
  return !!driver && driver.vehicle === s.vehicle && driver.ai?.task === 'drive';
}
