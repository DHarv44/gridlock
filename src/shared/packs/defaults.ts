// The engine's default rules and gang-respect tuning. A universe overrides what it wants
// (Universe.rules / .respect); anything naming a pack id (a weapon, an archetype) has no default
// here and comes only from the universe.

export const DEFAULT_RULES = {
  /** Players carry a cell phone (hud/phone.ts, server/game/missions/cell.ts): gangs ring with work,
   *  texts arrive in its inbox. Without one, texts show as notices and work comes from payphones
   *  only. (Radio is on when the universe lists stations; ATMs where specs say `atm`; payphones
   *  per respect.phonesPerGang.) */
  cellPhone: true,
  /** Cheating at poker (systems/cardCheats.ts): slip in an ace, stack the deck on your deal, peek at
   *  your neighbours' cards; card sharps at the tables sometimes cheat too, and you can call them
   *  out. Off: nobody cheats and there's no calling out. */
  cardCheats: true,
  /** Respect a gang needs for you before it invites you to its back-room game. */
  cardInviteRespect: 40,
  /** A friend's game runs this many game minutes after they invite you or you call. */
  friendGameMinutes: 180,
  /** What gangs' job points look like: a payphone at the curb, or a timber post with a notice
   *  board and a bell (no phone ring; render/booths.ts). */
  jobPost: 'payphone' as 'payphone' | 'post',
  /** Gangs spray their tags (FactionSpec.brand / tags) on walls in their turf. */
  graffiti: true,
  /** Who works a walk-in counter when the layout doesn't name someone (a ped archetype id). */
  clerk: '',
  /** What a clerk who fights back pulls from under the counter if they carry no gun (weapon id). */
  counterGun: null as { weapon: string; ammo: number } | null,
  maxPlayers: 6,
  /** Every room is the same city, so a character's last spot means the same place in any room. */
  citySeed: 1337,
  /** Soldiers leave players alone unless they're inside a fenced compound (a base), wanted at
   *  least this badly (the level the army is called in at), or attacked a soldier lately. */
  militaryWanted: 5,
  militaryGrudgeS: 30,
  startCash: 2500,
  /** Weapons a new or respawned player carries (weapon ids). */
  startWeapons: [] as { weapon: string; ammo: number }[],
  deathCashLoss: 0.15,       // fraction of carried cash dropped on death
  hospitalFee: 300,
  bustedFine: 0.2,           // fraction of cash paid when arrested
  loseWeaponsOnDeath: true,
  heatDecayPerSec: 2.2,      // when no lawful unit can see you
  heatSightRange: 70,
  witnessRange: 40,
  gameMinutesPerSecond: 1,   // a day lasts 24 real minutes
  armorPrice: 600,
  healPrice: 200,
  // Businesses (server/game/systems/business.ts). Income piles up in each business's safe, up to
  // this many game hours of it; whatever's left at midnight goes to the bank, less the fee.
  safeHours: 8,
  safeSweepFee: 0.1,
  // Once a game day, a gang that respects you less than this may lean on a business on its turf.
  troubleBelow: 15,
  troubleChance: 0.5,
  troubleCrew: 3,
  troubleSeconds: 150,       // deal with them by then or they empty the safe
  payoffHours: 4,            // paying them off costs this many hours of the place's income...
  payoffRespect: 6,          // ...and they think better of you for it
  fenceMul: 1.6,             // your warehouse pays this much over the chop shop for a stolen car
  // The bank job: blow the vault door; it pays out in cash piles, the alarm brings the law.
  vaultCash: [2500, 4000] as [number, number], // per pile (six piles)
  vaultWanted: 4,            // the alarm puts the robber on at least this many stars
  vaultReset: 600,           // seconds before the vault is closed and restocked (once empty of people)
  // Hold-ups (server/game/systems/robbery.ts): point a gun at a clerk from inside the shop.
  robRange: 7,               // metres from the clerk
  robStart: 0.6,             // seconds of covering them before they put their hands up
  robSeconds: 10,            // to empty a full till while you keep them covered
  robGrace: 1.5,             // seconds you can look away before they stop handing it over
  robAlarm: 4,               // seconds in, the silent alarm goes off...
  robWanted: 2,              // ...putting you on at least this many stars
  tillRefill: 900,           // seconds for an emptied till to fill up again
  // Bailing out of a moving vehicle (m/s): up to `bailFall` (about 32 km/h) you step out; above it
  // you're thrown down and hurt (more the faster); at `bailDie` (about 95 km/h) it kills you.
  bailFall: 9,
  bailDie: 26,
  // Vehicle damage. Dents show every hit in full, but a vehicle only loses `vehicleHpTake` of it in
  // health, so it takes a beating before it catches fire. Crashes start to hurt above `crashSafe`
  // (closing speed, m/s; walls `wallSafe`) and do `crashDamage` / `wallDamage` per m/s over that.
  vehicleHpTake: 0.5,
  crashSafe: 5, crashDamage: 9,
  wallSafe: 8, wallDamage: 8,
  // Below `wearFrom` of its health a vehicle drives worse, worst when wrecked: down to `wearPower`
  // of its pull and `wearSpeed` of its top speed, `wearGrip` of its grip, and pulling to one side by
  // `wearPull` of full lock.
  wearFrom: 0.7, wearPower: 0.5, wearSpeed: 0.6, wearGrip: 0.75, wearPull: 0.12,
  // Shooting a hand weapon from a vehicle (radians either side of straight ahead): out of a car's
  // windows you can't fire behind you (`windowArc`, ~110°); riding open (a bike, an open-top, a
  // horse, a wagon bench) you can twist round further (`openArc`, ~150°), just not straight back.
  windowArc: 1.92, openArc: 2.62,
  // Jobs done with company: other players riding with you, or this close when it's done, split the
  // pay evenly with you.
  shareRange: 30,
  pedCap: 260,
  carCap: 140,
  vehicleCap: 300,           // all vehicles incl. parked
  pedCapPerPlayer: 55,
  carCapPerPlayer: 32,
  spawnRadius: [85, 165] as [number, number],
  despawnRadius: 210,
  interestRadius: 190,
  chopValue: 0.25,           // chop shop pays this fraction of a vehicle's price
  revivePayout: 0,
  killBounty: 0,
};
export type Rules = typeof DEFAULT_RULES;

export const DEFAULT_RESPECT = {
  min: -100,
  max: 100,
  hostileBelow: -40,         // the gang attacks you on sight
  noWorkBelow: -20,          // their phones stop ringing for you
  killMember: -3,            // killing one of theirs
  killRival: 1,              // ...and their rivals like it
  phoneCooldown: 45,         // seconds before the same booth rings again for you
  frenzyRespawn: 240,        // seconds before a used crate comes back
  phonesPerGang: 5,
  frenzyCrates: 8,
  // Cell phone: a gang that respects you this much texts you its number and calls with work.
  cellAt: 25,
  cellCallEvery: [120, 240] as [number, number], // seconds between calls while you're free
  cellRing: 20,              // seconds a call rings before it's missed
  cellPay: 1.25,             // jobs by phone pay this much more than payphone work
  cellDialCooldown: 90,      // seconds before the same contact has work for you again
  // The mentor (the cast member marked "mentor"): rings with a nudge after this long free while no
  // crew has your number, and stops dealing with you after this many blown jobs in a row.
  mentorNudgeAfter: 240,
  mentorFedUpAfter: 3,
};
export type Respect = typeof DEFAULT_RESPECT;
