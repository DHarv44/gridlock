// Deterministic movement steps shared by the server simulation and client prediction.
import { approach, clamp, wrapAngle } from '../math';
import type { VehicleSpec } from '../packs';
import type { StaticWorld } from '../world/collision';

export const DT = 1 / 30;
export const PED_RADIUS = 0.35;
/** Sprint speed multiplier (Shift). */
export const SPRINT = 1.45;
export const HELI_MAX_ALT = 48;
export const HELI_CLIMB = 9;
const HELI_DRAG = 0.45;
/** How near the middle of a roof a helicopter's centre must be to set down on it (metres in from
 *  the edge it may hang over). */
const HELI_PAD = 0.8;

export interface Body {
  x: number; y: number; angle: number;
  vx: number; vy: number; av: number;
  alt: number;
}

export interface Controls {
  mx: number; my: number;   // on-foot move axes (screen space), -1..1
  throttle: number;         // vehicle: -1..1
  steer: number;            // vehicle: -1..1
  handbrake: boolean;
  sprint: boolean;
  up: boolean; down: boolean;
}

export const emptyControls = (): Controls => ({ mx: 0, my: 0, throttle: 0, steer: 0, handbrake: false, sprint: false, up: false, down: false });

export const newBody = (x: number, y: number, angle = 0): Body => ({ x, y, angle, vx: 0, vy: 0, av: 0, alt: 0 });

export function copyBody(dst: Body, src: Body): Body {
  dst.x = src.x; dst.y = src.y; dst.angle = src.angle; dst.vx = src.vx; dst.vy = src.vy; dst.av = src.av; dst.alt = src.alt;
  return dst;
}

export const speedOf = (b: Body): number => Math.hypot(b.vx, b.vy);
export const forwardSpeed = (b: Body): number => b.vx * Math.cos(b.angle) + b.vy * Math.sin(b.angle);

/** On-foot movement. Returns true if the ped bumped into static geometry. */
export function stepFoot(b: Body, c: Controls, speed: number, dt: number, world: StaticWorld): boolean {
  let mx = c.mx, my = c.my;
  const m = Math.hypot(mx, my);
  if (m > 1) { mx /= m; my /= m; }
  // GTA2-style: full speed the instant a key is down, dead stop when released.
  b.vx = mx * speed;
  b.vy = my * speed;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  const hit = world.resolveCircle(b, PED_RADIUS, 0);
  if (hit) {
    const vn = b.vx * hit.nx + b.vy * hit.ny;
    if (vn < 0) { b.vx -= vn * hit.nx; b.vy -= vn * hit.ny; }
  }
  return hit !== null;
}

const QUARTER = Math.PI / 2;
const ASSIST_CONE = (25 * Math.PI) / 180;

/**
 * Vehicle movement (wheels, bikes, tracks, rotors). Returns impact speed against static geometry.
 * `onRoad`, when given, enables GTA2's steer assist: with gas on and no steering, a car on a road
 * within 25° of the road's axis is eased straight along it.
 */
export function stepVehicle(b: Body, spec: VehicleSpec, c: Controls, dt: number, world: StaticWorld, driven: boolean, onRoad?: (x: number, y: number) => boolean): number {
  if (spec.movement === 'rotor') return stepHeli(b, spec, c, dt, world, driven);
  const fx = Math.cos(b.angle), fy = Math.sin(b.angle);
  // Vehicles that pivot on their rear axle: the centre's sideways motion from turning is part of
  // the turn, not a skid, so it's taken out before grip acts on the slip.
  const pivot = spec.rearAxle ?? 0;
  let vf = b.vx * fx + b.vy * fy;
  let vl = -b.vx * fy + b.vy * fx - b.av * pivot;
  const throttle = driven ? c.throttle : 0;
  const steer = driven ? c.steer : 0;
  const hand = driven && c.handbrake;

  if (throttle > 0) {
    if (vf < -0.5) vf = approach(vf, 0, spec.brake * dt);
    else vf += spec.accel * throttle * clamp(1 - (vf / spec.maxSpeed) ** 2, 0, 1) * dt;
  } else if (throttle < 0) {
    if (vf > 0.5) vf = approach(vf, 0, spec.brake * -throttle * dt);
    else vf = Math.max(-spec.reverse, vf - spec.accel * 0.7 * -throttle * dt);
  } else {
    vf = approach(vf, 0, (driven ? 2.2 : 6) * dt);
  }
  if (hand) vf = approach(vf, 0, spec.brake * 0.45 * dt);
  vf -= vf * 0.04 * dt;

  const speedK = clamp(Math.abs(vf) / spec.maxSpeed, 0, 1);
  // Oversteer while turning (GTA2 turn_in): the rear lets go a little as you steer at speed.
  const turnIn = spec.turnIn ?? 0.15;
  let grip = spec.grip * (1 - turnIn * Math.abs(steer) * speedK * 1.6);
  if (hand) grip = spec.grip * 0.12;
  vl *= Math.exp(-Math.max(0.3, grip) * dt);

  let targetAv: number;
  if (spec.movement === 'tracks') {
    targetAv = steer * spec.turnRate * (vf < -0.5 ? -1 : 1);
  } else if (spec.minTurnRadius) {
    // Truck: turning rate follows the steering geometry (v / radius) up to the grip a heavy rig
    // has (lateral accel / v), so it turns tight at a crawl and wide at speed.
    const sp = Math.abs(vf);
    const most = Math.min(sp / spec.minTurnRadius, (spec.maxLateral ?? 4) / Math.max(sp, 0.5));
    targetAv = steer * most * Math.sign(vf) * (hand ? 1.3 : 1);
  } else {
    // Tight at low speed, much lazier at top speed (GTA2: ~1.25x down to ~0.5x).
    const low = clamp(Math.abs(vf) / 3.5, 0, 1);
    const bySpeed = 1.25 - 0.75 * speedK;
    targetAv = steer * spec.turnRate * low * Math.sign(vf) * bySpeed * (hand ? 1.5 : 1);
  }
  b.av += (targetAv - b.av) * Math.min(1, 12 * dt);
  b.angle += b.av * dt;
  if (onRoad && steer === 0 && throttle > 0 && vf > 3 && !hand && onRoad(b.x, b.y)) {
    const axis = Math.round(b.angle / QUARTER) * QUARTER;
    const off = wrapAngle(axis - b.angle);
    if (Math.abs(off) < ASSIST_CONE) b.angle += clamp(off, -spec.turnRate * 0.5 * dt, spec.turnRate * 0.5 * dt);
  }

  const nfx = Math.cos(b.angle), nfy = Math.sin(b.angle);
  const lat = vl + b.av * pivot;
  b.vx = nfx * vf - nfy * lat;
  b.vy = nfy * vf + nfx * lat;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  return collideStatic(b, spec, world, 0);
}

