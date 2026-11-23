// In-vehicle radio, as a broadcast: each station plays on the clock (shared/radioSchedule.ts), so
// tuning in joins whatever is on air and every player on a station hears the same thing. Like
// GTA2, the radio belongs to the car: each one comes tuned to its own station (picked from its id),
// and the radio key cycles that car's radio through the stations and Off, which it remembers.
//
// The clock is only used to tune in (the right track, the right second) and to check at each
// changeover that we're still with the broadcast. Between those the music runs itself: two decks,
// the next track loading on the second deck while the first plays, handed over the moment the
// first one ends, never seeked mid-song. If a changeover finds us more than a few seconds off the
// broadcast, it waits (ahead) or starts the next track a little in (behind) to rejoin it.
//
// Getting out fades the sound but keeps it running for a few seconds, so hopping into another car
// on the same station carries straight on.
import { RADIO } from '../../shared/packs';
import { onAir, type OnAir, type RadioListing, type StationList } from '../../shared/radioSchedule';
import { RadioClock } from './radioClock';
import { RadioDisplay } from './radioDisplay';

const NONE: StationList = { songs: [], ads: [] };
const FADE_S = 0.35;
/** Seconds the stream keeps running silently after you get out. */
const GRACE_S = 12;
/** Start loading the next track this long before the current one ends. */
const PRELOAD_S = 12;
/** At a changeover, further than this off the broadcast (seconds) and we rejoin it. */
const RESYNC_S = 3;
const REFRESH_S = 120;

