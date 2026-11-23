// Track lengths read from audio file headers (no decoding, no packages): MP4/M4A from the movie
// header box, MP3 from a Xing/Info frame count or the CBR bitrate, WAV from its byte rate.
// Returns seconds, or null when the format isn't understood.

export function audioDuration(buf: Buffer, ext: string): number | null {
  try {
    if (ext === '.m4a' || ext === '.mp4' || ext === '.aac') return mp4(buf);
    if (ext === '.mp3') return mp3(buf);
    if (ext === '.wav') return wav(buf);
  } catch { /* malformed */ }
  return null;
}

/** Child boxes of [start, end): type → body offset and end, in file order. */
function boxes(buf: Buffer, start: number, end: number): { type: string; body: number; end: number }[] {
  const out: { type: string; body: number; end: number }[] = [];
  for (let i = start; i + 8 <= end;) {
    let size = buf.readUInt32BE(i), hdr = 8;
    if (size === 1) { size = Number(buf.readBigUInt64BE(i + 8)); hdr = 16; }
    if (size === 0) size = end - i;
    if (size < hdr) break;
    out.push({ type: buf.toString('latin1', i + 4, i + 8), body: i + hdr, end: Math.min(end, i + size) });
    i += size;
  }
  return out;
}

/** The sound track's length: its track header duration (after its edit list), in the movie's
 *  timescale. Not the movie header's: that is the longest track, and some files carry a subtitle
 *  track that runs on seconds past the audio. 'mvhd' / 'tkhd' bodies: [version][flags×3], then
 *  v0 u32 times / v1 u64 times. */
function mp4(buf: Buffer): number | null {
  const moov = boxes(buf, 0, buf.length).find((b) => b.type === 'moov');
  if (!moov) return null;
  const kids = boxes(buf, moov.body, moov.end);
  const mvhd = kids.find((b) => b.type === 'mvhd');
  if (!mvhd) return null;
  const mv = buf[mvhd.body];
  const scale = mv === 1 ? buf.readUInt32BE(mvhd.body + 20) : buf.readUInt32BE(mvhd.body + 12);
  const movieDur = mv === 1 ? Number(buf.readBigUInt64BE(mvhd.body + 24)) : buf.readUInt32BE(mvhd.body + 16);
  if (!(scale > 0)) return null;
  for (const trak of kids.filter((b) => b.type === 'trak')) {
    const parts = boxes(buf, trak.body, trak.end);
    const mdia = parts.find((b) => b.type === 'mdia');
    const hdlr = mdia && boxes(buf, mdia.body, mdia.end).find((b) => b.type === 'hdlr');
    if (!hdlr || buf.toString('latin1', hdlr.body + 8, hdlr.body + 12) !== 'soun') continue;
    const tkhd = parts.find((b) => b.type === 'tkhd');
    if (!tkhd) break;
    const tv = buf[tkhd.body];
    const dur = tv === 1 ? Number(buf.readBigUInt64BE(tkhd.body + 28)) : buf.readUInt32BE(tkhd.body + 20);
    if (dur > 0) return dur / scale;
    break;
  }
  return movieDur / scale;
}

const MP3_BITRATES = [
  [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], // MPEG-1 layer III
  [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], // MPEG-2/2.5 layer III
];
const MP3_RATES = [[44100, 48000, 32000], [22050, 24000, 16000], [11025, 12000, 8000]];

function mp3(buf: Buffer): number | null {
  let i = 0;
  if (buf.toString('latin1', 0, 3) === 'ID3') i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
  while (i < buf.length - 4 && !(buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0)) i++;
  if (i >= buf.length - 4) return null;
  const ver = (buf[i + 1] >> 3) & 3; // 3 = MPEG-1, 2 = MPEG-2, 0 = MPEG-2.5
  const mpeg1 = ver === 3;
  const kbps = MP3_BITRATES[mpeg1 ? 0 : 1][buf[i + 2] >> 4];
  const rate = MP3_RATES[mpeg1 ? 0 : ver === 2 ? 1 : 2][(buf[i + 2] >> 2) & 3];
  const mono = (buf[i + 3] >> 6) === 3;
  if (!kbps || !rate) return null;
  const samples = mpeg1 ? 1152 : 576;
  // Xing/Info header (VBR or LAME CBR) carries the frame count.
  const x = i + 4 + (mpeg1 ? (mono ? 17 : 32) : (mono ? 9 : 17));
  const tag = buf.toString('latin1', x, x + 4);
  if ((tag === 'Xing' || tag === 'Info') && buf.readUInt32BE(x + 4) & 1) return (buf.readUInt32BE(x + 8) * samples) / rate;
  return ((buf.length - i) * 8) / (kbps * 1000);
}

function wav(buf: Buffer): number | null {
  if (buf.toString('latin1', 0, 4) !== 'RIFF') return null;
  let byteRate = 0;
  for (let i = 12; i + 8 <= buf.length;) {
    const id = buf.toString('latin1', i, i + 4), size = buf.readUInt32LE(i + 4);
    if (id === 'fmt ') byteRate = buf.readUInt32LE(i + 16);
    if (id === 'data') return byteRate ? size / byteRate : null;
    i += 8 + size + (size & 1);
  }
  return null;
}
