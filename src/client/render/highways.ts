// Highways (world/waygen.ts): the road along its corridor at the height its profile gives (on the
// ground; on an embankment, then a bridge on columns where it climbs over a street), with lane
// markings, jersey barriers and girder faces; ramps at ground level beside it merging in; the
// corridor's fences; trenches with retaining walls and the cross streets' bridge parapets. All
// static, built once.
import * as THREE from 'three';
import { LANE_W, type City } from '../../shared/world/cityTypes';
import { DECK_HALF, FOOT_GAP, MERGE, profileZ, type Ramp, RAMP_LEN, RAMP_W, WALL_H, WALL_T, type Way, wayPoint } from '../../shared/world/wayTypes';
import { columnStations, corridorFences, trenchOpen } from '../../shared/world/ways';

const STEP = 3;
/** Road surfaces sit this far over the ground they run on (no flicker where they're level with it). */
const LIFT = 0.04;
const CONCRETE = '#a19d95';
const GIRDER = '#8a867f';
const DECK_TILE = 24;
const RAMP_TILE = 12;

/** Triangles for one material: quads added as two triangles (both faces drawn). */
class Mesher {
  pos: number[] = [];
  uv: number[] = [];
  quad(p: number[][], uv?: number[][]): void {
    const [a, b, c, d] = p;
    this.pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    const t = uv ?? [[0, 0], [1, 0], [1, 1], [0, 1]];
    this.uv.push(...t[0], ...t[1], ...t[2], ...t[0], ...t[2], ...t[3]);
  }
  mesh(mat: THREE.Material): THREE.Mesh {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.matrixAutoUpdate = false;
    return m;
  }
}

