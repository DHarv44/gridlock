# GRIDLOCK voice scripts

*Generated from the JSON in content/ by `npm run scripts`. Edit the JSON, not this file.*

Every turn is in its own box, ready to paste into Chatterbox. Above it: who says it, the clip it becomes
(name your recording after it), and the tone. "✓ recorded" means a recording for it is in content/.

Recordings go in `content/characters/<folder>/voice/<clip>.m4a`, or `content/player/voice/<voice>/<key>.m4a`
for your lines; `npm run voices` puts them in the game.

---

## Benny Lutz: Fence at the Ironworks chop shop
Folder `content/characters/benny_lutz` · reference `model/benny_lutz_2.wav` · Exaggeration **0.6** · CFG/Pace **0.45**

Fast, friendly, a salesman who's always half-pitching. Plain American.

### First call
**Benny** `benny_intro_0_0` ✓ recorded — *big warm hello, grinning; rattling off what he knows*
```
Hey, there you are!
Benny Lutz here.

You don't know me, but word travels fast around here you know
And the word is you're new, you're broke, and you can drive.

Sound about right?
```
**You** `how_number` — *wary, a little thrown*
```
How'd you get this number?
```
**Benny** `benny_intro_0_1_male` ✓ recorded (male character) — *breezy brush-off, then leaning in with a tip*
```
Buddy,
I got everybody's number.
Listen, ain't nobody in this town gonna call your cell until they trust you.
Till then, you hear a payphone ringing out on the street, don't walk past it.
Might be for you.
```
**Benny** `benny_intro_0_1_female` ✓ recorded (female character) — *breezy brush-off, then leaning in with a tip*
```
Lady,
I got everybody's number.
Listen, ain't nobody in this town gonna call your cell until they trust you.
Till then, you hear a payphone ringing out on the street, don't walk past it.
Might be for you.
```
**You** `whats_in_it` — *dry, half-smiling*
```
And what's in it for you?
```
**Benny** `benny_intro_0_2` ✓ recorded — *mock-innocent, then cheerfully honest; signs off warm*
```
For me???

I'm a people person.

And hey,
anything nice you happen to drive off with,
you bring it to me...

Stop by my shop, and we both do alright.

See you around
```

### Job blown (1)
**Benny** `benny_do_better` ✓ recorded — *rueful chuckle; shrugging it off, then a friendly nudge*
```
Well, that didn't go as planned, did it?

No biggie.

Boss man won't be too happy, ehhh...

But what ya gonna do?

Just make sure you do better on the next one.
```

### Job blown (2)
**Benny** `benny_shit_together` ✓ recorded — *blunt, then easy-going; a real warning at the end*
```
Look, you really fucked that one up.

But hey, no problem...
Shit happens.

But if you want more work, you better get your shit together.
```

### Job blown (3)
**Benny** `benny_shit_show` ✓ recorded — *exasperated, then grudging; leaning hard on the last word*
```
After that little shit show you just put on, I don't know why the boss keeps you around.

Must be something about you that I ain't seein'...

But I guess that's why he's the boss, huh?

Look, no more fuck-ups.

Alright????
```

---

## Nico Reyes: Runs Varrio 22
Folder `content/characters/nico_reyes` · reference `model/nico.wav` · Exaggeration **0.65** · CFG/Pace **0.45**

Young, cocky, quick. Chicano street talk; the Spanish comes out faster the more excited he gets. Calls you "homie", never "ese" or "vato".

| Word | Means |
|---|---|
| qué onda | what's up |
| puro Varrio | all Varrio, nothing but |
| órale | alright, right on |
| simón | yeah |
| jale | a job, work |
| vato | guy |
| chale | nah, come on |
| me entiendes? | you understand me? |
| ranfla | a car, a ride |
| ándale | go on, hurry up |
| ay | oh, ugh |
| la neta | for real, the truth |
| la jura | the cops |
| feria | money |

