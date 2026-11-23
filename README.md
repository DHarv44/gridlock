# GRIDLOCK

Top-down multiplayer crime sandbox for up to 6 friends in the browser.

## Play

```
npm install
npm run play
```

Open http://localhost:5228, pick a name, **Create game**, then send friends the invite link
(Esc → Copy invite link, or `http://<your-address>:5228/#CODE`).

- **Same network:** friends use the LAN address the server prints on startup.
- **Over the internet:** forward TCP port 5228 on your router to this PC and share
  `http://<your-public-ip>:5228/#CODE`, or deploy to any Node host (it honours `PORT`;
  build command `npm run build`, start command `npm start`). `railway.json` configures Railway.
  Room saves live in `data/` (or `GRIDLOCK_DATA`); on Railway mount a volume there to keep them
  across deploys.

## Things to do

- **Gang payphones**: booths in each gang's turf blink in the gang's colour when there's work.
  Walk up and press E. Jobs: hits, torching rival cars, stealing specific rides, courier runs,
  turf-war rampages. Pay plus respect with the gang (and less with its rivals).
- **Respect**: three meters under your wanted stars. Kill a gang's members and it drops; sink low
  enough and that gang jumps you on sight and stops offering work.
- **Kill-frenzy crates**: red-and-black crates in parks and lots. Grab one for a weapon and a timer.
- **Room modes** (picked when creating a game): Free roam, Frag race (first to 10 player kills),
  Money race (first to earn $50,000). The winner is announced and a new round starts.

## Controls

Keyboard only, GTA2-style: turn and run where you face, shots auto-aim at whoever is ahead of
you (±16°). The mouse pointer plays no part. Esc → Change controls rebinds any action.

| Key | Action |
| --- | --- |
| W/S or Up/Down | Run forward / back where you face · in vehicles gas / brake, reverse |
| A/D or Left/Right | Turn · steer |
| Ctrl | Fire ahead (auto-aims at the nearest person in front) |
| , / . | Tank turret left / right |
| Shift | Sprint · descend in helicopters |
| Space | Handbrake · climb in helicopters |
| F or Enter | Get in/out, carjack, ride as passenger with a friend |
| E | Use a shop, hospital, dealer, respray, chop shop, property |
| R / Z / X / wheel / 1–9 | Reload / previous / next / pick weapon |
| H | Horn (siren in emergency vehicles) |
| T / M / Tab / Esc | Chat / city map / scores / menu |
