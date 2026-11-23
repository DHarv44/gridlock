// Radio: lists each station's tracks with their lengths (the broadcast schedule in
// shared/radioSchedule.ts is built from them) and serves the files with range requests. A station's folder comes from radio.local.json (station id → absolute folder, for a
// local music library, not committed) or else radio/<station id>/ in the project. Folders are read
// on each request, so dropping a new song in is enough.
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { basename, extname, join, resolve } from 'node:path';
import { RADIO } from '../shared/packs';
import type { RadioListing, RadioTrack, StationList } from '../shared/radioSchedule';
import { audioDuration } from './audioDuration';

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

/** Path → [size, mtime, seconds]: a file is only read again when it changes. */
const durations = new Map<string, [number, number, number | null]>();

function lengthOf(full: string): number | null {
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

/** Song names: radio/<station>/tracks.json in the project (file → { title, artist }), so they
 *  apply whether the audio comes from there or from a local library folder. */
function names(station: string): Record<string, { title?: string; artist?: string }> {
  try { return JSON.parse(readFileSync(join(ROOT, station, 'tracks.json'), 'utf8')) as Record<string, { title?: string; artist?: string }>; } catch { return {}; }
}

/** Every station's songs (named) and commercials with lengths: what the broadcast is built from. */
function playlists(): Record<string, StationList> {
  return Object.fromEntries(Object.entries(folders()).map(([id, dir]) => {
    const meta = names(id);
    const songs = listed(dir, '').map((t) => {
      const m = meta[t.file];
      return { ...t, title: typeof m?.title === 'string' ? m.title : t.file.replace(/\.[^.]+$/, ''), ...(typeof m?.artist === 'string' ? { artist: m.artist } : {}) };
    });
    return [id, { songs, ads: listed(join(dir, ADS), `${ADS}/`) }];
  }));
}

/** Handles /api/radio and /radio/<station>/<file>; false if not ours. */
export function radioRoutes(req: IncomingMessage, res: ServerResponse, path: string): boolean {
  if (path === '/api/radio') {
    // `now` lets clients line their clocks up with the server's, so everyone hears the same moment.
    const body: RadioListing = { now: Date.now(), stations: playlists() };
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
    return true;
  }
  if (!path.startsWith('/radio/')) return false;
  // /radio/<station>/<file> or /radio/<station>/commercials/<file>
  const parts = path.split('/');
  const station = folders()[parts[2] ?? ''];
  const ad = parts.length === 5 && parts[3] === ADS;
  const dir = station && (ad ? join(station, ADS) : parts.length === 4 ? station : '');
  const file = basename(decodeURIComponent(parts[parts.length - 1] ?? ''));
  // Only files the listing would show: no paths outside the station's folders.
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