### First call
**Nico** `nico_intro_0_0` — *laid-back greeting, then chest out*
```
Qué onda.
So you're the one Benny keeps talking about.
I'm Nico, Varrio Twenty-Two.
The Pits, Ashgrove, San Isidro, all of that is puro Varrio, homie, and everybody out there knows it.
```
**You** `good_for_you` — *unimpressed, flat*
```
Good for you.
Benny said you had work.
```
**Nico** `nico_intro_0_1` — *amused; promise and warning in one breath*
```
Órale, straight to business.
I like that.
Simón, I got a jale for you, and if you don't mess it up, there's a lot more where that came from.
```
**You** `lets_hear_it` — *cool, ready*
```
Then let's hear it.
```

### Hit
**Nico** `nico_hit_0_0` — *wound up and personal; "For good." hard and flat*
```
Okay, check it.
There's this vato from the other side who's been running his mouth all week, saying we went soft, saying my sister's the one really running things.
Out loud, on the street, in front of everybody.
I want that mouth shut, homie.
For good.
```
**You** `is_she` — *deadpan, poking him*
```
Is she?
```
**Nico** `nico_hit_0_1` — *caught out, flustered, hurrying you off*
```
Is she what?
Chale, just go handle it.
And don't say nothing to Lupe about this, me entiendes?
```

### Torch
**Nico** `nico_torch_0_0` — *mischievous, building a story*
```
You know what those fools love more than their own mothers?
Their ranfla.
They wax it every Sunday and park it right out in the open, like they're daring somebody.
So I'm daring somebody.
```
**You** `gone_or_burning` — *businesslike*
```
You want it gone, or you want it burning?
```
**Nico** `nico_torch_0_1` — *gleeful, almost giggling*
```
Burning, homie!
I want to see the smoke from my window, and I want them crying about it all week.
Ándale.
```

### Steal
**Nico** `nico_steal_0_0` — *dreamy car guy; firm on "one single scratch"*
```
Ay, there's a car out there I been dreaming about.
Like, actual dreams, homie.
Some fool's driving it around like it's nothing, and that's a crime, la neta.
Go get her, and bring her back without one single scratch.
```
**You** `if_scratched` — *teasing*
```
And if she comes back with a scratch?
```
**Nico** `nico_steal_0_1` — *mock-menacing, half joking*
```
Then you and me gonna have a real long talk, and you not gonna like it.
Go.
```

### Courier
**Nico** `nico_courier_0_0` — *rapid-fire, impatient*
```
Got a package that needs to be somewhere else, like, yesterday.
Don't open it, don't stop for nothing, and watch out for la jura.
Pick it up, drop it off, that's it.
```
**You** `whats_in_package` — *curious, innocent*
```
What's in it?
```
**Nico** `nico_courier_0_1` — *exasperated, a little amused*
```
See, that's you asking questions already.
Just drive, homie.
```

### Turf war
**Nico** `nico_frenzy_0_0` — *indignant, fired up*
```
They're on our corners again, homie.
Our corners!
Posted up in the varrio like they pay rent there.
I'm done being nice about it.
```
**You** `being_nice` — *dry, sceptical*
```
You were being nice?
```
**Nico** `nico_frenzy_0_1` — *laughs at himself, then rallies*
```
Ha!
Okay, okay, you got me.
But now I'm really not.
Go remind them whose streets these are.
Puro Varrio!
```

### Job done
**Nico** `nico_pass_0_0` — *delighted, buzzing*
```
Órale!
That's what I'm talking about!
The whole varrio's talking about you right now, homie.
That feria's yours.
You earned every cent.
```
**You** `told_you_drive` — *a little smug*
```
Told you I could drive.
```

