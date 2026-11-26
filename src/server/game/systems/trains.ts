// Trains on the railway (world/railgen.ts). Each runs its own track from one end station to the other
// and back, easing in and stopping at every station for RailSpec.dwell seconds. Its cars are
// vehicles laid along the track every tick (no physics step). You take a train at a station: Enter by
// a stair tower's door (at grade: beside the platform) and you board the next one that stops there;
// Enter at a station gets you off at the nearest exit.
import { VEHICLES, vehicleIndex } from '../../../shared/packs';
import { FX } from '../../../shared/protocol';
import { CAR_PITCH, type Railway, trackPoint } from '../../../shared/world/railgen';
import { LEVEL_BAND } from '../../../shared/world/levels';
import type { Ped, Player, Vehicle } from '../entities';
import { freeSeat, seatPed, spawnVehicle, unseatPed } from '../factory';
import type { World } from '../world';

/** Acceleration and braking (m/s²), how near an exit counts as being at the station (m). */
const ACC = 0.9;
const BRAKE = 1.0;
const AT_EXIT = 4;

interface Train { track: number; s: number; v: number; dir: 1 | -1; dwell: number; at: number; cars: number[] }
interface State { rail: Railway; trains: Train[]; waiting: Map<number, number> }

const states = new WeakMap<World, State | null>();

function state(w: World): State | null {
  if (states.has(w)) return states.get(w)!;
  const rail = w.city.railway;
  const type = rail ? vehicleIndex(rail.spec.car) : -1;
  if (!rail || type < 0) { states.set(w, null); return null; }
  const trains: Train[] = [];
  const n = Math.min(rail.spec.trains, rail.tracks.length);
  for (let t = 0; t < n; t++) {
    // One sets off from each end.
    const first = t % 2 === 0;
    const tr: Train = { track: t, s: first ? rail.a0 : rail.a1, v: 0, dir: first ? 1 : -1, dwell: rail.spec.dwell * (0.4 + t * 0.3), at: first ? 0 : rail.stations.length - 1, cars: [] };
    // Locomotives at both ends (RailSpec.ends), so one always leads; the rest are `car`.
    const ends = rail.spec.ends ? vehicleIndex(rail.spec.ends) : type;
    for (let k = 0; k < rail.spec.cars; k++) {
      const v = spawnVehicle(w, k === 0 || k === rail.spec.cars - 1 ? ends : type, 0, 0, 0);
      v.persistent = true;
      tr.cars.push(v.id);
    }
    trains.push(tr);
    place(w, rail, tr);
  }
  const st: State = { rail, trains, waiting: new Map() };
  states.set(w, st);
  return st;
}

/** Lays a train's cars along its track around its position (the same car always at the same end). */
function place(w: World, r: Railway, tr: Train): void {
  const n = tr.cars.length;
  const base = r.axis === 'h' ? 0 : Math.PI / 2;
  const ux = r.axis === 'h' ? 1 : 0, uy = r.axis === 'h' ? 0 : 1;
  tr.cars.forEach((id, k) => {
    const v = w.vehicles.get(id);
    if (!v) return;
    const p = trackPoint(r, tr.s + (k - (n - 1) / 2) * CAR_PITCH, tr.track);
    const b = v.body;
    b.x = p.x + r.strip * LEVEL_BAND; b.y = p.y; b.alt = 0;
    // End locomotives face outward (the trailing one runs tender-first); the rest face the way it goes.
    const end = r.spec.ends && n > 1 && (k === 0 || k === n - 1);
    b.angle = base + (end ? (k === 0 ? Math.PI : 0) : tr.dir < 0 ? Math.PI : 0);
    b.vx = ux * tr.dir * tr.v; b.vy = uy * tr.dir * tr.v; b.av = 0;
    v.hp = v.spec.hp; v.burning = -1; v.wrecked = false; // nothing stops a train
  });
}

