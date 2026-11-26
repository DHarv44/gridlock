// Street furniture: lamp posts, live traffic signals, hydrants, bins, benches, bus shelters, mailboxes.
import * as THREE from 'three';
import type { Rng } from '../../shared/rng';
import { type City, LANE_W, type RoadNode } from '../../shared/world/cityTypes';
import { lightState } from '../../shared/world/traffic';
import { ZONES } from '../../shared/packs';
import { Batch, lambert, UNIT } from './instancing';

interface Signal { node: RoadNode; axis: 'h' | 'v'; x: number; y: number }

const SIG_COLORS = [new THREE.Color('#ff2a1f'), new THREE.Color('#ffb21f'), new THREE.Color('#2bff6a')];

export class StreetProps {
  readonly lamps: { x: number; y: number }[] = [];
  readonly signals: Signal[] = [];
  private signalMesh: THREE.InstancedMesh | null = null;

  constructor(scene: THREE.Scene, private city: City, rng: Rng) {
    const box = new Batch(UNIT.box(), lambert());
    const cyl = new Batch(UNIT.cyl(8), lambert());
    this.lampPosts(box, cyl);
    this.trafficSignals(scene, box, cyl);
    this.sidewalkClutter(box, cyl, rng);
    this.parkFurniture(box, rng);
    box.build(scene);
    cyl.build(scene);
  }

  private lampPosts(box: Batch, cyl: Batch): void {
    for (const s of this.city.segs) {
      if (s.bridge) continue;
      const len = s.axis === 'h' ? s.x1 - s.x0 : s.y1 - s.y0;
      const side = s.width / 2 + 0.6;
      for (let p = 16; p < len - 10; p += 34) {
        const flip = Math.floor(p / 34) % 2 ? 1 : -1;
        const x = s.axis === 'h' ? s.x0 + p : s.x0 + side * flip;
        const y = s.axis === 'h' ? s.y0 + side * flip : s.y0 + p;
        // Arm reaches back over the road.
        const ax = s.axis === 'v' ? -flip : 0, ay = s.axis === 'h' ? -flip : 0;
        cyl.add(x, 0, y, 0.22, 7, 0.22, '#2d3035');
        box.add(x + ax * 1.1, 6.8, y + ay * 1.1, ax ? 2.2 : 0.12, 0.12, ay ? 2.2 : 0.12, '#2d3035');
        box.add(x + ax * 2.1, 6.6, y + ay * 2.1, ax ? 0.8 : 0.4, 0.2, ay ? 0.8 : 0.4, '#e8e2c8');
        this.lamps.push({ x: x + ax * 2.1, y: y + ay * 2.1 });
      }
    }
  }

