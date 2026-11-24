// Phone calls (docs/STORY.md): who calls, and what they say. Pack content: the engine only knows
// the situations (a first call, a job brief by kind, the job done or blown, busy, nothing on) and
// plays whatever exchange the caller has for it. A string is the caller's line (voiced: the clip
// is src/client/voice/<line id>.ogg, made by `npx tsx scripts/voice-calls.ts`); { you } is your
// reply, shown but never voiced. Lines never mention a job's details: those are on the job panel.

/** A turn in an exchange: the caller's line, or your reply. */
export type Turn = string | { you: string };

export interface Caller {
  id: string;
  name: string;
  /** Chatterbox reference voice (T:/Dev/chatterbox/voices) and its delivery settings. */
  voice: { ref: string; ex: number; cfg: number };
}

export type CallSituation = 'intro' | 'hit' | 'torch' | 'steal' | 'courier' | 'frenzy' | 'pass' | 'fail' | 'busy' | 'nothing';

export const CALLERS: Caller[] = [
  { id: 'benny', name: 'Benny', voice: { ref: 'benny', ex: 0.6, cfg: 0.45 } },
  { id: 'nico', name: 'Nico', voice: { ref: 'nico', ex: 0.65, cfg: 0.45 } },
  { id: 'lupe', name: 'Lupe', voice: { ref: 'lupe', ex: 0.45, cfg: 0.5 } },
  { id: 'sal', name: 'Sal', voice: { ref: 'sal', ex: 0.4, cfg: 0.55 } },
  { id: 'tito', name: 'Tito', voice: { ref: 'tito', ex: 0.75, cfg: 0.35 } },
  // Reference from Kokoro's most expressive voice; enough exaggeration that "cold" doesn't go flat,
  // and a lower cfg so her sentences run on naturally.
  { id: 'vega', name: 'Ines Vega', voice: { ref: 'vega', ex: 0.65, cfg: 0.35 } },
];

/** Who picks up a gang's phone: the boss first, then whoever else takes its calls. */
export const GANG_CALLERS: Record<string, string[]> = { v22: ['nico', 'lupe'], d9: ['sal', 'tito'], oro7: ['vega'] };

/** Each caller's exchanges by situation (one is picked at random each time). */
export const CALLS: Record<string, Partial<Record<CallSituation, Turn[][]>>> = {
  benny: {
    intro: [[
      "Hey, pal! Benny Lutz. You don't know me, but I know you just got off the bus.",
      'Listen. This town has three crews, and they all hire the same way. Payphones.',
      'Green, red, gold. When one rings for you, walk right up to it. That\'s you answering.',
      { you: 'And what do you get out of this?' },
      'Me? Goodwill. And a cut of anything you steal and bring to my shop. Welcome to town, pal.',
    ]],
  },
  nico: {
    intro: [[
      'Yo. You the new guy? Benny says you can drive.',
      "I'm Nico. Varrio Twenty-Two. The Pits, Ashgrove, that's us.",
      { you: "What's the job?" },
      "Easy one. Don't make it hard.",
    ]],
    hit: [["One of theirs has been running his mouth about us. Shut it. For good. He's on your map."]],
    torch: [["Their pride and joy is parked out in the open. Light it up. I want to see the smoke from here."]],
    steal: [['There\'s a beauty sitting pretty across town. Bring her home without a scratch, yeah?']],
    courier: [["Package needs moving, fast. Don't open it. Don't stop. Don't be cute."]],
    frenzy: [["They're on our corners again. Go and remind them whose streets these are."]],
    pass: [["Ha! That's what I'm talking about. Money's in your pocket."]],
    fail: [['Seriously? I vouched for you, man.']],
    busy: [["You're busy? Fine. Call me when you're not."]],
    nothing: [["Nothing right now, man. I'll hit you up."]],
  },
  lupe: {
    hit: [["There's a man who needs to stop breathing before tonight. Nico wants it loud. I want it done."]],
    torch: [["Their car's sitting there with nobody watching it. Burn it. Not the block, just the car."]],
    steal: [["I need a car for parts, and I need it whole. Drive it like it's yours. It isn't."]],
    courier: [["Pick up a package and bring it to the drop. If it's late, it's useless. So don't be late."]],
    frenzy: [["We're done talking with them. Thin them out. Then come home."]],
    pass: [["Clean work. Nico won't say it, so I will. Thank you."]],
    fail: [["That cost us. Don't let it happen twice."]],
  },
  sal: {
    intro: [[
      "You're the one Benny's been talking up.",
      "My name is Sal. Diablos Nine. You work for me, you work hard, and you don't talk to cops.",
      { you: "I don't talk to anybody." },
      'Good. Keep it that way.',
    ]],
    hit: [["Somebody is holding court on my street. End it. He'll have friends with him."]],
    torch: [['They left something they love where I can see it. Burn it.']],
    steal: [['I need a vehicle for a job. Bring it in one piece.']],
    courier: [["A package. Pick it up, drop it off. Don't look inside."]],
    frenzy: [["They're walking around like they own the place. Drop as many as you can. Quickly."]],
    pass: [["Good. You're paid."]],
    fail: [["That's a disappointment. I don't like disappointments."]],
    busy: [["Finish what you're doing. Then we talk."]],
    nothing: [["Nothing. I'll call you."]],
  },
  tito: {
    hit: [["Okay, okay, so there's this guy, right? Big shot. Thinks he's untouchable. Go touch him!"]],
    torch: [['You like fire? Everybody likes fire. There\'s a car. Make it a bonfire, baby!']],
    steal: [["Sal wants wheels. Big ones. Don't ask me what for. I asked, and he looked at me funny."]],
    courier: [['Delivery job! You ever been a mailman? Same thing. Except the mail shoots back.']],
    frenzy: [["Turf war, baby! Count them up. I'll be counting too!"]],
    pass: [['You did it! I had money on you. Well, half on you.']],
    fail: [["Oof. The boss is gonna be mad. Not at me, though. At you."]],
  },
  vega: {
    // Calm and controlled, but there's someone in there: dry amusement, a little warmth for people
    // who are useful, and the menace underneath it. Full sentences that run on; never clipped.
    intro: [[
      "Hello. My name is Ines Vega, and I speak for Oro Seven. Benny tells me you're looking for work.",
      "We pay well, and we always pay on time. All we ask, in return, is the same courtesy from you.",
      { you: 'What do you need?' },
      "Oh, something simple, to start with. I'd like to see how you handle simple.",
    ]],
    hit: [
      ["There's a man who owes us a great deal more than money now. You'll find him on your map. Please, be thorough."],
      ["One of their lieutenants has been very careless with our name. I'd like you to correct that, permanently."],
    ],
    torch: [
      ["There's a car that I'd like to stop existing, and fire is always the quickest way. Just keep your face out of it, would you?"],
      ["A rival of ours is terribly attached to his car. I think you should help him let it go."],
    ],
    steal: [
      ["We need a very particular car brought in, and I mean clean. Not one scratch on it."],
      ["El Jefe has taken a liking to a certain car. Would you collect it for him? Gently, please."],
    ],
    courier: [
      ["There's a parcel waiting for you, and I'm afraid the clock is already running. Don't keep us waiting."],
      ["A package that should have been somewhere else ten minutes ago is still sitting there. Could you fix that for me?"],
    ],
    frenzy: [
      ["Honestly, I'd much rather we talked it out. They wouldn't. So go and make their numbers smaller."],
      ["Their people are standing on our ground as if they own it. Please, remove them."],
    ],
    pass: [["Very efficient. I like that. The money's already with you."], ["Now that was nicely done. We won't forget it."]],
    fail: [["Well. That was expensive, for you as much as for us."], ["We expected better than that. Please, don't make us start wondering about you."]],
    busy: [["Ah, you're busy. Another time, then."]],
    nothing: [["I'm sorry, there's nothing for you just now. We'll be in touch."]],
  },
};

