// Mounts (vehicles with `stamina`: horses and teams). Their wind: spent galloping, got back at a
// canter or at rest, half as fast. AI riders gallop when they chase or run. And a horse comes to
// the whistle of whoever last rode it (`comesWhenCalled`): it trots, then gallops if it's far,
// straight for them; from far off, or stuck out of anyone's sight, it comes round the nearest corner.
import { angleDiff, clamp } from '../../../shared/math';
import { VEHICLES } from '../../../shared/packs';
import { galloping } from '../../../shared/sim/physics';
import type { Player, TaskName, Vehicle } from '../entities';
import type { World } from '../world';
import { laneSpawn } from './spawnPoints';

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
    if (v.calledBy) lead(w, v);
    if (galloping(v.body, v.spec, v.ctl.sprint)) v.stamina = Math.max(0, v.stamina - dt);
    else v.stamina = Math.min(st.gallop, v.stamina + dt * RECOVER);
    if (v.stamina <= 0) v.blown = true;
    else if (v.blown && v.stamina >= st.gallop * WINDED) v.blown = false;
  }
}

/** A blown horse canters until it has this share of its wind back. */
const WINDED = 0.3;

/** Whether a mount can be asked for a gallop now. */
export const canGallop = (v: Vehicle): boolean => !v.blown && v.stamina > 0;

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
  w.notify('info', 'You whistle for your horse.', pl);
}

function stop(v: Vehicle): void {
  v.calledBy = 0;
  v.ctl.throttle = 0; v.ctl.steer = 0; v.ctl.sprint = false;
}

/** A called horse heads for its rider. */
function lead(w: World, v: Vehicle): void {
  const pl = w.players.get(v.calledBy);
  const p = pl ? w.peds.get(pl.pid) : undefined;
  if (!p || p.dead || p.vehicle || v.wrecked || v.seats.some((s) => s)) { stop(v); return; }
  const at = w.pedPos(p);
  let dx = at.x - v.body.x, dy = at.y - v.body.y, d = Math.hypot(dx, dy);
  // From far off, or stuck (against a building, a rock): it appears on a road nearby instead
  // (round a corner if it was far, closer in if it was already close).
  if (d > 220 || (d > ARRIVE + 1 && v.idleT > 3)) {
    const s = d > 30 ? laneSpawn(w, at.x, at.y, 45, 80, at) : laneSpawn(w, at.x, at.y, 8, 25, at);
    if (s) {
      v.body.x = s.x; v.body.y = s.y; v.body.angle = s.angle; v.body.vx = 0; v.body.vy = 0; v.body.av = 0; v.idleT = 0;
      dx = at.x - v.body.x; dy = at.y - v.body.y; d = Math.hypot(dx, dy);
    }
  }
  if (d < ARRIVE) { stop(v); return; }
  const turn = angleDiff(v.body.angle, Math.atan2(dy, dx));
  v.ctl.steer = clamp(turn * 2, -1, 1);
  // Slow down to turn round, and to walk the last few metres up to them.
  v.ctl.throttle = Math.abs(turn) > 1.6 ? 0.3 : clamp(d / 14, 0.25, 1);
  v.ctl.sprint = d > 40 && canGallop(v);
  v.ctl.handbrake = false;
}
