// Headless check of traffic signals: drives the city and records, each time an AI car passes a
// stop line at a signalled junction, what its light showed at that moment.
// `npx tsx scripts/signals.ts [seconds]`
import { lightState } from '../src/shared/world/traffic';

process.env.GRIDLOCK_DATA = 'data-smoke';
const { Room } = await import('../src/server/room');
const SECONDS = Number(process.argv[2] ?? 120);
const room = new Room('SIGN', 4242);
room.stop();
// A few spectators spread out so traffic spawns in several places.
for (const [i, [x, y]] of [[700, 700], [1300, 800], [900, 1300], [1500, 1400]].entries()) {
  const pl = room.join(`watch${i}`, { send: () => {}, close: () => {} });
  if (typeof pl === 'string') throw new Error(pl);
  const p = room.world.peds.get(pl.pid)!;
  p.body.x = x; p.body.y = y;
}
room.stop();
const w = room.world;
/** Car id → the next stop line on its route (node, axis, position). */
const next = new Map<number, { node: number; axis: 'h' | 'v'; x: number; y: number }>();
const counts = { green: 0, amber: 0, red: 0 };
for (let k = 0; k < SECONDS * 30; k++) {
  room.tick();
  for (const v of w.vehicles.values()) {
    const driver = v.seats[0] ? w.peds.get(v.seats[0]) : undefined;
    const d = driver?.ai?.drive;
    if (!driver || driver.player || !d || v.wrecked || driver.ai!.task !== 'drive' || v.siren) { next.delete(v.id); continue; }
    const s = d.pts.find((p) => p.stop !== undefined);
    const prev = next.get(v.id);
    // The previous stop line left the route: the car went past it, near it, just now.
    if (prev && (!s || s.stop !== prev.node) && Math.hypot(prev.x - v.body.x, prev.y - v.body.y) < 12 && w.city.nodes[prev.node].lights) {
      const st = lightState(w.city.nodes[prev.node], prev.axis, w.time);
      counts[st === 2 ? 'green' : st === 1 ? 'amber' : 'red']++;
    }
    if (s) next.set(v.id, { node: s.stop!, axis: s.axis!, x: s.x, y: s.y }); else next.delete(v.id);
  }
}
const total = counts.green + counts.amber + counts.red;
console.log(`stop lines passed at lights ${total}: green ${counts.green}, amber ${counts.amber}, red ${counts.red} (${((counts.red / Math.max(1, total)) * 100).toFixed(1)}% on red)`);
process.exit(0);
