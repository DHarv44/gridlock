// Syncs interpolated entities to meshes each frame, plus per-entity effects and night glows.
import * as THREE from 'three';
import { SERVICES, VEHICLES, WEAPONS } from '../../shared/packs';
import { EK, PF, PK, VF } from '../../shared/protocol';
import type { City } from '../../shared/world/cityTypes';
import type { EntityStore, ViewEntity } from '../net/entities';
import type { Effects } from './effects';
import { animatePed, makePed, type PedView, setPedWeapon } from './pedMesh';
import { makeVehicle, sirenMats, type VehicleView } from './vehicleMesh';

export interface OwnState { pid: number; vid: number; x: number; y: number; angle: number; alt: number; driving: boolean; vx: number; vy: number }
export interface PlayerTag { name: string; color: string }

const projGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6).rotateZ(Math.PI / 2);
const grenadeGeo = new THREE.SphereGeometry(0.16, 8, 6);
const pickupGeo = new THREE.BoxGeometry(0.7, 0.35, 0.45);
const ringGeo = new THREE.RingGeometry(1.1, 1.5, 28).rotateX(-Math.PI / 2);
const darkMat = new THREE.MeshLambertMaterial({ color: '#2a2c2e' });
const cashMat = new THREE.MeshLambertMaterial({ color: '#3fae4a', emissive: '#0f3a12' });
const gunMat = new THREE.MeshLambertMaterial({ color: '#4a4e54', emissive: '#202428' });

export class WorldView {
  private peds = new Map<number, PedView>();
  private vehs = new Map<number, VehicleView>();
  private objs = new Map<number, THREE.Object3D>();
  private labels = new Map<number, THREE.Sprite>();
  private rings = new Map<number, THREE.Mesh>();
  private time = 0;

