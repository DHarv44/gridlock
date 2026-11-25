// Writes content/SCRIPTS.md, the readable version of every conversation, from the JSON in
// content/: each turn in its own box ready to paste into Chatterbox, with who says it, the clip
// it becomes, the tone, and each speaker's reference clip and settings. Don't edit SCRIPTS.md:
// edit the JSON and run this again. `npm run scripts`
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CALLERS, CALLS, type CallSituation, PLAYER_LINES, PLAYER_SAYS, PLAYER_VOICES, type PlayerSituation, youLineId } from '../src/shared/packs';
import { recordings } from './voices';

const root = resolve(import.meta.dirname, '..');
const SITUATIONS: [CallSituation, string][] = [
  ['intro', 'First call'], ['hit', 'Hit'], ['torch', 'Torch'], ['steal', 'Steal'], ['courier', 'Courier'],
  ['frenzy', 'Turf war'], ['pass', 'Job done'], ['fail', 'Job blown'], ['busy', 'Busy (already on a job)'], ['nothing', 'Nothing on'],
  ['hello', 'Opening a call to you'], ['answer', 'Picking up when you ring'], ['refuse', 'Picking up, won\'t deal with you'],
  ['tip', 'Sending you to a payphone'], ['nudge', 'There\'s another job'], ['voicemail', 'Voicemail'],
];
const SAYS: [PlayerSituation, string][] = [
  ['pickup', 'Answering your cell'], ['payphone', 'Picking up a ringing payphone'], ['ask', 'Ringing someone for work'], ['on_it', 'Sent to a payphone'],
];
const recorded = new Set(recordings().map((r) => r.clip));
const box = (text: string) => ['```', text, '```'].join('\n');
const done = (clip: string) => (recorded.has(clip) ? ' ✓ recorded' : '');
const file = (c: { dir: string }) => JSON.parse(readFileSync(join(root, c.dir, `${c.dir.split('/').pop()}.json`), 'utf8')) as { glossary?: Record<string, string> };

const out: string[] = [
  '# GRIDLOCK voice scripts',
  '',
  '*Generated from the JSON in content/ by `npm run scripts`. Edit the JSON, not this file.*',
  '',
  'Every turn is in its own box, ready to paste into Chatterbox. Above it: who says it, the clip it becomes',
  '(name your recording after it), and the tone. "✓ recorded" means a recording for it is in content/.',
  '',
  'Recordings go in `content/characters/<folder>/voice/<clip>.m4a`, or `content/player/voice/<voice>/<key>.m4a`',
  'for your lines; `npm run voices` puts them in the game.',
  '',
];

for (const c of CALLERS) {
  const calls = CALLS[c.id] ?? {};
  out.push('---', '', `## ${c.fullName}: ${c.role}`, `Folder \`${c.dir}\` · reference \`${c.voice.model.split('/').slice(-2).join('/')}\` · Exaggeration **${c.voice.ex}** · CFG/Pace **${c.voice.cfg}**`, '', c.about, '');
  const glossary = file(c).glossary;
  if (glossary) {
    out.push('| Word | Means |', '|---|---|', ...Object.entries(glossary).map(([w, m]) => `| ${w} | ${m} |`), '');
  }
  for (const [s, title] of SITUATIONS) {
    const exchanges = calls[s];
    if (!exchanges?.length) continue;
    exchanges.forEach((turns, x) => {
      out.push(`### ${title}${exchanges.length > 1 ? ` (${x + 1})` : ''}`);
      for (const t of turns) {
        if (t.by === 'you') { out.push(`**You** \`${t.key}\` — *${t.tone}*`, box(t.text)); continue; }
        if (typeof t.text === 'string') out.push(`**${c.name}** \`${t.clip}\`${done(t.clip)} — *${t.tone}*`, box(t.text));
        else {
          out.push(`**${c.name}** \`${t.clip}_male\`${done(`${t.clip}_male`)} (male character) — *${t.tone}*`, box(t.text.male));
          out.push(`**${c.name}** \`${t.clip}_female\`${done(`${t.clip}_female`)} (female character) — *${t.tone}*`, box(t.text.female));
        }
      }
      out.push('');
    });
  }
  if (!Object.keys(calls).length) out.push('*No lines yet.*', '');
}

out.push('---', '', '## You: the player', '', 'Every line here is said in the voice picked for your character. The clip is `you_<voice>_<key>`.', '',
  '| Voice | Reference | Exaggeration | CFG/Pace | Character |', '|---|---|---|---|---|',
  ...PLAYER_VOICES.map((v) => `| ${v.name} (${v.who}) | \`${v.voice.model.split('/').pop()}\` | ${v.voice.ex} | ${v.voice.cfg} | ${v.about} |`), '');
const mine = (key: string) => {
  const l = PLAYER_LINES[key];
  const have = PLAYER_VOICES.filter((v) => recorded.has(youLineId(v.id, key))).map((v) => v.name);
  out.push(`**\`${key}\`**${have.length ? ` ✓ recorded: ${have.join(', ')}` : ''} — *${l.tone}*`, box(l.text));
};
const opening = new Set(Object.values(PLAYER_SAYS).flat());
out.push('### On your own (one picked at random each time)', '');
for (const [s, title] of SAYS) { out.push(`#### ${title}`); for (const key of PLAYER_SAYS[s]) mine(key); out.push(''); }
out.push('### In conversations', '');
for (const key of Object.keys(PLAYER_LINES)) if (!opening.has(key)) mine(key);
out.push('');

const dst = join(root, 'content/SCRIPTS.md');
writeFileSync(dst, out.join('\n'));
console.log(`wrote ${dst} (${readdirSync(join(root, 'content/characters')).length} characters)`);