/** Where the trailer hitch sits: this far behind the vehicle's centre. */
export const hitchOffset = (spec: VehicleSpec): number => spec.trailer?.hitch ?? spec.length / 2 - 0.9;

/**
 * Advances an articulated trailer's heading. The trailer pivots on the hitch and its rear axle
 * can't slide sideways, so it swings toward the path of the hitch (classic trailer kinematics).
 */
export function stepTrailer(b: Body, spec: VehicleSpec, trailerAngle: number, dt: number): number {
  const t = spec.trailer;
  if (!t) return b.angle;
  const c = Math.cos(b.angle), s = Math.sin(b.angle);
  const off = hitchOffset(spec);
  // Hitch velocity = body velocity + spin × (hitch offset behind the centre).
  const hvx = b.vx + b.av * (s * off), hvy = b.vy - b.av * (c * off);
  const axle = t.length * 0.8;
  let rate = (hvx * -Math.sin(trailerAngle) + hvy * Math.cos(trailerAngle)) / axle;
  // Reversing, true trailer kinematics fold up within seconds (articulation grows at about
  // |v|·rel/axle). A straightening term twice that strong keeps it drivable: the trailer still
  // answers the steering but settles back in line instead of jackknifing.
  const along = hvx * Math.cos(trailerAngle) + hvy * Math.sin(trailerAngle);
  if (along < 0) rate -= 2 * wrapAngle(trailerAngle - b.angle) * (-along / axle);
  let a = trailerAngle + rate * dt;
  // Jackknife limit.
  const rel = wrapAngle(a - b.angle);
  if (Math.abs(rel) > 1.45) a = b.angle + Math.sign(rel) * 1.45;
  return a;
}

/** Centre of the trailer box for a given trailer heading. */
export function trailerCentre(b: Body, spec: VehicleSpec, trailerAngle: number): { x: number; y: number } {
  const off = hitchOffset(spec);
  const hx = b.x - Math.cos(b.angle) * off, hy = b.y - Math.sin(b.angle) * off;
  const half = (spec.trailer?.length ?? 0) / 2;
  return { x: hx - Math.cos(trailerAngle) * half, y: hy - Math.sin(trailerAngle) * half };
}

function stepHeli(b: Body, spec: VehicleSpec, c: Controls, dt: number, world: StaticWorld, driven: boolean): number {
  // Whatever's under it is the floor: the street, or a roof it can set down on.
  const floor = world.floorAt(b.x, b.y, HELI_PAD);
  const flying = b.alt > floor + 1.5;
  if (driven && c.up) b.alt = Math.min(HELI_MAX_ALT, b.alt + HELI_CLIMB * dt);
  else if (driven && c.down) b.alt = Math.max(floor, b.alt - HELI_CLIMB * dt);
  else if (!driven) b.alt = Math.max(floor, b.alt - HELI_CLIMB * 0.8 * dt);
  if (b.alt < floor) b.alt = floor;

  const fx = Math.cos(b.angle), fy = Math.sin(b.angle);
  if (flying && driven) {
    const t = c.throttle;
    b.vx += fx * spec.accel * t * dt;
    b.vy += fy * spec.accel * t * dt;
    const targetAv = c.steer * spec.turnRate;
    b.av += (targetAv - b.av) * Math.min(1, 4 * dt);
  } else {
    b.av *= Math.exp(-6 * dt);
  }
  // Air drag sets the real top speed (accel / drag) below the spec's hard cap.
  const drag = flying ? HELI_DRAG : 6;
  b.vx *= Math.exp(-drag * dt);
  b.vy *= Math.exp(-drag * dt);
  const sp = Math.hypot(b.vx, b.vy);
  if (sp > spec.maxSpeed) { b.vx *= spec.maxSpeed / sp; b.vy *= spec.maxSpeed / sp; }
  b.angle += b.av * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  return collideStatic(b, spec, world, b.alt);
}

function collideStatic(b: Body, spec: VehicleSpec, world: StaticWorld, z: number): number {
  const hl = spec.length / 2, hw = spec.width / 2;
  const hit = world.resolveObb(b, hl, hw, z);
  if (!hit) return 0;
  const vn = b.vx * hit.nx + b.vy * hit.ny;
  if (vn >= 0) return 0;
  const e = 0.22;
  b.vx -= (1 + e) * vn * hit.nx;
  b.vy -= (1 + e) * vn * hit.ny;
  b.vx *= 0.92; b.vy *= 0.92;
  b.av *= 0.5;
  return -vn;
}
