// Phone calls: the cast and every conversation, loaded from content/ (pack nouns: the engine only
// knows the situations: a first call, a job brief by kind, the job done or blown, busy, nothing on).
// Each character is a folder content/characters/<folder>/ holding <folder>.json (who they are, their
// voice and their conversations), voice/ (recordings) and model/ (reference clips for Chatterbox).
// Your side of every conversation is content/player/player.json, one line per key. See
// content/README.md for the format; content/SCRIPTS.md is the readable version
// (`npx tsx scripts/scripts-md.ts`).
import benny from '../../../content/characters/benny_lutz/benny_lutz.json';
import danny from '../../../content/characters/danny_keogh/danny_keogh.json';
import declan from '../../../content/characters/declan_rourke/declan_rourke.json';
import eleni from '../../../content/characters/eleni_kouris/eleni_kouris.json';
import price from '../../../content/characters/harlan_price/harlan_price.json';
import andreou from '../../../content/characters/kostas_andreou/kostas_andreou.json';
import lupe from '../../../content/characters/lupe_reyes/lupe_reyes.json';
import nico from '../../../content/characters/nico_reyes/nico_reyes.json';
import kowalski from '../../../content/characters/ray_kowalski/ray_kowalski.json';
import player from '../../../content/player/player.json';

/** `answer`: they pick up when you ring them; `refuse`: they pick up and won't deal with you (too
 *  many blown jobs); `nudge`: there's work if you want it (said after their job-result call, on
 *  its own when you've been idle); `tip`: after picking up, there's a payphone ringing for you;
 *  `hello`: how they open a call they make to you; `voicemail`: the message they leave when you
 *  miss it (falls back to a nudge). */
export type CallSituation = 'intro' | 'hit' | 'torch' | 'steal' | 'courier' | 'frenzy' | 'pass' | 'fail' | 'busy' | 'nothing'
  | 'answer' | 'refuse' | 'nudge' | 'tip' | 'hello' | 'voicemail';

/** A turn as written: the caller's lines (or a version for a male and a female character), or
 *  the key of your line in player.json. A line's breaks are how it's read and shown. */
interface TurnFile { say?: string[]; male?: string[]; female?: string[]; you?: string; tone?: string; clip?: string }
interface VoiceFile { model: string; exaggeration: number; cfg: number }
interface CharacterFile {
  id: string; name: string; fullName: string; role: string; about: string;
  crew?: string; boss?: boolean; welcome?: boolean; mentor?: boolean; contact?: boolean;
  voice: VoiceFile;
  calls: Partial<Record<CallSituation, TurnFile[][]>>;
}
interface PlayerFile {
  about: string; default: string;
  voices: ({ id: string; name: string; who: 'man' | 'woman'; about: string } & VoiceFile)[];
  lines: Record<string, { say: string[]; tone?: string }>;
}

/** The cast, by folder under content/characters/. */
const CAST: [string, CharacterFile][] = ([
  ['benny_lutz', benny], ['nico_reyes', nico], ['lupe_reyes', lupe], ['declan_rourke', declan], ['danny_keogh', danny],
  ['eleni_kouris', eleni], ['kostas_andreou', andreou], ['ray_kowalski', kowalski], ['harlan_price', price],
] as [string, unknown][]).map(([folder, json]) => [folder, json as CharacterFile]);
const PLAYER = player as unknown as PlayerFile;

/** A reference voice: a clip (path from the project root) and its Chatterbox settings. */
export interface Voice { model: string; ex: number; cfg: number }
const voiceOf = (dir: string, v: VoiceFile): Voice => ({ model: `${dir}/${v.model}`, ex: v.exaggeration, cfg: v.cfg });

export interface Caller {
  id: string; name: string; fullName: string; role: string; about: string;
  /** The gang they speak for, if any. */
  crew?: string;
  /** Their folder, from the project root. */
  dir: string;
  voice: Voice;
}

/** A turn, ready to play: the caller's line (with its clip id; a gendered line's clip is
 *  `<clip>_male` / `_female`), or yours (its clip is youLineId(your voice, key)). */
export type Turn =
  | { by: 'caller'; text: string | { male: string; female: string }; clip: string; tone: string }
  | { by: 'you'; key: string; text: string; tone: string };

const text = (lines: string[]) => lines.join('\n');

