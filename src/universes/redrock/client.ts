// Redrock's browser assets: the Blender-built horses, wagons and guns (art/build.py --universe
// redrock writes them to ./models) and the voiced lines (only the player's own, shared with
// Bayhaven). Only the URLs are bundled; each file is fetched when it's needed.
import type { ClientAssets } from '../clientTypes';
import vehicles from './models/vehicles.glb?url';
import weapons from './models/weapons.glb?url';

export const ASSETS: ClientAssets = {
  vehiclesGlb: vehicles,
  weaponsGlb: weapons,
  voice: import.meta.glob('../../client/voice/you_*.ogg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
};
