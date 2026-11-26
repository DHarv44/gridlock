// Lobby: creates/joins rooms by short code and routes socket messages. Each room belongs to one
// universe: the creator's, or its save's. The server hosts every room in a worker thread of its own
// with that universe installed (workerRoom.ts); headless scripts host them in-process (roomHost.ts).
import type { WebSocket } from 'ws';
import { DEFAULT_RULES } from '../shared/packs/defaults';
import { cleanName, RULES, UNIVERSE, type Universe } from '../shared/packs';
import { type C2S, PROTOCOL_VERSION, type RoomListing, type S2C } from '../shared/protocol';
import { codeTaken, savedUniverse } from './persist';
import type { Conn } from './room';
import { type JoinResult, LocalRoom, type RoomHost, type Seat } from './roomHost';
import { WorkerRoom } from './workerRoom';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_IDLE_MS = 10 * 60 * 1000;

export interface LobbyOptions {
  /** Every universe the server offers; rooms then run in worker threads. Without it, rooms run
   *  in-process in the installed universe only (headless scripts). */
  universes?: Map<string, Universe>;
}

/** What the lobby needs from a character before the room checks the rest. */
function peekCharacter(raw: unknown): { id: string; name: string; universe: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const id = String(c.id ?? '').replace(/[^\w-]/g, '').slice(0, 40);
  const name = cleanName(c.name);
  return id && name && typeof c.universe === 'string' ? { id, name, universe: c.universe } : null;
}

export class Lobby {
  private rooms = new Map<string, RoomHost>();
  /** Character ids currently in (or joining) a game: one game at a time each. */
  private active = new Set<string>();
  private universes: Map<string, Universe> | null;

  constructor(opts: LobbyOptions = {}) {
    this.universes = opts.universes ?? null;
    setInterval(() => this.reap(), 60 * 1000).unref();
  }

  private maxPlayers(universe: string): number {
    const u = this.universes?.get(universe);
    return u ? u.rules.maxPlayers ?? DEFAULT_RULES.maxPlayers : RULES.maxPlayers;
  }

  private nameOf = (universe: string): string => this.universes?.get(universe)?.name ?? (universe === UNIVERSE.id ? UNIVERSE.name : universe);

  list(): RoomListing[] {
    return [...this.rooms.values()].filter((r) => r.size > 0)
      .map((r) => ({ code: r.code, universe: r.universe, players: r.size, max: this.maxPlayers(r.universe), names: r.names() }));
  }

  stats(): { rooms: number; players: number; tickMs: number[] } {
    const rooms = [...this.rooms.values()];
    return { rooms: rooms.length, players: rooms.reduce((a, r) => a + r.size, 0), tickMs: rooms.map((r) => Math.round(r.tickMs * 100) / 100) };
  }

  private newCode(): string {
    for (;;) {
      let c = '';
      for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      if (!this.rooms.has(c) && !codeTaken(c)) return c;
    }
  }

  /** The room under `code` for a page running `universe`: running, reopened from its save, or new. */
  private getRoom(code: string, create: boolean, universe: string, mode?: string): RoomHost | { error: string; universe?: string } {
    const existing = this.rooms.get(code);
    const where = existing?.universe ?? savedUniverse(code) ?? (create ? universe : null);
    if (!where) return { error: `No room called ${code}.` };
    if (where !== universe) return { error: `${code} is a game in ${this.nameOf(where)}.`, universe: where };
    if (existing) return existing;
    let room: RoomHost;
    if (this.universes) {
      if (!this.universes.has(universe)) return { error: 'This server has no such universe.' };
      room = new WorkerRoom({ code, universe, mode });
    } else {
      if (universe !== UNIVERSE.id) return { error: 'This server has no such universe.' };
      room = new LocalRoom(code, RULES.citySeed, mode);
    }
    this.rooms.set(code, room);
    return room;
  }

  attach(ws: WebSocket): void {
    let room: RoomHost | null = null;
    let seat: Seat | null = null;
    let charId: string | null = null;
    let closed = false;
    const send = (m: S2C) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m)); };
    const conn: Conn = {
      send: (data: string) => { if (ws.readyState === ws.OPEN && ws.bufferedAmount < 2_000_000) ws.send(data); },
      close: () => ws.close(),
    };
    const reject = (reason: string, universe?: string) => {
      send({ t: 'reject', reason, ...(universe ? { universe } : {}) });
      if (charId) this.active.delete(charId);
      charId = null;
      room = null;
    };
    ws.on('message', (raw) => {
      let msg: C2S;
      try { msg = JSON.parse(String(raw)) as C2S; } catch { return; }
      if (seat === null) {
        if (room || msg.t !== 'hello') return; // still joining, or not a hello
        if (msg.v !== PROTOCOL_VERSION) { send({ t: 'reject', reason: 'Version mismatch: refresh the page.' }); return; }
        const universe = String(msg.universe ?? '');
        let name = String(msg.name ?? '').replace(/[^\w \-.]/g, '').trim().slice(0, 16);
        if (msg.char !== undefined) {
          const peek = peekCharacter(msg.char);
          if (!peek) { send({ t: 'reject', reason: 'That character could not be read.' }); return; }
          if (peek.universe !== universe) { send({ t: 'reject', reason: 'That character lives in another universe.' }); return; }
          if (this.active.has(peek.id)) { send({ t: 'reject', reason: 'That character is already in a game.' }); return; }
          name = peek.name;
          charId = peek.id;
          this.active.add(peek.id);
        }
        if (!name) { send({ t: 'reject', reason: 'Pick a name.' }); return; }
        const wanted = String(msg.room ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
        // Continue: back into that room if it's running, or open it again under the same code.
        const resume = !!msg.resume && wanted.length === 4;
        const code = resume ? wanted : msg.create ? (wanted.length === 4 && !this.rooms.has(wanted) ? wanted : this.newCode()) : wanted;
        const got = this.getRoom(code, !!msg.create || resume, universe, typeof msg.mode === 'string' ? msg.mode : undefined);
        if ('error' in got) { reject(got.error, got.universe); return; }
        const host = got;
        room = host;
        const settle = (res: JoinResult) => {
          if ('error' in res) { reject(res.error); return; }
          if (closed) { host.leave(res.seat); return; }
          seat = res.seat;
        };
        const res = host.join(name, conn, msg.char);
        if (res instanceof Promise) void res.then(settle); else settle(res);
        return;
      }
      room!.onMessage(seat, msg);
    });
    ws.on('close', () => {
      closed = true;
      if (charId) this.active.delete(charId);
      if (room && seat !== null) room.leave(seat);
      room = null;
      seat = null;
    });
  }

  private reap(): void {
    const now = Date.now();
    for (const [code, r] of this.rooms) {
      if (r.size === 0 && now - r.emptySince > ROOM_IDLE_MS) {
        r.close();
        this.rooms.delete(code);
      }
    }
  }
}