/** The id of a caller's line: `<caller>_<situation>_<exchange>_<turn>` (its clip's file name). */
export const lineId = (caller: string, situation: CallSituation, exchange: number, turn: number): string =>
  `${caller}_${situation}_${exchange}_${turn}`;

/** The voices a player's character can have (picked in the character creator). Your side of a
 *  call is voiced in it: the replies in the exchanges above, and a line back after a brief, a job
 *  done or blown (REPLIES). */
export const PLAYER_VOICES: { id: string; name: string; who: 'man' | 'woman'; voice: Caller['voice'] }[] = [
  { id: 'steady', name: 'Steady', who: 'man', voice: { ref: 'pv_steady', ex: 0.45, cfg: 0.5 } },
  { id: 'rough', name: 'Rough', who: 'man', voice: { ref: 'pv_rough', ex: 0.5, cfg: 0.5 } },
  { id: 'london', name: 'London', who: 'man', voice: { ref: 'pv_london', ex: 0.45, cfg: 0.5 } },
  { id: 'warm', name: 'Warm', who: 'man', voice: { ref: 'pv_warm', ex: 0.5, cfg: 0.5 } },
  { id: 'bright', name: 'Bright', who: 'woman', voice: { ref: 'pv_bright', ex: 0.55, cfg: 0.5 } },
  { id: 'smoky', name: 'Smoky', who: 'woman', voice: { ref: 'pv_smoky', ex: 0.4, cfg: 0.5 } },
  { id: 'crisp', name: 'Crisp', who: 'woman', voice: { ref: 'pv_crisp', ex: 0.45, cfg: 0.5 } },
  { id: 'easy', name: 'Easy', who: 'woman', voice: { ref: 'pv_easy', ex: 0.5, cfg: 0.5 } },
];
export const DEFAULT_VOICE = 'steady';

/** A voice id from a save, or the default. */
export const cleanVoice = (v: unknown): string => (PLAYER_VOICES.some((p) => p.id === v) ? String(v) : DEFAULT_VOICE);

/** What you say back after the caller's part (one picked at random); briefs share one list. */
export const REPLIES: Record<'brief' | 'pass' | 'fail' | 'busy' | 'nothing', string[]> = {
  brief: ['On it.', 'Consider it done.', 'Leave it with me.', 'Yeah, yeah. I heard you.'],
  pass: ['Nice doing business with you.', 'Told you I was good.'],
  fail: ["Yeah. I know.", 'It went sideways. It happens.'],
  busy: ["I'll call you back."],
  nothing: ['Fine. Call me.'],
};

/** The line you say as a demo in the character creator. */
export const VOICE_SAMPLE = "Yeah, I can do that. What's it pay?";

/** Clip ids for your side: a reply in an exchange (by its line id), a REPLIES line, the sample. */
export const youLineId = (voice: string, key: string): string => `you_${voice}_${key}`;
