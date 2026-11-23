// Headless soak test: 6 fake players in one room, random inputs, simulated minutes.
// `npm run smoke [seconds]`
import { deflateRawSync } from 'node:zlib';
import { BTN, type InputMsg, Mode } from '../src/shared/protocol';
import { addHeat } from '../src/server/game/systems/wanted';
import { Room } from '../src/server/room';

process.env.GRIDLOCK_DATA = process.env.GRIDLOCK_DATA ?? 'data-smoke';
const SECONDS = Number(process.argv[2] ?? 180);
const room = new Room('SMKE', 1337);
room.stop();
const bytes: number[] = [];
const zbytes: number[] = [];
let sampleN = 0;
const players = Array.from({ length: 6 }, (_, i) => {
  const res = room.join(`bot${i}`, { send: (d) => {
    bytes.push(d.length);
    // Deflate a sample of messages to estimate on-the-wire size.
    if (d.startsWith('{"t":"s"') && sampleN++ % 10 === 0) zbytes.push(deflateRawSync(d, { level: 3 }).length);
  }, close: () => {} });
  if (typeof res === 'string') throw new Error(res);
  return res;
});
room.stop(); // drive ticks manually

let seq = 0;
const w = room.world;
const t0 = performance.now();
let worst = 0, worstAt = 0;
const slow: string[] = [];
const ticks = SECONDS * 30;
for (let k = 0; k < ticks; k++) {
  for (const [i, pl] of players.entries()) {
    const phase = Math.floor(k / 90 + i) % 6;
    let btn = 0;
    if (phase === 2 || phase === 4) btn |= BTN.fire;
    if (k % 150 === i * 10) btn |= BTN.enter;
    if (k % 200 === 7) btn |= BTN.next;
    const inp: InputMsg = [++seq, Math.sin(k / 50 + i), Math.cos(k / 70 + i * 2), phase < 3 ? 1 : -0.4, Math.sin(k / 40 + i), (k / 30 + i) % 6.28, btn, -1];
    pl.queue.push(inp);
  }
  if (k === 30 * 20) addHeat(players[0], 400);   // five stars: military response
  if (k === 30 * 40) addHeat(players[1], 120);   // three stars
  const s = performance.now();
  room.tick();
  const took = performance.now() - s;
  if (took > worst) { worst = took; worstAt = k; }
  if (took > 40) slow.push(`${k}:${took.toFixed(0)}`);
  if (k % (30 * 30) === 0) {
    let bad = 0;
    for (const p of w.peds.values()) if (!Number.isFinite(p.body.x + p.body.y + p.hp)) bad++;
    for (const v of w.vehicles.values()) if (!Number.isFinite(v.body.x + v.body.y + v.body.angle)) bad++;
    const tasks = new Map<string, number>();
    for (const p of w.peds.values()) if (p.ai) tasks.set(p.ai.task, (tasks.get(p.ai.task) ?? 0) + 1);
    const avg = bytes.length ? Math.round(bytes.reduce((a, b) => a + b, 0) / bytes.length) : 0;
    const zavg = zbytes.length ? Math.round(zbytes.reduce((a, b) => a + b, 0) / zbytes.length) : 0;
    zbytes.length = 0;
    console.log(`  snapshot deflated ≈ ${zavg} B → ${(zavg * 15 / 1024).toFixed(1)} KB/s per player`);
    console.log(`t=${(k / 30).toFixed(0)}s peds=${w.peds.size} veh=${w.vehicles.size} proj=${w.projectiles.size} fires=${w.fires.size} squads=${w.squads.size} NaN=${bad} msgAvg=${avg}B`,
      `wanted=[${players.map((p) => p.wanted).join(',')}] modes=[${players.map((p) => Mode.Dead === p.mode ? 'D' : p.mode).join(',')}]`,
      JSON.stringify(Object.fromEntries(tasks)));
    bytes.length = 0;
  }
}
const ms = performance.now() - t0;
console.log(`${ticks} ticks in ${ms.toFixed(0)} ms: avg ${(ms / ticks).toFixed(2)} ms/tick, worst ${worst.toFixed(1)} ms at tick ${worstAt} (budget 33 ms); slow ticks: ${slow.slice(0, 20).join(' ')}`);
console.log('kills', players.map((p) => `${p.name}:${p.kills}/${p.deaths}`).join(' '));
