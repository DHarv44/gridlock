// Runs the game server (watch mode) and the Vite client dev server side by side.
import { spawn } from 'node:child_process';

const isWin = process.platform === 'win32';
const npx = isWin ? 'npx.cmd' : 'npx';

// GRIDLOCK_DEV turns on dev-only commands (chat "/tp x y").
const env = { ...process.env, GRIDLOCK_PORT: process.env.GRIDLOCK_PORT ?? '5228', GRIDLOCK_DEV: '1' };
const procs = [
  spawn(npx, ['tsx', 'watch', '--clear-screen=false', 'src/server/main.ts'], { stdio: 'inherit', shell: isWin, env }),
  // Vite straight from node (through npx under a shell it can stall at startup on Windows).
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit', env }),
];

const stop = () => {
  for (const p of procs) p.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const p of procs) p.on('exit', (code) => { if (code) stop(); });
