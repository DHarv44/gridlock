// /api/characters: list (GET), create (POST {name, look}), delete (DELETE /api/characters/<id>).
// The player's key travels in the x-gridlock-key header, never in the URL.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createCharacter, deleteCharacter, listCharacters, validKey } from './characters';

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 4096) { req.destroy(); resolve(null); }
    });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

/** Handles the request if it is for the characters API; returns false otherwise. */
export function characterApi(req: IncomingMessage, res: ServerResponse, path: string): boolean {
  if (path !== '/api/characters' && !path.startsWith('/api/characters/')) return false;
  const key = req.headers['x-gridlock-key'];
  if (!validKey(key)) { json(res, 400, { error: 'Missing player key.' }); return true; }
  if (req.method === 'GET' && path === '/api/characters') { json(res, 200, listCharacters(key)); return true; }
  if (req.method === 'POST' && path === '/api/characters') {
    void readBody(req).then((body) => {
      const b = (body ?? {}) as { name?: unknown; look?: unknown };
      const made = createCharacter(key, b.name, b.look);
      if (typeof made === 'string') json(res, 400, { error: made });
      else json(res, 200, made);
    });
    return true;
  }
  if (req.method === 'DELETE') {
    const id = path.slice('/api/characters/'.length);
    json(res, deleteCharacter(key, id) ? 200 : 404, {});
    return true;
  }
  json(res, 405, { error: 'Unsupported.' });
  return true;
}
