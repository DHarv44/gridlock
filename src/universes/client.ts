// Browser-only side of the universe catalogue: each universe's assets (models, voices) are their
// own chunk, fetched only when that universe is played. Add a line here with each new universe.
import type { ClientAssets } from './clientTypes';

const LOADERS: Record<string, () => Promise<{ ASSETS: ClientAssets }>> = {
  bayhaven: () => import('./bayhaven/client'),
};

export async function loadClientAssets(id: string): Promise<ClientAssets> {
  const load = LOADERS[id];
  return load ? (await load()).ASSETS : { voice: {} };
}
