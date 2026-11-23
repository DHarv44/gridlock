// NPC driving: lane-following traffic with lights, and routed/direct pursuit driving.
import { angleDiff, clamp } from '../../../shared/math';
import { forwardSpeed } from '../../../shared/sim/physics';
import type { DriveState, Ped, Vehicle } from '../entities';
import type { World } from '../world';
import { findRoute, isGreen, laneOf, segBetween } from './route';

export function newDrive(w: World, v: Vehicle): DriveState {
  const { seg } = w.map.nearestSegment(v.body.x, v.body.y);
  const c = Math.cos(v.body.angle), s = Math.sin(v.body.angle);
  const dir: 1 | -1 = (seg.axis === 'h' ? c : s) >= 0 ? 1 : -1;
  const lane = seg.lanes > 1 && w.rng.chance(0.5) ? 1 : 0;
  const L = laneOf(w, seg, dir, lane);
  return { pts: [{ x: L.ex, y: L.ey, stop: L.to.id, axis: seg.axis }], seg: seg.id, dir, lane, route: [], routeT: 0, stuckT: 0, reverseT: 0, honkT: 0, blockT: 0, bypassT: 0 };
}

/** Appends the next lane (and the turn into it) to the traffic polyline. */
function extend(w: World, d: DriveState): void {
  const seg = w.city.segs[d.seg];
  const cur = laneOf(w, seg, d.dir, d.lane);
  const node = cur.to;
  let options = node.segs.filter((s) => s !== seg.id);
  if (!options.length) options = [seg.id];
  const weights = options.map((s) => (w.city.segs[s].axis === seg.axis ? 2.2 : 1));
  let r = w.rng.next() * weights.reduce((a, b) => a + b, 0);
  let pick = options[0];
  for (let k = 0; k < options.length; k++) { r -= weights[k]; if (r <= 0) { pick = options[k]; break; } }
  const next = w.city.segs[pick];
  const ndir: 1 | -1 = next.a === node.id ? 1 : -1;
  const probe = laneOf(w, next, ndir, 0);
  const cross = cur.hx * probe.hy - cur.hy * probe.hx;
  const nlane = cross > 0.5 ? next.lanes - 1 : cross < -0.5 ? 0 : Math.min(d.lane, next.lanes - 1);
  const L = laneOf(w, next, ndir, nlane);
  // Corner control point: where the two lane lines meet.
  let cx: number, cy: number;
  if (next.id === seg.id) { cx = node.x + cur.hx * 4; cy = node.y + cur.hy * 4; }
  else if (seg.axis === next.axis) { cx = (cur.ex + L.sx) / 2; cy = (cur.ey + L.sy) / 2; }
  else if (seg.axis === 'h') { cx = L.sx; cy = cur.ey; }
  else { cx = cur.ex; cy = L.sy; }
  const turn = seg.axis !== next.axis || next.id === seg.id;
  for (const t of [0.35, 0.7]) {
    const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
    d.pts.push({ x: a * cur.ex + b * cx + c * L.sx, y: a * cur.ey + b * cy + c * L.sy, axis: turn ? undefined : seg.axis });
  }
  d.pts.push({ x: L.sx, y: L.sy });
  d.pts.push({ x: L.ex, y: L.ey, stop: L.to.id, axis: next.axis });
  d.seg = next.id; d.dir = ndir; d.lane = nlane;
}

/** Speed cap from whatever is in front of the vehicle (cars, peds). */
function clearance(w: World, v: Vehicle, aggressive: boolean): { cap: number; ped: boolean } {
  const b = v.body, c = Math.cos(b.angle), s = Math.sin(b.angle);
  const hl = v.spec.length / 2, hw = v.spec.width / 2;
  let cap = Infinity, ped = false;
  const look = 14 + Math.abs(forwardSpeed(b)) * 1.1;
  w.vehiclesNear(b.x + c * look / 2, b.y + s * look / 2, look / 2 + 10, (o) => {
    if (o === v || (o.spec.movement === 'rotor' && o.body.alt > 2)) return;
    const rx = o.body.x - b.x, ry = o.body.y - b.y;
    const f = rx * c + ry * s, l = -rx * s + ry * c;
    if (f <= 0 || f > look + o.spec.length || Math.abs(l) > hw + o.spec.width / 2 + 0.6) return;
    const gap = f - hl - o.spec.length / 2;
    cap = Math.min(cap, Math.max(0, (gap - (aggressive ? 1 : 2.5)) * 1.1));
  });
  if (!aggressive) {
    w.pedsNear(b.x + c * 7, b.y + s * 7, 9, (o) => {
      if (o.dead) return;
      const rx = o.body.x - b.x, ry = o.body.y - b.y;
      const f = rx * c + ry * s, l = -rx * s + ry * c;
      if (f <= 0 || f > hl + 9 || Math.abs(l) > hw + 1) return;
      ped = true;
      cap = Math.min(cap, Math.max(0, (f - hl - 2.5) * 0.8));
    });
  }
  return { cap, ped };
}

