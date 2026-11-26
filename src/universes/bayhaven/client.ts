// Bayhaven's browser assets: the Blender-built models (art/build.py writes them to src/client/models)
// and the voiced lines (scripts/voices.ts / voice-calls.ts write src/client/voice). Only the URLs are
// bundled; each file is fetched when it's needed.
import type { ClientAssets } from '../clientTypes';
import vehicles from '../../client/models/vehicles.glb?url';
import weapons from '../../client/models/weapons.glb?url';

export const ASSETS: ClientAssets = {
  vehiclesGlb: vehicles,
  weaponsGlb: weapons,
  voice: import.meta.glob('../../client/voice/*.ogg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
};
