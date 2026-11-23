// In-vehicle radio. The radio key cycles Off → each station; getting in resumes your station,
// getting out silences it. Tuning in drops you mid-song like a live broadcast; after that tracks
// play through in a shuffled order. The station name shows briefly at the top of the screen.
import { RADIO } from '../../shared/packs';

const FADE_S = 0.35;

export class Radio {
  private audio = new Audio();
  private tracks: Record<string, string[]> = {};
  /** -1 = off, else index into RADIO. */
  private station = (() => { try { return Number(localStorage.getItem('gridlock.radio') ?? 0); } catch { return 0; } })();
  private inVehicle = false;
  private lastTrack = '';
  private banner: HTMLElement;
  private bannerT = 0;
  private target = 0;
  volume = 0.7;

  constructor(private muted: boolean) {
    this.audio.preload = 'auto';
    this.audio.volume = 0;
    this.audio.addEventListener('ended', () => this.playNext(false));
    this.banner = document.createElement('div');
    this.banner.className = 'radio-banner';
    this.banner.hidden = true;
    document.body.appendChild(this.banner);
    if (!Number.isInteger(this.station) || this.station >= RADIO.length) this.station = 0;
    void fetch('/api/radio').then((r) => r.json()).then((t: Record<string, string[]>) => { this.tracks = t; }).catch(() => {});
  }

  /** Call every frame with whether you're in a vehicle; handles getting in and out. */
  update(dt: number, inVehicle: boolean, level: number): void {
    if (inVehicle !== this.inVehicle) {
      this.inVehicle = inVehicle;
      if (inVehicle) this.tune(false); else this.target = 0;
    }
    // Ease the volume toward its target so cuts aren't abrupt.
    const want = this.muted ? 0 : this.target * level * this.volume;
    const v = this.audio.volume + Math.sign(want - this.audio.volume) * Math.min(Math.abs(want - this.audio.volume), dt / FADE_S);
    this.audio.volume = Math.max(0, Math.min(1, v));
    if (this.target === 0 && this.audio.volume === 0 && !this.audio.paused) this.audio.pause();
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) this.banner.hidden = true;
  }

  /** The radio key: next station (or off). Only works in a vehicle. */
  next(): void {
    if (!this.inVehicle) return;
    this.station = this.station + 1 >= RADIO.length ? -1 : this.station + 1;
    try { localStorage.setItem('gridlock.radio', String(this.station)); } catch { /* ignore */ }
    this.tune(true);
  }

  private tune(announce: boolean): void {
    const s = RADIO[this.station];
    if (!s) {
      this.target = 0;
      if (announce) this.show('Radio off', '#9aa5ad');
      return;
    }
    this.target = 1;
    this.show(s.name, s.color);
    this.lastTrack = '';
    this.playNext(true);
  }

  private playNext(midSong: boolean): void {
    const s = RADIO[this.station];
    const list = s ? this.tracks[s.id] ?? [] : [];
    if (!s || !list.length || this.muted || !this.inVehicle) return;
    const pool = list.length > 1 ? list.filter((t) => t !== this.lastTrack) : list;
    const track = pool[Math.floor(Math.random() * pool.length)];
    this.lastTrack = track;
    this.audio.src = `/radio/${encodeURIComponent(s.id)}/${encodeURIComponent(track)}`;
    if (midSong) {
      this.audio.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(this.audio.duration)) this.audio.currentTime = this.audio.duration * Math.random() * 0.7;
      }, { once: true });
    }
    void this.audio.play().catch(() => {});
  }

  private show(text: string, color: string): void {
    this.banner.textContent = text;
    this.banner.style.color = color;
    this.banner.hidden = false;
    this.bannerT = 2.6;
  }
}
