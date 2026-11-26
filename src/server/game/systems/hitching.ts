// Hitching (the Hitch key while driving, stopped). A wagon in harness (`hitch`) unhitches: the wagon
// is left standing where it was (its `wagon` vehicle, seatless) and you're on the bare `team`. A
// team backed up to a standing wagon's pole (`hitchAs`) hitches on, and it's that wagon again.
// The vehicle keeps its id, riders and wind; only its type changes (snapshots carry the type).
import { VEHICLES, vehicleIndex } from '../../../shared/packs';
import { hitchOffset, trailerCentre } from '../../../shared/sim/physics';
import type { Player, Vehicle } from '../entities';
import { removeVehicle, spawnVehicle, unseatPed } from '../factory';
import type { World } from '../world';

/** Too fast to hitch or unhitch (m/s). */
const STILL = 1.5;
/** How near the team's tail must be to a wagon's pole (m), and how square to it (rad). */
const REACH = 3.5, SQUARE = 0.9;

export function toggleHitch(w: World, pl: Player, v: Vehicle): void {
  if (!v.spec.hitch && !VEHICLES.some((s) => s.hitch?.team === v.spec.id)) return; // nothing here hitches
  if (Math.hypot(v.body.vx, v.body.vy) > STILL) { w.notify('info', 'Stop first.', pl); return; }
  if (v.spec.hitch) unhitch(w, v);
  else if (!hitch(w, v)) w.notify('info', 'Back up to a wagon\'s pole to hitch on.', pl);
}

/** Changes a vehicle's type in place: health as the same share, riders past its seats put out. */
function retype(w: World, v: Vehicle, type: number): void {
  const spec = VEHICLES[type];
  for (let s = spec.seats; s < v.seats.length; s++) {
    const p = v.seats[s] ? w.peds.get(v.seats[s]) : undefined;
    if (p) unseatPed(w, p, true);
  }
  v.hp = Math.max(1, (v.hp / v.spec.hp) * spec.hp);
  v.seats = Array.from({ length: Math.max(1, spec.seats) }, (_, s) => v.seats[s] ?? 0);
  v.type = type;
  v.spec = spec;
  v.stamina = Math.min(v.stamina, spec.stamina?.gallop ?? 0);
}

function unhitch(w: World, v: Vehicle): void {
  const c = trailerCentre(v.body, v.spec, v.trailer);
  const wagon = spawnVehicle(w, vehicleIndex(v.spec.hitch!.wagon), c.x, c.y, v.trailer, v.color);
  wagon.owner = v.owner;
  retype(w, v, vehicleIndex(v.spec.hitch!.team));
  v.trailer = v.body.angle;
}

/** The standing wagon whose pole the team's tail is at, squared up to it; hitches on. */
function hitch(w: World, v: Vehicle): boolean {
  let best: { wagon: Vehicle; as: number } | null = null, bd = REACH;
  for (const o of w.vehicles.values()) {
    if (!o.spec.hitchAs || o.wrecked) continue;
    const as = vehicleIndex(o.spec.hitchAs);
    if (VEHICLES[as].hitch?.team !== v.spec.id) continue;
    // The pole: the front of the wagon. The team's tail: where its hitch would be.
    const px = o.body.x + Math.cos(o.body.angle) * o.spec.length / 2, py = o.body.y + Math.sin(o.body.angle) * o.spec.length / 2;
    const off = hitchOffset(VEHICLES[as]);
    const tx = v.body.x - Math.cos(v.body.angle) * off, ty = v.body.y - Math.sin(v.body.angle) * off;
    const d = Math.hypot(px - tx, py - ty);
    const square = Math.abs(Math.atan2(Math.sin(v.body.angle - o.body.angle), Math.cos(v.body.angle - o.body.angle)));
    if (d < bd && square < SQUARE) { bd = d; best = { wagon: o, as }; }
  }
  if (!best) return false;
  const o = best.wagon;
  const px = o.body.x + Math.cos(o.body.angle) * o.spec.length / 2, py = o.body.y + Math.sin(o.body.angle) * o.spec.length / 2;
  retype(w, v, best.as);
  // The team's hitch onto the pole; the wagon trails from it at its own heading.
  const off = hitchOffset(v.spec);
  v.body.x = px + Math.cos(v.body.angle) * off;
  v.body.y = py + Math.sin(v.body.angle) * off;
  v.body.vx = 0; v.body.vy = 0;
  v.trailer = o.body.angle;
  removeVehicle(w, o);
  return true;
}