export function updateTrains(w: World, dt: number): void {
  const st = state(w);
  if (!st) return;
  const { rail, trains } = st;
  const stops = rail.stations;
  for (const tr of trains) {
    if (tr.dwell > 0) {
      tr.dwell -= dt;
      if (tr.dwell <= 0) {
        // Off again; at the end of the line, back the other way.
        if ((tr.dir > 0 && tr.at === stops.length - 1) || (tr.dir < 0 && tr.at === 0)) tr.dir = tr.dir > 0 ? -1 : 1;
        tr.at = -1;
        w.emit(FX.Horn, tr.cars[0]);
      }
      place(w, rail, tr);
      continue;
    }
    // The next station ahead, braking to stop at it.
    const next = tr.dir > 0 ? stops.findIndex((s) => s.a > tr.s + 0.1) : stops.map((s) => s.a < tr.s - 0.1).lastIndexOf(true);
    const ni = next < 0 ? (tr.dir > 0 ? stops.length - 1 : 0) : next;
    const dist = Math.abs(stops[ni].a - tr.s);
    const want = Math.min(rail.spec.speed, Math.sqrt(2 * BRAKE * Math.max(0, dist - 0.2)));
    tr.v = want > tr.v ? Math.min(want, tr.v + ACC * dt) : Math.max(want, tr.v - BRAKE * 2 * dt);
    const step = tr.v * dt;
    if (dist <= Math.max(0.15, step)) {
      tr.s = stops[ni].a; tr.v = 0; tr.at = ni; tr.dwell = rail.spec.dwell;
      boardWaiting(w, st, tr);
    } else tr.s += tr.dir * Math.max(step, 0.05);
    place(w, rail, tr);
  }
  // Anyone who's wandered off from a station stops waiting.
  for (const [plId, si] of st.waiting) {
    const pl = w.players.get(plId);
    const p = pl ? w.peds.get(pl.pid) : undefined;
    if (!p || p.vehicle || p.dead || nearExit(rail, si, p) === null) st.waiting.delete(plId);
  }
}

function nearExit(r: Railway, si: number, p: Ped): { x: number; y: number } | null {
  for (const e of r.stations[si].exits) if (Math.hypot(e.x - p.body.x, e.y - p.body.y) < AT_EXIT + 2) return e;
  return null;
}

/** Puts a player in a free seat of a train standing at the station (not the driver's). */
function board(w: World, tr: Train, p: Ped): boolean {
  for (const id of tr.cars) {
    const v = w.vehicles.get(id);
    const seat = v ? freeSeat(v, 1) : -1;
    if (v && seat > 0) { seatPed(w, p, v, seat); return true; }
  }
  return false;
}

function boardWaiting(w: World, st: State, tr: Train): void {
  for (const [plId, si] of st.waiting) {
    if (si !== tr.at) continue;
    const pl = w.players.get(plId);
    const p = pl ? w.peds.get(pl.pid) : undefined;
    if (!p || !pl || p.vehicle || p.dead) { st.waiting.delete(plId); continue; }
    if (board(w, tr, p)) { st.waiting.delete(plId); w.notify('info', `On the train from ${st.rail.stations[si].name}. Enter at a station to get off.`, pl); }
  }
}

/** Enter on foot: at a station, take the train standing there or wait for the next. False when
 *  you're not at a station. */
export function stationEnter(w: World, pl: Player, p: Ped): boolean {
  const st = state(w);
  if (!st || p.vehicle) return false;
  const si = st.rail.stations.findIndex((s) => s.exits.some((e) => Math.hypot(e.x - p.body.x, e.y - p.body.y) < AT_EXIT));
  if (si < 0) return false;
  const here = st.trains.find((t) => t.at === si && t.dwell > 0.8);
  if (here && board(w, here, p)) { w.notify('info', `On the train from ${st.rail.stations[si].name}. Enter at a station to get off.`, pl); return true; }
  st.waiting.set(pl.id, si);
  w.notify('info', `Waiting for the next train at ${st.rail.stations[si].name}.`, pl);
  return true;
}

/** Enter in a train: off at the station it's standing at (by the nearest exit), or not yet. */
export function trainLeave(w: World, pl: Player, p: Ped, v: Vehicle): void {
  const st = state(w);
  const tr = st?.trains.find((t) => t.cars.includes(v.id));
  if (!st || !tr || tr.at < 0) { w.notify('info', 'Wait for the next station to get off.', pl); return; }
  const s = st.rail.stations[tr.at];
  const g = { x: v.body.x - st.rail.strip * LEVEL_BAND, y: v.body.y };
  let best = s.exits[0], bd = Infinity;
  for (const e of s.exits) { const d = Math.hypot(e.x - g.x, e.y - g.y); if (d < bd) { bd = d; best = e; } }
  unseatPed(w, p, false);
  p.body.x = best.x; p.body.y = best.y; p.body.vx = 0; p.body.vy = 0; p.body.alt = 0;
  w.notify('info', s.name, pl);
}

/** The vehicle type a railway's cars are (for checks), or -1. */
export const railCarType = (w: World): number => (w.city.railway ? VEHICLES.findIndex((s) => s.id === w.city.railway!.spec.car) : -1);
