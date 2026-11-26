// A universe's soundtrack (music that isn't a radio: the western's score): the songs in
// <contentDir>/soundtrack/ and what <contentDir>/soundtrack/tracks.json says of each, its title and
// the regions (zone ids) it belongs to. Read on each request, so dropping a song in is enough.
// The client plays them (client/audio/soundtrack.ts).
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { Universe } from '../shared/packs';
import type { SoundtrackListing, SoundtrackSong } from '../shared/soundtrack';
import { lengthOf, serveAudio, tracks } from './radio';

const dirOf = (u: Pick<Universe, 'contentDir'>) => resolve(process.cwd(), u.contentDir, 'soundtrack');

type Meta = Record<string, { title?: unknown; regions?: unknown }>;

export function songs(u: Pick<Universe, 'contentDir'>): SoundtrackSong[] {
  const dir = dirOf(u);
  let meta: Meta = {};
  try { meta = JSON.parse(readFileSync(join(dir, 'tracks.json'), 'utf8')) as Meta; } catch { /* untitled */ }
  return tracks(dir).flatMap((file) => {
    const dur = lengthOf(join(dir, file));
    if (!dur || dur < 1) return [];
    const m = meta[file];
    const title = typeof m?.title === 'string' ? m.title : file.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
    const regions = Array.isArray(m?.regions) ? m.regions.filter((r): r is string => typeof r === 'string') : [];
    return [{ file, title, dur, regions }];
  });
}

/** Handles /api/soundtrack?u=<universe> and /soundtrack/<universe>/<file>; false if not ours. */
export function soundtrackRoutes(req: IncomingMessage, res: ServerResponse, url: URL, universes: Map<string, Universe>): boolean {
  const path = url.pathname;
  if (path === '/api/soundtrack') {
    const u = universes.get(url.searchParams.get('u') ?? '');
    if (!u) { res.writeHead(404).end(); return true; }
    const body: SoundtrackListing = { songs: songs(u) };
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
    return true;
  }
  if (!path.startsWith('/soundtrack/')) return false;
  const parts = path.split('/');
  const u = universes.get(parts[2] ?? '');
  const file = basename(decodeURIComponent(parts[3] ?? ''));
  // Only files the listing would show: nothing outside the folder.
  if (!u || parts.length !== 4 || !tracks(dirOf(u)).includes(file)) { res.writeHead(404).end(); return true; }
  serveAudio(req, res, join(dirOf(u), file));
  return true;
}
