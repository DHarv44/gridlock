// A room worker's entry point, plain JavaScript so any Node can start it: registers the TypeScript
// loader itself (rather than inheriting the server's loader flags, which not every Node accepts in a
// worker) and then runs the room (roomWorker.ts).
import { register } from 'tsx/esm/api';

register();
await import('./roomWorker.ts');
