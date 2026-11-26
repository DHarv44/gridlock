// The universes this build can run. Each is one folder (src/universes/<id>/) whose index.ts exports
// a Universe (packs/types.ts). Adding one: write its folder, then add a line to LOADERS and INFO.
// Bayhaven is loaded with the engine (it's the default); the others are fetched only when picked.
import type { Universe } from '../shared/packs/types';
import { BAYHAVEN } from './bayhaven';

export interface UniverseInfo { id: string; name: string; blurb: string }

/** Installed when nothing else has been (headless scripts, a server started without a choice). */
export const DEFAULT_UNIVERSE: Universe = BAYHAVEN;

const LOADERS: Record<string, () => Promise<Universe>> = {
  bayhaven: async () => BAYHAVEN,
  redrock: async () => (await import('./redrock')).REDROCK,
};

/** What the universe picker lists (no packs loaded for it). */
export const UNIVERSE_INFO: UniverseInfo[] = [
  { id: BAYHAVEN.id, name: BAYHAVEN.name, blurb: BAYHAVEN.blurb },
  { id: 'redrock', name: 'Redrock Territory', blurb: 'An 1870s frontier territory: timber towns, prairie and badlands, horses, outlaws and the law.' },
];

export const isUniverse = (id: unknown): id is string => typeof id === 'string' && id in LOADERS;

/** Every universe's manifest by id (the server's front door: radio, room listings). Data only;
 *  nothing is installed. */
export async function loadAllUniverses(): Promise<Map<string, Universe>> {
  return new Map(await Promise.all(UNIVERSE_INFO.map(async (i) => [i.id, await loadUniverse(i.id)] as const)));
}

export async function loadUniverse(id: string): Promise<Universe> {
  const load = LOADERS[id];
  if (!load) throw new Error(`unknown universe "${id}"`);
  return load();
}