function steerTo(v: Vehicle, tx: number, ty: number, speed: number): void {
  const b = v.body;
  const want = Math.atan2(ty - b.y, tx - b.x);
  let diff = angleDiff(b.angle, want);
  const vf = forwardSpeed(b);
  const backing = speed < 0;
  if (backing) diff = angleDiff(b.angle + Math.PI, want);
  v.ctl.steer = clamp(diff * 2.4, -1, 1) * (backing ? -1 : 1);
  const dv = speed - vf;
  if (speed === 0 && Math.abs(vf) < 0.6) { v.ctl.throttle = 0; v.ctl.handbrake = true; return; }
  v.ctl.handbrake = false;
  v.ctl.throttle = dv > 0 ? clamp(dv * 0.45, 0.15, 1) : clamp(dv * 0.5, -1, -0.05);
}

/** Handles being wedged: back up with opposite lock for a moment. */
function unstick(v: Vehicle, d: DriveState, wanted: number, dt: number): boolean {
  if (d.reverseT > 0) {
    d.reverseT -= dt;
    v.ctl.throttle = -0.8;
    v.ctl.steer = -v.ctl.steer || 0.6;
    v.ctl.handbrake = false;
    return true;
  }
  if (wanted > 2 && Math.abs(forwardSpeed(v.body)) < 0.6) d.stuckT += dt; else d.stuckT = 0;
  if (d.stuckT > 2.5) { d.stuckT = 0; d.reverseT = 1.3; }
  return false;
}

/** Ordinary traffic: follow lanes, obey lights, keep distance. */
export function cruise(w: World, v: Vehicle, p: Ped, dt: number, panic = false): void {
  const ai = p.ai!;
  if (!ai.drive) ai.drive = newDrive(w, v);
  const d = ai.drive;
  const b = v.body;
  while (d.pts.length < 5) extend(w, d);
  const vf = forwardSpeed(b);
  // Drop points we've reached or passed.
  for (let k = 0; k < 3 && d.pts.length; k++) {
    const pt = d.pts[0];
    const dx = pt.x - b.x, dy = pt.y - b.y;
    const dd = Math.hypot(dx, dy);
    const ahead = dx * Math.cos(b.angle) + dy * Math.sin(b.angle);
    if (dd < 3 + Math.abs(vf) * 0.15 || (ahead < 0 && dd < 10)) d.pts.shift(); else break;
  }
  if (d.pts.length < 5) extend(w, d);
  const seg = w.city.segs[d.seg];
  let target = panic ? 24 : seg.lanes > 1 ? 16 : 11.5;
  target = Math.min(target, v.spec.maxSpeed * 0.8);
  // Slow for turns ahead.
  if (d.pts.slice(0, 3).some((pt) => !pt.axis && pt.stop === undefined)) target = Math.min(target, panic ? 11 : 7.5);
  // Lights.
  if (!panic) {
    for (const pt of d.pts.slice(0, 3)) {
      if (pt.stop === undefined) continue;
      const node = w.city.nodes[pt.stop];
      if (!isGreen(node, pt.axis!, w.time)) {
        const dist = Math.hypot(pt.x - b.x, pt.y - b.y);
        if (dist > 1.5 || vf > 1) target = Math.min(target, Math.sqrt(2 * 5 * Math.max(0, dist - 2)));
      }
      break;
    }
  }
  const clear = clearance(w, v, panic || d.bypassT > 0);
  const lightHold = target < 1 && clear.cap > 3;
  if (d.bypassT > 0) { d.bypassT -= dt; target = Math.min(target, 7); }
  else target = Math.min(target, clear.cap);
  if ((clear.ped || clear.cap < 1) && vf < 1 && !lightHold) {
    d.honkT += dt;
    d.blockT += dt;
    if (d.honkT > 2.5) { d.honkT = -3; v.horn = true; }
    // Something has been in the way for a while: pull out and go around it.
    if (d.blockT > 5 && !clear.ped) { d.blockT = 0; d.bypassT = 3.5; }
  } else d.blockT = Math.max(0, d.blockT - dt);
  if (unstick(v, d, Math.max(target, d.bypassT > 0 ? 3 : 0), dt)) return;
  // Pure pursuit on the polyline.
  const look = 6 + Math.abs(vf) * 0.45;
  const pt = d.pts[0];
  let tx = pt.x, ty = pt.y;
  const d0 = Math.hypot(pt.x - b.x, pt.y - b.y);
  if (d0 < look && d.pts[1]) {
    const n = d.pts[1];
    const segLen = Math.hypot(n.x - pt.x, n.y - pt.y) || 1;
    const t = Math.min(1, (look - d0) / segLen);
    tx = pt.x + (n.x - pt.x) * t; ty = pt.y + (n.y - pt.y) * t;
  }
  if (d.bypassT > 0) {
    // Offset into the oncoming lane (to the left of travel).
    tx += Math.sin(b.angle) * 3.8; ty -= Math.cos(b.angle) * 3.8;
  }
  steerTo(v, tx, ty, target);
}