  private trafficSignals(scene: THREE.Scene, box: Batch, cyl: Batch): void {
    for (const n of this.city.nodes) {
      if (!n.lights) continue;
      for (const si of n.segs) {
        const s = this.city.segs[si];
        // Traffic on this segment approaching the node travels toward it.
        const toward = s.a === n.id ? -1 : 1;
        const hx = s.axis === 'h' ? toward : 0, hy = s.axis === 'v' ? toward : 0;
        const rx = -hy, ry = hx;
        const back = (s.axis === 'h' ? n.wv : n.wh) / 2 + 0.8;
        const px = n.x - hx * back + rx * (s.width / 2 + 0.5), py = n.y - hy * back + ry * (s.width / 2 + 0.5);
        const reach = s.lanes * LANE_W;
        cyl.add(px, 0, py, 0.24, 6, 0.24, '#24272b');
        box.add(px - rx * reach / 2, 5.6, py - ry * reach / 2, Math.abs(rx) * reach + 0.15, 0.16, Math.abs(ry) * reach + 0.15, '#24272b');
        const hxp = px - rx * (reach - 0.3), hyp = py - ry * (reach - 0.3);
        box.add(hxp, 4.6, hyp, 0.55, 1.1, 0.55, '#1a1c1f');
        this.signals.push({ node: n, axis: s.axis, x: hxp, y: hyp });
      }
    }
    if (!this.signals.length) return;
    // Lamp face, big enough to read from the overhead camera.
    const geo = new THREE.BoxGeometry(0.7, 0.1, 0.7);
    this.signalMesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial(), this.signals.length);
    const m = new THREE.Matrix4();
    this.signals.forEach((s, i) => {
      this.signalMesh!.setMatrixAt(i, m.makeTranslation(s.x, 5.72, s.y));
      this.signalMesh!.setColorAt(i, SIG_COLORS[0]);
    });
    scene.add(this.signalMesh);
  }

  /** Recolours signal lamps for the current server time; returns lit lamps for glows. */
  updateSignals(serverSeconds: number): Signal[] {
    const mesh = this.signalMesh;
    if (!mesh) return [];
    this.signals.forEach((s, i) => mesh.setColorAt(i, SIG_COLORS[lightState(s.node, s.axis, serverSeconds)]));
    mesh.instanceColor!.needsUpdate = true;
    return this.signals;
  }

  stateOf(s: Signal, t: number): number {
    return lightState(s.node, s.axis, t);
  }

  private sidewalkClutter(box: Batch, cyl: Batch, rng: Rng): void {
    for (const b of this.city.blocks) {
      const z = ZONES[b.zone];
      if (z.layout === 'park' || z.layout === 'compound') continue;
      const r = b.rect;
      const busy = !!z.busy;
      const edge = (inset: number) => {
        const side = Math.floor(rng.next() * 4), t = rng.range(0.15, 0.85);
        const x = side === 1 ? r.x1 - inset : side === 3 ? r.x0 + inset : r.x0 + (r.x1 - r.x0) * t;
        const y = side === 0 ? r.y0 + inset : side === 2 ? r.y1 - inset : r.y0 + (r.y1 - r.y0) * t;
        return { x, y, side };
      };
      // Hydrants near the curb.
      for (let k = 0; k < rng.int(1, 2); k++) {
        const p = edge(0.6);
        cyl.add(p.x, 0, p.y, 0.32, 0.65, 0.32, '#c0281e');
        cyl.add(p.x, 0.65, p.y, 0.22, 0.14, 0.22, '#d8d2c0');
      }
      // Bins, newspaper boxes, mailboxes in busy districts.
      for (let k = 0; k < (busy ? rng.int(2, 4) : rng.int(0, 1)); k++) {
        const p = edge(0.8);
        const kind = rng.next();
        if (kind < 0.5) cyl.add(p.x, 0, p.y, 0.6, 0.95, 0.6, '#2f4a3a');
        else if (kind < 0.75) box.add(p.x, 0, p.y, 0.5, 1.1, 0.5, '#2a4f9a');
        else box.add(p.x, 0, p.y, 0.45, 1.0, 0.45, rng.pick(['#c9a227', '#b0302a', '#2a7a7a']));
      }
      // Bus shelter on busy blocks.
      if (busy && rng.chance(0.25)) this.shelter(box, edge(1.1), r);
    }
  }

  private shelter(box: Batch, p: { x: number; y: number; side: number }, r: { x0: number; y0: number; x1: number; y1: number }): void {
    const along = p.side === 0 || p.side === 2;
    const L = 3.6, Dp = 1.4;
    const out = p.side === 0 ? -1 : p.side === 2 ? 1 : p.side === 1 ? 1 : -1;
    const bx = along ? p.x : p.x - out * 0.4, by = along ? p.y - out * 0.4 : p.y;
    box.add(bx, 2.4, by, along ? L : Dp, 0.14, along ? Dp : L, '#d0d3d6');
    // Back panel away from the road, and a bench.
    const backX = along ? bx : bx - out * Dp / 2, backY = along ? by - out * Dp / 2 : by;
    box.add(backX, 0, backY, along ? L : 0.08, 2.4, along ? 0.08 : L, '#7fa6c0');
    box.add(backX + (along ? 0 : out * 0.35), 0, backY + (along ? out * 0.35 : 0), along ? L * 0.8 : 0.45, 0.5, along ? 0.45 : L * 0.8, '#5a4a3a');
    void r;
  }

  private parkFurniture(box: Batch, rng: Rng): void {
    for (const lot of this.city.lots) {
      if (lot.use !== 'park' && lot.use !== 'plaza') continue;
      const r = lot.rect;
      const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
      const n = lot.use === 'park' ? 10 : 3;
      for (let k = 0; k < n; k++) {
        // Benches beside the paths.
        const onX = rng.chance(0.5);
        const t = rng.range(0.1, 0.9);
        const x = onX ? r.x0 + (r.x1 - r.x0) * t : cx + (rng.chance(0.5) ? 3 : -3);
        const y = onX ? cy + (rng.chance(0.5) ? 3 : -3) : r.y0 + (r.y1 - r.y0) * t;
        box.add(x, 0, y, onX ? 1.8 : 0.5, 0.45, onX ? 0.5 : 1.8, '#6b4a30');
      }
      if (lot.use === 'plaza' && rng.chance(0.5)) {
        box.add(cx, 0, cy, 5, 0.6, 5, '#b8b4aa');
        box.add(cx, 0.6, cy, 4.2, 0.05, 4.2, '#4c7f9a');
      }
    }
  }
}
