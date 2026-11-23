// Per-player snapshots with interest management.
import { r2 } from '../../../shared/math';
import { GANGS, RULES } from '../../../shared/packs';
import { objectivePoint } from '../missions/kinds';
import { EK, FULL_SNAP_EVERY, FX, Mode, PF, type PlayerInfo, type S2C, VF, type YouState } from '../../../shared/protocol';
import type { Ped, Player, Vehicle } from '../entities';
import type { World } from '../world';

const a2 = (v: number) => Math.round(v * 100) / 100;

function pedFlags(p: Ped): number {
  let f = 0;
  if (p.dead) f |= PF.dead;
  if (Math.hypot(p.body.vx, p.body.vy) > 3) f |= PF.fast;
  if (p.trigger) f |= PF.aim;
  if (p.burning > 0) f |= PF.burning;
  if (p.down > 0) f |= PF.down;
  if (p.player) f |= PF.player;
  if (p.ai && (p.ai.task === 'revive' || p.ai.task === 'extinguish') && p.ai.workT > 0) f |= PF.busy;
  if (p.jumpT > 0) f |= PF.jump;
  return f;
}

function vehFlags(w: World, v: Vehicle): number {
  let f = 0;
  if (v.siren) f |= VF.siren;
  if (v.wrecked) f |= VF.wreck;
  if (v.burning >= 0) f |= VF.burning;
  if (v.ctl.throttle < 0 || v.ctl.handbrake) f |= VF.brake;
  if (v.seats[0]) f |= VF.driven;
  if (!v.wrecked && v.hp < v.spec.hp * 0.35) f |= VF.smoke;
  const fwd = v.body.vx * Math.cos(v.body.angle) + v.body.vy * Math.sin(v.body.angle);
  if (fwd < -0.5) f |= VF.reverse;
  const hour = (w.gameMinutes / 60) % 24;
  if (v.seats[0] && (hour > 19 || hour < 6.5)) f |= VF.lights;
  return f;
}

export function buildSnapshot(w: World, pl: Player): S2C {
  const me = w.peds.get(pl.pid);
  const center = me ? w.pedPos(me) : { x: 1000, y: 1000 };
  const R = RULES.interestRadius;
  const R2 = R * R;
  const e: number[][] = [];
  const near = (x: number, y: number, r2 = R2) => (x - center.x) ** 2 + (y - center.y) ** 2 < r2;

  w.pedHash.query(center.x, center.y, R, (p) => {
    if (p.vehicle || !near(p.body.x, p.body.y)) return;
    const h = p.weapons[p.wi];
    e.push([p.id, EK.Ped, p.arch, r2(p.body.x), r2(p.body.y), a2(p.body.angle), pedFlags(p), h ? h.w : -1]);
  });
  for (const v of w.vehicles.values()) {
    const air = v.spec.movement === 'rotor' && v.body.alt > 3;
    if (!near(v.body.x, v.body.y, air ? R2 * 1.7 : R2)) continue;
    const dmg = v.wrecked ? 3 : v.hp < v.spec.hp * 0.35 ? 2 : v.hp < v.spec.hp * 0.7 ? 1 : 0;
    e.push([v.id, EK.Veh, v.type, r2(v.body.x), r2(v.body.y), a2(v.body.angle), v.color, vehFlags(w, v), a2(v.body.alt), a2(v.turret), dmg, v.spec.trailer ? a2(v.trailer) : 0]);
  }
  for (const pr of w.projectiles.values()) {
    if (near(pr.x, pr.y)) e.push([pr.id, EK.Proj, pr.weapon, r2(pr.x), r2(pr.y), a2(pr.angle), a2(pr.z)]);
  }
  for (const pk of w.pickups.values()) {
    if (near(pk.x, pk.y)) e.push([pk.id, EK.Pickup, pk.type, r2(pk.x), r2(pk.y), pk.weapon]);
  }
  for (const f of w.fires.values()) {
    if (near(f.x, f.y)) e.push([f.id, EK.Fire, r2(f.x), r2(f.y), a2(f.r)]);
  }
  const fx = w.fx.filter((ev) => fxNear(w, ev, center.x, center.y, R2));
  const { changed, kept } = delta(pl, e);
  return { t: 's', st: Math.round(w.time * 1000), ack: pl.ack, gt: Math.round(w.gameMinutes * 10) / 10, you: youState(w, pl, me), e: changed, k: kept, fx };
}

