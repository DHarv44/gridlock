// A room running in its own worker thread (roomWorker.ts) with its universe installed there. The
// lobby talks to it through this proxy: sockets stay on the main thread, their messages go over as
// they arrive, and what the room sends comes back already serialised.
import { Worker } from 'node:worker_threads';
import type { C2S } from '../shared/protocol';
import type { Conn } from './room';
import type { JoinResult, RoomHost, Seat } from './roomHost';

/** Main thread → worker. */
export type ToWorker =
  | { t: 'join'; cid: number; name: string; char: unknown }
  | { t: 'msg'; cid: number; msg: C2S }
  | { t: 'leave'; cid: number }
  | { t: 'close' };
/** Worker → main thread. */
export type FromWorker =
  | { t: 'joined'; cid: number; error?: string }
  | { t: 'send'; cid: number; data: string }
  | { t: 'drop'; cid: number }
  | { t: 'info'; size: number; names: string[]; tickMs: number; emptySince: number }
  | { t: 'closed' };

export interface WorkerRoomInit { code: string; universe: string; mode?: string }

export class WorkerRoom implements RoomHost {
  readonly code: string;
  readonly universe: string;
  size = 0;
  tickMs = 0;
  emptySince = Date.now();
  private list: string[] = [];
  private worker: Worker;
  private conns = new Map<number, Conn>();
  private pending = new Map<number, (r: JoinResult) => void>();
  private nextCid = 1;

  constructor(init: WorkerRoomInit) {
    this.code = init.code;
    this.universe = init.universe;
    // A plain .mjs entry with no inherited flags: it loads TypeScript itself (roomWorker.mjs).
    this.worker = new Worker(new URL('./roomWorker.mjs', import.meta.url), { workerData: init, execArgv: [] });
    this.worker.on('message', (m: FromWorker) => this.receive(m));
    this.worker.on('error', (err) => this.fail(err));
    this.worker.on('exit', (code) => { if (code !== 0 && !this.failed && !this.closing) this.fail(new Error(`room thread exited (${code})`)); });
  }

  /** Set when the room's thread died: the lobby drops the room and opens a fresh one next time. */
  failed: string | null = null;

  /** The thread died: whoever is waiting to join is told why (the lobby sends it as the reject
   *  reason, so it reaches the player rather than a bare "Disconnected"); players already in are
   *  dropped. */
  private fail(err: unknown): void {
    const why = err instanceof Error ? err.message : String(err);
    console.error(`[room ${this.code}] worker failed:`, err);
    this.failed = why;
    for (const [cid, done] of this.pending) {
      this.conns.delete(cid);
      done({ error: `The game could not start (${why.slice(0, 160)}).` });
    }
    this.pending.clear();
    for (const c of this.conns.values()) c.close();
    this.conns.clear();
    this.size = 0;
  }

  names(): string[] { return this.list; }

  join(name: string, conn: Conn, character: unknown): Promise<JoinResult> {
    const cid = this.nextCid++;
    this.conns.set(cid, conn);
    this.post({ t: 'join', cid, name, char: character });
    return new Promise((done) => this.pending.set(cid, done));
  }

  onMessage(seat: Seat, msg: C2S): void { this.post({ t: 'msg', cid: seat as number, msg }); }

  leave(seat: Seat): void {
    this.conns.delete(seat as number);
    this.post({ t: 'leave', cid: seat as number });
  }

  /** Shutting down on purpose (its thread's exit then isn't a failure). */
  private closing = false;

  close(): void {
    this.closing = true;
    this.post({ t: 'close' });
    // It saves and answers 'closed'; if it's stuck, it goes anyway.
    setTimeout(() => void this.worker.terminate(), 5000).unref();
  }

  private post(m: ToWorker): void { this.worker.postMessage(m); }

  private receive(m: FromWorker): void {
    switch (m.t) {
      case 'joined': {
        const done = this.pending.get(m.cid);
        this.pending.delete(m.cid);
        if (m.error) this.conns.delete(m.cid);
        done?.(m.error ? { error: m.error } : { seat: m.cid });
        break;
      }
      case 'send': this.conns.get(m.cid)?.send(m.data); break;
      case 'drop': this.conns.get(m.cid)?.close(); break;
      case 'info': this.size = m.size; this.list = m.names; this.tickMs = m.tickMs; this.emptySince = m.emptySince; break;
      case 'closed': void this.worker.terminate(); break;
    }
  }
}
