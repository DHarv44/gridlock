// Draws a gang's graffiti atlas: several versions of its brand, one per 512 × 256 row.
// Styles: the bare symbol (twice, plain and on a badge), symbol + word pieces, bubble-letter
// throw-ups and quick tags. All with overspray and drips, seeded so every client matches.
import * as THREE from 'three';
import type { FactionSpec } from '../../shared/packs';
import type { Rng } from '../../shared/rng';
import { drawSymbol } from './gangSymbols';

export const CELL_W = 512, CELL_H = 256;
const OUTLINE = '#0b0b0c';
const FONT = 'Impact, "Arial Black", sans-serif';

type Style = 'symbol' | 'badge' | 'piece' | 'throwup' | 'tag';
/** Atlas rows. `big` pieces suit rooftops; anything suits a wall. */
export const PIECES: { style: Style; word: number; big: boolean }[] = [
  { style: 'symbol', word: 0, big: true },
  { style: 'badge', word: 0, big: true },
  { style: 'piece', word: 0, big: true },
  { style: 'piece', word: 2, big: true },
  { style: 'throwup', word: 1, big: false },
  { style: 'throwup', word: 2, big: false },
  { style: 'tag', word: 3, big: false },
  { style: 'tag', word: 0, big: false },
];

/** Font size that fits `text` within maxW (and no taller than maxH). */
function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxH: number, weight = '900'): number {
  let size = maxH;
  for (; size > 16; size -= 4) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    if (ctx.measureText(text).width <= maxW) break;
  }
  return size;
}

function overspray(ctx: CanvasRenderingContext2D, color: string, w: number, h: number, rng: Rng): void {
  ctx.fillStyle = `${color}1c`;
  for (let i = 0; i < 140; i++) {
    ctx.beginPath();
    ctx.arc((rng.next() - 0.5) * w, (rng.next() - 0.5) * h, 2 + rng.next() * 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drips(ctx: CanvasRenderingContext2D, color: string, width: number, y: number, size: number, rng: Rng, n = 6): void {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = (rng.next() - 0.5) * width * 0.9;
    ctx.fillRect(x, y, 3 + rng.next() * 3, size * (0.12 + rng.next() * 0.45));
  }
}

/** Fat rounded letters: black edge, gang-colour line, accent fill (a "throw-up"). */
function bubble(ctx: CanvasRenderingContext2D, text: string, size: number, color: string, fill: string): void {
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.32; ctx.strokeStyle = OUTLINE; ctx.strokeText(text, 0, 0);
  ctx.lineWidth = size * 0.18; ctx.strokeStyle = color; ctx.strokeText(text, 0, 0);
  ctx.fillStyle = fill; ctx.fillText(text, 0, 0);
  ctx.lineWidth = Math.max(2, size * 0.03); ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.strokeText(text, -size * 0.02, -size * 0.03);
}

function cell(ctx: CanvasRenderingContext2D, f: FactionSpec, style: Style, word: string, rng: Rng): void {
  const color = f.color, accent = f.brand?.accent ?? '#f2f2ee', symbol = f.brand?.symbol ?? '';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.rotate((rng.next() - 0.5) * (style === 'tag' ? 0.25 : 0.12));
  overspray(ctx, style === 'badge' ? accent : color, CELL_W * 0.8, CELL_H * 0.8, rng);
  switch (style) {
    case 'symbol':
      drawSymbol(ctx, symbol, 230, color, accent);
      drips(ctx, color, 160, 70, 60, rng, 5);
      break;
    case 'badge':
      ctx.beginPath(); ctx.arc(0, 0, 112, 0, Math.PI * 2);
      ctx.lineWidth = 12; ctx.strokeStyle = OUTLINE; ctx.stroke();
      ctx.fillStyle = accent; ctx.fill();
      drawSymbol(ctx, symbol, 190, color, OUTLINE);
      drips(ctx, accent, 150, 100, 50, rng, 4);
      break;
    case 'piece': {
      ctx.save(); ctx.translate(-150, 0); drawSymbol(ctx, symbol, 190, color, accent); ctx.restore();
      ctx.save(); ctx.translate(95, 0);
      const size = fit(ctx, word, 290, 120);
      bubble(ctx, word, size, color, accent);
      drips(ctx, color, 260, size * 0.36, size, rng, 4);
      ctx.restore();
      break;
    }
    case 'throwup': {
      const size = fit(ctx, word, 440, 150);
      bubble(ctx, word, size, color, rng.chance(0.5) ? '#f2f2ee' : accent);
      drips(ctx, color, 380, size * 0.36, size, rng, 6);
      break;
    }
    case 'tag': {
      // Quick slanted handstyle with a swoosh underline.
      ctx.transform(1, 0, -0.3, 1, 0, 0);
      const size = fit(ctx, word, 400, 120, 'italic 900');
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.12; ctx.strokeStyle = OUTLINE; ctx.strokeText(word, 0, 0);
      ctx.fillStyle = color; ctx.fillText(word, 0, 0);
      const w = ctx.measureText(word).width;
      ctx.beginPath(); ctx.moveTo(-w / 2, size * 0.48); ctx.quadraticCurveTo(0, size * 0.62, w / 2 + 30, size * 0.36);
      ctx.lineWidth = 9; ctx.strokeStyle = OUTLINE; ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = color; ctx.stroke();
      drips(ctx, color, w, size * 0.3, size, rng, 4);
      break;
    }
  }
}

export function gangAtlas(f: FactionSpec, rng: Rng): THREE.CanvasTexture {
  const words = f.tags?.length ? f.tags : [f.name.toUpperCase()];
  const c = document.createElement('canvas');
  c.width = CELL_W; c.height = CELL_H * PIECES.length;
  const ctx = c.getContext('2d')!;
  PIECES.forEach((p, row) => {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, row * CELL_H, CELL_W, CELL_H); ctx.clip();
    ctx.translate(CELL_W / 2, row * CELL_H + CELL_H / 2);
    cell(ctx, f, p.style, words[p.word % words.length], rng);
    ctx.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
