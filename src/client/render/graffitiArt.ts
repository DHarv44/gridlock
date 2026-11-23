// Draws a gang's graffiti atlas: versions of its mark, one per 512 × 256 row, painted to look
// sprayed: soft edges, an overspray haze, drips, splatter and grain where the paint didn't take.
// Mostly the symbol and the number; words are short (initials, Roman numerals).
import * as THREE from 'three';
import { FACTIONS, type FactionSpec } from '../../shared/packs';
import { Rng } from '../../shared/rng';
import { drawSymbol } from './gangSymbols';

export const CELL_W = 512, CELL_H = 256;
const INK = '#0b0b0c';
const PLACA = '"Old English Text MT", "Engravers Old English BT", "Cloister Black", "Times New Roman", serif';
const HAND = '"Segoe Script", "Brush Script MT", "Comic Sans MS", cursive';
const BLOCK = 'Impact, "Arial Black", sans-serif';

type Style = 'symbol' | 'symbolNumber' | 'placa' | 'throw' | 'roman' | 'tag' | 'crossout' | 'outline';
/** Atlas rows. `big` pieces suit rooftops; anything suits a wall. */
export const PIECES: { style: Style; big: boolean }[] = [
  { style: 'symbol', big: true },
  { style: 'symbolNumber', big: true },
  { style: 'placa', big: true },
  { style: 'throw', big: true },
  { style: 'roman', big: false },
  { style: 'tag', big: false },
  { style: 'crossout', big: false },
  { style: 'outline', big: false },
];

interface Ctx { g: CanvasRenderingContext2D; f: FactionSpec; rng: Rng; color: string; accent: string; symbol: string; words: string[] }

