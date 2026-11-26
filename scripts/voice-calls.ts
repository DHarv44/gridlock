// Fills in the voiced lines nobody has recorded yet with Chatterbox (workbench voice tools,
// T:/Dev/workbench/voice): three takes a line in the speaker's reference clip (their model/ folder),
// faster-whisper listens back, and the best take of each is mastered to src/client/voice/<clip>.ogg.
// A line with a recording in content/ (see scripts/voices.ts) is skipped: recordings win. Takes are
// kept in art/out/voice/work (gitignored), so re-running after editing a line only renders what
// changed. Never run it while the Chatterbox page is open (the GPU can't hold both).
// `npx tsx scripts/voice-calls.ts [--wait]`
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CALLERS, CALLS, PLAYER_LINES, PLAYER_VOICES, type Voice, youLineId } from '../src/shared/packs';
import { recordings } from './voices';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'src/client/voice');
const work = join(root, 'art/out/voice/work');
const jobPath = join(root, 'art/out/voice/calls.job.json');
mkdirSync(work, { recursive: true });

const recorded = new Set(recordings().map((r) => r.clip));
const lines: { id: string; text: string; ref: string; ex: number; cfg: number; takes: number }[] = [];
const add = (id: string, text: string, v: Voice, takes: number) => {
  if (!recorded.has(id)) lines.push({ id, text, ref: join(root, v.model).replaceAll('\\', '/'), ex: v.ex, cfg: v.cfg, takes });
};

for (const [who, situations] of Object.entries(CALLS)) {
  const caller = CALLERS.find((c) => c.id === who)!;
  if (!caller.voice) continue;
  for (const exchanges of Object.values(situations)) {
    for (const t of exchanges!.flat()) {
      if (t.by !== 'caller') continue;
      if (typeof t.text === 'string') add(t.clip, t.text, caller.voice, 3);
      else { add(`${t.clip}_male`, t.text.male, caller.voice, 3); add(`${t.clip}_female`, t.text.female, caller.voice, 3); }
    }
  }
}
// Your lines, in every voice a character can have. They're short and plain: two takes each.
for (const pv of PLAYER_VOICES) for (const [key, l] of Object.entries(PLAYER_LINES)) add(youLineId(pv.id, key), l.text, pv.voice, 2);

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
console.log(`${lines.length} lines to render (${recorded.size} recorded) -> ${jobPath}`);
if (process.argv.includes('--dry')) process.exit(0);
const py = 'C:/Python38/python.exe', job = 'T:/Dev/workbench/voice/job.py';
if (process.argv.includes('--wait')) {
  const r = spawnSync(py, [job, jobPath], { stdio: 'inherit' });
  console.log(readFileSync(join(work, 'status.json'), 'utf8'));
  process.exit(r.status ?? 1);
} else {
  spawn(py, [job, jobPath], { detached: true, stdio: 'ignore' }).unref();
  console.log(`started; status in ${join(work, 'status.json')}`);
}
