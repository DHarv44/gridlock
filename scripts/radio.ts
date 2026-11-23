// Headless check of the radio broadcast: track lengths are read, the schedule plays every track
// back to back with no gaps or overlaps, and two listeners at the same moment hear the same thing.
// `npx tsx scripts/radio.ts`
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { onAir, type RadioTrack } from '../src/shared/radioSchedule';
import { audioDuration } from '../src/server/audioDuration';

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const dir = 'radio/weather';
const tracks: RadioTrack[] = readdirSync(dir).sort().flatMap((file) => {
  const dur = audioDuration(readFileSync(join(dir, file)), extname(file).toLowerCase());
  return dur ? [{ file, dur }] : [];
});
console.log(tracks.map((t) => `${t.file} ${t.dur.toFixed(1)}s`).join('\n'));
check(tracks.length === readdirSync(dir).length, 'every track has a length');
check(tracks.every((t) => t.dur > 30 && t.dur < 900), 'lengths look like songs');

// Walk an hour of broadcast: each track starts as the previous one ends.
const t0 = 1_800_000_000;
let t = t0, gaps = 0, repeats = 0, plays = 0, prev = '';
while (t < t0 + 3600) {
  const a = onAir('weather', tracks, t)!;
  // Unix time is ~1.8e9 s, so float error is ~1e-6 s; a millisecond is far below audible.
  if (plays > 0 && Math.abs(a.offset) > 1e-3) gaps++; // the first sample lands mid-song
  if (a.file === prev) repeats++;
  prev = a.file; plays++;
  t = a.endsAt + 1e-4;
}
check(gaps === 0, `an hour of air: ${plays} plays, each starts where the last ended`);
check(repeats === 0, 'the same song never plays twice in a row');
const a = onAir('weather', tracks, t0 + 1234.5)!, b = onAir('weather', tracks, t0 + 1234.5)!;
check(a.file === b.file && a.offset === b.offset, 'two listeners at the same moment hear the same thing');
console.log(failures ? `${failures} check(s) failed` : 'all radio checks passed');
process.exit(failures ? 1 : 0);
