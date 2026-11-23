// The broadcast clock: the server's time, worked out from a few round trips to /api/radio/now.
// The trip that came back fastest wins (its midpoint is the best guess of when the server read its
// clock). The radio only consults it when tuning in and at changeovers, never mid-song.
const SAMPLES = 5;

export class RadioClock {
  /** Server minus local (ms). */
  private offset = 0;
  private synced = false;

  async sync(): Promise<void> {
    let bestTrip = Infinity, bestOffset = 0;
    for (let i = 0; i < SAMPLES; i++) {
      try {
        const sent = Date.now(), t0 = performance.now();
        const { now } = (await (await fetch('/api/radio/now', { cache: 'no-store' })).json()) as { now: number };
        const trip = performance.now() - t0;
        if (trip < bestTrip) { bestTrip = trip; bestOffset = now - (sent + trip / 2); }
      } catch { /* try the next one */ }
    }
    if (bestTrip === Infinity) return;
    // The first sync sets the clock; later ones only nudge it, so one slow sample can't jolt it.
    this.offset = this.synced ? this.offset + (bestOffset - this.offset) * 0.5 : bestOffset;
    this.synced = true;
  }

  /** Broadcast time, Unix seconds. */
  now(): number {
    return (Date.now() + this.offset) / 1000;
  }
}
