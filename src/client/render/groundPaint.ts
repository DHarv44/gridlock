// Paints a square chunk of the city ground (roads, markings, sidewalks, lots, water) to a canvas.
import { Rng } from '../../shared/rng';
import { SERVICES, ZONES } from '../../shared/packs';
import type { CityMap } from '../../shared/world/city';
import { LAND0, LAND1, LANE_W, type Lot } from '../../shared/world/cityTypes';

export const CHUNK = 128;
export const PX = 4; // pixels per metre
const ASPHALT = '#3b3e43';
const ASPHALT_ART = '#36393e';
const CURB = '#b7b4ab';
const WATER = '#1f4250';
const LINE_W = '#e8e6df';
const LINE_Y = '#e2b93b';

let noise: HTMLCanvasElement | null = null;
function noisePattern(): HTMLCanvasElement {
  if (noise) return noise;
  noise = document.createElement('canvas');
  noise.width = noise.height = 256;
  const ctx = noise.getContext('2d')!;
  const img = ctx.createImageData(256, 256);
  const rng = new Rng(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + rng.next() * 50;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return noise;
}

export function paintChunk(map: CityMap, cx: number, cy: number, canvas: HTMLCanvasElement): void {
  const city = map.city;
  const size = CHUNK * PX;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const X0 = cx * CHUNK, Y0 = cy * CHUNK, X1 = X0 + CHUNK, Y1 = Y0 + CHUNK;
  ctx.setTransform(PX, 0, 0, PX, -X0 * PX, -Y0 * PX);
  const inView = (x0: number, y0: number, x1: number, y1: number) => x1 >= X0 && x0 <= X1 && y1 >= Y0 && y0 <= Y1;
  const rect = (x0: number, y0: number, x1: number, y1: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); };

  rect(X0, Y0, X1, Y1, WATER);
  // Shoreline: a lighter shallow band, then land.
  rect(LAND0 - 3, LAND0 - 3, LAND1 + 3, LAND1 + 3, '#2c5866');
  rect(LAND0, LAND0, LAND1, LAND1, CURB);
  const r = map.river;
  if (inView(0, r.y0, 4096, r.y1)) {
    rect(X0, r.y0 - 1.5, X1, r.y1 + 1.5, '#8c8a82');
    rect(X0, r.y0, X1, r.y1, WATER);
  }

  // Roads.
  for (const s of city.segs) {
    const hw = s.width / 2;
    const x0 = Math.min(s.x0, s.x1) - (s.axis === 'v' ? hw : 0), x1 = Math.max(s.x0, s.x1) + (s.axis === 'v' ? hw : 0);
    const y0 = Math.min(s.y0, s.y1) - (s.axis === 'h' ? hw : 0), y1 = Math.max(s.y0, s.y1) + (s.axis === 'h' ? hw : 0);
    if (!inView(x0, y0, x1, y1)) continue;
    rect(x0, y0, x1, y1, s.lanes > 1 ? ASPHALT_ART : ASPHALT);
    if (s.bridge) {
      rect(x0 - 1.2, y0, x0, y1, '#9a978e');
      rect(x1, y0, x1 + 1.2, y1, '#9a978e');
    }
  }
  for (const n of city.nodes) {
    if (!inView(n.x - n.wv, n.y - n.wh, n.x + n.wv, n.y + n.wh)) continue;
    rect(n.x - n.wv / 2, n.y - n.wh / 2, n.x + n.wv / 2, n.y + n.wh / 2, ASPHALT);
  }

  // Blocks and lots.
  for (const b of city.blocks) {
    const br = b.rect;
    if (!inView(br.x0, br.y0, br.x1, br.y1)) continue;
    const z = ZONES[b.zone];
    rect(br.x0, br.y0, br.x1, br.y1, z.sidewalk);
    // Curb edge.
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.25;
    ctx.strokeRect(br.x0 + 0.12, br.y0 + 0.12, br.x1 - br.x0 - 0.24, br.y1 - br.y0 - 0.24);
    for (const li of b.lots) paintLot(ctx, city.lots[li], z.ground);
  }

  paintMarkings(ctx, map, inView);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.12;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(noisePattern(), 'repeat')!;
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function paintLot(ctx: CanvasRenderingContext2D, lot: Lot, ground: string): void {
  const r = lot.rect, w = r.x1 - r.x0, h = r.y1 - r.y0;
  const fill = (c: string) => { ctx.fillStyle = c; ctx.fillRect(r.x0, r.y0, w, h); };
  switch (lot.use) {
    case 'park': {
      fill('#5c8a43');
      const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
      ctx.fillStyle = '#b9ad8f';
      ctx.fillRect(cx - 2, r.y0, 4, h);
      ctx.fillRect(r.x0, cy - 2, w, 4);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4c7f9a';
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'yard': fill('#6a9150'); paintDriveway(ctx, lot); break;
    case 'plaza': fill('#a29d92'); grid(ctx, r, 3, 'rgba(0,0,0,0.08)'); break;
    case 'parking': fill('#45484d'); stallLines(ctx, lot); break;
    case 'containers': fill('#6f6c66'); break;
    case 'pad': {
      fill('#5a5d55');
      if (lot.service !== undefined && SERVICES[lot.service].verb === 'helipad') helipad(ctx, r);
      break;
    }
    default: {
      fill(ground);
      if (lot.pad) {
        // Drive-in apron in front of service buildings.
        ctx.fillStyle = '#55585d';
        const b = lot.building?.rect;
        if (b) ctx.fillRect(Math.min(r.x0, b.x0), Math.min(r.y0, b.y0), Math.max(r.x1, b.x1) - Math.min(r.x0, b.x0), Math.max(r.y1, b.y1) - Math.min(r.y0, b.y0));
      }
    }
  }
}

function grid(ctx: CanvasRenderingContext2D, r: { x0: number; y0: number; x1: number; y1: number }, step: number, c: string): void {
  ctx.strokeStyle = c;
  ctx.lineWidth = 0.15;
  ctx.beginPath();
  for (let x = r.x0; x <= r.x1; x += step) { ctx.moveTo(x, r.y0); ctx.lineTo(x, r.y1); }
  for (let y = r.y0; y <= r.y1; y += step) { ctx.moveTo(r.x0, y); ctx.lineTo(r.x1, y); }
  ctx.stroke();
}

function paintDriveway(ctx: CanvasRenderingContext2D, lot: Lot): void {
  const b = lot.building?.rect;
  if (!b) return;
  const r = lot.rect;
  ctx.fillStyle = '#8f8d86';
  switch (lot.front) {
    case 0: ctx.fillRect(b.x0 + 0.5, r.y0, 3.5, b.y0 - r.y0); break;
    case 2: ctx.fillRect(b.x0 + 0.5, b.y1, 3.5, r.y1 - b.y1); break;
    case 1: ctx.fillRect(b.x1, b.y0 + 0.5, r.x1 - b.x1, 3.5); break;
    case 3: ctx.fillRect(r.x0, b.y0 + 0.5, b.x0 - r.x0, 3.5); break;
  }
}

function stallLines(ctx: CanvasRenderingContext2D, lot: Lot): void {
  const r = lot.rect;
  const alongX = r.x1 - r.x0 >= r.y1 - r.y0;
  ctx.strokeStyle = 'rgba(240,240,230,0.55)';
  ctx.lineWidth = 0.15;
  ctx.beginPath();
  const len = alongX ? r.x1 - r.x0 : r.y1 - r.y0;
  for (let a = 1.5; a < len - 1.5; a += 2.9) {
    if (alongX) {
      ctx.moveTo(r.x0 + a, r.y0 + 1.5); ctx.lineTo(r.x0 + a, r.y0 + 6.9);
      ctx.moveTo(r.x0 + a, r.y1 - 1.5); ctx.lineTo(r.x0 + a, r.y1 - 6.9);
    } else {
      ctx.moveTo(r.x0 + 1.5, r.y0 + a); ctx.lineTo(r.x0 + 6.9, r.y0 + a);
      ctx.moveTo(r.x1 - 1.5, r.y0 + a); ctx.lineTo(r.x1 - 6.9, r.y0 + a);
    }
  }
  ctx.stroke();
}

function helipad(ctx: CanvasRenderingContext2D, r: { x0: number; y0: number; x1: number; y1: number }): void {
  const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
  ctx.fillStyle = '#3d4046';
  ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e2b93b'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#f2f0ea';
  ctx.fillRect(cx - 3, cy - 4, 1.2, 8); ctx.fillRect(cx + 1.8, cy - 4, 1.2, 8); ctx.fillRect(cx - 3, cy - 0.6, 6, 1.2);
}

function paintMarkings(ctx: CanvasRenderingContext2D, map: CityMap, inView: (a: number, b: number, c: number, d: number) => boolean): void {
  const city = map.city;
  ctx.lineCap = 'butt';
  for (const s of city.segs) {
    const A = city.nodes[s.a], B = city.nodes[s.b];
    const hw = s.width / 2;
    if (!inView(Math.min(s.x0, s.x1) - hw, Math.min(s.y0, s.y1) - hw, Math.max(s.x0, s.x1) + hw, Math.max(s.y0, s.y1) + hw)) continue;
    // Markings stop at the intersections.
    const a0 = (s.axis === 'h' ? A.wv : A.wh) / 2 + 0.5, b0 = (s.axis === 'h' ? B.wv : B.wh) / 2 + 0.5;
    const line = (off: number, color: string, width: number, dash: number[]) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
      ctx.beginPath();
      if (s.axis === 'h') { ctx.moveTo(s.x0 + a0, s.y0 + off); ctx.lineTo(s.x1 - b0, s.y0 + off); }
      else { ctx.moveTo(s.x0 + off, s.y0 + a0); ctx.lineTo(s.x0 + off, s.y1 - b0); }
      ctx.stroke();
    };
    if (s.lanes > 1) {
      line(-0.2, LINE_Y, 0.15, []);
      line(0.2, LINE_Y, 0.15, []);
      line(-LANE_W, LINE_W, 0.15, [3, 6]);
      line(LANE_W, LINE_W, 0.15, [3, 6]);
    } else {
      line(0, LINE_Y, 0.15, [3, 4]);
      if (s.parking) { line(-LANE_W, 'rgba(232,230,223,0.5)', 0.12, []); line(LANE_W, 'rgba(232,230,223,0.5)', 0.12, []); }
    }
    ctx.setLineDash([]);
    // Stop lines.
    ctx.fillStyle = LINE_W;
    const lanesW = s.lanes * LANE_W;
    const sa = a0 + (A.lights ? 2.6 : 0), sb = b0 + (B.lights ? 2.6 : 0);
    if (s.axis === 'h') {
      if (B.segs.length > 2) ctx.fillRect(s.x1 - sb - 0.4, s.y0 + 0.2, 0.4, lanesW);
      if (A.segs.length > 2) ctx.fillRect(s.x0 + sa, s.y0 - 0.2 - lanesW, 0.4, lanesW);
    } else {
      if (B.segs.length > 2) ctx.fillRect(s.x0 - 0.2 - lanesW, s.y1 - sb - 0.4, lanesW, 0.4);
      if (A.segs.length > 2) ctx.fillRect(s.x0 + 0.2, s.y0 + sa, lanesW, 0.4);
    }
  }
  // Zebra crossings at signalled intersections.
  ctx.fillStyle = 'rgba(235,233,226,0.85)';
  for (const n of city.nodes) {
    if (!n.lights || !inView(n.x - n.wv, n.y - n.wh, n.x + n.wv, n.y + n.wh)) continue;
    for (const si of n.segs) {
      const s = city.segs[si];
      const toward = s.a === n.id ? 1 : -1;
      if (s.axis === 'h') {
        const x = n.x + toward * (n.wv / 2 + 0.3) - (toward < 0 ? 2.4 : 0);
        for (let y = n.y - s.width / 2 + 0.6; y < n.y + s.width / 2 - 0.6; y += 1.2) ctx.fillRect(x, y, 2.4, 0.6);
      } else {
        const y = n.y + toward * (n.wh / 2 + 0.3) - (toward < 0 ? 2.4 : 0);
        for (let x = n.x - s.width / 2 + 0.6; x < n.x + s.width / 2 - 0.6; x += 1.2) ctx.fillRect(x, y, 0.6, 2.4);
      }
    }
  }
}
