// In-vehicle radio, as a broadcast: each station plays on the clock (shared/radioSchedule.ts), so
// tuning in joins whatever is on air and every player on a station hears the same moment. Like
// GTA2, the radio belongs to the car: each one comes tuned to its own station (picked from its id),
// and the radio key cycles that car's radio through the stations and Off, which it remembers for
// the next time you get in it. Getting out fades the sound but the stream keeps running
// for a few seconds, so hopping into another car just fades it back in; after that it stops, and
// the next car tunes in to the live broadcast again. The station name shows briefly on screen.
import { RADIO } from '../../shared/packs';
import { onAir, type RadioListing, type StationList } from '../../shared/radioSchedule';

const NONE: StationList = { songs: [], ads: [] };

/** The station a car's radio comes tuned to: scrambled from its id, so neighbouring cars differ. */
function carStation(vid: number): number {
  let h = Math.imul(vid ^ (vid >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) % Math.max(1, RADIO.length);
}

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
  /** The car you're in: -1 = off, else index into RADIO. */
  private station = 0;
  private inVehicle = false;
  /** The car you're in (0 = none), and the cars whose radio you've retuned. */
  private vehicle = 0;
  private retuned = new Map<number, number>();
  private target = 0;
  private grace = 0;
  private playing = '';
  private loading = false;
  private checkT = 0;
  private refreshT = REFRESH_S;
  private banner: HTMLElement;
  private bannerT = 0;
  /** "Now playing" card, top left: title, artist, station. */
  private card: HTMLElement;
  private cardT = 0;
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
    this.card = document.createElement('div');
    this.card.className = 'now-playing';
    this.card.innerHTML = '<div class="np-title"></div><div class="np-artist"></div>';
    document.body.appendChild(this.card);
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

  /** Call every frame with the vehicle you're in (0 = on foot). */
  update(dt: number, vehicle: number, level: number): void {
    if ((this.refreshT -= dt) <= 0) { this.refreshT = REFRESH_S; void this.load(); }
    if (vehicle && vehicle !== this.vehicle) {
      // Into a car (or straight from one into another): its radio, on its station.
      this.vehicle = vehicle;
      this.inVehicle = true;
      this.station = this.retuned.get(vehicle) ?? carStation(vehicle);
      this.tune(false);
    } else if (!vehicle && this.inVehicle) {
      this.vehicle = 0;
      this.inVehicle = false;
      this.target = 0;
      this.grace = GRACE_S;
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
    if (this.cardT > 0 && ((this.cardT -= dt) <= 0 || !this.inVehicle)) { this.cardT = 0; this.card.classList.remove('on'); }
  }

  /** Shows what's playing (songs only; commercials leave the card alone). */
  private nowPlaying(stationId: string, file: string): void {
    const s = RADIO.find((r) => r.id === stationId);
    const t = this.stations[stationId]?.songs.find((x) => x.file === file);
    if (!s || !t || !this.inVehicle) return;
    this.card.querySelector('.np-title')!.textContent = t.title ?? file;
    this.card.querySelector('.np-artist')!.textContent = t.artist ? `${t.artist} · ${s.name}` : s.name;
    this.card.style.setProperty('--np', s.color);
    // Top left, under the job panel when one is up.
    const job = document.querySelector('.hud-mission')?.getBoundingClientRect();
    this.card.style.top = job && job.height > 0 ? `${Math.round(job.bottom + 10)}px` : '';
    this.card.classList.add('on');
    this.cardT = 7;
  }

  /** The radio key: this car's next station (or off). Only works in a vehicle. */
  next(): void {
    if (!this.inVehicle) return;
    this.station = this.station + 1 >= RADIO.length ? -1 : this.station + 1;
    this.retuned.set(this.vehicle, this.station);
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
    // Another station's track (playing or still loading) goes: tune straight to this one, and a
    // station with nothing on air is silent rather than carrying on with the last one.
    if (this.playing && !this.playing.startsWith(`/radio/${encodeURIComponent(s.id)}/`)) this.stop();
    this.cardT = 0;
    this.card.classList.remove('on');
    this.follow();
    // Tuning in mid-song: say what it is.
    const air = onAir(s.id, this.stations[s.id] ?? NONE, this.now());
    if (air && !air.ad) this.nowPlaying(s.id, air.file);
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
      // The file ran out before the schedule says it ends (or we're in its last moment): playing it
      // again would restart it from the top. Wait for the next item instead.
      const end = Number.isFinite(this.audio.duration) ? this.audio.duration : air.dur;
      if (this.audio.ended || air.offset >= end - 0.05) {
        this.checkT = Math.min(1, Math.max(0.05, air.endsAt - this.now() + 0.02));
        return;
      }
      if (!this.audio.seeking && Math.abs(this.audio.currentTime - air.offset) > DRIFT_S) this.audio.currentTime = air.offset;
      if (this.audio.paused) this.start();
      return;
    }
    this.playing = src;
    this.loading = true;
    this.audio.src = src;
    if (!air.ad) this.nowPlaying(s.id, air.file);
    this.audio.addEventListener('loadedmetadata', () => {
      if (this.playing !== src) return; // retuned while this was loading
      // Loading took a moment: seek to where the broadcast is now, not where it was.
      const live = onAir(s.id, this.stations[s.id] ?? NONE, this.now());
      this.audio.currentTime = live && live.file === air.file ? Math.min(live.offset, this.audio.duration - 0.1) : 0;
      this.loading = false;
      this.start();
    }, { once: true });
    // A track that won't load: forget it so the next check tries again.
    this.audio.addEventListener('error', () => { if (this.playing !== src) return; this.loading = false; this.playing = ''; console.warn('[radio] could not load', src); }, { once: true });
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
