// Lobby: creates/joins rooms by short code and routes socket messages.
import type { WebSocket } from 'ws';
import { type C2S, PROTOCOL_VERSION, type RoomListing, type S2C } from '../shared/protocol';
import { RULES } from '../shared/packs';
import type { Player } from './game/entities';
import { loadRoom } from './persist';
import { Room } from './room';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_IDLE_MS = 10 * 60 * 1000;

export class Lobby {
  private rooms = new Map<string, Room>();

  constructor() {
    setInterval(() => this.reap(), 60 * 1000).unref();
  }

  list(): RoomListing[] {
    return [...this.rooms.values()].filter((r) => r.size > 0)
      .map((r) => ({ code: r.code, players: r.size, max: RULES.maxPlayers, names: r.names() }));
  }

  stats(): { rooms: number; players: number; tickMs: number[] } {
    const rooms = [...this.rooms.values()];
    return { rooms: rooms.length, players: rooms.reduce((a, r) => a + r.size, 0), tickMs: rooms.map((r) => Math.round(r.tickMs * 100) / 100) };
  }

  private newCode(): string {
    for (;;) {
      let c = '';
      for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      if (!this.rooms.has(c) && !loadRoom(c)) return c;
    }
  }

  private getRoom(code: string, create: boolean, mode?: string): Room | null {
    const existing = this.rooms.get(code);
    if (existing) return existing;
    if (!create && !loadRoom(code)) return null;
    const room = new Room(code, (Math.random() * 2 ** 31) | 0, mode);
    this.rooms.set(code, room);
    return room;
  }

  /** Room the tests/bots use directly (no socket). */
  roomFor(code: string): Room {
    return this.getRoom(code, true)!;
  }

  attach(ws: WebSocket): void {
    let room: Room | null = null;
    let player: Player | null = null;
    const send = (m: S2C) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m)); };
    const conn = {
      send: (data: string) => { if (ws.readyState === ws.OPEN && ws.bufferedAmount < 2_000_000) ws.send(data); },
      close: () => ws.close(),
    };
    ws.on('message', (raw) => {
      let msg: C2S;
      try { msg = JSON.parse(String(raw)) as C2S; } catch { return; }
      if (!player) {
        if (msg.t !== 'hello') return;
        if (msg.v !== PROTOCOL_VERSION) { send({ t: 'reject', reason: 'Version mismatch: refresh the page.' }); return; }
        const name = String(msg.name ?? '').replace(/[^\w \-.]/g, '').trim().slice(0, 16);
        if (!name) { send({ t: 'reject', reason: 'Pick a name.' }); return; }
        const wanted = String(msg.room ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
        const code = msg.create ? (wanted.length === 4 && !this.rooms.has(wanted) ? wanted : this.newCode()) : wanted;
        room = this.getRoom(code, !!msg.create, typeof msg.mode === 'string' ? msg.mode : undefined);
        if (!room) { send({ t: 'reject', reason: `No room called ${code}.` }); return; }
        const res = room.join(name, conn);
        if (typeof res === 'string') { send({ t: 'reject', reason: res }); room = null; return; }
        player = res;
        return;
      }
      room!.onMessage(player, msg);
    });
    ws.on('close', () => {
      if (room && player) room.leave(player);
      room = null;
      player = null;
    });
  }

  private reap(): void {
    const now = Date.now();
    for (const [code, r] of this.rooms) {
      if (r.size === 0 && now - r.emptySince > ROOM_IDLE_MS) {
        r.persist();
        this.rooms.delete(code);
      }
    }
  }
}