/** The station a car's radio comes tuned to: scrambled from its id, so neighbouring cars differ. */
function carStation(vid: number): number {
  let h = Math.imul(vid ^ (vid >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) % Math.max(1, RADIO.length);
}

/** A scheduled item: what a deck holds, and when the broadcast starts and ends it. */
interface Item { station: string; file: string; ad: boolean; start: number; endsAt: number }
const itemOf = (station: string, a: OnAir): Item => ({ station, file: a.file, ad: a.ad, start: a.endsAt - a.dur, endsAt: a.endsAt });
// Songs are `file`, commercials `commercials/file`: encode each path segment.
const srcOf = (it: Item) => `/radio/${encodeURIComponent(it.station)}/${it.file.split('/').map(encodeURIComponent).join('/')}`;

export class Radio {
  private decks = [new Audio(), new Audio()];
  /** Index of the deck on air. */
  private cur = 0;
  /** What the deck on air holds, and what the other deck has loaded to play next. */
  private item: Item | null = null;
  private queued: Item | null = null;
  private queuedFailed = false;
  /** Broadcast time to start the deck on air (we finished early and are waiting for the broadcast). */
  private startAt = 0;
  /** Bumped whenever the decks are reset, so a load that finishes afterwards bows out. */
  private gen = 0;
  private stations: Record<string, StationList> = {};
  private clock = new RadioClock();
  private display = new RadioDisplay();
  /** The car you're in: -1 = off, else index into RADIO. */
  private station = 0;
  private inVehicle = false;
  /** The car you're in (0 = none), and the cars whose radio you've retuned. */
  private vehicle = 0;
  private retuned = new Map<number, number>();
  private target = 0;
  private grace = 0;
  private retryT = 0;
  private refreshT = REFRESH_S;
  private unblock: (() => void) | null = null;
  /** Scaled by the music volume setting passed to update(). */
  volume = 1;
  /** Each deck's level (0..1): the radio's own record, since a routed element ignores its volume. */
  private vols = [0, 0];

  constructor(private muted: boolean) {
    for (const d of this.decks) {
      d.preload = 'auto';
      d.volume = 0;
      d.addEventListener('ended', () => { if (d === this.deck) this.changeover(); });
      d.addEventListener('error', () => {
        if (!d.getAttribute('src')) return;
        console.warn('[radio] could not load', d.getAttribute('src'));
        if (d === this.deck) this.item = null; // rejoin on the next try
        else this.queuedFailed = true;
      });
    }
    void this.load();
  }

  private get deck(): HTMLAudioElement { return this.decks[this.cur]; }
  private get other(): HTMLAudioElement { return this.decks[1 - this.cur]; }
  private now(): number { return this.clock.now(); }
  private list(station: string): StationList { return this.stations[station] ?? NONE; }

  /** Fetches the playlists and lines our clock up with the server's. */
  private async load(): Promise<void> {
    try { this.stations = ((await (await fetch('/api/radio')).json()) as RadioListing).stations; } catch { /* offline: no radio */ }
    await this.clock.sync();
  }

  /** Call every frame with the vehicle you're in (0 = on foot). */
  update(dt: number, vehicle: number, level: number): void {
    if ((this.refreshT -= dt) <= 0) { this.refreshT = REFRESH_S; void this.load(); }
    if (vehicle && vehicle !== this.vehicle) {
      // Into a car (or straight from one into another): its radio, on its station.
      this.vehicle = vehicle;
      this.inVehicle = true;
      this.station = this.retuned.get(vehicle) ?? carStation(vehicle);
      this.tune();
    } else if (!vehicle && this.inVehicle) {
      this.vehicle = 0;
      this.inVehicle = false;
      this.target = 0;
      this.grace = GRACE_S;
    }
    if (!this.inVehicle && this.item && (this.grace -= dt) <= 0) this.stop();
    // Tuned in but nothing on yet (the station list may still have been loading): keep trying.
    if (this.inVehicle && this.target > 0 && !this.item && (this.retryT -= dt) <= 0) { this.retryT = 1; this.join(); }
    if (this.startAt && this.now() >= this.startAt) { this.startAt = 0; this.start(); }
    this.preload();
    const want = this.muted ? 0 : this.target * level * this.volume;
    const v = this.vols[this.cur];
    const nv = Math.max(0, Math.min(1, v + Math.sign(want - v) * Math.min(Math.abs(want - v), dt / FADE_S)));
    this.setVol(this.cur, nv);
    this.display.update(dt, this.inVehicle, nv);
  }

  /** A deck's level: on its gain once the equaliser has routed the decks, else on the element. */
  private setVol(i: number, v: number): void {
    this.vols[i] = v;
    const g = this.display.eq.gains;
    if (g) g[i].gain.value = v; else this.decks[i].volume = v;
  }

  /** The radio key: this car's next station (or off). Only works in a vehicle. */
  next(): void {
    if (!this.inVehicle) return;
    this.station = this.station + 1 >= RADIO.length ? -1 : this.station + 1;
    this.retuned.set(this.vehicle, this.station);
    this.tune();
  }

  private tune(): void {
    const s = RADIO[this.station];
    if (!s) {
      this.target = 0;
      this.stop();
      this.display.off();
      return;
    }
    this.target = 1;
    this.display.tuned(s.name, s.color);
    if (this.item?.station === s.id) {
      // Back in a car on the station that's still running (the grace period): carry on.
      this.nowPlaying(this.item);
      if (this.deck.paused && !this.deck.ended && !this.startAt) this.start();
      return;
    }
    this.stop();
    this.join();
  }

  /** Tunes in to the broadcast as it is right now: the right track, the right second. */
  private join(): void {
    const s = RADIO[this.station];
    const air = s && !this.muted ? onAir(s.id, this.list(s.id), this.now()) : null;
    if (!s || !air) return;
    const gen = ++this.gen;
    const it = itemOf(s.id, air);
    const d = this.deck;
    this.item = it;
    this.queued = null;
    this.startAt = 0;
    d.src = srcOf(it);
    this.nowPlaying(it);
    d.addEventListener('loadedmetadata', () => {
      if (gen !== this.gen) return;
      // Loading took a moment: start where the broadcast is now, or rejoin if this one's over.
      const at = this.now() - it.start;
      if (at >= d.duration - 0.25) { this.item = null; this.join(); return; }
      d.currentTime = Math.max(0, at);
      this.start();
    }, { once: true });
  }

  /** Loads the next scheduled item on the other deck once the one on air is nearly done. */
  private preload(): void {
    const it = this.item;
    if (!it || this.queued || this.muted) return;
    const d = this.deck;
    const left = Number.isFinite(d.duration) ? d.duration - d.currentTime : it.endsAt - this.now();
    if (left > PRELOAD_S) return;
    const next = onAir(it.station, this.list(it.station), it.endsAt + 0.01);
    if (!next) return;
    this.queued = itemOf(it.station, next);
    this.queuedFailed = false;
    this.other.src = srcOf(this.queued);
  }

  /** The deck on air finished: hand over to the next one. */
  private changeover(): void {
    const q = this.queued;
    if (!q || this.queuedFailed || q.station !== RADIO[this.station]?.id) { this.item = null; this.join(); return; }
    const level = this.vols[this.cur];
    this.deck.pause();
    this.cur = 1 - this.cur;
    this.item = q;
    this.queued = null;
    const d = this.deck;
    this.setVol(this.cur, level);
    // Still with the broadcast? Positive: we're early; negative: we're late.
    const early = q.start - this.now();
    if (early > RESYNC_S) {
      d.currentTime = 0;
      this.startAt = q.start; // wait for the broadcast to catch up
    } else {
      d.currentTime = early < -RESYNC_S ? Math.min(-early, q.endsAt - q.start - 1) : 0;
      this.start();
    }
    this.nowPlaying(q);
  }

  /** Plays the deck on air. A browser that won't play sound before the page is used gets another
   *  go on the next key press or click. */
  private start(): void {
    this.display.eq.attach(this.decks);
    this.deck.play().catch((err: unknown) => {
      if ((err as { name?: string }).name !== 'NotAllowedError' || this.unblock) return;
      this.unblock = () => {
        window.removeEventListener('keydown', this.unblock!);
        window.removeEventListener('pointerdown', this.unblock!);
        this.unblock = null;
        if (this.item && this.target > 0 && !this.startAt) void this.deck.play().catch(() => {});
      };
      window.addEventListener('keydown', this.unblock);
      window.addEventListener('pointerdown', this.unblock);
    });
  }

  private stop(): void {
    this.gen++;
    for (const d of this.decks) {
      d.pause();
      d.removeAttribute('src');
      d.load();
    }
    this.item = null;
    this.queued = null;
    this.startAt = 0;
  }

  /** Shows what's on air: the song (or show) and its artist (or host), or that it's a commercial. */
  private nowPlaying(it: Item): void {
    const s = RADIO.find((r) => r.id === it.station);
    if (!s || !this.inVehicle) return;
    if (it.ad) { this.display.nowPlaying(s.name, s.color, 'Commercial', ''); return; }
    const t = this.list(it.station).songs.find((x) => x.file === it.file);
    if (t) this.display.nowPlaying(s.name, s.color, t.title ?? it.file.replace(/\.[^.]+$/, ''), t.artist ?? '');
  }
}
