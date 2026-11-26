// Radio: lists each station's tracks with their lengths (the broadcast schedule in
// shared/radioSchedule.ts is built from them) and serves the files with range requests. A station's
// folder is <universe contentDir>/radio/<station id>/ in the project (Bayhaven: content/radio/).
// Folders are read on each request, so dropping a new song in is enough. One server hosts every
// universe, so the universe comes with each request (?u= / the path).
import { createReadStream, readdirSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { basename, extname, join, resolve } from 'node:path';
import type { Universe } from '../shared/packs';
import type { RadioListing, RadioTrack, StationList } from '../shared/radioSchedule';
import { audioDuration } from './audioDuration';

const TYPES: Record<string, string> = { '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

const rootOf = (u: Universe) => resolve(process.cwd(), u.contentDir, 'radio');

function folders(u: Universe): Record<string, string> {
  return Object.fromEntries(u.radio.map((s) => [s.id, join(rootOf(u), s.id)]));
}

/** The audio files in a folder, sorted. */
export function tracks(dir: string): string[] {
  try { return readdirSync(dir).filter((f) => TYPES[extname(f).toLowerCase()] && statSync(join(dir, f)).isFile()).sort(); } catch { return []; }
}

/** Path → [size, mtime, seconds]: a file is only read again when it changes. */
const durations = new Map<string, [number, number, number | null]>();

export function lengthOf(full: string): number | null {
  const st = statSync(full);
  const hit = durations.get(full);
  if (hit && hit[0] === st.size && hit[1] === st.mtimeMs) return hit[2];
  const d = audioDuration(readFileSync(full), extname(full).toLowerCase());
  if (d === null) console.warn(`[radio] can't read the length of ${full}; it won't be broadcast`);
  durations.set(full, [st.size, st.mtimeMs, d]);
  return d;
}

/** Commercials (idents, jingles, ads) sit in this subfolder of a station's folder. */
const ADS = 'commercials';

/** Tracks in a folder with their lengths; `prefix` is the path the client asks for them by. */
function listed(dir: string, prefix: string): RadioTrack[] {
  return tracks(dir).flatMap((f) => {
    const dur = lengthOf(join(dir, f));
    return dur && dur > 1 ? [{ file: prefix + f, dur: Math.round(dur * 1000) / 1000 }] : [];
  });
}

/** Song names: <radio>/<station>/tracks.json (file → { title, artist }). */
function names(dir: string): Record<string, { title?: string; artist?: string }> {
  try { return JSON.parse(readFileSync(join(dir, 'tracks.json'), 'utf8')) as Record<string, { title?: string; artist?: string }>; } catch { return {}; }
}

/** Every station's songs (named) and commercials with lengths: what the broadcast is built from. */
function playlists(u: Universe): Record<string, StationList> {
  return Object.fromEntries(Object.entries(folders(u)).map(([id, dir]) => {
    const meta = names(dir);
    const songs = listed(dir, '').map((t) => {
      const m = meta[t.file];
      return { ...t, title: typeof m?.title === 'string' ? m.title : t.file.replace(/\.[^.]+$/, ''), ...(typeof m?.artist === 'string' ? { artist: m.artist } : {}) };
    });
    return [id, { songs, ads: listed(join(dir, ADS), `${ADS}/`) }];
  }));
}

/** Handles /api/radio?u=<universe> and /radio/<universe>/<station>/<file>; false if not ours. */
export function radioRoutes(req: IncomingMessage, res: ServerResponse, url: URL, universes: Map<string, Universe>): boolean {
  const path = url.pathname;
  if (path === '/api/radio/now') {
    // Tiny on purpose: clients time a few of these round trips to line their clocks up.
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ now: Date.now() }));
    return true;
  }
  if (path === '/api/radio') {
    // `now` lets clients line their clocks up with the server's, so everyone hears the same moment.
    const u = universes.get(url.searchParams.get('u') ?? '');
    if (!u) { res.writeHead(404).end(); return true; }
    const body: RadioListing = { now: Date.now(), stations: playlists(u) };
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
    return true;
  }
  if (!path.startsWith('/radio/')) return false;
  // /radio/<universe>/<station>/<file> or /radio/<universe>/<station>/commercials/<file>
  const parts = path.split('/');
  const u = universes.get(parts[2] ?? '');
  const station = u && folders(u)[parts[3] ?? ''];
  const ad = parts.length === 6 && parts[4] === ADS;
  const dir = station && (ad ? join(station, ADS) : parts.length === 5 ? station : '');
  const file = basename(decodeURIComponent(parts[parts.length - 1] ?? ''));
  // Only files the listing would show: no paths outside the station's folders.
  if (!dir || !tracks(dir).includes(file)) { res.writeHead(404).end(); return true; }
  serveAudio(req, res, join(dir, file));
  return true;
}

/** Streams an audio file, honouring range requests (seeking, and browsers loading in pieces). */
export function serveAudio(req: IncomingMessage, res: ServerResponse, full: string): void {
  const file = basename(full);
  const size = statSync(full).size;
  const type = TYPES[extname(file).toLowerCase()];
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
    if (start >= size || start > end) { res.writeHead(416, { 'content-range': `bytes */${size}` }).end(); return; }
    res.writeHead(206, { 'content-type': type, 'content-length': end - start + 1, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes' });
    createReadStream(full, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
  createReadStream(full).pipe(res);
}
