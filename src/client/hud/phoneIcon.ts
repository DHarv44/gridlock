// The ringing-payphone icon: a handset on a disc in the gang's colour, used by the radar, the city
// map and the payphone's own sign.

/** A telephone handset (earpiece and mouthpiece joined by a curved grip), centred on (x, y). */
export function handset(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  g.save();
  g.translate(x, y);
  g.rotate(-Math.PI / 4);
  g.strokeStyle = color; g.fillStyle = color;
  g.lineWidth = r * 0.32; g.lineCap = 'round';
  g.beginPath(); g.arc(0, r * 0.55, r * 0.95, Math.PI * 1.22, Math.PI * 1.78); g.stroke();
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(s * r * 0.62, -r * 0.08, r * 0.3, r * 0.2, s * 0.5, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** A ringing phone on a map: gang-coloured disc, dark handset, and a pulse ring while it rings. */
export function phoneBlip(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  const t = (performance.now() % 1500) / 1500;
  g.strokeStyle = color; g.globalAlpha = 1 - t; g.lineWidth = 2;
  g.beginPath(); g.arc(x, y, r * (1 + t * 0.9), 0, Math.PI * 2); g.stroke();
  g.globalAlpha = 1;
  g.fillStyle = color; g.strokeStyle = '#000'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
  handset(g, x, y + r * 0.08, r * 0.62, '#111');
}
