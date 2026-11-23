// In-vehicle radio, as a broadcast: each station plays on the clock (shared/radioSchedule.ts), so
// tuning in joins whatever is on air and every player on a station hears the same moment. The
// radio key cycles Off → each station. Getting out fades the sound but the stream keeps running
// for a few seconds, so hopping into another car just fades it back in; after that it stops, and
// the next car tunes in to the live broadcast again. The station name shows briefly on screen.
import { RADIO } from '../../shared/packs';
import { onAir, type RadioListing, type StationList } from '../../shared/radioSchedule';

const NONE: StationList = { songs: [], ads: [] };

const FADE_S = 0.35;
/** Seconds the stream keeps running silently after you get out. */
const GRACE_S = 12;
/** Re-sync when the player drifts this far from the broadcast (seconds). */
const DRIFT_S = 1.2;
const REFRESH_S = 120;

export class Radio {
  private audio = new Audio();
  private stations: Record<string, StationList> = {};
  /** Server clock minus ours (ms). */
  private clock = 0;
  /** -1 = off, else index into RADIO. */
  private station = (() => { try { return Number(localStorage.getItem('gridlock.radio') ?? 0); } catch { return 0; } })();
  private inVehicle = false;
  private target = 0;
  private grace = 0;
  private playing = '';
  private loading = false;
  private checkT = 0;
  private refreshT = REFRESH_S;
  private banner: HTMLElement;
  private bannerT = 0;
  /** Scaled by the music volume setting passed to update(). */
  volume = 1;

  constructor(private muted: boolean) {
    this.audio.preload = 'auto';
    this.audio.volume = 0;
    this.audio.addEventListener('ended', () => this.follow());
    this.banner = document.createElement('div');
    this.banner.className = 'radio-banner';
    this.banner.hidden = true;
    document.body.appendChild(this.banner);
    if (!Number.isInteger(this.station) || this.station >= RADIO.length) this.station = 0;
    void this.load();
  }

  /** Fetches the playlists and lines our clock up with the server's. */
  private async load(): Promise<void> {
    try {
      const t0 = Date.now();
      const l = (await (await fetch('/api/radio')).json()) as RadioListing;
      const t1 = Date.now();
      this.clock = l.now + (t1 - t0) / 2 - t1;
      this.stations = l.stations;
    } catch { /* offline: no radio */ }
  }

  private now(): number {
    return (Date.now() + this.clock) / 1000;
  }

  /** Call every frame with whether you're in a vehicle. */
  update(dt: number, inVehicle: boolean, level: number): void {
    if ((this.refreshT -= dt) <= 0) { this.refreshT = REFRESH_S; void this.load(); }
    if (inVehicle !== this.inVehicle) {
      this.inVehicle = inVehicle;
      if (inVehicle) this.tune(false);
      else { this.target = 0; this.grace = GRACE_S; }
    }
    if (!this.inVehicle && this.playing && (this.grace -= dt) <= 0) this.stop();
    // Keep on the broadcast, and keep trying to tune in if nothing is playing yet (the station list
    // may still have been loading when you got in).
    const tuned = this.inVehicle && this.target > 0;
    if ((this.playing || tuned) && (this.checkT -= dt) <= 0) { this.checkT = 1; this.follow(); }
    const want = this.muted ? 0 : this.target * level * this.volume;
    const v = this.audio.volume + Math.sign(want - this.audio.volume) * Math.min(Math.abs(want - this.audio.volume), dt / FADE_S);
    this.audio.volume = Math.max(0, Math.min(1, v));
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) this.banner.hidden = true;
  }

  /** The radio key: next station (or off). Only works in a vehicle. */
  next(): void {
    if (!this.inVehicle) return;
    this.station = this.station + 1 >= RADIO.length ? -1 : this.station + 1;
    try { localStorage.setItem('gridlock.radio', String(this.station)); } catch { /* ignore */ }
    this.tune(true);
  }

  private tune(_announce: boolean): void {
    const s = RADIO[this.station];
    if (!s) {
      this.target = 0;
      this.stop();
      this.show('Radio off', '#9aa5ad');
      return;
    }
    this.target = 1;
    this.show(s.name, s.color);
    this.follow();
  }

  /** Puts the player on what the station is broadcasting right now: the right track, the right
   *  second. Already there? Only nudges it back if it has drifted. */
  private follow(): void {
    const s = RADIO[this.station];
    const air = s && !this.muted ? onAir(s.id, this.stations[s.id] ?? NONE, this.now()) : null;
    if (!s || !air || this.loading) return;
    // Songs are `file`, commercials `commercials/file`: encode each path segment.
    const src = `/radio/${encodeURIComponent(s.id)}/${air.file.split('/').map(encodeURIComponent).join('/')}`;
    if (this.playing === src) {
      if (!this.audio.seeking && Math.abs(this.audio.currentTime - air.offset) > DRIFT_S) this.audio.currentTime = air.offset;
      if (this.audio.paused) this.start();
      return;
    }
    this.playing = src;
    this.loading = true;
    this.audio.src = src;
    this.audio.addEventListener('loadedmetadata', () => {
      // Loading took a moment: seek to where the broadcast is now, not where it was.
      const live = onAir(s.id, this.stations[s.id] ?? NONE, this.now());
      this.audio.currentTime = live && live.file === air.file ? Math.min(live.offset, this.audio.duration - 0.1) : 0;
      this.loading = false;
      this.start();
    }, { once: true });
    // A track that won't load: forget it so the next check tries again.
    this.audio.addEventListener('error', () => { this.loading = false; this.playing = ''; console.warn('[radio] could not load', src); }, { once: true });
  }

  /** Starts playback. A browser that won't play sound before the page is used gets another go on
   *  the next key press or click. */
  private start(): void {
    this.audio.play().catch((err: unknown) => {
      if ((err as { name?: string }).name !== 'NotAllowedError' || this.unblock) return;
      this.unblock = () => {
        window.removeEventListener('keydown', this.unblock!);
        window.removeEventListener('pointerdown', this.unblock!);
        this.unblock = null;
        if (this.playing && this.target > 0) void this.audio.play().catch(() => {});
      };
      window.addEventListener('keydown', this.unblock);
      window.addEventListener('pointerdown', this.unblock);
    });
  }

  private unblock: (() => void) | null = null;

  private stop(): void {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.playing = '';
    this.loading = false;
  }

  private show(text: string, color: string): void {
    this.banner.textContent = text;
    this.banner.style.color = color;
    this.banner.hidden = false;
    this.bannerT = 2.6;
  }
}