### Job blown
**Nico** `nico_fail_0_0` — *disbelief turning to hurt*
```
Are you serious right now?
I stood up in front of everybody and said you were solid.
You know how that makes me look, homie?
```
**You** `went_sideways` — *flat, owning it*
```
It went sideways.
The next one won't.
```
**Nico** `nico_fail_0_1` — *sulky, cooling off*
```
Yeah.
It better not.
```

### Busy (already on a job)
**Nico** `nico_busy_0_0` — *put out, impatient*
```
Qué onda?
You're on something already?
Fine.
Finish it and hit me back.
I'm not gonna wait forever.
```
**You** `five_minutes` — *distracted, hurried*
```
Give me five minutes.
```

### Nothing on
**Nico** `nico_nothing_0_0` — *easy, relaxed*
```
Nah, it's dead right now.
Everybody's laying low with la jura all over the place.
I'll hit you up when something pops off.
```
**You** `dont_take_long` — *casual*
```
Don't take too long.
```

---

## Lupe Reyes: Varrio 22, Nico's sister, the mechanic
Folder `content/characters/lupe_reyes` · reference `model/lupe.wav` · Exaggeration **0.45** · CFG/Pace **0.5**

Dry, careful, the brains. Level voice, humour so dry it barely shows; a little Spanish slips out. Cleans up her brother's messes.

| Word | Means |
|---|---|
| mira | look |
| por favor | please |
| abuela | grandma |
| ay | oh, ugh |
| basura | garbage |
| eso | that's it, exactly |
| ándale | go on, hurry up |
| gracias | thanks |
| cuídate | take care |
| bueno | good, fine |

### Hit
**Lupe** `lupe_hit_0_0` — *cool, practical; exasperated at her brother*
```
It's Lupe.
Nico wants somebody gone, and for once I actually agree with my brother.
I'd do it quick and quiet, but he wants it loud, so mira, do whatever gets it done.
```
**You** `ever_agree` — *amused*
```
You two ever agree on anything?
```
**Lupe** `lupe_hit_0_1` — *deadpan joke, then a quiet warning*
```
Twice.
This, and that you're worth the money.
Don't make me regret the second one.
```

### Torch
**Lupe** `lupe_torch_0_0` — *matter-of-fact, then weary at the memory*
```
It's Lupe.
There's a car I need you to set on fire.
Just the car, por favor.
The last time somebody did this for us, they took half the block with it, and I had to explain that to my abuela.
```
**You** `just_the_car` — *trying not to laugh*
```
Just the car.
Got it.
```

### Steal
**Lupe** `lupe_steal_0_0` — *businesslike; last line bone dry*
```
It's Lupe.
I need a car for parts, and parts are worth nothing to me if they show up bent.
So drive it like it's yours.
Gently.
Because it's not.
```
**You** `drive_gently` — *innocent, not convincing*
```
I always drive gently.
```
**Lupe** `lupe_steal_0_1` — *long-suffering, a hint of a smile*
```
Ay, I've seen you drive.
Just bring it back in one piece.
```

### Courier
**Lupe** `lupe_courier_0_0` — *patient, schoolteacher-firm*
```
It's Lupe.
There's a package going to a drop, and it's only worth something if it gets there on time.
If it's late, it's basura, and so is the money.
```
**You** `not_be_late` — *easy*
```
Then I'd better not be late.
```
**Lupe** `lupe_courier_0_1` — *dry approval*
```
Eso.
That's the idea.
```

### Turf war
**Lupe** `lupe_frenzy_0_0` — *tired, decided; the end almost caring*
```
It's Lupe.
We tried talking to them.
Twice.
They laughed in our faces, so now we're done talking.
Thin them out, and then come home in one piece, okay?
```
**You** `didnt_know_cared` — *teasing, warm*
```
Didn't know you cared.
```
**Lupe** `lupe_frenzy_0_1` — *covering it, too quickly*
```
I care about my investments.
Ándale, go.
```