/** Hand-painted letters: each character slightly off in size, tilt and baseline. */
function word(c: Ctx, text: string, x: number, y: number, size: number, font: string, fill: string | null, outline = size * 0.12): void {
  const g = c.g;
  g.font = `bold ${size}px ${font}`;
  const widths = [...text].map((ch) => g.measureText(ch).width * 0.96);
  let cx = x - widths.reduce((a, b) => a + b, 0) / 2;
  [...text].forEach((ch, i) => {
    const s = size * (0.92 + c.rng.next() * 0.16);
    g.save();
    g.translate(cx + widths[i] / 2, y + (c.rng.next() - 0.5) * size * 0.08);
    g.rotate((c.rng.next() - 0.5) * 0.14);
    g.font = `bold ${s}px ${font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    if (outline > 0) { g.lineWidth = outline; g.strokeStyle = INK; g.strokeText(ch, 0, 0); }
    if (fill) { g.fillStyle = fill; g.fillText(ch, 0, 0); }
    g.restore();
    cx += widths[i];
  });
}

/** Paint runs: thin lines with a fat bead at the bottom. */
function drips(c: Ctx, color: string, x0: number, x1: number, y: number, n: number): void {
  const g = c.g;
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = x0 + c.rng.next() * (x1 - x0), len = 10 + c.rng.next() * 50, w = 2 + c.rng.next() * 2.5;
    g.fillRect(x, y, w, len);
    g.beginPath(); g.arc(x + w / 2, y + len, w * 0.9, 0, Math.PI * 2); g.fill();
  }
}

function piece(c: Ctx, style: Style): void {
  const { g, color, accent, symbol, words } = c;
  const [initials, number, roman] = [words[0], words[1] ?? words[0], words[2] ?? words[0]];
  g.strokeStyle = INK;
  switch (style) {
    case 'symbol':
      drawSymbol(g, symbol, 220, color, accent);
      drips(c, color, -60, 60, 70, 4);
      break;
    case 'symbolNumber':
      g.save(); g.translate(-120, 0); drawSymbol(g, symbol, 190, color, accent); g.restore();
      word(c, number, 95, 8, 170, BLOCK, color, 16);
      drips(c, color, 40, 160, 70, 4);
      break;
    case 'placa':
      g.save(); g.translate(0, -78); drawSymbol(g, symbol, 80, color, accent); g.restore();
      word(c, initials, 0, 28, 120, PLACA, color, 10);
      g.lineWidth = 6; g.strokeStyle = color;
      g.beginPath(); g.moveTo(-150, 92); g.lineTo(150, 92); g.stroke();
      break;
    case 'throw':
      // A fast one-colour outline: symbol and number, no fill.
      g.strokeStyle = color;
      g.save(); g.translate(-100, 0); drawSymbol(g, symbol, 170, color, accent, true); g.restore();
      word(c, number, 100, 6, 150, BLOCK, null, 0);
      g.lineWidth = 7; g.strokeStyle = color; g.font = `bold 150px ${BLOCK}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.strokeText(number, 100, 6);
      drips(c, color, -160, 150, 60, 5);
      break;
    case 'roman':
      word(c, roman, 0, 0, 130, PLACA, color, 10);
      drips(c, color, -120, 120, 50, 4);
      break;
    case 'tag': {
      g.save(); g.transform(1, 0, -0.25, 1, 0, 0);
      word(c, initials, 0, -6, 110, HAND, color, 6);
      g.lineWidth = 6; g.strokeStyle = color;
      g.beginPath(); g.moveTo(-130, 62); g.quadraticCurveTo(0, 88, 150, 40); g.stroke();
      g.restore();
      break;
    }
    case 'crossout': {
      // A rival's number, crossed out, with this gang's number beside it.
      const rivalId = c.f.hostile.find((h) => FACTIONS.some((x) => x.id === h && x.gang));
      const rival = FACTIONS.find((x) => x.id === rivalId);
      const theirs = rival?.tags?.[1] ?? '?';
      word(c, theirs, -90, 0, 130, BLOCK, rival?.color ?? '#888', 10);
      g.lineWidth = 16; g.lineCap = 'round'; g.strokeStyle = color;
      g.beginPath(); g.moveTo(-170, -70); g.lineTo(-10, 70); g.moveTo(-170, 70); g.lineTo(-10, -70); g.stroke();
      word(c, number, 120, 0, 140, BLOCK, color, 12);
      drips(c, color, -160, 160, 60, 4);
      break;
    }
    case 'outline':
      g.strokeStyle = color;
      drawSymbol(g, symbol, 210, color, accent, true);
      drips(c, color, -50, 50, 80, 3);
      break;
  }
}

/** One atlas row: haze, paint, grain and splatter on a scratch canvas, then into the atlas. */
function sprayCell(out: CanvasRenderingContext2D, row: number, f: FactionSpec, style: Style, rng: Rng): void {
  const cv = document.createElement('canvas');
  cv.width = CELL_W; cv.height = CELL_H;
  const g = cv.getContext('2d')!;
  const c: Ctx = { g, f, rng, color: f.color, accent: f.brand?.accent ?? '#f2f2ee', symbol: f.brand?.symbol ?? '', words: f.tags?.length ? f.tags : [f.name] };
  const tilt = (rng.next() - 0.5) * 0.16;
  const draw = () => { g.save(); g.translate(CELL_W / 2, CELL_H / 2); g.rotate(tilt); piece(c, style); g.restore(); };
  // Overspray haze, then the paint itself with a slightly soft edge: same jitter in both passes.
  const seed = Math.floor(rng.next() * 2 ** 31);
  const replay = () => { c.rng = new Rng(seed); draw(); };
  g.filter = 'blur(9px)'; g.globalAlpha = 0.28; replay();
  g.filter = 'blur(1.2px)'; g.globalAlpha = 1; replay();
  g.filter = 'none';
  // Where the paint didn't take: speckles knocked out of the coat.
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) {
    g.globalAlpha = 0.2 + rng.next() * 0.6;
    g.fillRect(rng.next() * CELL_W, rng.next() * CELL_H, 1 + rng.next() * 2, 1 + rng.next() * 2);
  }
  // Splatter flecks from the can.
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = f.color;
  for (let i = 0; i < 40; i++) {
    g.globalAlpha = 0.5 + rng.next() * 0.5;
    g.beginPath(); g.arc(CELL_W / 2 + (rng.next() - 0.5) * CELL_W * 0.85, CELL_H / 2 + (rng.next() - 0.5) * CELL_H * 0.85, 0.8 + rng.next() * 2.2, 0, Math.PI * 2); g.fill();
  }
  out.drawImage(cv, 0, row * CELL_H);
}

export function gangAtlas(f: FactionSpec, rng: Rng): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = CELL_W; c.height = CELL_H * PIECES.length;
  const ctx = c.getContext('2d')!;
  PIECES.forEach((p, row) => sprayCell(ctx, row, f, p.style, rng));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
