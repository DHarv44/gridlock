// The universe's soundtrack (server/soundtrack.ts lists it; shared/soundtrack.ts picks): one song at
// a time, always played to its end; a short quiet, then the next, chosen for the region you're in
// when it starts. Ride from town onto the prairie mid-song and the town song plays out; the next one
// is the prairie's. Follows the music volume; never starts with ?mute. A universe with none is silent.
import { UNIVERSE } from '../../shared/packs';
import { nextSong, type SoundtrackListing, type SoundtrackSong } from '../../shared/soundtrack';

/** Seconds of quiet before the first song, and between songs. */
const FIRST_S = 4;
const GAP_S = [6, 14] as const;
/** The soundtrack sits under the game's sounds. */
const LEVEL = 0.8;

export class Soundtrack {
  private el = new Audio();
  private songs: SoundtrackSong[] = [];
  private last = '';
  private playing = false;
  /** When the next song may start (performance.now ms). */
  private nextAt = performance.now() + FIRST_S * 1000;
  /** What's playing (title), for anything that wants to show it. */
  title = '';

  constructor(private muted: boolean) {
    if (muted) return;
    fetch(`/api/soundtrack?u=${encodeURIComponent(UNIVERSE.id)}`)
      .then((r) => (r.ok ? r.json() as Promise<SoundtrackListing> : { songs: [] }))
      .then((l) => { this.songs = l.songs; })
      .catch(() => {});
    const done = () => {
      this.playing = false;
      this.title = '';
      this.nextAt = performance.now() + (GAP_S[0] + Math.random() * (GAP_S[1] - GAP_S[0])) * 1000;
    };
    this.el.addEventListener('ended', done);
    this.el.addEventListener('error', done);
  }

  /** Every frame: `level` the music volume (0..1), `zone` the id of the zone you're in. */
  update(level: number, zone: string): void {
    if (this.muted || !this.songs.length) return;
    this.el.volume = Math.max(0, Math.min(1, level * LEVEL));
    if (this.playing || performance.now() < this.nextAt) return;
    const s = nextSong(this.songs, zone, this.last, Math.random());
    if (!s) return;
    this.last = s.file;
    this.title = s.title;
    this.playing = true;
    this.el.src = `/soundtrack/${encodeURIComponent(UNIVERSE.id)}/${encodeURIComponent(s.file)}`;
    // Browsers hold sound back until the page has been clicked: try again shortly.
    this.el.play().catch(() => { this.playing = false; this.nextAt = performance.now() + 3000; });
  }

  /** Leaving the game: stop at once. */
  stop(): void {
    this.el.pause();
    this.el.removeAttribute('src');
    this.songs = [];
  }
}