function markingsTexture(across: number, along: number, lines: { l: number; color: string; dash?: boolean }[], aniso: number): THREE.CanvasTexture {
  const W = 256, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#45484d';
  ctx.fillRect(0, 0, W, H);
  // A little grain so the slab doesn't read as flat paint.
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${0.04 + Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  const px = W / across, py = H / along;
  for (const ln of lines) {
    ctx.fillStyle = ln.color;
    const x = (ln.l + across / 2) * px - 0.08 * px;
    if (!ln.dash) ctx.fillRect(x, 0, 0.16 * px, H);
    else for (let v = 0; v < along; v += 12) ctx.fillRect(x, v * py, 0.16 * px, 3 * py);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}

/** Standing under a deck you'd be hidden: within uFade.z metres of (uFade.x, uFade.y) the highway is
 *  drawn screen-door thin (uFade.w = 1 while it applies). */
const fade = { value: new THREE.Vector4(0, 0, 12, 0) };

export function fadeable<T extends THREE.Material>(m: T): T {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFade = fade;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHwWorld;')
      .replace('#include <project_vertex>', `#include <project_vertex>
#ifdef USE_INSTANCING
vHwWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
vHwWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHwWorld;\nuniform vec4 uFade;')
      .replace('void main() {', `void main() {
  if (uFade.w > 0.5) {
    float d = distance(vHwWorld.xz, uFade.xy);
    float k = 1.0 - smoothstep(uFade.z * 0.6, uFade.z, d);
    if (k > 0.0 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y) * 2.0, 4.0) < 3.0 * k) discard;
  }`);
  };
  return m;
}

export class Highways {
  private ways: Way[] = [];

  /** Each frame: thin the highway out over you when you're on the street beneath it. */
  update(x: number, y: number, onStreet: boolean): void {
    let under = false;
    if (onStreet) {
      for (const w of this.ways) {
        const a = w.axis === 'h' ? x : y, l = (w.axis === 'h' ? y : x) - w.pos;
        if (Math.abs(l) < DECK_HALF + RAMP_W + 2 && a > w.a0 - RAMP_LEN - MERGE && a < w.a1 + RAMP_LEN + MERGE && profileZ(w, a) > 0) under = true;
      }
    }
    fade.value.set(x, y, 13, under ? 1 : 0);
  }

  constructor(scene: THREE.Scene, city: City, aniso = 8) {
    this.ways = city.ways;
    if (!city.ways.some((w) => w.kind === 'highway')) return;
    const deckTex = markingsTexture(2 * DECK_HALF, DECK_TILE, [
      { l: -0.45, color: '#d9b53a' }, { l: 0.45, color: '#d9b53a' },
      { l: -LANE_W, color: '#e8e6df', dash: true }, { l: LANE_W, color: '#e8e6df', dash: true },
      { l: -2 * LANE_W, color: '#e8e6df' }, { l: 2 * LANE_W, color: '#e8e6df' },
    ], aniso);
    // A ramp: its lane between edge lines, a narrow shoulder on the highway's side and a wide one out.
    const rampTex = markingsTexture(RAMP_W, RAMP_TILE, [{ l: -RAMP_W / 2 + 1.4, color: '#e8e6df' }, { l: -RAMP_W / 2 + 1.4 + 3.7, color: '#e8e6df' }], aniso);
    const deck = new Mesher(), ramps = new Mesher(), walls = new Mesher(), girders = new Mesher();
    const cols: THREE.Matrix4[] = [], caps: THREE.Matrix4[] = [];
    for (const w of city.ways) {
      if (w.kind !== 'highway') continue; // a railway's viaduct is render/railway.ts
      this.deck(w, deck, walls, girders);
      for (const r of w.ramps) this.ramp(w, r, ramps, walls);
      this.fences(city, w, walls);
      this.trench(w, walls);
      for (const a of columnStations(city, w)) {
        const z = profileZ(w, a) - 0.9;
        const m = wayPoint(w, a, 0);
        for (const sd of [1, -1]) {
          const p = wayPoint(w, a, sd * (DECK_HALF - 0.6));
          cols.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, z / 2, p.y), new THREE.Quaternion(), new THREE.Vector3(1, z, 1)));
        }
        const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), w.axis === 'h' ? Math.PI / 2 : 0);
        caps.push(new THREE.Matrix4().compose(new THREE.Vector3(m.x, z + 0.35, m.y), rot, new THREE.Vector3(2 * DECK_HALF - 0.4, 0.7, 1.4)));
      }
    }
    const lam = (color: string, map?: THREE.Texture) => fadeable(new THREE.MeshLambertMaterial(map ? { map, side: THREE.DoubleSide } : { color, side: THREE.DoubleSide }));
    for (const m of [deck.mesh(lam('', deckTex)), ramps.mesh(lam('', rampTex)), walls.mesh(lam(CONCRETE)), girders.mesh(lam(GIRDER))]) { m.updateMatrix(); scene.add(m); }
    const inst = (geo: THREE.BufferGeometry, list: THREE.Matrix4[]) => {
      const im = new THREE.InstancedMesh(geo, lam(GIRDER), list.length);
      list.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = true; im.receiveShadow = true;
      scene.add(im);
    };
    if (cols.length) inst(new THREE.CylinderGeometry(0.45, 0.5, 1, 12), cols);
    if (caps.length) inst(new THREE.BoxGeometry(1, 1, 1), caps);
  }

  /** Stations along a stretch: every STEP metres and at the profile's corners. */
  private stations(w: Way, a0: number, a1: number): number[] {
    const out: number[] = [];
    for (let a = a0; a < a1; a += STEP) out.push(a);
    for (const [a] of w.profile) if (a > a0 && a < a1) out.push(a);
    out.push(a1);
    return out.sort((p, q) => p - q);
  }

  private deck(w: Way, deck: Mesher, walls: Mesher, girders: Mesher): void {
    const at = (a: number, l: number, dz = 0) => { const p = wayPoint(w, a, l); return [p.x, profileZ(w, a) + LIFT + dz, p.y]; };
    const st = this.stations(w, w.a0, w.a1);
    const H = DECK_HALF;
    for (let i = 0; i + 1 < st.length; i++) {
      const a = st[i], b = st[i + 1];
      deck.quad([at(a, -H), at(a, H), at(b, H), at(b, -H)], [[0, a / DECK_TILE], [1, a / DECK_TILE], [1, b / DECK_TILE], [0, b / DECK_TILE]]);
      // Girder faces under the deck's edges: down to the ground where it's low, so a dive reads as solid.
      for (const sd of [1, -1]) {
        const za = profileZ(w, a), zb = profileZ(w, b);
        if (za < 0 && zb < 0) continue;
        const da = za > 3 ? -1 : -Math.max(0, za), db = zb > 3 ? -1 : -Math.max(0, zb);
        girders.quad([at(a, sd * H), at(b, sd * H), at(b, sd * H, db), at(a, sd * H, da)]);
      }
    }
    // Barriers: the median the whole way, the edges except where a ramp's lane runs alongside.
    this.wall(w, walls, w.a0, w.a1, () => 0, 0.3, 0.8);
    for (const sd of [1, -1] as const) {
      const gaps = w.ramps.filter((r) => r.side === sd).map((r) => {
        const p = r.foot + r.up * RAMP_LEN, q = r.foot + r.up * (RAMP_LEN + MERGE);
        return [Math.min(p, q), Math.max(p, q)] as [number, number];
      }).sort((p, q) => p[0] - q[0]);
      let from = w.a0;
      const edge = () => sd * (DECK_HALF - WALL_T / 2);
      for (const [g0, g1] of gaps) { if (g0 > from) this.wall(w, walls, from, g0, edge); from = Math.max(from, g1); }
      if (w.a1 > from) this.wall(w, walls, from, w.a1, edge);
    }
    // The deck's ends.
    for (const a of [w.a0, w.a1]) girders.quad([at(a, -H), at(a, H), at(a, H, -1), at(a, -H, -1)]);
  }

  /** A jersey barrier along the way from a0 to a1, its centre `lat(a)` across, on the deck's
   *  profile (or a ramp's, via zAt). */
  private wall(w: Way, m: Mesher, a0: number, a1: number, lat: (a: number) => number, t = WALL_T, h = WALL_H, zAt = (a: number) => profileZ(w, a)): void {
    const st = this.stations(w, Math.min(a0, a1), Math.max(a0, a1));
    const P = (a: number, dl: number, dz: number) => { const p = wayPoint(w, a, lat(a) + dl); return [p.x, zAt(a) + dz, p.y]; };
    for (let i = 0; i + 1 < st.length; i++) {
      const a = st[i], b = st[i + 1];
      for (const s of [-t / 2, t / 2]) m.quad([P(a, s, 0), P(b, s, 0), P(b, s * 0.4, h), P(a, s * 0.4, h)]);
      m.quad([P(a, -t * 0.2, h), P(b, -t * 0.2, h), P(b, t * 0.2, h), P(a, t * 0.2, h)]);
    }
  }

  /** A ramp: on the ground from its cross street's kerb, beside the highway (which may be climbing
   *  over that street), then over into its outer lane along the merge. */
  private ramp(w: Way, r: Ramp, slab: Mesher, walls: Mesher): void {
    const reach = RAMP_LEN + MERGE;
    const sAt = (a: number) => (a - r.foot) * r.up;
    const sd = r.side;
    const inner = (a: number) => (sAt(a) <= RAMP_LEN ? r.lat - sd * (RAMP_W / 2) : sd * DECK_HALF);
    // The outer edge: the ramp lane's, closing in on the deck's edge along the merge.
    const o0 = Math.abs(r.lat) + RAMP_W / 2, o1 = DECK_HALF + 0.3;
    const outer = (a: number) => { const k = Math.min(1, Math.max(0, (sAt(a) - RAMP_LEN) / MERGE)); return sd * (o0 + (o1 - o0) * k); };
    const P = (a: number, l: number) => { const p = wayPoint(w, a, l); return [p.x, LIFT, p.y]; };
    const start = r.foot - r.up * FOOT_GAP;
    const a0 = Math.min(start, r.foot + r.up * reach), a1 = Math.max(start, r.foot + r.up * reach);
    const st: number[] = [];
    for (let a = a0; a < a1; a += 3) st.push(a);
    st.push(a1, r.foot + r.up * RAMP_LEN);
    st.sort((p, q) => p - q);
    for (let i = 0; i + 1 < st.length; i++) {
      const a = st[i], b = st[i + 1];
      const ua = sAt(a) / RAMP_TILE, ub = sAt(b) / RAMP_TILE;
      const lo = (x: number) => Math.min(inner(x), outer(x)), hi = (x: number) => Math.max(inner(x), outer(x));
      // The lane's markings along the ramp proper; the merge lane beside the deck is plain slab.
      // (u runs across from the lane's inner side: flipped on the -l side so the shoulders match.)
      const uv = (x: number) => (sAt(x) < RAMP_LEN ? (sd > 0 ? [0, 1] : [1, 0]) : [0.5, 0.5]);
      slab.quad([P(a, lo(a)), P(a, hi(a)), P(b, hi(b)), P(b, lo(b))], [[uv(a)[0], ua], [uv(a)[1], ua], [uv(b)[1], ub], [uv(b)[0], ub]]);
    }
    // The barrier between it and the highway, from the kerb to where they meet; the merge's taper.
    const flat = () => LIFT;
    this.wall(w, walls, start, r.foot + r.up * RAMP_LEN, () => r.lat - sd * (RAMP_W / 2 - WALL_T / 2), WALL_T, WALL_H, flat);
    this.wall(w, walls, r.foot + r.up * RAMP_LEN, r.foot + r.up * reach, (a) => outer(a) - sd * (WALL_T / 2), WALL_T, WALL_H, flat);
  }

  /** The corridor's fences on the street's side (world/ways.ts corridorFences): low concrete walls. */
  private fences(city: City, w: Way, walls: Mesher): void {
    for (const f of corridorFences(city, w)) {
      const c = (a: number, l: number, z: number) => { const p = wayPoint(w, a, l); return [p.x, z, p.y]; };
      const { a0, a1, l0, l1 } = f, h = 1.1;
      walls.quad([c(a0, l0, 0), c(a1, l0, 0), c(a1, l0, h), c(a0, l0, h)]);
      walls.quad([c(a0, l1, 0), c(a1, l1, 0), c(a1, l1, h), c(a0, l1, h)]);
      walls.quad([c(a0, l0, 0), c(a0, l1, 0), c(a0, l1, h), c(a0, l0, h)]);
      walls.quad([c(a1, l0, 0), c(a1, l1, 0), c(a1, l1, h), c(a1, l0, h)]);
      walls.quad([c(a0, l0, h), c(a1, l0, h), c(a1, l1, h), c(a0, l1, h)]);
    }
  }

  private trench(w: Way, walls: Mesher): void {
    const L = DECK_HALF + 0.3;
    for (const [a0, a1] of trenchOpen(w)) {
      const st = this.stations(w, a0, a1);
      const P = (a: number, l: number, z: number) => { const p = wayPoint(w, a, l); return [p.x, z, p.y]; };
      for (let i = 0; i + 1 < st.length; i++) {
        const a = st[i], b = st[i + 1];
        for (const sd of [1, -1]) {
          walls.quad([P(a, sd * L, profileZ(w, a) - 0.3), P(b, sd * L, profileZ(w, b) - 0.3), P(b, sd * L, 0.05), P(a, sd * L, 0.05)]);
          // Coping along the top, and a railing to keep people out.
          walls.quad([P(a, sd * L, 0.05), P(b, sd * L, 0.05), P(b, sd * (L + 0.5), 0.05), P(a, sd * (L + 0.5), 0.05)]);
        }
      }
      for (const sd of [1, -1]) this.wall(w, walls, a0, a1, () => sd * (L + 0.25), 0.25, 1.05, () => 0);
    }
    // The cross streets' bridges over it: a parapet along each side of the deck.
    for (const [b0, b1] of w.bridges) {
      if (profileZ(w, (b0 + b1) / 2) >= 0) continue;
      for (const a of [b0 + 0.15, b1 - 0.15]) {
        const p = wayPoint(w, a, -L), q = wayPoint(w, a, L);
        walls.quad([[p.x, 0, p.y], [q.x, 0, q.y], [q.x, 1.05, q.y], [p.x, 1.05, p.y]]);
        walls.quad([[p.x, 0, p.y], [q.x, 0, q.y], [q.x, -0.7, q.y], [p.x, -0.7, p.y]]);
      }
    }
  }
}
