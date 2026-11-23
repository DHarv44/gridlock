// Headless check of the radio broadcast: track lengths are read, the schedule plays everything
// back to back with commercial breaks where they belong, and every listener hears the same thing.
// `npx tsx scripts/radio.ts`
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { MAX_RUN, MIN_RUN, onAir, type RadioTrack, type StationList } from '../src/shared/radioSchedule';
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
let t = t0, gaps = 0, plays = 0, ads = 0, adRuns = 0, run = 0, repeats = 0;
let prev = '', prevAd = false, seenAd = false;
const runs: number[] = [];
while (t < t0 + 7200) {
  const a = onAir('weather', list, t)!;
  if (plays > 0 && Math.abs(a.offset) > 1e-3) gaps++; // the first sample lands mid-song
  if (a.file === prev) repeats++;
  if (a.ad) {
    ads++;
    if (prevAd) adRuns++;
    if (seenAd) runs.push(run); // the stretch before the first spot started before we tuned in
    seenAd = true;
    run = 0;
  } else run++;
  prev = a.file; prevAd = a.ad; plays++;
  t = a.endsAt + 1e-4;
}
check(gaps === 0, `two hours: ${plays} plays (${ads} commercials), each starts where the last ended`);
check(ads > 0 && adRuns === 0, 'one commercial per break, never two in a row');
check(runs.length > 0 && runs.every((n) => n >= MIN_RUN && n <= MAX_RUN), `${MIN_RUN} to ${MAX_RUN} songs between commercials (seen: ${[...new Set(runs)].sort().join(', ')})`);
check(repeats === 0, 'nothing plays twice in a row');
// Every station, a day of air: a song only comes back after half the station's others have played.
for (const id of readdirSync('radio').filter((d) => statSync(join('radio', d)).isDirectory())) {
  const st: StationList = { songs: read(join('radio', id), ''), ads: read(join('radio', id, 'commercials'), 'commercials/') };
  if (st.songs.length < 2) continue;
  const need = Math.ceil((st.songs.length - 1) / 2);
  const last = new Map<string, number>();
  let n = 0, closest = Infinity;
  for (let s = t0; s < t0 + 86400;) {
    const a = onAir(id, st, s)!;
    if (!a.ad) {
      const seen = last.get(a.file);
      if (seen !== undefined) closest = Math.min(closest, n - seen - 1);
      last.set(a.file, n++);
    }
    s = a.endsAt + 1e-4;
  }
  check(closest >= need, `${id}: ${st.songs.length} songs, a day of air, at least ${need} others between repeats (closest: ${closest})`);
}
// Same moment, asked cold (forces a replay from the start date) and warm: same answer.
const warm = onAir('weather', list, t0 + 1234.5)!;
onAir('weather', list, Date.UTC(2026, 0, 2) / 1000);
const cold = onAir('weather', list, t0 + 1234.5)!;
check(warm.file === cold.file && Math.abs(warm.offset - cold.offset) < 1e-6, 'every listener hears the same thing');
console.log(failures ? `${failures} check(s) failed` : 'all radio checks passed');
process.exit(failures ? 1 : 0);
