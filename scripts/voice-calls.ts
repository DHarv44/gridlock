// Writes the voice job for every voiced call line in packs/calls.ts and starts it (workbench voice
// tools, T:/Dev/workbench/voice): Chatterbox renders three takes a line in the caller's reference
// voice, faster-whisper listens back, and the best take of each is mastered to
// src/client/voice/<line id>.ogg. Takes are kept in art/out/voice/work (gitignored), so re-running
// after editing a line only renders what changed. `npx tsx scripts/voice-calls.ts [--wait]`
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CALLERS, CALLS, type CallSituation, lineId, PLAYER_VOICES, REPLIES, VOICE_SAMPLE, youLineId } from '../src/shared/packs';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'src/client/voice');
const work = join(root, 'art/out/voice/work');
const jobPath = join(root, 'art/out/voice/calls.job.json');
mkdirSync(work, { recursive: true });

const lines: { id: string; text: string; ref: string; ex: number; cfg: number; takes: number }[] = [];
for (const [who, situations] of Object.entries(CALLS)) {
  const caller = CALLERS.find((c) => c.id === who);
  if (!caller) throw new Error(`calls for unknown caller ${who}`);
  for (const [situation, exchanges] of Object.entries(situations) as [CallSituation, (string | { you: string })[][]][]) {
    exchanges.forEach((turns, x) => turns.forEach((t, k) => {
      if (typeof t !== 'string') return;
      lines.push({ id: lineId(who, situation, x, k), text: t, ref: caller.voice.ref, ex: caller.voice.ex, cfg: caller.voice.cfg, takes: 3 });
    }));
  }
}
// Your side, in every voice a character can have: the replies in the exchanges, the lines back
// (REPLIES) and the creator's sample.
for (const pv of PLAYER_VOICES) {
  const say = (key: string, text: string) => lines.push({ id: youLineId(pv.id, key), text, ref: pv.voice.ref, ex: pv.voice.ex, cfg: pv.voice.cfg, takes: 3 });
  for (const [who, situations] of Object.entries(CALLS)) {
    for (const [situation, exchanges] of Object.entries(situations) as [CallSituation, (string | { you: string })[][]][]) {
      exchanges.forEach((turns, x) => turns.forEach((t, k) => { if (typeof t !== 'string') say(lineId(who, situation, x, k), t.you); }));
    }
  }
  for (const [key, list] of Object.entries(REPLIES)) list.forEach((text, i) => say(`reply_${key}_${i}`, text));
  say('sample', VOICE_SAMPLE);
}

// A line whose words changed since its takes were made gets fresh takes.
const heardPath = join(work, 'heard.json');
if (existsSync(heardPath)) {
  const heard = JSON.parse(readFileSync(heardPath, 'utf8')) as Record<string, { script: string }>;
  for (const l of lines) {
    for (let k = 0; k < l.takes; k++) {
      const h = heard[`${l.id}_t${k}`];
      if (h && h.script !== l.text) rmSync(join(work, 'takes', `${l.id}_t${k}.wav`), { force: true });
    }
  }
}

writeFileSync(jobPath, JSON.stringify({ out_dir: out.replaceAll('\\', '/'), work: work.replaceAll('\\', '/'), format: 'ogg', max_wer: 0.12, lines }, null, 1));
console.log(`${lines.length} lines -> ${jobPath}`);
const py = 'C:/Python38/python.exe', job = 'T:/Dev/workbench/voice/job.py';
if (process.argv.includes('--wait')) {
  const r = spawnSync(py, [job, jobPath], { stdio: 'inherit' });
  console.log(readFileSync(join(work, 'status.json'), 'utf8'));
  process.exit(r.status ?? 1);
} else {
  spawn(py, [job, jobPath], { detached: true, stdio: 'ignore' }).unref();
  console.log(`started; status in ${join(work, 'status.json')}`);
}
