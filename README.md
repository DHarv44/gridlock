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

Mouse-aim layout by default. Esc → Change controls switches to the Classic style (arrows turn,
Ctrl fires straight ahead) and rebinds any action to a key or mouse button.

| Key | Action |
| --- | --- |
| WASD | Move up/left/down/right on screen · in vehicles gas / steer / brake |
| Mouse / left click | Aim (you face the cursor) / shoot; drive-bys and tank turrets aim at the cursor too |
| Shift | Sprint · descend in helicopters |
| Space | Handbrake · climb in helicopters |
| F or Enter | Get in/out, carjack, ride as passenger with a friend |
| E | Use a shop, hospital, dealer, respray, chop shop, property |
| R / Q / X / wheel / 1–9 | Reload / previous / next / pick weapon |
| H | Horn (siren in emergency vehicles) |
| T / M / Tab / Esc | Chat / city map / scores / menu |
