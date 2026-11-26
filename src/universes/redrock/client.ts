// Redrock's browser assets: the Blender-built horses, wagons and guns (art/build.py --universe
// redrock writes them to ./models). Nobody is voiced yet (its cast and the player's lines are its
// own, shown in bubbles). Only the URLs are bundled; each file is fetched when it's needed.
import type { ClientAssets } from '../clientTypes';
import vehicles from './models/vehicles.glb?url';
import weapons from './models/weapons.glb?url';

export const ASSETS: ClientAssets = {
  vehiclesGlb: vehicles,
  weaponsGlb: weapons,
  voice: {},
};