/** Your lines by key (player.json). */
export const PLAYER_LINES: Record<string, { text: string; tone: string }> = Object.fromEntries(
  Object.entries(PLAYER.lines).map(([k, l]) => [k, { text: text(l.say), tone: l.tone ?? '' }]));

export const CALLERS: Caller[] = CAST.map(([folder, c]) => {
  const dir = `content/characters/${folder}`;
  return { id: c.id, name: c.name, fullName: c.fullName, role: c.role, about: c.about, crew: c.crew, dir, voice: voiceOf(dir, c.voice) };
});

/** A recording's clip id from the name a character's file gives it: their id in front, so names
 *  only have to be unique per character (`do_better` → `benny_do_better`). */
export const namedClip = (caller: string, name: string): string => (name.startsWith(`${caller}_`) ? name : `${caller}_${name}`);

/** Each caller's exchanges by situation (one is picked at random each time). A caller line's clip
 *  is the turn's own `clip` name, or else `<caller>_<situation>_<exchange>_<n>`, n counting only
 *  the caller's turns. */
export const CALLS: Record<string, Partial<Record<CallSituation, Turn[][]>>> = Object.fromEntries(CAST.map(([folder, c]) => [c.id,
  Object.fromEntries(Object.entries(c.calls).map(([situation, exchanges]) => [situation, exchanges!.map((turns, x) => {
    let n = 0;
    return turns.map((t): Turn => {
      if (t.you) {
        const mine = PLAYER_LINES[t.you];
        if (!mine) throw new Error(`${folder}: ${situation} points at your line "${t.you}", which player.json doesn't have`);
        return { by: 'you', key: t.you, text: mine.text, tone: mine.tone };
      }
      const clip = t.clip ? namedClip(c.id, t.clip) : `${c.id}_${situation}_${x}_${n}`;
      n++;
      if (t.male && t.female) return { by: 'caller', text: { male: text(t.male), female: text(t.female) }, clip, tone: t.tone ?? '' };
      if (!t.say) throw new Error(`${folder}: a ${situation} turn has no "say", "male"/"female" or "you"`);
      return { by: 'caller', text: text(t.say), clip, tone: t.tone ?? '' };
    });
  })]))]));

/** Who picks up a gang's phone: the boss first, then whoever else takes its calls. */
export const GANG_CALLERS: Record<string, string[]> = {};
for (const [, c] of [...CAST].sort(([, a], [, b]) => Number(!!b.boss) - Number(!!a.boss))) {
  if (c.crew) (GANG_CALLERS[c.crew] ??= []).push(c.id);
}

/** Who rings a newcomer's cell to welcome them to town (the character marked "welcome"). */
export const WELCOME_CALLER: string | undefined = CAST.find(([, c]) => c.welcome)?.[1].id;

/** Who rings you about a job for a crew that doesn't trust you with its number yet (the
 *  character marked "mentor"), when they have something to say about it. */
export const MENTOR_CALLER: string | undefined = CAST.find(([, c]) => c.mentor)?.[1].id;

/** People (not gangs) whose number you get once you've talked to them (marked "contact"). */
export const PEOPLE_CONTACTS: string[] = CAST.filter(([, c]) => c.contact).map(([, c]) => c.id);

/** The voices a player's character can have (picked in the character creator). */
export const PLAYER_VOICES: { id: string; name: string; who: 'man' | 'woman'; about: string; voice: Voice }[] =
  PLAYER.voices.map((v) => ({ id: v.id, name: v.name, who: v.who, about: v.about, voice: voiceOf('content/player', v) }));
export const DEFAULT_VOICE = PLAYER.default;

/** Whether callers talk to you as a man or a woman: by your character's voice. */
export const genderOf = (voice: string): 'male' | 'female' =>
  PLAYER_VOICES.find((p) => p.id === voice)?.who === 'woman' ? 'female' : 'male';

/** A voice id from a save, or the default. */
export const cleanVoice = (v: unknown): string => (PLAYER_VOICES.some((p) => p.id === v) ? String(v) : DEFAULT_VOICE);

/** The line you say as a demo in the character creator. */
export const VOICE_SAMPLE = PLAYER_LINES.sample?.text ?? '';

/** The clip of one of your lines in one of the voices. */
export const youLineId = (voice: string, key: string): string => `you_${voice}_${key}`;
