// Gang symbols for graffiti: a registry of drawers keyed by symbol kind (the pack says which kind
// a gang uses). Each draws centred on (0, 0) within a box of size s: black outline, the gang's
// colour, its accent for details.
type Draw = (ctx: CanvasRenderingContext2D, s: number, color: string, accent: string) => void;

const OUTLINE = '#0b0b0c';

function poly(ctx: CanvasRenderingContext2D, s: number, pts: [number, number][]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
  ctx.closePath();
}

function inked(ctx: CanvasRenderingContext2D, s: number, fill: string, width = 0.05): void {
  ctx.lineJoin = 'round';
  ctx.lineWidth = s * width;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Coiled serpent: an S-curved body with scale dots, diamond head, forked tongue. */
const serpent: Draw = (ctx, s, color, accent) => {
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-0.4 * s, 0.34 * s);
    ctx.bezierCurveTo(-0.62 * s, -0.04 * s, 0.06 * s, 0.26 * s, 0, -0.02 * s);
    ctx.bezierCurveTo(-0.06 * s, -0.28 * s, 0.34 * s, -0.22 * s, 0.24 * s, -0.3 * s);
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  body(); ctx.lineWidth = s * 0.27; ctx.strokeStyle = OUTLINE; ctx.stroke();
  body(); ctx.lineWidth = s * 0.19; ctx.strokeStyle = color; ctx.stroke();
  body(); ctx.lineWidth = s * 0.05; ctx.setLineDash([s * 0.02, s * 0.07]); ctx.strokeStyle = accent; ctx.stroke(); ctx.setLineDash([]);
  // Head, pointing up and right.
  ctx.save();
  ctx.translate(0.27 * s, -0.33 * s);
  ctx.rotate(-0.6);
  ctx.scale(1.35, 1.35);
  poly(ctx, s, [[0.16, 0], [0.02, -0.1], [-0.08, 0], [0.02, 0.1]]);
  inked(ctx, s, color);
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.ellipse(0.05 * s, -0.04 * s, s * 0.022, s * 0.012, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.05 * s, 0.04 * s, s * 0.022, s * 0.012, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d0202a';
  ctx.lineWidth = s * 0.018;
  ctx.beginPath(); ctx.moveTo(0.16 * s, 0); ctx.lineTo(0.25 * s, 0); ctx.lineTo(0.3 * s, -0.03 * s);
  ctx.moveTo(0.25 * s, 0); ctx.lineTo(0.3 * s, 0.03 * s); ctx.stroke();
  ctx.restore();
};

/** Snarling hound's head, front on, in a spiked collar. */
const hound: Draw = (ctx, s, color, accent) => {
  // Collar with spikes.
  ctx.beginPath();
  ctx.ellipse(0, 0.36 * s, 0.3 * s, 0.08 * s, 0, 0, Math.PI * 2);
  inked(ctx, s, '#2a2a2e', 0.04);
  for (let i = -3; i <= 3; i++) {
    const x = i * 0.08;
    poly(ctx, s, [[x - 0.03, 0.38], [x, 0.48], [x + 0.03, 0.38]]);
    inked(ctx, s, accent, 0.025);
  }
  // Ears, then the head over them.
  poly(ctx, s, [[-0.34, -0.42], [-0.1, -0.16], [-0.36, -0.02]]); inked(ctx, s, color);
  poly(ctx, s, [[0.34, -0.42], [0.1, -0.16], [0.36, -0.02]]); inked(ctx, s, color);
  poly(ctx, s, [[-0.3, -0.16], [0.3, -0.16], [0.34, 0.08], [0.17, 0.3], [0, 0.38], [-0.17, 0.3], [-0.34, 0.08]]);
  inked(ctx, s, color);
  // Angry eyes, nose, fangs.
  ctx.fillStyle = OUTLINE;
  poly(ctx, s, [[-0.22, -0.06], [-0.05, 0.02], [-0.2, 0.04]]); ctx.fill();
  poly(ctx, s, [[0.22, -0.06], [0.05, 0.02], [0.2, 0.04]]); ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(-0.15 * s, 0.01 * s, s * 0.015, 0, Math.PI * 2); ctx.arc(0.15 * s, 0.01 * s, s * 0.015, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = OUTLINE;
  ctx.beginPath(); ctx.ellipse(0, 0.16 * s, 0.07 * s, 0.045 * s, 0, 0, Math.PI * 2); ctx.fill();
  poly(ctx, s, [[-0.09, 0.25], [-0.05, 0.36], [-0.02, 0.26]]); inked(ctx, s, '#f2f2ee', 0.015);
  poly(ctx, s, [[0.09, 0.25], [0.05, 0.36], [0.02, 0.26]]); inked(ctx, s, '#f2f2ee', 0.015);
};

/** Burning sun: alternating flame rays round a disc with a hard stare. */
const sun: Draw = (ctx, s, color, accent) => {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = i % 2 ? 0.36 : 0.47;
    const w = 0.13;
    poly(ctx, s, [
      [Math.cos(a - w) * 0.2, Math.sin(a - w) * 0.2],
      [Math.cos(a) * r, Math.sin(a) * r],
      [Math.cos(a + w) * 0.2, Math.sin(a + w) * 0.2],
    ]);
    inked(ctx, s, i % 2 ? color : accent, 0.035);
  }
  ctx.beginPath();
  ctx.arc(0, 0, 0.24 * s, 0, Math.PI * 2);
  inked(ctx, s, color);
  ctx.fillStyle = OUTLINE;
  poly(ctx, s, [[-0.15, -0.05], [-0.03, -0.02], [-0.13, 0.03]]); ctx.fill();
  poly(ctx, s, [[0.15, -0.05], [0.03, -0.02], [0.13, 0.03]]); ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = s * 0.03;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-0.09 * s, 0.11 * s); ctx.quadraticCurveTo(0, 0.08 * s, 0.09 * s, 0.11 * s); ctx.stroke();
};

const SYMBOLS: Record<string, Draw> = { serpent, hound, sun };

/** Draws a symbol kind; unknown kinds draw a plain ringed dot so a pack typo is visible. */
export function drawSymbol(ctx: CanvasRenderingContext2D, kind: string, s: number, color: string, accent: string): void {
  const d = SYMBOLS[kind];
  if (d) { d(ctx, s, color, accent); return; }
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
  inked(ctx, s, color);
}
