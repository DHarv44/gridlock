// Traffic health check: idle players around the city, the sim runs for a few minutes, and we
// report how many AI cars are stuck, for how long, why, and where the jams are.
// `npx tsx scripts/traffic.ts [seconds]`
import { RULES } from '../src/shared/packs';
import type { Vehicle } from '../src/server/game/entities';
import { Room } from '../src/server/room';
import { FX } from '../src/shared/protocol';

process.env.GRIDLOCK_DATA = 'data-smoke';
const SECONDS = Number(process.argv[2] ?? 180);
const room = new Room('TRAF', 1337);
room.stop();
const w = room.world;
// Players parked in different districts (they never move).
const spots = [[0.5, 0.42], [0.3, 0.42], [0.55, 0.22], [0.74, 0.3]];
for (const [i, [u, v]] of spots.entries()) {
  const pl = room.join(`watch${i}`, { send: () => {}, close: () => {} });
  if (typeof pl === 'string') throw new Error(pl);
  const p = w.peds.get(pl.pid)!;
  const b = w.map.blockAt(u * 2048, v * 2048) ?? w.city.blocks[0];
  p.body.x = b.rect.x0 + 1; p.body.y = b.rect.y0 + 1;
}
room.stop();

// Horns: AI drivers should only honk at a person in the road or a driver stopped for no reason.
let honks = 0;
const emit = w.emit.bind(w);
w.emit = (...e: number[]) => { if (e[0] === FX.Horn) honks++; emit(...e); };

const stopped = new Map<number, number>(); // vehicle -> seconds stopped
const driverOf = (v: Vehicle) => (v.seats[0] ? w.peds.get(v.seats[0]) : undefined);
const inNode = (v: Vehicle) => w.city.nodes.some((n) => Math.abs(v.body.x - n.x) < n.wv / 2 && Math.abs(v.body.y - n.y) < n.wh / 2);
let peakJam = 0, sumStuckFrac = 0, samples = 0, crashes = 0;
const hpBefore = new Map<number, number>();
const crashWhy = new Map<string, number>();

for (let k = 0; k < SECONDS * 30; k++) {
  for (const v of w.vehicles.values()) hpBefore.set(v.id, v.hp);
  room.tick();
  for (const v of w.vehicles.values()) {
    const d = driverOf(v);
    if (d && !d.player && (hpBefore.get(v.id) ?? v.hp) - v.hp > 15) {
      crashes++;
      const key = `${d.ai?.task}:${d.ai?.drive?.why ?? '-'}:${inNode(v) ? 'junction' : 'road'}:${d.ai?.panicT && d.ai.panicT > 0 ? 'panic' : 'calm'}`;
      crashWhy.set(key, (crashWhy.get(key) ?? 0) + 1);
    }
  }
  for (const v of w.vehicles.values()) {
    const d = driverOf(v);
    if (!d || d.player || !d.ai || d.ai.task !== 'drive') { stopped.delete(v.id); continue; }
    const sp = Math.hypot(v.body.vx, v.body.vy);
    stopped.set(v.id, sp < 0.5 ? (stopped.get(v.id) ?? 0) + 1 / 30 : 0);
  }
  if (k % (30 * 15) === 0 && k > 0) {
    const traffic = [...w.vehicles.values()].filter((v) => { const d = driverOf(v); return d && !d.player && d.ai?.task === 'drive'; });
    const long = traffic.filter((v) => (stopped.get(v.id) ?? 0) > 12);
    const why = new Map<string, number>();
    for (const v of long) { const r = driverOf(v)!.ai!.drive?.why ?? '?'; why.set(r, (why.get(r) ?? 0) + 1); }
    // What's at the head of each stuck queue? Follow 'car' blockers to the front.
    const heads = new Map<string, number>();
    for (const v of long) {
      const c = Math.cos(v.body.angle), s = Math.sin(v.body.angle);
      let front: Vehicle | null = null, bf = 30;
      for (const o of w.vehicles.values()) {
        if (o === v) continue;
        const rx = o.body.x - v.body.x, ry = o.body.y - v.body.y;
        const f = rx * c + ry * s, l = -rx * s + ry * c;
        if (f > 0 && f < bf && Math.abs(l) < 2.6) { bf = f; front = o; }
      }
      if (!front) { heads.set('nothing ahead', (heads.get('nothing ahead') ?? 0) + 1); continue; }
      const fd = driverOf(front);
      const kind = front.wrecked ? 'wreck' : !fd ? (front.spot >= 0 ? 'parked car' : 'empty car') : fd.player ? 'player car'
        : `npc ${fd.ai?.task}:${fd.ai?.drive?.why ?? '-'}${(stopped.get(front.id) ?? 0) > 12 ? ' (stuck)' : ''}`;
      heads.set(kind, (heads.get(kind) ?? 0) + 1);
    }
    if (heads.size) console.log('   queue heads:', JSON.stringify(Object.fromEntries(heads)));
    const inBox = long.filter(inNode).length;
    // Jam clusters: stuck cars within 14 m of each other.
    let biggest = 0;
    for (const a of long) biggest = Math.max(biggest, long.filter((b) => Math.hypot(a.body.x - b.body.x, a.body.y - b.body.y) < 14).length);
    peakJam = Math.max(peakJam, biggest);
    sumStuckFrac += traffic.length ? long.length / traffic.length : 0;
    samples++;
    console.log(`t=${k / 30}s traffic=${traffic.length} stuck>12s=${long.length} (in intersections ${inBox}) biggest jam=${biggest}`,
      `why=${JSON.stringify(Object.fromEntries(why))} wrecks=${[...w.vehicles.values()].filter((v) => v.wrecked).length}`);
  }
}
console.log('crashes by state:', JSON.stringify(Object.fromEntries([...crashWhy].sort((a, b) => b[1] - a[1]).slice(0, 12))));
console.log(`avg stuck share ${(100 * sumStuckFrac / Math.max(1, samples)).toFixed(0)}%, peak jam ${peakJam} cars, AI crash hits ${crashes}, cap ${RULES.carCap}`);
console.log(`horns: ${honks} in ${SECONDS}s (${(honks / SECONDS * 60).toFixed(1)} a minute across the city)`);
