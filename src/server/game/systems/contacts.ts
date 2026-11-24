// Dynamic contacts: vehicle-vehicle, vehicle-ped and ped-ped.
import { clamp } from '../../../shared/math';
import { FX } from '../../../shared/protocol';
import { PED_RADIUS } from '../../../shared/sim/physics';
import { obbVsCircle } from '../../../shared/world/collision';
import { damagePed, damageVehicle } from '../combat/damage';
import type { Vehicle } from '../entities';
import type { World } from '../world';

interface Hit { nx: number; ny: number; depth: number }

function obbVsObb(a: Vehicle, b: Vehicle): Hit | null {
  const A = a.body, B = b.body;
  const ca = Math.cos(A.angle), sa = Math.sin(A.angle), cb = Math.cos(B.angle), sb = Math.sin(B.angle);
  const ahl = a.spec.length / 2, ahw = a.spec.width / 2, bhl = b.spec.length / 2, bhw = b.spec.width / 2;
  const dx = A.x - B.x, dy = A.y - B.y;
  const axes: [number, number][] = [[ca, sa], [-sa, ca], [cb, sb], [-sb, cb]];
  let best = Infinity, nx = 0, ny = 0;
  for (const [ax, ay] of axes) {
    const ra = ahl * Math.abs(ca * ax + sa * ay) + ahw * Math.abs(-sa * ax + ca * ay);
    const rb = bhl * Math.abs(cb * ax + sb * ay) + bhw * Math.abs(-sb * ax + cb * ay);
    const d = dx * ax + dy * ay;
    const o = ra + rb - Math.abs(d);
    if (o <= 0) return null;
    if (o < best) { best = o; const s = d < 0 ? -1 : 1; nx = ax * s; ny = ay * s; }
  }
  return { nx, ny, depth: best };
}

const flying = (v: Vehicle) => v.spec.movement === 'rotor' && v.body.alt > 2;

export function resolveContacts(w: World): void {
  for (const a of w.vehicles.values()) {
    const A = a.body;
    const reach = a.spec.length / 2 + 7;
    w.vehHash.query(A.x, A.y, reach, (b) => {
      if (b.id <= a.id || flying(a) !== flying(b)) return;
      if (flying(a) && Math.abs(a.body.alt - b.body.alt) > 4) return;
      const h = obbVsObb(a, b);
      if (h) vehicleHit(w, a, b, h);
    });
    if (flying(a)) continue;
    w.pedHash.query(A.x, A.y, reach, (p) => {
      if (p.vehicle || p.jumpT > 0) return; // hopping peds clear the car
      const c = Math.cos(A.angle), s = Math.sin(A.angle);
      const h = obbVsCircle(A.x, A.y, c, s, a.spec.length / 2, a.spec.width / 2, { x: p.body.x, y: p.body.y, r: PED_RADIUS });
      if (!h) return;
      // h pushes the vehicle; the ped goes the other way. Only the car's own speed toward the
      // ped counts: running into a parked car must not floor you.
      const rel = A.vx * -h.nx + A.vy * -h.ny;
      p.body.x -= h.nx * h.depth; p.body.y -= h.ny * h.depth;
      if (p.dead) return;
      if (rel > (p.player ? 7 : 5)) {
        const driver = a.seats[0];
        p.body.vx = A.vx * 0.8 - h.nx * rel * 0.3; p.body.vy = A.vy * 0.8 - h.ny * rel * 0.3;
        p.down = Math.max(p.down, 1.2);
        damagePed(w, p, rel * rel * 0.32 * clamp(a.spec.mass / 1400, 0.4, 3), driver, { vehicle: true });
        A.vx *= 0.97; A.vy *= 0.97;
      } else {
        p.body.vx -= h.nx * 1.5; p.body.vy -= h.ny * 1.5;
      }
    });
  }
  // Peds push each other apart.
  for (const p of w.peds.values()) {
    if (p.vehicle || p.dead) continue;
    w.pedHash.query(p.body.x, p.body.y, 1, (o) => {
      if (o.id <= p.id || o.dead || o.vehicle) return;
      const dx = o.body.x - p.body.x, dy = o.body.y - p.body.y;
      const d2 = dx * dx + dy * dy, min = PED_RADIUS * 2;
      if (d2 >= min * min || d2 < 1e-6) return;
      const d = Math.sqrt(d2), push = (min - d) / 2;
      p.body.x -= (dx / d) * push; p.body.y -= (dy / d) * push;
      o.body.x += (dx / d) * push; o.body.y += (dy / d) * push;
    });
  }
}

function vehicleHit(w: World, a: Vehicle, b: Vehicle, h: Hit): void {
  let ma = a.spec.mass, mb = b.spec.mass;
  if (a.spec.crushes && !b.spec.crushes) mb *= 0.1;
  if (b.spec.crushes && !a.spec.crushes) ma *= 0.1;
  const ka = mb / (ma + mb), kb = ma / (ma + mb);
  a.body.x += h.nx * h.depth * ka; a.body.y += h.ny * h.depth * ka;
  b.body.x -= h.nx * h.depth * kb; b.body.y -= h.ny * h.depth * kb;
  const vn = (a.body.vx - b.body.vx) * h.nx + (a.body.vy - b.body.vy) * h.ny;
  if (vn >= 0) return;
  const e = 0.25;
  const j = (-(1 + e) * vn) / (1 / ma + 1 / mb);
  a.body.vx += (j / ma) * h.nx; a.body.vy += (j / ma) * h.ny;
  b.body.vx -= (j / mb) * h.nx; b.body.vy -= (j / mb) * h.ny;
  const impact = -vn;
  a.body.av += (w.rng.next() - 0.5) * impact * 0.04 * ka;
  b.body.av += (w.rng.next() - 0.5) * impact * 0.04 * kb;
  if (impact > 4) {
    const base = (impact - 4) * 11;
    const da = a.seats[0], db = b.seats[0];
    // Each takes the dent on the side facing the other (the normal points from b towards a).
    damageVehicle(w, a, base * clamp(mb / ma, 0.15, 4) * (b.spec.crushes ? 4 : 1), db, { x: a.body.x - h.nx * 50, y: a.body.y - h.ny * 50 });
    damageVehicle(w, b, base * clamp(ma / mb, 0.15, 4) * (a.spec.crushes ? 4 : 1), da, { x: b.body.x + h.nx * 50, y: b.body.y + h.ny * 50 });
    if (impact > 8) w.emit(FX.Spark, Math.round((a.body.x + b.body.x) / 2), Math.round((a.body.y + b.body.y) / 2));
    for (const v of [a, b]) {
      for (const sid of v.seats) {
        const occ = sid ? w.peds.get(sid) : undefined;
        if (occ && impact > 14) damagePed(w, occ, (impact - 14) * (v.spec.openTop ? 6 : 1.5), 0, { vehicle: true });
      }
    }
  }
}
