// Gang symbols for graffiti: a registry of drawers keyed by symbol kind (the pack says which kind
// a gang uses). Simple, instantly recognisable shapes: each draws centred on (0, 0) within a box
// of size s, filled with `color`, details in `accent`. Strokes use the current strokeStyle as the
// outline so the art code can draw outline-only "throws" too.
type Draw = (ctx: CanvasRenderingContext2D, s: number, color: string, accent: string, outlineOnly: boolean) => void;

function shape(ctx: CanvasRenderingContext2D, s: number, pts: [number, number][]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
  ctx.closePath();
}

/** Outline first (fat), then the fill on top, like a painter cutting in. */
function paint(ctx: CanvasRenderingContext2D, s: number, fill: string, outlineOnly: boolean, width = 0.06): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = s * width;
  ctx.stroke();
  if (!outlineOnly) { ctx.fillStyle = fill; ctx.fill(); }
}

/** Calavera: round skull, hollow eyes, heart-shaped nose, stitched teeth, crossed bones behind. */
const skull: Draw = (ctx, s, color, accent, outlineOnly) => {
  for (const flip of [1, -1]) {
    ctx.save();
    ctx.rotate(flip * 0.7);
    ctx.beginPath();
    ctx.roundRect(-0.46 * s, -0.045 * s, 0.92 * s, 0.09 * s, 0.045 * s);
    for (const end of [-0.46, 0.46]) {
      for (const cy of [-0.05, 0.05]) { ctx.moveTo((end + 0.05) * s, cy * s); ctx.arc(end * s, cy * s, 0.05 * s, 0, Math.PI * 2); }
    }
    paint(ctx, s, accent, outlineOnly, 0.04);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, -0.08 * s, 0.27 * s, Math.PI * 0.8, Math.PI * 2.2);
  ctx.lineTo(0.17 * s, 0.24 * s);
  ctx.lineTo(-0.17 * s, 0.24 * s);
  ctx.closePath();
  paint(ctx, s, color, outlineOnly);
  if (outlineOnly) return;
  const ink = ctx.strokeStyle as string;
  ctx.fillStyle = ink;
  ctx.beginPath(); ctx.ellipse(-0.11 * s, -0.04 * s, 0.075 * s, 0.085 * s, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.11 * s, -0.04 * s, 0.075 * s, 0.085 * s, -0.2, 0, Math.PI * 2); ctx.fill();
  shape(ctx, s, [[0, 0.06], [-0.035, 0.13], [0.035, 0.13]]); ctx.fill();
  ctx.lineWidth = s * 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.13 * s, 0.19 * s); ctx.lineTo(0.13 * s, 0.19 * s);
  for (let i = -2; i <= 2; i++) { ctx.moveTo(i * 0.05 * s, 0.16 * s); ctx.lineTo(i * 0.05 * s, 0.23 * s); }
  ctx.stroke();
};

/** The devil's pitchfork: shaft with three barbed prongs and a pointed tail. */
const pitchfork: Draw = (ctx, s, color, _accent, outlineOnly) => {
  shape(ctx, s, [
    [-0.035, 0.46], [-0.035, -0.06], [-0.2, -0.06], [-0.2, -0.36], [-0.26, -0.3], [-0.2, -0.46], [-0.14, -0.3],
    [-0.14, -0.12], [-0.035, -0.12], [-0.035, -0.36], [-0.08, -0.32], [0, -0.48], [0.08, -0.32], [0.035, -0.36],
    [0.035, -0.12], [0.14, -0.12], [0.14, -0.3], [0.2, -0.46], [0.26, -0.3], [0.2, -0.36], [0.2, -0.06],
    [0.035, -0.06], [0.035, 0.46],
  ]);
  paint(ctx, s, color, outlineOnly);
  // Tail-tip arrowhead at the butt of the shaft.
  shape(ctx, s, [[0, 0.5], [-0.09, 0.4], [0.09, 0.4]]);
  paint(ctx, s, color, outlineOnly);
};

/** Dollar sign: a fat S with the bar through it. */
const dollar: Draw = (ctx, s, color, _accent, outlineOnly) => {
  ctx.save();
  ctx.font = `900 ${s * 0.95}px Impact, "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = s * 0.09;
  ctx.strokeText('$', 0, s * 0.03);
  if (!outlineOnly) { ctx.fillStyle = color; ctx.fillText('$', 0, s * 0.03); }
  ctx.restore();
};

const SYMBOLS: Record<string, Draw> = { skull, pitchfork, dollar };

/** Draws a symbol kind with the current strokeStyle as its outline; unknown kinds draw a ringed
 *  dot so a pack typo shows up. */
export function drawSymbol(ctx: CanvasRenderingContext2D, kind: string, s: number, color: string, accent: string, outlineOnly = false): void {
  const d = SYMBOLS[kind];
  if (d) { d(ctx, s, color, accent, outlineOnly); return; }
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
  paint(ctx, s, color, outlineOnly);
}
