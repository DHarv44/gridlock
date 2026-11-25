// A voice down a phone line, done live from one clean recording (src/client/voice/*.ogg):
// - payphone: an old analogue line. Narrow band (about 300 Hz to 3 kHz) with the honk of a carbon
//   earpiece, a touch of saturation, and a hiss bed with the odd crackle under it.
// - cell: clean, as recorded (no filter).

/** How a line is heard: down a payphone's line (filtered), a cell's (clean), or `local`: you,
 *  speaking (clean). */
export type Line = 'payphone' | 'cell' | 'local';

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

  if (line !== 'payphone') {
    src.connect(bus);
  } else {
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
