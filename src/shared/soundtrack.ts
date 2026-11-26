// A universe's soundtrack as the server lists it (server/soundtrack.ts), and how the next song is
// chosen (client/audio/soundtrack.ts plays them). A song is never cut short; when one ends, the next
// comes from the region you're in then: a song tagged with your zone, else one tagged with none
// (plays anywhere), else any. Never the same song twice running while there's another to play.

/** `regions`: zone ids it plays in; none = anywhere. `dur` in seconds. */
export interface SoundtrackSong { file: string; title: string; dur: number; regions: string[] }
export interface SoundtrackListing { songs: SoundtrackSong[] }

/** The songs that suit a zone: its own, else the untagged, else all of them. */
export function songsFor(songs: SoundtrackSong[], zone: string): SoundtrackSong[] {
  const own = songs.filter((s) => s.regions.includes(zone));
  if (own.length) return own;
  const anywhere = songs.filter((s) => !s.regions.length);
  return anywhere.length ? anywhere : songs;
}

/** The next song for a zone, `r` in [0, 1); avoids `last` when there's a choice. */
export function nextSong(songs: SoundtrackSong[], zone: string, last: string, r: number): SoundtrackSong | null {
  const pool = songsFor(songs, zone);
  const fresh = pool.length > 1 ? pool.filter((s) => s.file !== last) : pool;
  return fresh.length ? fresh[Math.floor(r * fresh.length)] : null;
}
