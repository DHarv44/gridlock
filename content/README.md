# content/

Everything the game says and plays that isn't code: the nouns. The engine reads it; nothing in
`src/` names a character, a station or a line.

```
content/
  radio/<station id>/          songs, commercials/ and tracks.json (titles), per station in src/universes/bayhaven/radio.ts
  characters/<folder>/
    <folder>.json              who they are, their voice, every conversation they're in
    voice/<clip>.m4a           your recordings of their lines (npm run voices)
    model/                     reference clips for Chatterbox
  player/
    player.json                the player's two voices (male, female), every line the player says
                               by key, and "says": the lines the player opens or closes a call
                               with (pickup, payphone, ask, on_it), one picked at random
    voice/<voice>/**/<key>.m4a recordings of the player's lines: voice/male/, voice/female/
                               (any subfolders, only the file name counts)
    model/                     the player voices' reference clips
  voice-models/                spare reference clips not given to anyone yet
  SCRIPTS.md                   every conversation, readable (generated: npm run scripts)
```

## A character's file

```json
{
  "id": "benny",                 short id (clip names start with it; saves remember who you've met by it)
  "name": "Benny",               what the speech bubble and the phone show
  "fullName": "Benny Lutz",
  "role": "Fence at the Ironworks chop shop",
  "crew": "v22",                 the gang they speak for (leave out if none)
  "boss": true,                  the gang's boss makes its first call
  "welcome": true,               rings a newcomer's cell (one character)
  "mentor": true,                rings about a job's result for a crew that doesn't have your
                                 number yet, when they have lines for it (one character)
  "about": "How they talk",
  "voice": { "model": "model/benny.wav", "exaggeration": 0.6, "cfg": 0.45 },
                                 (leave out: not voiced yet, the bubbles stay up to be read)
  "glossary": { "órale": "alright" },   foreign words in their lines, for whoever records them
  "calls": {
    "intro": [ [ turn, turn, ... ] ],    situations: intro, hit, torch, steal, courier, frenzy,
    "hit":   [ [ ... ], [ ... ] ]        pass, fail, busy, nothing; several exchanges = one at random
  }
}
```

People you walk up to and talk to are cast members too: a ped archetype's `talker` names whose
lines they speak (a universe's `peds`). Face to face they use `greet` (walking up to them),
`rumour` (sometimes after a greeting), `scared` (you're wanted or aiming at them); a gang's people
also brief its jobs by kind and say `busy`, `nothing` or `refuse`. Redrock's are under
`content/redrock/characters/`.

A turn is one of:
- `{ "say": ["line", "line", "", "line"], "tone": "...", "clip": "do_better" }`: the caller speaks.
  `clip` (optional) names the recording: `voice/do_better.m4a`. Each string is a line;
  `""` is a blank line. The breaks are how it's read and how the bubble shows it.
- `{ "male": [...], "female": [...], "tone": "..." }`: a version for each, picked by the player
  character's voice.
- `{ "you": "key" }`: the player answers with that line from player.json.

A caller turn's clip is its `clip` name, or else `<id>_<situation>_<exchange>_<n>`, counting only
the caller's turns from 0 (`benny_intro_0_1`); a male/female turn adds `_male` / `_female`.
Recordings no line uses (spare takes) are left alone. The player's clips are
`you_<voice>_<key>`. Name recordings after their clip; `npm run voices` masters them into the game.
Lines nobody has recorded can be filled in with Chatterbox: `npx tsx scripts/voice-calls.ts`
(never while the Chatterbox page is open).

A new character needs its folder and one import line (plus its entry in `cast`) in
`src/universes/bayhaven/index.ts`. This folder is Bayhaven's content (`contentDir: 'content'`); another
universe keeps the same layout under its own `contentDir`.
