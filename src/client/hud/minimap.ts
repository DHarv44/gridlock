// Radar and full-screen map rendered from a pre-baked city image.
import { DISTRICTS, SERVICES, ZONES } from '../../shared/packs';
import type { PlayerInfo } from '../../shared/protocol';
import type { CityMap } from '../../shared/world/city';
import { LAND0, LAND1, MAP_SIZE } from '../../shared/world/cityTypes';

const SCALE = 0.5; // px per metre in the baked image

export const PLACE_ICON: Record<string, { color: string; label: string }> = {
  gunshop: { color: '#ff4a3d', label: 'Guns' },
  dealer: { color: '#4fa3ff', label: 'Car dealer' },
  respray: { color: '#ffd34f', label: 'Respray' },
  chopshop: { color: '#ff9a3c', label: 'Chop shop' },
  hospital: { color: '#ffffff', label: 'Hospital' },
  police: { color: '#5a7dff', label: 'Police' },
  fire: { color: '#c0303a', label: 'Fire station' },
  helipad: { color: '#e8e8e8', label: 'Heliport' },
  military: { color: '#7fa05a', label: 'Military base' },
};

export class Minimap {
  readonly baked: HTMLCanvasElement;

  constructor(private map: CityMap) {
    this.baked = document.createElement('canvas');
    this.baked.width = this.baked.height = MAP_SIZE * SCALE;
    const ctx = this.baked.getContext('2d')!;
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = '#16313d';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
    ctx.fillStyle = '#2b2f34';
    ctx.fillRect(LAND0, LAND0, LAND1 - LAND0, LAND1 - LAND0);
    ctx.fillStyle = '#16313d';
    ctx.fillRect(0, map.river.y0, MAP_SIZE, map.river.y1 - map.river.y0);
    for (const b of map.city.bridges) { ctx.fillStyle = '#2b2f34'; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
    for (const b of map.city.blocks) {
      ctx.fillStyle = ZONES[b.zone].mapColor;
      ctx.fillRect(b.rect.x0, b.rect.y0, b.rect.x1 - b.rect.x0, b.rect.y1 - b.rect.y0);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (const bd of map.city.buildings) ctx.fillRect(bd.rect.x0, bd.rect.y0, bd.rect.x1 - bd.rect.x0, bd.rect.y1 - bd.rect.y0);
  }

  /** Draws the radar centred on (x, y) with `range` metres to the edge. */
  drawRadar(ctx: CanvasRenderingContext2D, size: number, x: number, y: number, angle: number, range: number, players: PlayerInfo[], meId: number, owned: Set<number>, hostiles: { x: number; y: number }[]): void {
    const k = size / 2 / range;
    ctx.save();
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#16313d';
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;
    const src = range * 2 * SCALE;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(this.baked, (x - range) * SCALE, (y - range) * SCALE, src, src, 0, 0, size, size);
    ctx.globalAlpha = 1;
    const to = (wx: number, wy: number) => [size / 2 + (wx - x) * k, size / 2 + (wy - y) * k] as const;
    const clampEdge = (px: number, py: number) => {
      const dx = px - size / 2, dy = py - size / 2, d = Math.hypot(dx, dy), m = size / 2 - 7;
      return d > m ? [size / 2 + (dx / d) * m, size / 2 + (dy / d) * m] as const : [px, py] as const;
    };
    for (const s of this.map.city.services) {
      const icon = PLACE_ICON[SERVICES[s.spec].verb];
      const [px, py] = to(s.x, s.y);
      if (px < -6 || py < -6 || px > size + 6 || py > size + 6) continue;
      ctx.fillStyle = icon.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(px - 4, py - 4, 8, 8); ctx.fill(); ctx.stroke();
    }
    for (const p of this.map.city.properties) {
      const [px, py] = to(p.x, p.y);
      if (px < -6 || py < -6 || px > size + 6 || py > size + 6) continue;
      ctx.fillStyle = owned.has(p.id) ? '#6fe08a' : 'rgba(111,224,138,0.35)';
      ctx.beginPath(); ctx.moveTo(px, py - 5); ctx.lineTo(px + 5, py + 4); ctx.lineTo(px - 5, py + 4); ctx.fill();
    }
    for (const h of hostiles) {
      const [px, py] = to(h.x, h.y);
      ctx.fillStyle = Math.floor(performance.now() / 250) % 2 ? '#ff3b30' : '#3b6bff';
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    }
    for (const p of players) {
      if (p.id === meId) continue;
      const [px, py] = clampEdge(...to(p.x, p.y));
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#000';
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // Self arrow.
    ctx.translate(size / 2, size / 2);
    ctx.rotate(angle);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, 5.5); ctx.lineTo(-3, 0); ctx.lineTo(-6, -5.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  drawFull(ctx: CanvasRenderingContext2D, size: number, players: PlayerInfo[], meId: number, owned: Set<number>, ownerNames: Map<number, string>): void {
    const k = size / MAP_SIZE;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(this.baked, 0, 0, size, size);
    ctx.font = '600 13px Bahnschrift, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    for (const d of DISTRICTS) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(d.name.toUpperCase(), d.x * size, d.y * size);
    }
    for (const s of this.map.city.services) {
      const icon = PLACE_ICON[SERVICES[s.spec].verb];
      ctx.fillStyle = icon.color; ctx.strokeStyle = '#000';
      ctx.beginPath(); ctx.rect(s.x * k - 5, s.y * k - 5, 10, 10); ctx.fill(); ctx.stroke();
    }
    for (const p of this.map.city.properties) {
      const mine = owned.has(p.id), taken = ownerNames.has(p.id);
      ctx.fillStyle = mine ? '#6fe08a' : taken ? '#888' : 'rgba(111,224,138,0.55)';
      const px = p.x * k, py = p.y * k;
      ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px + 6, py + 5); ctx.lineTo(px - 6, py + 5); ctx.fill();
    }
    for (const p of players) {
      ctx.fillStyle = p.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x * k, p.y * k, p.id === meId ? 8 : 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText(p.name, p.x * k, p.y * k - 12);
    }
    // Legend.
    let ly = 18;
    ctx.textAlign = 'left';
    for (const icon of Object.values(PLACE_ICON)) {
      ctx.fillStyle = icon.color; ctx.fillRect(14, ly - 9, 10, 10);
      ctx.fillStyle = '#ddd'; ctx.fillText(icon.label, 30, ly);
      ly += 18;
    }
    ctx.fillStyle = '#6fe08a';
    ctx.beginPath(); ctx.moveTo(19, ly - 10); ctx.lineTo(25, ly + 1); ctx.lineTo(13, ly + 1); ctx.fill();
    ctx.fillStyle = '#ddd'; ctx.fillText('Property for sale', 30, ly);
  }
}
