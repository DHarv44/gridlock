// A room's own thread (started by workerRoom.ts): installs the room's universe first, then loads the
// game (whose modules read the packs as they load) and runs the room. Messages that arrive while
// it's loading wait in a queue.
import { parentPort, workerData } from 'node:worker_threads';
import { installUniverse, RULES } from '../shared/packs';
import { loadUniverse } from '../universes';
import type { FromWorker, ToWorker, WorkerRoomInit } from './workerRoom';

const init = workerData as WorkerRoomInit;
const port = parentPort!;
const post = (m: FromWorker) => port.postMessage(m);

const queue: ToWorker[] = [];
let handle: ((m: ToWorker) => void) | null = null;
port.on('message', (m: ToWorker) => (handle ? handle(m) : queue.push(m)));

installUniverse(await loadUniverse(init.universe));
const { LocalRoom } = await import('./roomHost');
const host = new LocalRoom(init.code, RULES.citySeed, init.mode);
const seats = new Map<number, unknown>();

const info = () => post({ t: 'info', size: host.size, names: host.names(), tickMs: host.tickMs, emptySince: host.emptySince });
setInterval(info, 1000).unref();

handle = (m) => {
  switch (m.t) {
    case 'join': {
      const conn = { send: (data: string) => post({ t: 'send', cid: m.cid, data }), close: () => post({ t: 'drop', cid: m.cid }) };
      const res = host.join(m.name, conn, m.char);
      if ('error' in res) { post({ t: 'joined', cid: m.cid, error: res.error }); break; }
      seats.set(m.cid, res.seat);
      post({ t: 'joined', cid: m.cid });
      info();
      break;
    }
    case 'msg': { const s = seats.get(m.cid); if (s) host.onMessage(s, m.msg); break; }
    case 'leave': { const s = seats.get(m.cid); seats.delete(m.cid); if (s) host.leave(s); info(); break; }
    case 'close': host.close(); post({ t: 'closed' }); break;
  }
};
for (const m of queue.splice(0)) handle(m);
