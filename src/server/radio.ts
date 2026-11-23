// Radio: lists each station's tracks and serves them (with range requests so players can tune in
// mid-song). A station's folder comes from radio.local.json (station id → absolute folder, for a
// local music library, not committed) or else radio/<station id>/ in the project. Folders are read
// on each request, so dropping a new song in is enough.
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { basename, extname, join, resolve } from 'node:path';
import { RADIO } from '../shared/packs';

const ROOT = resolve(process.cwd(), 'radio');
const LOCAL = resolve(process.cwd(), 'radio.local.json');
const TYPES: Record<string, string> = { '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

function folders(): Record<string, string> {
  let local: Record<string, string> = {};
  try { if (existsSync(LOCAL)) local = JSON.parse(readFileSync(LOCAL, 'utf8')) as Record<string, string>; } catch { /* ignore */ }
  return Object.fromEntries(RADIO.map((s) => [s.id, typeof local[s.id] === 'string' ? local[s.id] : join(ROOT, s.id)]));
}

function tracks(dir: string): string[] {
  try { return readdirSync(dir).filter((f) => TYPES[extname(f).toLowerCase()] && statSync(join(dir, f)).isFile()).sort(); } catch { return []; }
}

/** Handles /api/radio (station → tracks) and /radio/<station>/<file>; false if not ours. */
export function radioRoutes(req: IncomingMessage, res: ServerResponse, path: string): boolean {
  if (path === '/api/radio') {
    const dirs = folders();
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(Object.fromEntries(Object.entries(dirs).map(([id, dir]) => [id, tracks(dir)]))));
    return true;
  }
  if (!path.startsWith('/radio/')) return false;
  const [, , station, raw] = path.split('/');
  const dir = folders()[station ?? ''];
  const file = basename(decodeURIComponent(raw ?? ''));
  // Only files the listing would show: no paths outside the station's folder.
  if (!dir || !tracks(dir).includes(file)) { res.writeHead(404).end(); return true; }
  const full = join(dir, file);
  const size = statSync(full).size;
  const type = TYPES[extname(file).toLowerCase()];
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
    if (start >= size || start > end) { res.writeHead(416, { 'content-range': `bytes */${size}` }).end(); return true; }
    res.writeHead(206, { 'content-type': type, 'content-length': end - start + 1, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes' });
    createReadStream(full, { start, end }).pipe(res);
    return true;
  }
  res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
  createReadStream(full).pipe(res);
  return true;
}
