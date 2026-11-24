// The cell phone's own sounds, synthesised (no recordings): the ringtone, a short original melody
// played the way a handset's little speaker plays it (bright, thin, no bass), and the two-note
// chirp of a text arriving. Both are in the room with you, so they don't fade with distance.

/** A note: frequency (Hz, 0 = rest) and length (s). */
type Note = [number, number];

const n = (semitonesFromA4: number): number => 440 * 2 ** (semitonesFromA4 / 12);
const E5 = n(7), Gs5 = n(11), B5 = n(14), Cs6 = n(16), E6 = n(19), Fs6 = n(21), Gs6 = n(23), B6 = n(26), E7 = n(31);
const Q = 0.13; // one step of the ringtone

const TUNES: Record<string, { notes: Note[]; gain: number }> = {
  // Up the E major chord, a turn at the top, and back down: about 1.7 s, repeated while it rings.
  ringtone: {
    gain: 0.16,
    notes: [[E6, Q], [B5, Q], [E6, Q], [Gs6, Q], [Fs6, Q], [E6, Q], [Cs6, Q * 2], [0, Q],
      [E5, Q], [Gs5, Q], [B5, Q], [E6, Q * 2]],
  },
  // A text: two quick high notes.
  text: { gain: 0.13, notes: [[B6, 0.08], [0, 0.05], [E7, 0.14]] },
};

/** Plays a handset tune into `out` (the game's master bus). */
export function playTune(ctx: AudioContext, out: AudioNode, name: keyof typeof TUNES | string): void {
  const tune = TUNES[name];
  if (!tune) return;
  // The phone's speaker: nothing much below 700 Hz, rolled off above 5 kHz.
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5000;
  const bus = ctx.createGain(); bus.gain.value = tune.gain;
  bus.connect(hp).connect(lp).connect(out);
  let t = ctx.currentTime + 0.02;
  const nodes: AudioNode[] = [bus, hp, lp];
  for (const [f, len] of tune.notes) {
    if (f > 0) {
      // A square wave softened with a sine an octave up: the classic handset timbre.
      for (const [type, mul, level] of [['square', 1, 0.35], ['sine', 2, 0.25]] as const) {
        const o = ctx.createOscillator();
        o.type = type; o.frequency.value = f * mul;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(level, t + 0.008);
        g.gain.setValueAtTime(level, t + len * 0.7);
        g.gain.linearRampToValueAtTime(0, t + len * 0.95);
        o.connect(g).connect(bus);
        o.start(t); o.stop(t + len);
        nodes.push(o, g);
      }
    }
    t += len;
  }
  window.setTimeout(() => nodes.forEach((x) => x.disconnect()), (t - ctx.currentTime + 0.3) * 1000);
}
