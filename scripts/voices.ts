// Turns the recordings in content/ into the game's voice clips (src/client/voice/<clip>.ogg): the
// silence at both ends trimmed, every clip brought to the same loudness, Opus at 40 kb/s, the same
// mastering the Chatterbox pipeline uses (scripts/voice-calls.ts). A recording is named after its
// clip:
//   content/characters/<folder>/voice/**/<name>.m4a   the turn's "clip" name (do_better.m4a), or its
//                                                   numbered clip (benny_intro_0_1_male.m4a); any
//                                                   subfolders, only the file name counts
//   content/player/voice/<voice>/<key>.m4a         e.g. player/voice/steady/how_number.m4a
// (.m4a, .mp3, .wav, .ogg or .flac). Only recordings a line uses and that are newer than their clip
// are converted; the rest (spare takes) are listed and left alone. `npm run voices`
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CALLERS, CALLS, namedClip, PLAYER_LINES, PLAYER_VOICES, youLineId } from '../src/shared/packs';

const root = resolve(import.meta.dirname, '..');
const AUDIO = new Set(['.m4a', '.mp3', '.wav', '.ogg', '.flac']);
const MASTER = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,'
  + 'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,'
  + 'loudnorm=I=-18:TP=-2:LRA=11';

const dirs = (d: string) => (existsSync(d) ? readdirSync(d).filter((f) => statSync(join(d, f)).isDirectory()) : []);
const audio = (d: string) => (existsSync(d) ? readdirSync(d).filter((f) => AUDIO.has(extname(f).toLowerCase())) : []);
/** Audio files in a folder and its subfolders (folders are only for keeping things tidy: a
 *  recording is matched by its file name). */
const audioDeep = (d: string): string[] => [...audio(d).map((f) => join(d, f)), ...dirs(d).flatMap((s) => audioDeep(join(d, s)))];

/** Every clip a line plays. */
function wanted(): Set<string> {
  const clips = new Set<string>();
  for (const situations of Object.values(CALLS)) {
    for (const t of Object.values(situations).flatMap((x) => x!.flat())) {
      if (t.by !== 'caller') continue;
      if (typeof t.text === 'string') clips.add(t.clip); else { clips.add(`${t.clip}_male`); clips.add(`${t.clip}_female`); }
    }
  }
  for (const v of PLAYER_VOICES) for (const key of Object.keys(PLAYER_LINES)) clips.add(youLineId(v.id, key));
  return clips;
}

/** Every recording in content/ a line uses, and the clip it becomes (`spare`: recordings no line uses). */
export function recordings(spare: string[] = []): { src: string; clip: string }[] {
  const use = wanted();
  const out: { src: string; clip: string }[] = [];
  const add = (src: string, clip: string) => {
    if (!use.has(clip)) { spare.push(src.slice(root.length + 1)); return; }
    // The same clip in two formats (a .wav left next to its .m4a): the .wav gives way.
    const had = out.findIndex((r) => r.clip === clip);
    if (had < 0) out.push({ src, clip });
    else if (extname(out[had].src).toLowerCase() === '.wav') out[had] = { src, clip };
  };
  for (const c of CALLERS) for (const f of audioDeep(join(root, c.dir, 'voice'))) add(f, namedClip(c.id, basename(f, extname(f))));
  const mine = join(root, 'content/player/voice');
  for (const v of dirs(mine)) for (const f of audio(join(mine, v))) add(join(mine, v, f), youLineId(v, basename(f, extname(f))));
  return out;
}

function main(): void {
  const outDir = join(root, 'src/client/voice');
  let made = 0;
  const spare: string[] = [];
  const recs = recordings(spare);
  if (spare.length) console.log(`not used by any line (left alone):\n  ${spare.join('\n  ')}`);
  for (const r of recs) {
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
