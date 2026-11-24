# Story: Bayhaven

The bigger story behind the jobs (milestone H in docs/PLAN.md). Written so every call, text and
scripted job can come from it. The engine never names these people: they're pack content
(content/characters/ holds the cast, their conversations, recordings and reference clips;
content/README.md has the format and content/SCRIPTS.md every line, readable).

## The city and the squeeze
Bayhaven is a port town that's been running down for twenty years. Three crews split what's left:

Each crew is a different community and talks like it.

- **Varrio 22** (green, skull): a Chicano street crew. The Pits and Ashgrove, the two projects, and
  San Isidro, the barrio. Car people: boosting, street racing, chop work. Young, loud,
  loyal to each other and nobody else. Their English switches into Spanish (órale, simón, la neta,
  la jura, ranfla, jale, feria, homie).
- **Local 9** (red, cargo hook): Irish-American union muscle, a haulage and teamsters' local gone
  crooked. Foundry Lane and Tannery Flats, the industrial east: haulage, protection, anything heavy.
  They hate cops more than they hate each other. Working-class Boston Irish talk (the Local, the
  brothers, kid, fella, wicked).
- **Argo 7** (gold, dollar): a Greek-American shipping family. Saltmarsh Docks and Delancey behind it.
  The money: smuggling through their own docks, laundering through the family's businesses. Quiet,
  organised, patient, family first.

The squeeze: **Harlan Price**, a developer with a clean face and a lot of borrowed money, wants the
whole waterfront for a marina project. He can't buy out three crews, so he's going to make them
destroy each other, with a dirty cop to sweep up what's left. You walk into the middle of it.

## The cast
Each person has one voice (a Chatterbox reference made with voice_ref) and a way of talking. Lines
are written to be read aloud: plain words, the person's rhythm in the punctuation, no stage directions.

| Who | Side | Voice (reference) | How they talk |
|---|---|---|---|
| **Benny Lutz** | fence at the Ironworks chop shop | `benny` (am_puck) | Fast, friendly, a salesman; calls everyone "pal". The first friendly voice. |
| **Nico Reyes** | Varrio 22, runs the crew | `nico` (am_liam) | Young, cocky, quick, Chicano street talk that slides into Spanish when he's excited. Big plans, short fuse, funny when he's winning. |
| **Lupe Reyes** | Varrio 22, Nico's sister, the mechanic | `lupe` (ef_dora) | Dry, careful, the brains; a little Spanish slips out. Cleans up Nico's messes. |
| **Declan Rourke** | Local 9, the boss | `declan` (am_onyx, -2 st) | Old-school Irish-American union boss. Deep, slow, few words. Threatens by understating. |
| **Danny Keogh** | Local 9, Declan's number two | `danny` (am_echo, +1 st) | Southie motor-mouth: wired, talks too much, laughs at his own jokes. Selling Declan out. |
| **Eleni Kouris** | Argo 7, the old man's niece and voice | `eleni` (af_heart) | Polished and controlled, never raises her voice; dry amusement and a little warmth for the useful, menace underneath. Polite full sentences, family first. |
| **Kostas Andreou** | Argo 7, the old man | `andreou` (em_santa, -2 st) | Old, unhurried, courteous; Greek comes out when he's moved. Calls only when it matters. |
| **Det. Ray Kowalski** | Bayhaven PD, on Price's payroll | `kowalski` (am_michael, -1 st) | Tired, sarcastic, matter-of-fact about the things he does. |
| **Harlan Price** | the developer | `price` (bm_fable) | Smooth, warm, British, never says what he means. |

## The story, in three acts
Each gang's run of jobs (H4) follows the same spine from its own side; random odd jobs carry on
between them.

**Act 1: Off the bus.** Broke and new in town. Benny at the chop shop gives you your first number and
tells you which payphones ring for whom. The three crews each try you out with odd jobs from their
payphones. Do enough for a crew and they give you their number (the cell phone takes over).

**Act 2: Turf.** The crews start giving you real work, and the work starts going wrong in ways that
aren't accidents: a stash hit that someone tipped off, a car job that turns out to be a sting, a
shipment that's lighter than it should be. Kowalski calls with "favours": do a job for him and your
heat goes away. Eleni is the first to notice the pattern. Danny is the leak in Local 9.

**Act 3: The waterfront.** Price makes his move: a war between the crews, with Kowalski's people
cleaning up. Whichever crew you've stood with longest calls you in for the last job: take Price's
deal apart, and Kowalski with it. The crew that wins holds the waterfront and its turf turns friendly
to you; the others don't forget. (Siding with Price is possible. He's very generous. Right up to the end.)

## Calls (H1, first pass)
A call is a short, natural conversation between the caller and you: one turn per bubble, never
split up, 300 characters at most, and all of it voiced (your turns in the voice you picked for your
character). Nobody explains the game: they talk the way they would, and the job panel and map carry
the rest. A boss's first call runs straight from their introduction into the job. Lines never
assume whether you're a man or a woman. What a line says out loud never depends on the job's details (the
place, the payout): those are on the job panel and the map route. The caller sounds like a payphone
(narrow, analogue, a little hiss) or a cell (wider, a digital edge) by how the call came in, done
live in the browser from one clean recording.

First pass (voiced now): Benny's welcome; each boss's first call; a brief for each kind of job
(hit, torch, steal, courier, turf war) in each boss's voice, two takes on the words each; their
"done" and "you blew it" lines; the cell's "missed call", "busy" and "nothing right now".
