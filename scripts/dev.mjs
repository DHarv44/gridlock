// Runs the game server (watch mode) and the Vite client dev server side by side.
import { spawn } from 'node:child_process';

const isWin = process.platform === 'win32';
const npx = isWin ? 'npx.cmd' : 'npx';

const env = { ...process.env, GRIDLOCK_PORT: process.env.GRIDLOCK_PORT ?? '5228' };
const procs = [
  spawn(npx, ['tsx', 'watch', '--clear-screen=false', 'src/server/main.ts'], { stdio: 'inherit', shell: isWin, env }),
  spawn(npx, ['vite'], { stdio: 'inherit', shell: isWin, env }),
];

const stop = () => {
  for (const p of procs) p.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const p of procs) p.on('exit', (code) => { if (code) stop(); });
