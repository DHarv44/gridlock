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

## Controls

Classic layout by default; every action can be rebound (keys or mouse buttons) in Esc → Change controls.

| Key | Action |
| --- | --- |
| Up / Down arrows | Move forward / back where you face · accelerate / brake and reverse |
| Left / Right arrows | Turn · steer |
| Left Ctrl | Fire straight ahead (also from cars with pistols, SMGs, rifles) |
| Enter | Get in/out, carjack, ride as passenger with a friend |
| Space | Handbrake · climb in helicopters |
| Left Shift | Sprint · descend in helicopters |
| A / D | Tank turret left / right |
| Z / X / wheel / 1–9 | Previous / next / pick weapon |
| R | Reload |
| E | Use a shop, hospital, dealer, respray, chop shop, property |
| H | Horn (siren in emergency vehicles) |
| T / M / Tab / Esc | Chat / city map / scores / menu |
