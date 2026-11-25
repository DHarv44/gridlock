// Transcribes recordings with faster-whisper (T:/Dev/whisper, base.en on the CPU), so a new clip's
// words don't have to be typed: `npm run hear -- <file or folder> ...` prints each file's length
// and what it says. Folders are searched for audio (.m4a .mp3 .wav .ogg .flac).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const PY = 'T:/Dev/whisper/.venv/Scripts/python.exe';
const AUDIO = new Set(['.m4a', '.mp3', '.wav', '.ogg', '.flac']);
const files = (p: string): string[] => statSync(p).isDirectory()
  ? readdirSync(p).sort().flatMap((f) => files(join(p, f)))
  : AUDIO.has(extname(p).toLowerCase()) ? [p] : [];

const inputs = process.argv.slice(2).map((a) => resolve(a)).filter(existsSync).flatMap(files);
if (!inputs.length) { console.log('usage: npm run hear -- <file or folder> ...'); process.exit(1); }

const tmp = mkdtempSync(join(tmpdir(), 'hear-'));
const wavs = inputs.map((f, i) => {
  const out = join(tmp, `${i}.wav`);
  spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', f, '-ac', '1', '-ar', '16000', out]);
  return out;
});
const py = join(tmp, 'hear.py');
writeFileSync(py, `import sys, wave, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel('base.en', device='cpu', compute_type='int8')
for f in sys.argv[1:]:
    w = wave.open(f); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    segs, info = m.transcribe(a, beam_size=5)
    print('%.1f\\t%s' % (info.duration, ' '.join(s.text.strip() for s in segs)), flush=True)
`);
const r = spawnSync(PY, ['-I', py, ...wavs], { encoding: 'utf8' });
const lines = r.stdout.trim().split('\n');
inputs.forEach((f, i) => {
  const [dur, text] = (lines[i] ?? '?\t(no result)').split('\t');
  console.log(`${f.replace(/\\/g, '/').split('/voice/').pop()}  (${dur} s)\n  ${text}`);
});
if (r.status !== 0) console.error(r.stderr);
rmSync(tmp, { recursive: true, force: true });
