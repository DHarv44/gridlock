// Per-frame ambience: traffic-signal glows synced to the server clock, the nearest siren's sound and
// your own vehicle's engine.
import { PEDS, VEHICLES } from '../../shared/packs';
import { VF } from '../../shared/protocol';
import type { Sound } from '../audio/sound';
import type { EntityStore } from '../net/entities';
import type { ParticleLayer } from '../render/particles';
import type { StreetProps } from '../render/streetProps';

type View = { x0: number; y0: number; x1: number; y1: number };

export function signalGlows(props: StreetProps, store: EntityStore, glow: ParticleLayer, night: number, vr: View): void {
  const t = store.serverNow() / 1000;
  for (const s of props.updateSignals(t)) {
    if (s.x < vr.x0 || s.x > vr.x1 || s.y < vr.y0 || s.y > vr.y1) continue;
    const st = props.stateOf(s, t);
    const [r, g, b] = st === 2 ? [0.2, 1, 0.4] : st === 1 ? [1, 0.7, 0.1] : [1, 0.15, 0.1];
    glow.put(s.x, s.y, 5.9, 1.5 + night * 1.5, 1, 0, r, g, b, 0.45 + night * 0.4);
  }
}

const LAW = new Set(PEDS.map((p, i) => (p.behaviour === 'police' || p.behaviour === 'military' ? i : -1)).filter((i) => i >= 0));
const LAW_RIDE = new Set(VEHICLES.map((v, i) => (v.roles.some((r) => r.startsWith('police') || r.startsWith('military')) ? i : -1)).filter((i) => i >= 0));

/** Police and military in view (on foot and alive, or driving a law vehicle), for the radar. */
export function lawUnits(store: EntityStore): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const e of store.all.values()) {
    if ((e.kind === 0 && LAW.has(e.data[2]) && !(e.data[6] & 1)) || (e.kind === 1 && LAW_RIDE.has(e.data[2]) && e.data[7] & VF.driven)) out.push(e);
  }
  return out;
}

export function nearestSiren(store: EntityStore, me: { x: number; y: number } | null, sound: Sound): void {
  let best: { x: number; y: number } | null = null, bd = 90;
  if (me) {
    for (const e of store.all.values()) {
      if (e.kind !== 1 || !(e.data[7] & VF.siren)) continue;
      const d = Math.hypot(e.x - me.x, e.y - me.y);
      if (d < bd) { bd = d; best = e; }
    }
  }
  sound.siren(best);
}

let lastSpeed = 0;
/** Your vehicle's engine: how hard it works is its speed against its top speed, plus a lift while
 *  it's picking up speed. On foot (or in a vehicle with no engine voice) it's silent. */
export function ownEngine(store: EntityStore, own: { vid: number; vx: number; vy: number } | null, sound: Sound, dt: number): void {
  const spec = own?.vid ? VEHICLES[store.all.get(own.vid)?.data[2] ?? -1] : undefined;
  if (!own || !spec?.engine) { sound.engine(null, 0); lastSpeed = 0; return; }
  const speed = Math.hypot(own.vx, own.vy);
  const gaining = dt > 0 ? Math.max(0, Math.min(1, (speed - lastSpeed) / dt / spec.accel)) : 0;
  lastSpeed = speed;
  sound.engine(spec.engine, speed / spec.maxSpeed + gaining * 0.25);
}
