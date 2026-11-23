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

/** 'mvhd': [version][flags×3] then v0: ctime, mtime, timescale, duration (u32) / v1: u64 times. */
function mp4(buf: Buffer): number | null {
  const at = buf.indexOf('mvhd');
  if (at < 0) return null;
  const v = buf[at + 4];
  const scale = v === 1 ? buf.readUInt32BE(at + 24) : buf.readUInt32BE(at + 16);
  const dur = v === 1 ? Number(buf.readBigUInt64BE(at + 28)) : buf.readUInt32BE(at + 20);
  return scale > 0 ? dur / scale : null;
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
