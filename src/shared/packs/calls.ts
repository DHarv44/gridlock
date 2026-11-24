// Phone calls (docs/STORY.md): who calls, and what they say. Pack content: the engine only knows
// the situations (a first call, a job brief by kind, the job done or blown, busy, nothing on) and
// plays whatever exchange the caller has for it. Each exchange is a real conversation: a string is
// the caller's turn, { you } is yours, one turn per bubble (300 characters at most, never split).
// All of it is voiced: the clip is src/client/voice/<line id>.ogg (yours in your character's
// voice), made by `npx tsx scripts/voice-calls.ts`. Lines never mention a job's details (those are
// on the job panel), never explain the game, and never assume whether you're a man or a woman.
// Every crew talks like who they are (docs/STORY.md "The cast"). An introduction ends on you,
// because the job's brief follows it in the same call.

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
  { id: 'declan', name: 'Declan', voice: { ref: 'declan', ex: 0.4, cfg: 0.55 } },
  { id: 'danny', name: 'Danny', voice: { ref: 'danny', ex: 0.75, cfg: 0.35 } },
  // Enough exaggeration that "cold" doesn't go flat, and a lower cfg so her sentences run on.
  { id: 'eleni', name: 'Eleni', voice: { ref: 'eleni', ex: 0.65, cfg: 0.35 } },
];

/** Who picks up a gang's phone: the boss first, then whoever else takes its calls. */
export const GANG_CALLERS: Record<string, string[]> = { v22: ['nico', 'lupe'], d9: ['declan', 'danny'], oro7: ['eleni'] };