### Job done
**Lupe** `lupe_pass_0_0` — *understated, genuine warmth at the end*
```
Clean work.
Nico won't say it to your face, so I'll say it for him.
Gracias.
Really.
```
**You** `say_it_himself` — *grinning*
```
Tell him he can say it himself next time.
```
**Lupe** `lupe_pass_0_1` — *dry little laugh, then soft*
```
He'd rather die.
Cuídate.
```

### Job blown
**Lupe** `lupe_fail_0_0` — *cold, controlled disappointment*
```
That cost us money, and it cost us respect, and I'm the one who has to fix both.
Don't let it happen twice.
```
**You** `it_wont` — *quiet, chastened*
```
It won't.
```
**Lupe** `lupe_fail_0_1` — *clipped, hanging up*
```
Bueno.
```

---

## Declan Rourke: Runs Local 9
Folder `content/characters/declan_rourke` · reference `model/declan.wav` · Exaggeration **0.4** · CFG/Pace **0.55**

Old-school Irish-American union boss. Deep, slow, few words; never raises his voice, threatens by understating. A Boston-Irish edge, not a brogue.

### First call
**Declan** `declan_intro_0_0` — *flat, weighing you up*
```
So you're the one Benny keeps going on about.
My name's Declan Rourke.
I run Local Nine.
I don't usually call people I haven't met.
```
**You** `why_call_me` — *guarded*
```
So why call me?
```
**Declan** `declan_intro_0_1` — *slow, laying down the law; heaviest on "never, ever"*
```
Because I need somebody nobody knows yet.
You work for the Local, you work hard, you keep your mouth shut, and you never, ever talk to cops.
We understand each other?
```
**You** `dont_talk` — *steady, meeting his stare*
```
I don't talk to anybody.
```
**Declan** `declan_intro_0_2` — *faint approval, then business*
```
Good.
Keep it that way, kid.
Now listen.
```
**You** `listening` — *calm*
```
I'm listening.
```

### Hit
**Declan** `declan_hit_0_0` — *contained contempt, each sentence its own beat*
```
There's a fella holding court on my street.
Shaking hands.
Making promises he can't keep.
He won't be alone, so don't expect him to be.
```
**You** `when_i_find_him` — *quiet*
```
And when I find him?
```
**Declan** `declan_hit_0_1` — *very calm, final*
```
You end it.
That's all.
```

### Torch
**Declan** `declan_torch_0_0` — *cold, almost amused*
```
They left something they care about parked where I can see it.
That was careless.
Burn it.
```
**You** `tell_them` — *serious*
```
Anything you want me to tell them?
```
**Declan** `declan_torch_0_1` — *low, flat*
```
The fire tells them.
```

### Steal
**Declan** `declan_steal_0_0` — *plain, no colour*
```
I need a rig for a job.
I need it in one piece, and I need it today.
```
**You** `whats_the_job` — *curious*
```
What's the job?
```
**Declan** `declan_steal_0_1` — *patient, a closed door*
```
That's not your end.
Your end is the truck.
```

### Courier
**Declan** `declan_courier_0_0` — *bored; weary about people*
```
A package.
You pick it up, you drop it off, you don't look inside.
Simple work.
Most people still find a way to get it wrong.
```
**You** `not_most_people` — *confident*
```
I'm not most people.
```
**Declan** `declan_courier_0_1` — *unconvinced*
```
We'll see.
```

### Turf war
**Declan** `declan_frenzy_0_0` — *slow-burning anger kept down*
```
They're walking around my neighbourhood like they own it.
I've been patient.
I'm finished being patient.
Drop as many of them as you can, and do it quick.
```
**You** `how_many` — *matter-of-fact*
```
How many is enough?
```
**Declan** `declan_frenzy_0_1` — *cold*
```
I'll tell you when.
```

### Job done
**Declan** `declan_pass_0_0` — *brief, then rare quiet praise*
```
Good.
You got paid.
And you did that well.
The brothers noticed.
```
**You** `call_me_again` — *even, professional*
```
Call me when you need me again.
```

