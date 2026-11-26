// Boot: picks the universe (?u=id, else the one last played, else the default), installs its packs
// and browser assets, and only then loads the lobby and game, whose modules read the packs when
// they load. Switching universe (lobby.ts) stores the choice and reloads the page.
import { installUniverse } from '../shared/packs';
import { DEFAULT_UNIVERSE, isUniverse, loadUniverse } from '../universes';
import { loadClientAssets } from '../universes/client';
import { setAssets, UNIVERSE_KEY } from './assets';

void (async () => {
  const asked = new URLSearchParams(location.search).get('u');
  const stored = localStorage.getItem(UNIVERSE_KEY);
  const id = isUniverse(asked) ? asked : isUniverse(stored) ? stored : DEFAULT_UNIVERSE.id;
  const [u, assets] = await Promise.all([loadUniverse(id), loadClientAssets(id)]);
  installUniverse(u);
  setAssets(assets);
  await import('./lobby');
})();