/** Splits entities into changed (sent in full) and unchanged (sent as ids only). */
function delta(pl: Player, all: number[][]): { changed: number[][]; kept: number[] } {
  const full = pl.snapCount++ % FULL_SNAP_EVERY === 0;
  const next = new Map<number, string>();
  const changed: number[][] = [], kept: number[] = [];
  for (const d of all) {
    const key = d.join(',');
    next.set(d[0], key);
    if (!full && pl.sent.get(d[0]) === key) kept.push(d[0]);
    else changed.push(d);
  }
  pl.sent = next;
  return { changed, kept };
}

const ID_EVENTS = new Set<number>([FX.Swing, FX.Horn, FX.Throw]);

function fxNear(w: World, ev: number[], cx: number, cy: number, R2: number): boolean {
  // Events keyed by entity id are sent to everyone; the client ignores ids it doesn't know.
  if (ID_EVENTS.has(ev[0])) return true;
  void w;
  return (ev[1] - cx) ** 2 + (ev[2] - cy) ** 2 < R2 * 1.3;
}

function youState(w: World, pl: Player, p: Ped | undefined): YouState {
  const v = p?.vehicle ? w.vehicles.get(p.vehicle) : undefined;
  const b = v && p!.seat === 0 ? v.body : p?.body;
  return {
    pid: pl.pid, vid: v?.id ?? 0,
    mode: pl.mode === Mode.Foot && v ? (p!.seat === 0 ? Mode.Driver : Mode.Passenger) : pl.mode,
    // [x, y, angle, vx, vy, av, alt, trailer angle] — the trailer for client prediction of rigs.
    body: b ? [b.x, b.y, b.angle, b.vx, b.vy, b.av, b.alt, v && p!.seat === 0 && v.spec.trailer ? v.trailer : b.angle] : [0, 0, 0, 0, 0, 0, 0, 0],
    hp: Math.ceil(p?.hp ?? 0), ar: Math.ceil(p?.armor ?? 0), cash: pl.cash, wl: pl.wanted, heat: Math.round(pl.heat),
    w: p ? p.weapons.map((h) => [h.w, h.ammo, h.clip]) : [], wi: p?.wi ?? 0, rl: p ? a2(p.reloadT) : 0,
    vt: v ? v.type : -1, vhp: v ? Math.max(0, Math.round((v.hp / v.spec.hp) * 100) / 100) : 0,
    respawn: Math.max(0, a2(pl.respawnT)),
    rs: GANGS.map((g) => Math.round(pl.respect[g] ?? 0)),
    mt: objectiveOf(w, pl),
  };
}

function objectiveOf(w: World, pl: Player): number[] | null {
  if (!pl.mission) return null;
  const p = objectivePoint(w, pl.mission);
  return p ? [r2(p.x), r2(p.y)] : null;
}

export function playerList(w: World): PlayerInfo[] {
  return [...w.players.values()].map((pl) => {
    const p = w.peds.get(pl.pid);
    const pos = p ? w.pedPos(p) : { x: 0, y: 0 };
    return { id: pl.id, name: pl.name, color: pl.color, pid: pl.pid, x: r2(pos.x), y: r2(pos.y), cash: pl.cash, felonies: Object.values(pl.felonies).reduce((a, n) => a + n, 0), deaths: pl.deaths, wl: pl.wanted, ping: pl.ping, frags: pl.frags, earned: pl.earned, ...(pl.look ? { look: pl.look } : {}) };
  });
}