### Job blown
**Declan** `declan_fail_0_0` — *very quiet; the menace is the calm*
```
That was a disappointment.
I don't like disappointments.
I'm told I don't handle them well.
```
**You** `wont_happen_again` — *earnest, a little nervous*
```
It won't happen again.
```
**Declan** `declan_fail_0_1` — *flat, double meaning*
```
No.
It won't.
```

### Busy (already on a job)
**Declan** `declan_busy_0_0` — *patient, unhurried*
```
You're working.
Good.
Finish it.
Then we talk.
```
**You** `wont_be_long` — *brisk*
```
Won't be long.
```

### Nothing on
**Declan** `declan_nothing_0_0` — *curt*
```
Nothing today, kid.
I'll call you.
```
**You** `be_around` — *easy*
```
I'll be around.
```

---

## Danny Keogh: Local 9, Declan's number two
Folder `content/characters/danny_keogh` · reference `model/danny.wav` · Exaggeration **0.75** · CFG/Pace **0.35**

A South Boston motor-mouth: wired, talks too fast and too much, laughs at his own jokes. Nervous energy underneath (he's the leak).

### Hit
**Danny** `danny_hit_0_0` — *excited, words tumbling; setting up a joke*
```
Hey, hey, it's Danny!
Okay, so there's this guy, right?
Big shot.
Thinks he's untouchable, walks around like his feet don't even touch the ground.
You know what I'm gonna say?
```
**You** `go_touch_him` — *deadpan, beating him to it*
```
Go touch him?
```
**Danny** `danny_hit_0_1` — *thrilled, then a little sorry for himself*
```
Go touch him!
Ha!
See, you get it!
Declan never laughs at that one.
Not once.
Wicked tough crowd, that guy.
```

### Torch
**Danny** `danny_torch_0_0` — *giddy, rising to a whoop*
```
Danny again!
You like fire?
Everybody likes fire.
There's a car out there just sitting all by itself, all lonely.
Make it a bonfire, kid!
```
**You** `too_happy` — *amused*
```
You're way too happy about this.
```
**Danny** `danny_torch_0_1` — *cheerful, shrugging*
```
Hey, it's the little things, you know?
Bring marshmallows!
```

### Steal
**Danny** `danny_steal_0_0` — *gossipy; a nervous laugh at the end*
```
Okay, so, Declan wants a truck.
A big one.
Don't ask me what for.
I asked him what for, and he just looked at me, like, for a really long time.
I don't ask anymore.
```
**You** `stop_asking` — *dry*
```
Maybe stop asking Declan things.
```
**Danny** `danny_steal_0_1` — *delighted*
```
That's what my ma says!
Go get the truck.
```

### Courier
**Danny** `danny_courier_0_0` — *a joke that gets away from him*
```
Delivery job!
You ever been a mailman?
It's like that.
Except the mail shoots back.
And the dogs have guns.
Okay, it's mostly the guns part.
```
**You** `sales_pitch` — *sarcastic*
```
Great sales pitch, Danny.
```
**Danny** `danny_courier_0_1` — *mock-wounded, then hyper*
```
I'm wasted here, honestly.
Go, go, go!
```

### Turf war
**Danny** `danny_frenzy_0_0` — *hyped, then too quick on "not for any reason"*
```
Turf war, kid!
Declan says thin them out, so thin them out!
I'm keeping count, by the way.
Not for any reason.
I just like counting.
```
**You** `telling_count` — *suspicious, quiet*
```
Who are you telling your count to, Danny?
```
**Danny** `danny_frenzy_0_1` — *panicky, laughing it off*
```
What?
Nobody!
Who would I tell?
Go!
```

### Job done
**Danny** `danny_pass_0_0` — *thrilled, then sheepish*
```
You did it!
I knew it!
I had money on you!
Well, half.
Half my money.
Okay, it was twenty bucks, but still!
```
**You** `vote_confidence` — *dry*
```
Thanks for the vote of confidence.
```

### Job blown
**Danny** `danny_fail_0_0` — *wincing, then relieved*
```
Oof.
Oof.
Declan's gonna be wicked mad.
Not at me, though!
At you!
Which, honestly, better you than me.
```
**You** `thanks_danny` — *flat sarcasm*
```
Thanks, Danny.
```
**Danny** `danny_fail_0_1` — *missing the sarcasm completely*
```
Anytime!
```

---

## Eleni Kouris: Argo 7, the old man's niece and his voice
Folder `content/characters/eleni_kouris` · reference `model/eleni.wav` · Exaggeration **0.65** · CFG/Pace **0.35**

Polished and controlled, never raises her voice; dry amusement and a little warmth for the useful, menace underneath. Polite full sentences that flow. Family first.

| Word | Means |
|---|---|
| yiayia | grandmother |

### First call
**Eleni** `eleni_intro_0_0` — *gracious, poised, a smile in the voice*
```
Hello.
My name is Eleni Kouris, and I speak for Argo Seven, and for my uncle, Mr. Andreou.
Benny tells me you're new in town, and looking for work.
Benny is usually right about these things.
```
**You** `usually` — *picking up on it*
```
Usually?
```
**Eleni** `eleni_intro_0_1` — *amused, then warm with a soft edge*
```
Mm.
Usually.
We're a family business.
We pay well, and we always pay on time.
All we ask in return is the same courtesy from you.
Do you think you can manage that?
```
**You** `can_manage` — *calm, sure*
```
I can manage.
```
**Eleni** `eleni_intro_0_2` — *lightly teasing*
```
Good.
Then let's start with something simple.
I'd like to see how you handle simple.
```
**You** `go_ahead` — *attentive*
```
Go ahead.
```

### Hit
**Eleni** `eleni_hit_0_0` — *regretful, almost tender; chilling at the end*
```
There's a man who owes my family a great deal more than money now.
I gave him every chance, I really did.
I'd like you to make sure he doesn't need any more of them.
```
**You** `almost_sorry` — *quiet, curious*
```
You sound almost sorry about it.
```
**Eleni** `eleni_hit_0_1` — *wry, then soft and cold*
```
I'm always a little sorry.
It never seems to stop me.
Please, be thorough.
```

### Torch
**Eleni** `eleni_torch_0_0` — *dry, mock-sympathetic*
```
A rival of ours is terribly attached to his car.
It isn't healthy.
I think you should help him let it go, and fire is always the quickest way.
```
**You** `anything_else` — *professional*
```
Anything else I should know?
```
**Eleni** `eleni_torch_0_1` — *light, a warning inside*
```
Only that I like you better anonymous, so keep your face out of it, would you?
```

### Steal
**Eleni** `eleni_steal_0_0` — *fond of the old man; polite with weight behind it*
```
My uncle has taken a liking to a certain car.
He's an old man, and he doesn't ask for much, so when he does, we see that he gets it.
Would you collect it for him?
Gently, please.
```
**You** `how_gently` — *half joking*
```
How gently?
```
**Eleni** `eleni_steal_0_1` — *deadpan, a fond shiver*
```
Like it belonged to my yiayia.
You never met her.
Be grateful, and drive very gently.
```

### Courier
**Eleni** `eleni_courier_0_0` — *apologetic-polite, cold at the end*
```
There's a parcel waiting for you, and I'm afraid the clock is already running.
It should have been moved an hour ago, by someone who no longer works for us.
```
**You** `what_happened` — *uneasy*
```
What happened to them?
```
**Eleni** `eleni_courier_0_1` — *pleasant, which is what makes it frightening*
```
They were late.
Don't keep us waiting.
```

### Turf war
**Eleni** `eleni_frenzy_0_0` — *a sigh, reasonable; offence growing*
```
Honestly, I'd much rather we talked it out.
I offered.
They laughed.
So now their people are standing on our ground as if they own it, and I'd like you to make their numbers smaller.
```
**You** `want_to_talk` — *testing her*
```
And if they want to talk now?
```
**Eleni** `eleni_frenzy_0_1` — *very polite, very cold*
```
Then they should have said so earlier.
Please, remove them.
```

### Job done
**Eleni** `eleni_pass_0_0` — *pleased, impressed despite herself*
```
Very efficient.
I like that.
The money's already with you, and my uncle asked me your name, which, I should tell you, he almost never does.
```
**You** `what_told_him` — *curious, a little flattered*
```
What did you tell him?
```
**Eleni** `eleni_pass_0_1` — *soft, sincere*
```
That you're worth remembering.
```

### Job blown
**Eleni** `eleni_fail_0_0` — *a pause on "Well."; quietly threatening*
```
Well.
That was expensive, for you as much as for us.
We expected better than that.
```
**You** `wont_happen_again` — *earnest, a little nervous*
```
It won't happen again.
```
**Eleni** `eleni_fail_0_1` — *kind, then soft and dangerous*
```
I believe you.
Please don't make me start wondering why.
```

### Busy (already on a job)
**Eleni** `eleni_busy_0_0` — *light, gracious*
```
Ah, you're busy.
Another time, then.
Do finish what you're doing.
```
**You** `call_back` — *hurried*
```
I'll call you back.
```

### Nothing on
**Eleni** `eleni_nothing_0_0` — *polite, a hint of foreboding*
```
I'm sorry, there's nothing for you just now.
The ships come in when they come in.
We'll be in touch.
```
**You** `be_waiting` — *easy*
```
I'll be waiting.
```

---

## Kostas Andreou: Argo 7, the old man
Folder `content/characters/kostas_andreou` · reference `model/andreou.wav` · Exaggeration **0.5** · CFG/Pace **0.5**

Old, unhurried, courteous; grandfatherly warmth, absolute authority. Greek comes out when he's moved. Calls only when it matters. No lines yet (story jobs).

*No lines yet.*

---

## Det. Ray Kowalski: Bayhaven PD, on Price's payroll
Folder `content/characters/ray_kowalski` · reference `model/kowalski.wav` · Exaggeration **0.5** · CFG/Pace **0.5**

Tired, sarcastic, matter-of-fact about the things he does. No lines yet (story jobs).

*No lines yet.*

---

## Harlan Price: The developer
Folder `content/characters/harlan_price` · reference `model/price.wav` · Exaggeration **0.5** · CFG/Pace **0.5**

Smooth, warm, British, charming; never says what he means. No lines yet (story jobs).

*No lines yet.*

---

## You: the player

Every line here is said in the voice picked for your character. The clip is `you_<voice>_<key>`.

| Voice | Reference | Exaggeration | CFG/Pace | Character |
|---|---|---|---|---|
| Steady (man) | `pv_steady.wav` | 0.45 | 0.5 | even, grounded, unflappable |
| Rough (man) | `pv_rough.wav` | 0.5 | 0.5 | gravelly, street-hard |
| London (man) | `pv_london.wav` | 0.45 | 0.5 | British, dry, laconic |
| Warm (man) | `pv_warm.wav` | 0.5 | 0.5 | easy-going, friendly |
| Bright (woman) | `pv_bright.wav` | 0.55 | 0.5 | upbeat, quick, confident |
| Smoky (woman) | `pv_smoky.wav` | 0.4 | 0.5 | low, husky, unhurried |
| Crisp (woman) | `pv_crisp.wav` | 0.45 | 0.5 | British, clipped, sharp |
| Easy (woman) | `pv_easy.wav` | 0.5 | 0.5 | relaxed, casual |

**`sample`** — *casual confidence, straight to the money (the character creator's demo)*
```
Yeah, I can do that.
What's it pay?
```
**`how_number`** — *wary, a little thrown*
```
How'd you get this number?
```
**`whats_in_it`** — *dry, half-smiling*
```
And what's in it for you?
```
**`good_for_you`** — *unimpressed, flat*
```
Good for you.
Benny said you had work.
```
**`lets_hear_it`** — *cool, ready*
```
Then let's hear it.
```
**`is_she`** — *deadpan, poking him*
```
Is she?
```
**`gone_or_burning`** — *businesslike*
```
You want it gone, or you want it burning?
```
**`if_scratched`** — *teasing*
```
And if she comes back with a scratch?
```
**`whats_in_package`** — *curious, innocent*
```
What's in it?
```
**`being_nice`** — *dry, sceptical*
```
You were being nice?
```
**`told_you_drive`** — *a little smug*
```
Told you I could drive.
```
**`went_sideways`** — *flat, owning it*
```
It went sideways.
The next one won't.
```
**`five_minutes`** — *distracted, hurried*
```
Give me five minutes.
```
**`dont_take_long`** — *casual*
```
Don't take too long.
```
**`ever_agree`** — *amused*
```
You two ever agree on anything?
```
**`just_the_car`** — *trying not to laugh*
```
Just the car.
Got it.
```
**`drive_gently`** — *innocent, not convincing*
```
I always drive gently.
```
**`not_be_late`** — *easy*
```
Then I'd better not be late.
```
**`didnt_know_cared`** — *teasing, warm*
```
Didn't know you cared.
```
**`say_it_himself`** — *grinning*
```
Tell him he can say it himself next time.
```
**`it_wont`** — *quiet, chastened*
```
It won't.
```
**`why_call_me`** — *guarded*
```
So why call me?
```
**`dont_talk`** — *steady, meeting his stare*
```
I don't talk to anybody.
```
**`listening`** — *calm*
```
I'm listening.
```
**`when_i_find_him`** — *quiet*
```
And when I find him?
```
**`tell_them`** — *serious*
```
Anything you want me to tell them?
```
**`whats_the_job`** — *curious*
```
What's the job?
```
**`not_most_people`** — *confident*
```
I'm not most people.
```
**`how_many`** — *matter-of-fact*
```
How many is enough?
```
**`call_me_again`** — *even, professional*
```
Call me when you need me again.
```
**`wont_happen_again`** — *earnest, a little nervous*
```
It won't happen again.
```
**`wont_be_long`** — *brisk*
```
Won't be long.
```
**`be_around`** — *easy*
```
I'll be around.
```
**`go_touch_him`** — *deadpan, beating him to it*
```
Go touch him?
```
**`too_happy`** — *amused*
```
You're way too happy about this.
```
**`stop_asking`** — *dry*
```
Maybe stop asking Declan things.
```
**`sales_pitch`** — *sarcastic*
```
Great sales pitch, Danny.
```
**`telling_count`** — *suspicious, quiet*
```
Who are you telling your count to, Danny?
```
**`vote_confidence`** — *dry*
```
Thanks for the vote of confidence.
```
**`thanks_danny`** — *flat sarcasm*
```
Thanks, Danny.
```
**`usually`** — *picking up on it*
```
Usually?
```
**`can_manage`** — *calm, sure*
```
I can manage.
```
**`go_ahead`** — *attentive*
```
Go ahead.
```
**`almost_sorry`** — *quiet, curious*
```
You sound almost sorry about it.
```
**`anything_else`** — *professional*
```
Anything else I should know?
```
**`how_gently`** — *half joking*
```
How gently?
```
**`what_happened`** — *uneasy*
```
What happened to them?
```
**`want_to_talk`** — *testing her*
```
And if they want to talk now?
```
**`what_told_him`** — *curious, a little flattered*
```
What did you tell him?
```
**`call_back`** — *hurried*
```
I'll call you back.
```
**`be_waiting`** — *easy*
```
I'll be waiting.
```
