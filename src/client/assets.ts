// The installed universe's browser assets (set once by the boot, client/main.ts, before the game
// loads): model files and voiced-line URLs by line id.
import type { ClientAssets } from '../universes/clientTypes';

/** Local storage key of the universe last picked (client/main.ts boots it). */
export const UNIVERSE_KEY = 'gridlock.universe';

export const ASSETS: { vehiclesGlb?: string; weaponsGlb?: string; voice: Map<string, string> } = { voice: new Map() };

export function setAssets(a: ClientAssets): void {
  ASSETS.vehiclesGlb = a.vehiclesGlb;
  ASSETS.weaponsGlb = a.weaponsGlb;
  ASSETS.voice.clear();
  for (const [path, url] of Object.entries(a.voice)) ASSETS.voice.set(path.slice(path.lastIndexOf('/') + 1).replace(/\.ogg$/, ''), url);
}
