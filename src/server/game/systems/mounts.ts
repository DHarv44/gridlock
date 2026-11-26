// Mounts (vehicles with `stamina`: horses and teams). Their wind: spent galloping, got back at a
// canter or at rest, half as fast. AI riders gallop when they chase or run. And a horse comes to
// the whistle of whoever last rode it (`comesWhenCalled`): it canters, or gallops if it's far,
// along the roads to them; from far off, or getting no closer, it comes round the nearest corner.
import { VEHICLES } from '../../../shared/packs';
import { galloping } from '../../../shared/sim/physics';
import { newDrive, routeTo } from '../ai/driving';
import type { DriveState, Player, TaskName, Vehicle } from '../entities';
import type { World } from '../world';
import { laneSpawn } from './spawnPoints';
import { bolting, isLame, updateSpook } from './spook';

/** Tasks an AI rider gallops for. */
const HURRY = new Set<TaskName>(['pursue', 'respond', 'flee', 'attack']);
/** Wind comes back at this share of the rate it's spent. */
const RECOVER = 0.5;
/** A called horse stops this close (m). */
const ARRIVE = 4;

export function updateMounts(w: World, dt: number): void {
  for (const v of w.vehicles.values()) {
    const st = v.spec.stamina;
    if (!st) continue;
    const driver = v.seats[0] ? w.peds.get(v.seats[0]) : undefined;
    if (driver?.player && v.spec.comesWhenCalled) adopt(w, driver.player, v);
    if (driver && !driver.player && driver.ai) v.ctl.sprint = canGallop(v) && HURRY.has(driver.ai.task);
    if (v.calledBy && v.rearT <= 0 && !bolting(v)) lead(w, v, dt);
    updateSpook(w, v, dt); // rearing, bolting, limping (systems/spook.ts) override the above
    if (galloping(v.body, v.spec, v.ctl.sprint)) v.stamina = Math.max(0, v.stamina - dt);
    else v.stamina = Math.min(st.gallop, v.stamina + dt * RECOVER);
    if (v.stamina <= 0) v.blown = true;
    else if (v.blown && v.stamina >= st.gallop * WINDED) v.blown = false;
  }
}

/** A blown horse canters until it has this share of its wind back. */
const WINDED = 0.3;

/** Whether a mount can be asked for a gallop now. */
export const canGallop = (v: Vehicle): boolean => !v.blown && v.stamina > 0 && !isLame(v);

/** The horse a player is riding becomes theirs to whistle for (kept in the world while it is). */
function adopt(w: World, pl: Player, v: Vehicle): void {
  if (pl.mount === v.id) return;
  const old = pl.mount ? w.vehicles.get(pl.mount) : undefined;
  if (old && !old.owner) old.persistent = false;
  pl.mount = v.id;
  v.persistent = true;
}

/** The whistle (BTN.call, on foot): their last horse sets off toward them. */
export function callMount(w: World, pl: Player): void {
  if (!VEHICLES.some((s) => s.comesWhenCalled) || w.time < (pl.callT ?? 0)) return;
  pl.callT = w.time + 1.5;
  const v = pl.mount ? w.vehicles.get(pl.mount) : undefined;
  if (!v || v.wrecked) { w.notify('info', 'No horse answers your whistle.', pl); return; }
  if (v.seats.some((s) => s)) { w.notify('info', 'Someone is riding your horse.', pl); return; }
  v.calledBy = pl.id;
  progress.delete(v);
  routes.delete(v);
  w.notify('info', 'You whistle for your horse.', pl);
}

function stop(v: Vehicle): void {
  v.calledBy = 0;
  v.ctl.throttle = 0; v.ctl.steer = 0; v.ctl.sprint = false;
}

/** How close a called horse has got to its rider, and how long since it last got closer (s). */
const progress = new WeakMap<Vehicle, { best: number; t: number }>();
/** No closer in this long (against a building, a rock, circling a fence): it's stuck. */
const STUCK_S = 6;

/** A called horse heads for its rider. */
function lead(w: World, v: Vehicle, dt: number): void {
  const pl = w.players.get(v.calledBy);
  const p = pl ? w.peds.get(pl.pid) : undefined;
  if (!p || p.dead || p.vehicle || v.wrecked || v.seats.some((s) => s)) { stop(v); return; }
  const at = w.pedPos(p);
  let dx = at.x - v.body.x, dy = at.y - v.body.y, d = Math.hypot(dx, dy);
  let prog = progress.get(v);
  if (!prog) progress.set(v, (prog = { best: d, t: 0 }));
  if (d < prog.best - 1) { prog.best = d; prog.t = 0; } else prog.t += dt;
  // From far off, or stuck: it appears on a road nearby instead (round a corner if it was far,
  // closer in if it was already close).
  if (d > 220 || (d > ARRIVE + 1 && prog.t > STUCK_S)) {
    // Far off: round a corner well out. Stuck: round the nearest corner, closer in than it was.
    const s = d > 220 ? laneSpawn(w, at.x, at.y, 45, 80, at) : laneSpawn(w, at.x, at.y, 6, Math.max(12, Math.min(25, d * 0.6)), at);
    if (s) {
      v.body.x = s.x; v.body.y = s.y; v.body.angle = s.angle; v.body.vx = 0; v.body.vy = 0; v.body.av = 0; v.idleT = 0;
      dx = at.x - v.body.x; dy = at.y - v.body.y; d = Math.hypot(dx, dy);
    }
    progress.set(v, { best: d, t: 0 });
    routes.delete(v);
  }
  if (d < ARRIVE) { stop(v); return; }
  // Along the roads round the buildings, as a rider would take it, then straight up to them.
  let route = routes.get(v);
  if (!route) routes.set(v, (route = newDrive(w, v)));
  const gallop = d > 40 && canGallop(v);
  routeTo(w, v, route, at.x, at.y, dt, { stopAt: ARRIVE - 1, ram: false, speed: gallop ? undefined : v.spec.gaits?.canter });
  v.ctl.sprint = gallop;
}

/** A called horse's way along the roads. */
const routes = new WeakMap<Vehicle, DriveState>();