/** Routed driving toward a point, switching to a straight line when close. */
export function driveTo(w: World, v: Vehicle, p: Ped, tx: number, ty: number, dt: number, opts: { stopAt: number; ram: boolean; speed?: number }): number {
  const ai = p.ai!;
  if (!ai.drive) ai.drive = newDrive(w, v);
  const d = ai.drive;
  const b = v.body;
  const dist = Math.hypot(tx - b.x, ty - b.y);
  if (v.spec.movement === 'rotor') return flyTo(w, v, tx, ty, opts.stopAt, dt);
  const fast = opts.speed ?? Math.min(v.spec.maxSpeed * 0.92, 30);
  const clear = clearance(w, v, true);
  if (dist < 45 && !w.statics.raycast(b.x, b.y, tx, ty, 1)) {
    let target = dist <= opts.stopAt ? 0 : opts.ram ? fast : Math.min(fast, Math.sqrt(2 * 8 * Math.max(0, dist - opts.stopAt)));
    if (!opts.ram) target = Math.min(target, clear.cap + 2);
    if (unstick(v, d, Math.max(target, 3), dt)) return dist;
    steerTo(v, tx, ty, target);
    return dist;
  }
  d.routeT -= dt;
  if (d.routeT <= 0 || !d.route.length) {
    d.routeT = 2;
    const from = w.map.nearestNode(b.x, b.y), to = w.map.nearestNode(tx, ty);
    d.route = findRoute(w, from.id, to.id);
    // Skip the first node if we're already past it.
    if (d.route.length > 1) {
      const n0 = w.city.nodes[d.route[0]], n1 = w.city.nodes[d.route[1]];
      const ahead = (n0.x - b.x) * Math.cos(b.angle) + (n0.y - b.y) * Math.sin(b.angle);
      if (ahead < 0 && Math.hypot(n1.x - b.x, n1.y - b.y) < Math.hypot(n1.x - n0.x, n1.y - n0.y) + 10) d.route.shift();
    }
  }
  let gx = tx, gy = ty;
  if (d.route.length) {
    const n = w.city.nodes[d.route[0]];
    if (Math.hypot(n.x - b.x, n.y - b.y) < 9 && d.route.length > 1) d.route.shift();
    const cur = w.city.nodes[d.route[0]];
    const nxt = d.route[1] !== undefined ? w.city.nodes[d.route[1]] : null;
    gx = cur.x; gy = cur.y;
    // Keep to the right-hand lane of the segment ahead.
    const seg = nxt ? segBetween(w, cur.id, nxt.id) : null;
    if (seg && nxt) {
      const hx = Math.sign(nxt.x - cur.x), hy = Math.sign(nxt.y - cur.y);
      gx += -hy * 1.8; gy += hx * 1.8;
    }
  }
  const turnAhead = Math.abs(angleDiff(b.angle, Math.atan2(gy - b.y, gx - b.x))) > 0.5;
  let target = turnAhead && Math.hypot(gx - b.x, gy - b.y) < 30 ? 10 : fast;
  target = Math.min(target, clear.cap + 4);
  if (unstick(v, d, Math.max(target, 3), dt)) return dist;
  steerTo(v, gx, gy, target);
  return dist;
}

/** Helicopter flight: climb, turn toward target, hover at a standoff distance. */
export function flyTo(w: World, v: Vehicle, tx: number, ty: number, standoff: number, dt: number): number {
  const b = v.body;
  const dist = Math.hypot(tx - b.x, ty - b.y);
  const cruiseAlt = 32;
  v.ctl.up = b.alt < cruiseAlt - 2;
  v.ctl.down = b.alt > cruiseAlt + 4;
  if (b.alt < 6) { v.ctl.throttle = 0; v.ctl.steer = 0; return dist; }
  const want = Math.atan2(ty - b.y, tx - b.x);
  v.ctl.steer = clamp(angleDiff(b.angle, want) * 1.8, -1, 1);
  const closing = dist - standoff;
  v.ctl.throttle = clamp(closing / 25, -0.6, 1) * (Math.abs(angleDiff(b.angle, want)) < 1.2 ? 1 : 0.2);
  void dt;
  return dist;
}
