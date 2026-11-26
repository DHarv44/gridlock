// The voiced lines of the installed universe (client/assets.ts): their URLs by line id.
// Only the URLs are bundled; each clip is fetched the first time it's played.
import { ASSETS } from '../assets';

export const clipOf = (id: string): string | undefined => ASSETS.voice.get(id);
