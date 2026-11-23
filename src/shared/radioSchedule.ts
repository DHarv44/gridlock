// The broadcast: what each station is playing at any moment, worked out from the clock alone.
// Since a fixed start date the station has played its songs in loops, each loop in a fresh order
// shuffled from (station, loop number), with commercial breaks between songs: one spot per break,
// after no fewer than 1 and no more than 3 songs, never the same spot twice running. A song never
// comes back until at least half the station's other songs have played, across loops too.
// Anyone who knows the playlist and the time works out the same thing, so tuning in
// joins what's on air; there's nothing to pause or resume.
import { Rng } from './rng';

/** `title` / `artist` come from the station's tracks.json; without them the file name stands in. */
export interface RadioTrack { file: string; dur: number; title?: string; artist?: string }
export interface StationList { songs: RadioTrack[]; ads: RadioTrack[] }
export interface RadioListing { now: number; stations: Record<string, StationList> }
export interface OnAir { file: string; dur: number; offset: number; endsAt: number; ad: boolean }

/** The broadcast has been running since 1 Jan 2026 (Unix seconds). */
const EPOCH = Date.UTC(2026, 0, 1) / 1000;
/** Songs between commercials: at least MIN_RUN, at most MAX_RUN; in between, a break after a
 *  song comes with this chance. Every break is a single spot. */
export const MIN_RUN = 1;
export const MAX_RUN = 3;
const BREAK_CHANCE = 0.5;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

interface Slot { track: RadioTrack; ad: boolean }
/** State carried from one loop into the next (so breaks, spots and songs don't bunch across
 *  loops); `tail` is the end of the last loop's song order, most recent last. */
interface Carry { run: number; lastAd: number; tail: number[] }

/** Songs that must play between two plays of the same song: half the rest of the station's list. */
const gapFor = (songs: number) => Math.ceil((songs - 1) / 2);

/** One loop: the songs in shuffled order with breaks between them. A song from the end of the last
 *  loop waits until enough others have played before it comes round again. */
function buildLoop(station: string, list: StationList, loop: number, carry: Carry): { slots: Slot[]; carry: Carry } {
  const rng = new Rng(hash(station) ^ Math.imul(loop, 0x9e3779b1));
  const gap = gapFor(list.songs.length);
  // Earliest place in this loop for each of the last loop's closing songs.
  const earliest = new Map(carry.tail.map((s, j) => [s, gap - (carry.tail.length - 1 - j)]));
  const pool = rng.shuffle([...list.songs.keys()]);
  const order: number[] = [];
  while (pool.length) {
    const k = pool.findIndex((i) => (earliest.get(i) ?? 0) <= order.length);
    order.push(pool.splice(Math.max(0, k), 1)[0]);
  }
  const slots: Slot[] = [];
  let { run, lastAd } = carry;
  for (const i of order) {
    slots.push({ track: list.songs[i], ad: false });
    run++;
    if (list.ads.length && run >= MIN_RUN && (run >= MAX_RUN || rng.chance(BREAK_CHANCE))) {
      let a = rng.int(0, list.ads.length - 1);
      if (list.ads.length > 1 && a === lastAd) a = (a + 1 + rng.int(0, list.ads.length - 2)) % list.ads.length;
      slots.push({ track: list.ads[a], ad: true });
      lastAd = a;
      run = 0;
    }
  }
  return { slots, carry: { run, lastAd, tail: gap ? order.slice(-gap) : [] } };
}

const span = (slots: Slot[]) => slots.reduce((a, s) => a + s.track.dur, 0);

/** Per station: the loop most recently found, so lookups near "now" don't replay from the start. */
const cache = new Map<string, { sig: string; loop: number; start: number; carry: Carry }>();

/** What `station` is playing at Unix time `t` (seconds), or null if it has no songs. */
export function onAir(station: string, list: StationList, t: number): OnAir | null {
  if (!list.songs.length) return null;
  const sig = [...list.songs, ...list.ads].map((x) => `${x.file}:${x.dur}`).join('|');
  let c = cache.get(station);
  if (!c || c.sig !== sig || t < c.start) c = { sig, loop: 0, start: EPOCH, carry: { run: 0, lastAd: -1, tail: [] } };
  t = Math.max(t, EPOCH);
  for (;;) {
    const { slots, carry } = buildLoop(station, list, c.loop, c.carry);
    const len = span(slots);
    if (t < c.start + len) {
      cache.set(station, c);
      let into = t - c.start;
      for (const s of slots) {
        if (into < s.track.dur) return { file: s.track.file, dur: s.track.dur, offset: Math.max(0, into), endsAt: t - into + s.track.dur, ad: s.ad };
        into -= s.track.dur;
      }
      // Rounding left us a hair past the loop's end: that's the last slot's final moment.
      const last = slots[slots.length - 1];
      return { file: last.track.file, dur: last.track.dur, offset: last.track.dur, endsAt: t, ad: last.ad };
    }
    c = { sig, loop: c.loop + 1, start: c.start + len, carry };
  }
}