  constructor(private scene: THREE.Scene, private fx: Effects, city: City, private lamps: { x: number; y: number }[]) {
    // Door markers for shops, services and properties.
    const places = [...city.services.map((s) => ({ ...s, color: SERVICES[s.spec].sign })), ...city.properties.map((p) => ({ ...p, color: '#6fe08a' }))];
    const inst = new THREE.InstancedMesh(ringGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.75 }), places.length);
    const m = new THREE.Matrix4();
    places.forEach((p, i) => {
      m.makeTranslation(p.x, 0.06, p.y);
      inst.setMatrixAt(i, m);
      inst.setColorAt(i, new THREE.Color(p.color === '#f2f2ee' ? '#ffffff' : p.color));
    });
    scene.add(inst);
  }

  sync(store: EntityStore, dt: number, own: OwnState | null, tags: Map<number, PlayerTag>, night: number, view: { x0: number; y0: number; x1: number; y1: number }): void {
    this.time += dt;
    const seen = new Set<number>();
    for (const e of store.all.values()) {
      seen.add(e.id);
      switch (e.kind) {
        case EK.Ped: this.ped(e, dt, own, tags); break;
        case EK.Veh: this.vehicle(e, dt, own, night); break;
        case EK.Proj: this.projectile(e); break;
        case EK.Pickup: this.pickup(e); break;
        case EK.Fire: this.fireEnt(e, night); break;
      }
    }
    this.prune(seen);
    if (night > 0.05) this.lampGlows(night, view);
    this.fx.glow.update(dt);
  }

  private prune(seen: Set<number>): void {
    for (const [id, v] of this.peds) if (!seen.has(id)) { this.scene.remove(v.root); this.peds.delete(id); this.dropTag(id); }
    for (const [id, v] of this.vehs) if (!seen.has(id)) { this.scene.remove(v.root); this.vehs.delete(id); }
    for (const [id, o] of this.objs) if (!seen.has(id)) { this.scene.remove(o); this.objs.delete(id); }
  }

  private dropTag(id: number): void {
    const l = this.labels.get(id);
    if (l) { l.removeFromParent(); (l.material as THREE.SpriteMaterial).map?.dispose(); l.material.dispose(); this.labels.delete(id); }
    const r = this.rings.get(id);
    if (r) { r.removeFromParent(); this.rings.delete(id); }
  }

  private ped(e: ViewEntity, dt: number, own: OwnState | null, tags: Map<number, PlayerTag>): void {
    const d = e.data;
    const flags = d[6];
    const tag = tags.get(e.id);
    let v = this.peds.get(e.id);
    if (!v) {
      v = makePed(e.id, d[2], tag?.color ?? null);
      this.peds.set(e.id, v);
      this.scene.add(v.root);
    }
    const isMe = own && own.pid === e.id && !own.vid;
    const x = isMe ? own!.x : e.x, y = isMe ? own!.y : e.y, a = isMe ? own!.angle : e.angle;
    v.root.position.set(x, 0, y);
    v.root.rotation.y = -a;
    setPedWeapon(v, d[7]);
    const speed = isMe ? Math.hypot(own!.vx, own!.vy) : Math.hypot(e.vx, e.vy);
    animatePed(v, dt, speed, !!(flags & PF.aim), !!(flags & PF.down), !!(flags & PF.dead), !!(flags & PF.busy));
    if (flags & PF.burning && Math.random() < 0.6) this.fx.fire(x, y, 0.8);
    if (tag && !this.rings.has(e.id)) this.addTag(e.id, v, tag, !!isMe);
  }

  private addTag(id: number, v: PedView, tag: PlayerTag, isMe: boolean): void {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: tag.color, transparent: true, opacity: 0.9 }));
    ring.position.y = 0.05;
    v.root.add(ring);
    this.rings.set(id, ring);
    if (isMe) return;
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d')!;
    ctx.font = 'bold 34px Bahnschrift, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(tag.name, 128, 44);
    ctx.fillStyle = tag.color;
    ctx.fillText(tag.name, 128, 44);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(8, 2, 1);
    s.position.set(0, 4.5, 0);
    s.renderOrder = 10;
    v.root.add(s);
    this.labels.set(id, s);
  }

  private vehicle(e: ViewEntity, dt: number, own: OwnState | null, night: number): void {
    const d = e.data;
    const type = d[2], color = d[6], flags = d[7], dmg = d[10];
    const spec = VEHICLES[type];
    const wreck = !!(flags & VF.wreck);
    const key = `${type}:${color}:${wreck}`;
    let v = this.vehs.get(e.id);
    if (!v || v.key !== key) {
      if (v) this.scene.remove(v.root);
      v = makeVehicle(type, color, wreck);
      this.vehs.set(e.id, v);
      this.scene.add(v.root);
    }
    const mine = own && own.vid === e.id && own.driving;
    const x = mine ? own!.x : e.x, y = mine ? own!.y : e.y, a = mine ? own!.angle : e.angle, alt = mine ? own!.alt : e.alt;
    v.root.position.set(x, alt, y);
    v.root.rotation.y = -a;
    if (v.turret) v.turret.rotation.y = -(e.turret - e.angle);
    const spinning = (flags & VF.driven) || alt > 0.3;
    for (const r of v.rotors) r.rotation.y += dt * (spinning ? 32 : 0);
    for (const r of v.tailRotors) r.rotation.z += dt * (spinning ? 40 : 0);
    const sirenOn = !!(flags & VF.siren);
    const phase = Math.floor(this.time * 6) % 2;
    for (const s of v.sirens) {
      const blue = s.userData.blue as boolean;
      s.material = !sirenOn ? (blue ? sirenMats.blueDim : sirenMats.redDim) : (phase === (blue ? 1 : 0) ? (blue ? sirenMats.blue : sirenMats.red) : (blue ? sirenMats.blueDim : sirenMats.redDim));
    }
    const c = Math.cos(a), s = Math.sin(a);
    if (sirenOn) {
      const col = phase ? [0.2, 0.35, 1] : [1, 0.15, 0.1];
      this.fx.glow.put(x, y, 0.1, 9 + night * 6, 1, 0, col[0], col[1], col[2], 0.18 + night * 0.25);
    }
    if (flags & VF.lights) {
      const L = spec.length / 2;
      this.fx.glow.put(x + c * (L + 7), y + s * (L + 7), 0.08, 6.5, 2, a, 1, 0.92, 0.7, 0.3 * night);
      this.fx.glow.put(x - c * (L + 0.6), y - s * (L + 0.6), 0.08, 1.6, 1.6, a + Math.PI / 2, 1, 0.1, 0.05, (flags & VF.brake ? 0.7 : 0.3) * night);
    }
    if ((flags & VF.smoke || dmg >= 2) && !wreck && Math.random() < dt * 8) this.fx.smoke(x + c * spec.length * 0.35, y + s * spec.length * 0.35, alt + spec.height, dmg >= 2 ? 0.6 : 0.2);
    if (flags & VF.burning) { this.fx.fire(x, y, spec.width); if (night > 0.1) this.fx.glow.put(x, y, 0.1, 10, 1, 0, 1, 0.5, 0.15, 0.35 * night); }
    if (wreck && Math.random() < dt * 3) this.fx.smoke(x, y, 1.5, 1);
    // Tyre marks when sliding.
    if (spec.movement === 'wheels' && alt < 0.2) {
      const vx = mine ? own!.vx : e.vx, vy = mine ? own!.vy : e.vy;
      const lat = Math.abs(-vx * s + vy * c);
      if (lat > 4.5 && Math.random() < dt * 30) {
        const bx = x - c * spec.length * 0.33, by = y - s * spec.length * 0.33;
        const ox = -s * (spec.width / 2 - 0.25), oy = c * (spec.width / 2 - 0.25);
        this.fx.skid(bx + ox, by + oy, a);
        this.fx.skid(bx - ox, by - oy, a);
      }
    }
  }

  private projectile(e: ViewEntity): void {
    const spec = WEAPONS[e.data[2]];
    let o = this.objs.get(e.id);
    if (!o) {
      o = new THREE.Mesh(spec.projectile?.arc ? grenadeGeo : projGeo, darkMat);
      this.objs.set(e.id, o);
      this.scene.add(o);
    }
    o.position.set(e.x, Math.max(0.15, e.alt), e.y);
    o.rotation.y = -e.angle;
    if (!spec.projectile?.arc) {
      this.fx.alpha.spawn({ x: e.x, y: e.y, z: e.alt, size: 0.6, grow: 2.5, max: 1.2, r: 0.75, g: 0.75, b: 0.72, a: 0.5, drag: 1 });
      this.fx.add.spawn({ x: e.x, y: e.y, z: e.alt, size: 0.9, max: 0.05, r: 1, g: 0.7, b: 0.3 });
    } else if (spec.projectile.fire) this.fx.fire(e.x, e.y, 0.3);
  }

  private pickup(e: ViewEntity): void {
    let o = this.objs.get(e.id);
    const type = e.data[2];
    if (!o) {
      o = new THREE.Mesh(pickupGeo, type === PK.cash ? cashMat : gunMat);
      this.objs.set(e.id, o);
      this.scene.add(o);
    }
    o.position.set(e.x, 0.6 + Math.sin(this.time * 3 + e.id) * 0.15, e.y);
    o.rotation.y = this.time * 2 + e.id;
    const col = type === PK.cash ? [0.3, 1, 0.4] : [1, 0.85, 0.4];
    this.fx.glow.put(e.x, e.y, 0.07, 2.4, 1, 0, col[0], col[1], col[2], 0.35);
  }

  private fireEnt(e: ViewEntity, night: number): void {
    const r = e.data[4];
    if (Math.random() < 0.9) this.fx.fire(e.x, e.y, r);
    if (Math.random() < 0.5) this.fx.fire(e.x, e.y, r);
    this.fx.glow.put(e.x, e.y, 0.09, r * 4, 1, 0, 1, 0.45, 0.1, 0.25 + night * 0.3);
  }

  private lampGlows(night: number, v: { x0: number; y0: number; x1: number; y1: number }): void {
    for (const l of this.lamps) {
      if (l.x < v.x0 || l.x > v.x1 || l.y < v.y0 || l.y > v.y1) continue;
      this.fx.glow.put(l.x, l.y, 0.06, 18, 1, 0, 1, 0.78, 0.45, 0.28 * night);
      this.fx.glow.put(l.x, l.y, 6.6, 1.2, 1, 0, 1, 0.9, 0.7, 0.9 * night);
    }
  }
}
