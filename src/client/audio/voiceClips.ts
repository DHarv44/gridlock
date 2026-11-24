// The voiced lines (src/client/voice/*.ogg, made by scripts/voice-calls.ts): their URLs by line id.
// Only the URLs are bundled; each clip is fetched the first time it's played.
const CLIPS = import.meta.glob('../voice/*.ogg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const clipOf = (id: string): string | undefined => CLIPS[`../voice/${id}.ogg`];
