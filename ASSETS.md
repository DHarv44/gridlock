# Third-party assets

## Sound effects

All from [Freesound](https://freesound.org), **Creative Commons 0 (public domain) only**, fetched
without an account as each sound's HQ Ogg preview. The method (from GREYLINE):

1. `python -I -X utf8 tools/audio/fs_search.py [key ...]` lists CC0 candidates (nothing downloaded).
2. The user OKs the batch; `python -I -X utf8 tools/audio/fs_fetch.py [key ...]` checks each sound's own
   page says CC0, downloads into `thirdparty/_incoming/freesound/` (quarantine, not committed), rejects
   anything that isn't really Ogg, and writes `manifest.json`.
3. `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup -P tools/blender/prep_audio.py -- [keys]`
   trims, cuts and levels them into `src/client/sfx/<key>.ogg` (mono, 48 kHz, RMS -20 dB).
4. A row here per sound. The mix (each voice's gain) is in `src/client/audio/sound.ts`.

Test with the game muted (`?mute`); never play sounds out loud while testing.

### Ledger

| File | Source | Author | Licence | Date | Used for |
|---|---|---|---|---|---|
| `pistol` | [427592 "9mm pistol shot"](https://freesound.org/s/427592/) | michorvath | CC0 | 2026-11-23 | Pistol |
| `revolver` | [683186 "357 Magnum Revolver Gunshot"](https://freesound.org/s/683186/) | Shark_Anthony | CC0 | 2026-11-23 | Revolver |
| `smg`, `minigun` | [482122 "Clean Machine Gun Burst"](https://freesound.org/s/482122/) | qubodup | CC0 | 2026-11-23 | SMG, minigun, chain gun (one shot cut from the burst) |
| `shotgun` | [427595 "20 gauge shotgun gunshot"](https://freesound.org/s/427595/) | michorvath | CC0 | 2026-11-23 | Shotguns |
| `rifle` | [427596 "AR15 rifle shot"](https://freesound.org/s/427596/) | michorvath | CC0 | 2026-11-23 | Rifles |
| `sniper` | [514228 "Sniper Rifle"](https://freesound.org/s/514228/) | SuperPhat | CC0 | 2026-11-23 | Sniper rifle |
| `flame` | [260554 "Basic Fire whoosh"](https://freesound.org/s/260554/) | LookIMadeAThing | CC0 | 2026-11-23 | Flamethrower |
| `launcher` | [163458 "Grenade Launcher"](https://freesound.org/s/163458/) | LeMudCrab | CC0 | 2026-11-23 | Grenade launcher |
| `rocket` | [521377 "Rocket Launch"](https://freesound.org/s/521377/) | Jarusca | CC0 | 2026-11-23 | Rocket launchers |
| `cannon` | [448002 "cannon.mp3"](https://freesound.org/s/448002/) | Kneeling | CC0 | 2026-11-23 | Tank cannon |
| `punch` | [94778 "Punch_1-2.wav"](https://freesound.org/s/94778/) | taylorsyoung (full username on the page) | CC0 | 2026-11-23 | Fists |
| `swing` | [60013 "Whoosh"](https://freesound.org/s/60013/) | qubodup | CC0 | 2026-11-23 | Bat swing, throws |
| `slash` | [35213 "slashkut.wav"](https://freesound.org/s/35213/) | Abyssmal | CC0 | 2026-11-23 | Knife |
| `boom` | [235968 "Explosion_01.wav"](https://freesound.org/s/235968/) | tommccann | CC0 | 2026-11-23 | Explosions |
| `crash` | [151624 "Clank Car Crash Collision"](https://freesound.org/s/151624/) | qubodup | CC0 | 2026-11-23 | Collisions (sparks) |
| `splash` | [442773 "Big Water Splash"](https://freesound.org/s/442773/) | qubodup | CC0 | 2026-11-23 | Water splashes |
| `horn` | [434878 "Car Honking"](https://freesound.org/s/434878/) | MicktheMicGuy | CC0 | 2026-11-23 | Car horns |
| `siren` | [52906 "police siren.wav"](https://freesound.org/s/52906/) | vlammenos | CC0 | 2026-11-23 | Emergency sirens (a 3.2 s loop of whole wail cycles) |
| `cash` | [209578 "Cash Register Purchase"](https://freesound.org/s/209578/) | Zott820 | CC0 | 2026-11-23 | Money earned |
| `horn_small` | [94868 "small horn.wav"](https://freesound.org/s/94868/) | tm1000 | CC0 | 2026-11-23 | Small cars' and motorbikes' horn |
| `horn_deep` | [450821 "truck pickup horn honk aggressive annoyed various1.wav"](https://freesound.org/s/450821/) | kyles | CC0 | 2026-11-23 | Pickups', SUVs', vans' and muscle cars' horn (first honk) |
| `horn_air` | [131930 "Industrial Air Horn"](https://freesound.org/s/131930/) | mcpable | CC0 | 2026-11-23 | Trucks' air horn |
| `horn_bus` | [451697 "school bus truck int horn honk.flac"](https://freesound.org/s/451697/) | kyles | CC0 | 2026-11-23 | City bus horn |
| `horn_icecream` | [128573 "Ice Cream Truck - \"The Entertainer\""](https://freesound.org/s/128573/) | sndadv | CC0 | 2026-11-23 | Ice cream van's jingle (first 4.5 s) |
| `engine_car` | [269771 "car idle"](https://freesound.org/s/269771/) (2002 Mini Cooper 1.6 petrol) | seth-m | CC0 | 2026-11-23 | Ordinary cars' engine loop (replaced 522225, a Peugeot 308 idle that sounded like a diesel truck) |
| `engine_suv` | [369054 "car_idle_ext_loop.wav"](https://freesound.org/s/369054/) (Honda CR-V) | AndrewAlexander | CC0 | 2026-11-23 | SUVs', pickups' and vans' engine loop |
| `engine_sport` | [585215 "Car Engine: Maserati GranTurismo Switch to Sport Mode and Launch"](https://freesound.org/s/585215/) (V8, the idle before the launch) | myeclecticself | CC0 | 2026-11-23 | Sports cars' engine loop |
| `engine_muscle` | [157142 "idle.wav"](https://freesound.org/s/157142/) (1975 Pontiac Firebird) | cr4sht3st | CC0 | 2026-11-23 | Muscle cars', lowriders' and police cruisers' engine loop |
| `phone_ring` | [456433 "Old Rotary Phone Ringing - Western Electric Bell 500 phone"](https://freesound.org/s/456433/) | mycompasstv | CC0 | 2026-11-23 | Ringing payphones (one ring) |
| `engine_diesel` | [128160 "Diesel Truck Idling Front.wav"](https://freesound.org/s/128160/) | ibirdfilm | CC0 | 2026-11-23 | Trucks', buses', the tank's and the ice cream van's engine loop |
| `engine_bike` | [119455 "Motorbike Idling.wav"](https://freesound.org/s/119455/) | lmbubec | CC0 | 2026-11-23 | Motorbikes' engine loop |
| `skid` | [71739 "Chrysler LHS tire squeal 04 (04-25-2009).wav"](https://freesound.org/s/71739/) | audible-edge | CC0 | 2026-11-26 | Tyre squeal in slides (a 1.5 s loop from 5.3–7.0 s, the steadiest squeal) |

## Music

The radio stations play the user's own files (made with Suno), not anything sourced here: see README.md.
