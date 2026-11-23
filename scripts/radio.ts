// Headless check of the radio broadcast: track lengths are read, the schedule plays everything
// back to back with commercial breaks where they belong, and every listener hears the same thing.
// `npx tsx scripts/radio.ts`
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { onAir, type RadioTrack, type StationList } from '../src/shared/radioSchedule';
import { audioDuration } from '../src/server/audioDuration';

let failures = 0;
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

const read = (dir: string, prefix: string): RadioTrack[] => !existsSync(dir) ? [] : readdirSync(dir).sort()
  .filter((f) => statSync(join(dir, f)).isFile())
  .flatMap((f) => { const dur = audioDuration(readFileSync(join(dir, f)), extname(f).toLowerCase()); return dur ? [{ file: prefix + f, dur }] : []; });
const list: StationList = { songs: read('radio/weather', ''), ads: read('radio/weather/commercials', 'commercials/') };
console.log([...list.songs, ...list.ads].map((t) => `${t.file} ${t.dur.toFixed(1)}s`).join('\n'));
check(list.songs.length > 0 && list.songs.every((t) => t.dur > 30), 'songs have song-like lengths');
check(list.ads.length > 0 && list.ads.every((t) => t.dur > 1 && t.dur < 60), 'commercials have spot-like lengths');

// Walk two hours of air.
const t0 = Date.UTC(2026, 10, 23) / 1000;
let t = t0, gaps = 0, plays = 0, ads = 0, adRuns = 0, longestRun = 0, run = 0, repeats = 0;
let prev = '', prevAd = false;
while (t < t0 + 7200) {
  const a = onAir('weather', list, t)!;
  if (plays > 0 && Math.abs(a.offset) > 1e-3) gaps++; // the first sample lands mid-song
  if (a.file === prev) repeats++;
  if (a.ad) { ads++; if (prevAd) adRuns++; run = 0; } else { run++; longestRun = Math.max(longestRun, run); }
  prev = a.file; prevAd = a.ad; plays++;
  t = a.endsAt + 1e-4;
}
check(gaps === 0, `two hours: ${plays} plays (${ads} commercials), each starts where the last ended`);
check(ads > 0 && adRuns === 0, 'commercials play, never two in a row');
check(longestRun <= 3, `at most 3 songs between breaks (longest run ${longestRun})`);
check(repeats === 0, 'nothing plays twice in a row');
// Same moment, asked cold (forces a replay from the start date) and warm: same answer.
const warm = onAir('weather', list, t0 + 1234.5)!;
onAir('weather', list, Date.UTC(2026, 0, 2) / 1000);
const cold = onAir('weather', list, t0 + 1234.5)!;
check(warm.file === cold.file && Math.abs(warm.offset - cold.offset) < 1e-6, 'every listener hears the same thing');
console.log(failures ? `${failures} check(s) failed` : 'all radio checks passed');
process.exit(failures ? 1 : 0);