/** Each caller's exchanges by situation (one is picked at random each time). */
export const CALLS: Record<string, Partial<Record<CallSituation, Turn[][]>>> = {
  benny: {
    intro: [[
      "Hey, there you are! Benny Lutz. You don't know me, but word travels fast around here, and the word is you're new, you're broke, and you can drive. That about right, pal?",
      { you: "How'd you get this number?" },
      "Pal, I got everybody's number. Listen, nobody in this town is gonna call your cell until they trust you. Till then, you hear a payphone ringing out on the street, don't walk past it. Might be for you.",
      { you: "And what's in it for you?" },
      "Me? I'm a people person. Also, anything nice you happen to drive off with, you bring it by my shop, and we both do alright. Welcome to Bayhaven, pal.",
    ]],
  },

  // Varrio 22: a Chicano street crew. Nico talks fast and loud and switches into Spanish when he's
  // excited; "homie" for you, never "ese" or "vato" (you might be a woman).
  nico: {
    intro: [[
      "Qué onda. So you're the one Benny keeps talking about. I'm Nico, Varrio Twenty-Two. The Pits, Ashgrove, San Isidro, all of that is puro Varrio, homie, and everybody out there knows it.",
      { you: 'Good for you. Benny said you had work.' },
      "Órale, straight to business. I like that. Simón, I got a jale for you, and if you don't mess it up, there's a lot more where that came from.",
      { you: "Then let's hear it." },
    ]],
    hit: [[
      "Okay, check it. There's this vato from the other side who's been running his mouth all week, saying we went soft, saying my sister's the one really running things. Out loud, on the street, in front of everybody. I want that mouth shut, homie. For good.",
      { you: 'Is she?' },
      "Is she what? Chale, just go handle it. And don't say nothing to Lupe about this, me entiendes?",
    ]],
    torch: [[
      "You know what those fools love more than their own mothers? Their ranfla. They wax it every Sunday and park it right out in the open, like they're daring somebody. So I'm daring somebody.",
      { you: 'You want it gone, or you want it burning?' },
      "Burning, homie! I want to see the smoke from my window, and I want them crying about it all week. Ándale.",
    ]],
    steal: [[
      "Ay, there's a car out there I been dreaming about. Like, actual dreams, homie. Some fool's driving it around like it's nothing, and that's a crime, la neta. Go get her, and bring her back without one single scratch.",
      { you: 'And if she comes back with a scratch?' },
      "Then you and me gonna have a real long talk, and you not gonna like it. Go.",
    ]],
    courier: [[
      "Got a package that needs to be somewhere else, like, yesterday. Don't open it, don't stop for nothing, and watch out for la jura. Pick it up, drop it off, that's it.",
      { you: "What's in it?" },
      "See, that's you asking questions already. Just drive, homie.",
    ]],
    frenzy: [[
      "They're on our corners again, homie. Our corners! Posted up in the varrio like they pay rent there. I'm done being nice about it.",
      { you: 'You were being nice?' },
      "Ha! Okay, okay, you got me. But now I'm really not. Go remind them whose streets these are. Puro Varrio!",
    ]],
    pass: [[
      "Órale! That's what I'm talking about! The whole varrio's talking about you right now, homie. That feria's yours. You earned every cent.",
      { you: 'Told you I could drive.' },
    ]],
    fail: [[
      "Are you serious right now? I stood up in front of everybody and said you were solid. You know how that makes me look, homie?",
      { you: "It went sideways. The next one won't." },
      'Yeah. It better not.',
    ]],
    busy: [[
      "Qué onda? You're on something already? Fine. Finish it and hit me back. I'm not gonna wait forever.",
      { you: 'Give me five minutes.' },
    ]],
    nothing: [[
      "Nah, it's dead right now. Everybody's laying low with la jura all over the place. I'll hit you up when something pops off.",
      { you: "Don't take too long." },
    ]],
  },
  // Lupe: the mechanic and the brains. Measured, dry, a little Spanish when it slips out.
  lupe: {
    hit: [[
      "It's Lupe. Nico wants somebody gone, and for once I actually agree with my brother. I'd do it quick and quiet, but he wants it loud, so mira, do whatever gets it done.",
      { you: 'You two ever agree on anything?' },
      "Twice. This, and that you're worth the money. Don't make me regret the second one.",
    ]],
    torch: [[
      "It's Lupe. There's a car I need you to set on fire. Just the car, por favor. The last time somebody did this for us, they took half the block with it, and I had to explain that to my abuela.",
      { you: 'Just the car. Got it.' },
    ]],
    steal: [[
      "It's Lupe. I need a car for parts, and parts are worth nothing to me if they show up bent. So drive it like it's yours. Gently. Because it's not.",
      { you: 'I always drive gently.' },
      "Ay, I've seen you drive. Just bring it back in one piece.",
    ]],
    courier: [[
      "It's Lupe. There's a package going to a drop, and it's only worth something if it gets there on time. If it's late, it's basura, and so is the money.",
      { you: "Then I'd better not be late." },
      "Eso. That's the idea.",
    ]],
    frenzy: [[
      "It's Lupe. We tried talking to them. Twice. They laughed in our faces, so now we're done talking. Thin them out, and then come home in one piece, okay?",
      { you: "Didn't know you cared." },
      'I care about my investments. Ándale, go.',
    ]],
    pass: [[
      "Clean work. Nico won't say it to your face, so I'll say it for him. Gracias. Really.",
      { you: 'Tell him he can say it himself next time.' },
      "He'd rather die. Cuídate.",
    ]],
    fail: [[
      "That cost us money, and it cost us respect, and I'm the one who has to fix both. Don't let it happen twice.",
      { you: "It won't." },
      'Bueno.',
    ]],
  },

  // Local 9: Irish-American union muscle out of the foundries and the haulage yards. Declan is the
  // old-school boss: few words, never raises his voice, "the Local", "the brothers", "kid".
  declan: {
    intro: [[
      "So you're the one Benny keeps going on about. My name's Declan Rourke. I run Local Nine. I don't usually call people I haven't met.",
      { you: 'So why call me?' },
      "Because I need somebody nobody knows yet. You work for the Local, you work hard, you keep your mouth shut, and you never, ever talk to cops. We understand each other?",
      { you: "I don't talk to anybody." },
      'Good. Keep it that way, kid. Now listen.',
      { you: "I'm listening." },
    ]],
    hit: [[
      "There's a fella holding court on my street. Shaking hands. Making promises he can't keep. He won't be alone, so don't expect him to be.",
      { you: 'And when I find him?' },
      "You end it. That's all.",
    ]],
    torch: [[
      'They left something they care about parked where I can see it. That was careless. Burn it.',
      { you: 'Anything you want me to tell them?' },
      'The fire tells them.',
    ]],
    steal: [[
      'I need a rig for a job. I need it in one piece, and I need it today.',
      { you: "What's the job?" },
      "That's not your end. Your end is the truck.",
    ]],
    courier: [[
      "A package. You pick it up, you drop it off, you don't look inside. Simple work. Most people still find a way to get it wrong.",
      { you: "I'm not most people." },
      "We'll see.",
    ]],
    frenzy: [[
      "They're walking around my neighbourhood like they own it. I've been patient. I'm finished being patient. Drop as many of them as you can, and do it quick.",
      { you: 'How many is enough?' },
      "I'll tell you when.",
    ]],
    pass: [[
      'Good. You got paid. And you did that well. The brothers noticed.',
      { you: 'Call me when you need me again.' },
    ]],
    fail: [[
      "That was a disappointment. I don't like disappointments. I'm told I don't handle them well.",
      { you: "It won't happen again." },
      "No. It won't.",
    ]],
    busy: [[
      "You're working. Good. Finish it. Then we talk.",
      { you: "Won't be long." },
    ]],
    nothing: [[
      "Nothing today, kid. I'll call you.",
      { you: "I'll be around." },
    ]],
  },
  // Danny Keogh, Declan's number two: a Southie motor-mouth who laughs at his own jokes. He's the leak.
  danny: {
    hit: [[
      "Hey, hey, it's Danny! Okay, so there's this guy, right? Big shot. Thinks he's untouchable, walks around like his feet don't even touch the ground. You know what I'm gonna say?",
      { you: 'Go touch him?' },
      "Go touch him! Ha! See, you get it! Declan never laughs at that one. Not once. Wicked tough crowd, that guy.",
    ]],
    torch: [[
      "Danny again! You like fire? Everybody likes fire. There's a car out there just sitting all by itself, all lonely. Make it a bonfire, kid!",
      { you: "You're way too happy about this." },
      "Hey, it's the little things, you know? Bring marshmallows!",
    ]],
    steal: [[
      "Okay, so, Declan wants a truck. A big one. Don't ask me what for. I asked him what for, and he just looked at me, like, for a really long time. I don't ask anymore.",
      { you: 'Maybe stop asking Declan things.' },
      "That's what my ma says! Go get the truck.",
    ]],
    courier: [[
      "Delivery job! You ever been a mailman? It's like that. Except the mail shoots back. And the dogs have guns. Okay, it's mostly the guns part.",
      { you: 'Great sales pitch, Danny.' },
      "I'm wasted here, honestly. Go, go, go!",
    ]],
    frenzy: [[
      "Turf war, kid! Declan says thin them out, so thin them out! I'm keeping count, by the way. Not for any reason. I just like counting.",
      { you: 'Who are you telling your count to, Danny?' },
      'What? Nobody! Who would I tell? Go!',
    ]],
    pass: [[
      "You did it! I knew it! I had money on you! Well, half. Half my money. Okay, it was twenty bucks, but still!",
      { you: 'Thanks for the vote of confidence.' },
    ]],
    fail: [[
      "Oof. Oof. Declan's gonna be wicked mad. Not at me, though! At you! Which, honestly, better you than me.",
      { you: 'Thanks, Danny.' },
      'Anytime!',
    ]],
  },

  // Argo 7: a Greek-American shipping family that smuggles through its own docks. Eleni Kouris is
  // the old man's niece and his voice: polished, polite full sentences, family first, menace
  // underneath. Never clipped.
  eleni: {
    intro: [[
      "Hello. My name is Eleni Kouris, and I speak for Argo Seven, and for my uncle, Mr. Andreou. Benny tells me you're new in town, and looking for work. Benny is usually right about these things.",
      { you: 'Usually?' },
      "Mm. Usually. We're a family business. We pay well, and we always pay on time. All we ask in return is the same courtesy from you. Do you think you can manage that?",
      { you: 'I can manage.' },
      "Good. Then let's start with something simple. I'd like to see how you handle simple.",
      { you: 'Go ahead.' },
    ]],
    hit: [[
      "There's a man who owes my family a great deal more than money now. I gave him every chance, I really did. I'd like you to make sure he doesn't need any more of them.",
      { you: 'You sound almost sorry about it.' },
      "I'm always a little sorry. It never seems to stop me. Please, be thorough.",
    ]],
    torch: [[
      "A rival of ours is terribly attached to his car. It isn't healthy. I think you should help him let it go, and fire is always the quickest way.",
      { you: 'Anything else I should know?' },
      'Only that I like you better anonymous, so keep your face out of it, would you?',
    ]],
    steal: [[
      "My uncle has taken a liking to a certain car. He's an old man, and he doesn't ask for much, so when he does, we see that he gets it. Would you collect it for him? Gently, please.",
      { you: 'How gently?' },
      "Like it belonged to my yiayia. You never met her. Be grateful, and drive very gently.",
    ]],
    courier: [[
      "There's a parcel waiting for you, and I'm afraid the clock is already running. It should have been moved an hour ago, by someone who no longer works for us.",
      { you: 'What happened to them?' },
      "They were late. Don't keep us waiting.",
    ]],
    frenzy: [[
      "Honestly, I'd much rather we talked it out. I offered. They laughed. So now their people are standing on our ground as if they own it, and I'd like you to make their numbers smaller.",
      { you: 'And if they want to talk now?' },
      'Then they should have said so earlier. Please, remove them.',
    ]],
    pass: [[
      "Very efficient. I like that. The money's already with you, and my uncle asked me your name, which, I should tell you, he almost never does.",
      { you: 'What did you tell him?' },
      "That you're worth remembering.",
    ]],
    fail: [[
      'Well. That was expensive, for you as much as for us. We expected better than that.',
      { you: "It won't happen again." },
      "I believe you. Please don't make me start wondering why.",
    ]],
    busy: [[
      "Ah, you're busy. Another time, then. Do finish what you're doing.",
      { you: "I'll call you back." },
    ]],
    nothing: [[
      "I'm sorry, there's nothing for you just now. The ships come in when they come in. We'll be in touch.",
      { you: "I'll be waiting." },
    ]],
  },
};

/** The id of a caller's line: `<caller>_<situation>_<exchange>_<turn>` (its clip's file name). */
export const lineId = (caller: string, situation: CallSituation, exchange: number, turn: number): string =>
  `${caller}_${situation}_${exchange}_${turn}`;

/** The voices a player's character can have (picked in the character creator). Your side of a
 *  call (the { you } turns above) is voiced in it. */
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

/** The line you say as a demo in the character creator. */
export const VOICE_SAMPLE = "Yeah, I can do that. What's it pay?";

/** Clip ids for your side: a turn in an exchange (by its line id), or the sample. */
export const youLineId = (voice: string, key: string): string => `you_${voice}_${key}`;
