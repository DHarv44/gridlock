// What the radio shows while it's on in your vehicle, stacked at the bottom centre the old GTA way:
// the music's waveform on top, then "Song — Artist" (talk shows: the show and its host; commercials:
// "Commercial"), then the station's name in its own typeface and colour with a heavy black outline.
// It brightens when a song starts or you retune, then settles dim.
import './radioFonts';
import { RadioEq } from './radioEq';

/** Seconds the display stays bright after a change. */
const BRIGHT_S = 6;
/** Seconds "Radio off" stays up. */
const OFF_S = 2;

export interface StationLook { name: string; color: string; font: string }

export class RadioDisplay {
  private root = document.createElement('div');
  private track = document.createElement('div');
  private title = document.createElement('span');
  private artist = document.createElement('span');
  private station = document.createElement('div');
  readonly eq = new RadioEq();
  private color = '#ffffff';
  private brightT = 0;
  private offT = 0;
  private on = false;

  constructor() {
    this.root.className = 'radio-line';
    this.track.className = 'rl-track';
    this.title.className = 'rl-title';
    this.artist.className = 'rl-artist';
    this.station.className = 'rl-station';
    this.track.append(this.title, this.artist);
    this.root.append(this.eq.canvas, this.track, this.station);
    document.body.appendChild(this.root);
  }

  /** Tuned to a station: its name, until the track's known. */
  tuned(s: StationLook): void {
    this.set(s, '', '');
  }

  /** Something new on air. `artist` empty for commercials. */
  nowPlaying(s: StationLook, title: string, artist: string): void {
    this.set(s, title, artist);
  }

  /** The radio switched off: say so briefly, then go. */
  off(): void {
    this.set({ name: 'Radio off', color: '#9aa5ad', font: '' }, '', '');
    this.offT = OFF_S;
  }

  private set(s: StationLook, title: string, artist: string): void {
    this.color = s.color;
    this.station.textContent = s.name;
    this.station.style.color = s.color;
    this.station.style.fontFamily = s.font ? `"${s.font}", Bahnschrift, sans-serif` : '';
    this.title.textContent = title;
    this.artist.textContent = artist;
    this.track.hidden = !title;
    this.artist.hidden = !artist;
    this.offT = 0;
    this.brightT = BRIGHT_S;
    this.on = true;
  }

  /** `level` is the music volume the decks play at (0..1), for the waveform. */
  update(dt: number, inVehicle: boolean, level: number): void {
    if (this.offT > 0 && (this.offT -= dt) <= 0) this.on = false;
    this.brightT = Math.max(0, this.brightT - dt);
    const show = this.on && inVehicle;
    this.root.classList.toggle('on', show);
    this.root.classList.toggle('bright', show && this.brightT > 0);
    if (show) this.eq.draw(dt, this.color, 1 / Math.max(0.15, level));
  }
}
