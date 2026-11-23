// Prints generation stats for a seed: `npx tsx scripts/citystats.ts [seed]`
import { SERVICES, ZONES } from '../src/shared/packs';
import { generateCity } from '../src/shared/world/city';

const seed = Number(process.argv[2] ?? 1337);
const t0 = performance.now();
const c = generateCity(seed);
const ms = performance.now() - t0;
console.log(`seed ${seed}: ${ms.toFixed(0)} ms`);
console.log(`lines ${c.xs.length}x${c.ys.length}, nodes ${c.nodes.length}, segs ${c.segs.length}, bridges ${c.bridges.length}`);
console.log(`blocks ${c.blocks.length}, lots ${c.lots.length}, buildings ${c.buildings.length}, obstacles ${c.obstacles.length}, trees ${c.trees.length}, parking ${c.parking.length}`);
const zoneCount = new Map<string, number>();
for (const b of c.blocks) zoneCount.set(ZONES[b.zone].id, (zoneCount.get(ZONES[b.zone].id) ?? 0) + 1);
console.log('blocks per zone', Object.fromEntries(zoneCount));
const svc = new Map<string, number>();
for (const s of c.services) svc.set(SERVICES[s.spec].id, (svc.get(SERVICES[s.spec].id) ?? 0) + 1);
console.log('services', Object.fromEntries(svc));
console.log('properties', c.properties.length, c.properties.slice(0, 4).map((p) => p.name));
const maxH = Math.max(...c.buildings.map((b) => b.h));
console.log('tallest', maxH.toFixed(1));
