// The broadcast: what each station is playing at any moment, worked out from the clock alone.
// A station's playlist loops forever on Unix time; each loop plays the tracks in a fresh order
// shuffled from (station, loop number). Anyone who knows the playlist and the time hears the same
// track at the same point, so there's nothing to pause or resume: tuning in joins what's on air.
import { Rng } from './rng';

export interface RadioTrack { file: string; dur: number }
export interface RadioListing { now: number; stations: Record<string, RadioTrack[]> }
export interface OnAir { file: string; dur: number; offset: number; endsAt: number }

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Track order for one loop; a loop never opens with the song the previous one closed on. */
function order(station: string, n: number, loop: number): number[] {
  const make = (k: number) => new Rng(hash(station) ^ Math.imul(k, 0x9e3779b1)).shuffle([...Array(n).keys()]);
  const o = make(loop);
  if (n > 1 && o[0] === make(loop - 1)[n - 1]) [o[0], o[1]] = [o[1], o[0]];
  return o;
}

/** What `station` is playing at Unix time `t` (seconds), or null if it has no tracks. */
export function onAir(station: string, tracks: RadioTrack[], t: number): OnAir | null {
  if (!tracks.length) return null;
  const total = tracks.reduce((a, x) => a + x.dur, 0);
  const loop = Math.floor(t / total);
  let into = t - loop * total;
  for (const i of order(station, tracks.length, loop)) {
    const tr = tracks[i];
    if (into < tr.dur) return { file: tr.file, dur: tr.dur, offset: into, endsAt: t - into + tr.dur };
    into -= tr.dur;
  }
  const last = tracks[order(station, tracks.length, loop)[tracks.length - 1]];
  return { file: last.file, dur: last.dur, offset: last.dur, endsAt: t };
}
