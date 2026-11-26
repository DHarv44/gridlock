// Runs another check script in a given universe: installs it first, then loads the script (whose
// game modules read the packs as they load). `npx tsx scripts/universe.ts redrock smoke 60`
export {};
const [id, script, ...rest] = process.argv.slice(2);
if (!id || !script) { console.log('usage: npx tsx scripts/universe.ts <universe> <script> [args]'); process.exit(1); }
const { installUniverse } = await import('../src/shared/packs');
const { loadUniverse } = await import('../src/universes');
installUniverse(await loadUniverse(id));
console.log(`[universe ${id}]`);
process.argv = [process.argv[0], `scripts/${script}.ts`, ...rest];
await import(`./${script}.ts`);
