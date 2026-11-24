// Turns the recordings in content/ into the game's voice clips (src/client/voice/<clip>.ogg): the
// silence at both ends trimmed, every clip brought to the same loudness, Opus at 40 kb/s, the same
// mastering the Chatterbox pipeline uses (scripts/voice-calls.ts). A recording is named after its
// clip:
//   content/characters/<folder>/voice/<clip>.m4a   e.g. benny_intro_0_1_male.m4a
//   content/player/voice/<voice>/<key>.m4a         e.g. player/voice/steady/how_number.m4a
// (.m4a, .mp3, .wav, .ogg or .flac). Only recordings newer than their clip are converted.
// `npm run voices`
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const AUDIO = new Set(['.m4a', '.mp3', '.wav', '.ogg', '.flac']);
const MASTER = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,'
  + 'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,'
  + 'loudnorm=I=-18:TP=-2:LRA=11';

const dirs = (d: string) => (existsSync(d) ? readdirSync(d).filter((f) => statSync(join(d, f)).isDirectory()) : []);
const audio = (d: string) => (existsSync(d) ? readdirSync(d).filter((f) => AUDIO.has(extname(f).toLowerCase())) : []);

/** Every recording in content/ and the clip it becomes. */
export function recordings(): { src: string; clip: string }[] {
  const out: { src: string; clip: string }[] = [];
  const chars = join(root, 'content/characters');
  for (const c of dirs(chars)) for (const f of audio(join(chars, c, 'voice'))) out.push({ src: join(chars, c, 'voice', f), clip: basename(f, extname(f)) });
  const mine = join(root, 'content/player/voice');
  for (const v of dirs(mine)) for (const f of audio(join(mine, v))) out.push({ src: join(mine, v, f), clip: `you_${v}_${basename(f, extname(f))}` });
  return out;
}

function main(): void {
  const outDir = join(root, 'src/client/voice');
  let made = 0;
  for (const r of recordings()) {
    const dst = join(outDir, `${r.clip}.ogg`);
    if (existsSync(dst) && statSync(dst).mtimeMs >= statSync(r.src).mtimeMs && !process.argv.includes('--all')) continue;
    const res = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', r.src, '-af', MASTER, '-ac', '1',
      '-c:a', 'libopus', '-b:a', '40k', '-ar', '48000', dst], { stdio: 'inherit' });
    if (res.status !== 0) { console.error(`failed: ${r.src}`); process.exitCode = 1; continue; }
    console.log(`${r.clip}.ogg`);
    made++;
  }
  console.log(`${made} clip(s) made from recordings`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
