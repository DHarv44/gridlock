// What the radio shows: one quiet line at the bottom centre while the radio's on in your vehicle:
// the equaliser, the station, and the title and artist (talk shows: the show and its host;
// commercials: "Commercial"). It brightens when a song starts or you retune, then settles dim.
import { RadioEq } from './radioEq';

/** Seconds the line stays bright after a change. */
const BRIGHT_S = 6;
/** Seconds "Radio off" stays up. */
const OFF_S = 2;

export class RadioDisplay {
  private line = document.createElement('div');
  private station = document.createElement('span');
  private title = document.createElement('span');
  private artist = document.createElement('span');
  readonly eq = new RadioEq();
  private color = '#ffffff';
  private brightT = 0;
  private offT = 0;
  private on = false;

  constructor() {
    this.line.className = 'radio-line';
    this.station.className = 'rl-station';
    this.title.className = 'rl-title';
    this.artist.className = 'rl-artist';
    const text = document.createElement('div');
    text.className = 'rl-text';
    text.append(this.station, this.title, this.artist);
    this.line.append(this.eq.canvas, text);
    document.body.appendChild(this.line);
  }

  /** Tuned to a station: its name, until the track's known. */
  tuned(name: string, color: string): void {
    this.set(name, color, '', '');
  }

  /** Something new on air. `artist` empty for commercials. */
  nowPlaying(name: string, color: string, title: string, artist: string): void {
    this.set(name, color, title, artist);
  }

  /** The radio switched off: say so briefly, then go. */
  off(): void {
    this.set('Radio off', '#9aa5ad', '', '');
    this.offT = OFF_S;
  }

  private set(name: string, color: string, title: string, artist: string): void {
    this.color = color;
    this.station.textContent = name;
    this.station.style.color = color;
    this.title.textContent = title;
    this.artist.textContent = artist;
    this.title.hidden = !title;
    this.artist.hidden = !artist;
    this.offT = 0;
    this.brightT = BRIGHT_S;
    this.on = true;
  }

  /** `level` is the music volume the decks play at (0..1), for the equaliser. */
  update(dt: number, inVehicle: boolean, level: number): void {
    if (this.offT > 0 && (this.offT -= dt) <= 0) this.on = false;
    this.brightT = Math.max(0, this.brightT - dt);
    const show = this.on && inVehicle;
    this.line.classList.toggle('on', show);
    this.line.classList.toggle('bright', show && this.brightT > 0);
    if (show) this.eq.draw(dt, this.color, 1 / Math.max(0.15, level));
  }
}
