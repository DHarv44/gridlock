// Redrock's browser assets. No Blender models yet: its horses, wagons and guns are drawn from their
// box models in the packs. Voices: only the player's own lines (shared with Bayhaven).
import type { ClientAssets } from '../clientTypes';

export const ASSETS: ClientAssets = {
  voice: import.meta.glob('../../client/voice/you_*.ogg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
};
