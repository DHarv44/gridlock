// A voice down a phone line, done live from one clean recording (src/client/voice/*.ogg):
// - payphone: an old analogue line. Narrow band (about 300 Hz to 3 kHz) with the honk of a carbon
//   earpiece, a touch of saturation, and a hiss bed with the odd crackle under it.
// - cell: a digital call. A little wider, no hiss, but the codec's grain (quantised) and now and
//   then a few tens of milliseconds dropping out.

export type Line = 'payphone' | 'cell';

/** Plays `buf` down a phone line into `out`; resolves when it's finished. */
export function playOnLine(ctx: AudioContext, out: AudioNode, buf: AudioBuffer, line: Line, gain: number): Promise<void> {
  const t0 = ctx.currentTime + 0.05;
  const dur = buf.duration;
  const nodes: AudioNode[] = [];
  const keep = <T extends AudioNode>(n: T): T => { nodes.push(n); return n; };
  const src = keep(ctx.createBufferSource());
  src.buffer = buf;
  const bus = keep(ctx.createGain());
  bus.gain.value = gain;
  bus.connect(out);

  const band = (lo: number, hi: number): AudioNode => {
    const hp = keep(ctx.createBiquadFilter()); hp.type = 'highpass'; hp.frequency.value = lo; hp.Q.value = 0.9;
    const lp = keep(ctx.createBiquadFilter()); lp.type = 'lowpass'; lp.frequency.value = hi; lp.Q.value = 0.9;
    hp.connect(lp);
    src.connect(hp);
    return lp;
  };

  if (line === 'payphone') {
    const narrow = band(320, 3000);
    const honk = keep(ctx.createBiquadFilter()); honk.type = 'peaking'; honk.frequency.value = 1700; honk.Q.value = 1.1; honk.gain.value = 5;
    const sat = keep(ctx.createWaveShaper()); sat.curve = softClip(2.2); sat.oversample = '2x';
    // The saturation adds level: brought back down to sit with a cell call.
    const trim = keep(ctx.createGain()); trim.gain.value = 0.55;
    narrow.connect(honk).connect(sat).connect(trim).connect(bus);
    // The line itself: hiss with crackles, running for the length of the line.
    const noise = keep(ctx.createBufferSource());
    noise.buffer = lineNoise(ctx, dur + 0.3);
    const nf = keep(ctx.createBiquadFilter()); nf.type = 'bandpass'; nf.frequency.value = 2400; nf.Q.value = 0.6;
    const ng = keep(ctx.createGain()); ng.gain.value = 0.016;
    noise.connect(nf).connect(ng).connect(bus);
    noise.start(t0 - 0.05);
  } else {
    const clean = band(240, 3800);
    // The codec: part of the signal quantised to a few bits, mixed under the clean band.
    const grain = keep(ctx.createWaveShaper()); grain.curve = quantise(5);
    const gg = keep(ctx.createGain()); gg.gain.value = 0.35;
    const cg = keep(ctx.createGain()); cg.gain.value = 0.75;
    clean.connect(grain).connect(gg).connect(bus);
    clean.connect(cg).connect(bus);
    // Dropouts: one or two short gaps in a longer line.
    const gaps = dur > 2.5 ? 1 + Math.floor(Math.random() * 2) : Math.random() < 0.4 ? 1 : 0;
    for (let i = 0; i < gaps; i++) {
      const at = t0 + 0.4 + Math.random() * Math.max(0.2, dur - 0.8), len = 0.04 + Math.random() * 0.05;
      bus.gain.setValueAtTime(gain, at);
      bus.gain.linearRampToValueAtTime(0.02 * gain, at + 0.008);
      bus.gain.setValueAtTime(0.02 * gain, at + len);
      bus.gain.linearRampToValueAtTime(gain, at + len + 0.01);
    }
  }
  src.start(t0);
  return new Promise((done) => {
    src.onended = () => { for (const n of nodes) n.disconnect(); done(); };
  });
}

function softClip(drive: number): Float32Array<ArrayBuffer> {
  const n = 1024, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * drive) / Math.tanh(drive); }
  return c;
}

function quantise(bits: number): Float32Array<ArrayBuffer> {
  const n = 4096, steps = 2 ** bits, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.round(x * steps / 2) / (steps / 2); }
  return c;
}

/** Hiss with sparse crackles (made once per length bucket, then reused). */
const noiseCache = new Map<number, AudioBuffer>();
function lineNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const key = Math.ceil(seconds);
  const hit = noiseCache.get(key);
  if (hit && hit.sampleRate === ctx.sampleRate) return hit;
  const len = Math.floor(key * ctx.sampleRate);
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
  // Crackles: a few short bursts a second.
  for (let k = 0; k < key * 4; k++) {
    const at = Math.floor(Math.random() * (len - 200)), amp = 1.5 + Math.random() * 2.5;
    for (let j = 0; j < 60 + Math.random() * 120; j++) d[at + j] += (Math.random() * 2 - 1) * amp * (1 - j / 180);
  }
  noiseCache.set(key, b);
  return b;
}
