// Writes art/specs/game.json: the sizes the Blender build must match (vehicle bodies are the physics
// boxes; weapons are at real size). The packs stay the source; rerun this after changing them.
// `npx tsx scripts/model-specs.ts`
import { mkdirSync, writeFileSync } from 'node:fs';
import { PALETTE, VEHICLES, WEAPONS } from '../src/shared/packs';

// `paint`: the vehicle's first fixed colour (police, army...), so review sheets show liveries as in game.
const vehicles = Object.fromEntries(VEHICLES.map((v) => [v.id, {
  name: v.name, length: v.length, width: v.width, height: v.height, movement: v.movement,
  paint: Array.isArray(v.colors) ? PALETTE[v.colors[0]] : null,
  siren: !!v.siren, openTop: !!v.openTop, armored: !!v.armored,
  ...(v.trailer ? { trailer: { length: v.trailer.length, width: v.trailer.width, height: v.trailer.height, hitch: v.trailer.hitch } } : {}),
}]));
const weapons = Object.fromEntries(WEAPONS.filter((w) => w.size > 0).map((w) => [w.id, { name: w.name, size: w.size, hold: w.hold }]));

mkdirSync('art/specs', { recursive: true });
writeFileSync('art/specs/game.json', `${JSON.stringify({ vehicles, weapons }, null, 1)}\n`);
console.log(`art/specs/game.json: ${Object.keys(vehicles).length} vehicles, ${Object.keys(weapons).length} weapons`);
