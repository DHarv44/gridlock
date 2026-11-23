// Client game: owns rendering, input, prediction and HUD for one connected session.
import { PEDS, VEHICLES } from '../../shared/packs';
import { type InputMsg, Mode, type PlayerInfo, type Profile, type S2C, TICK_HZ, VF, type YouState } from '../../shared/protocol';
import { CityMap, generateCity } from '../../shared/world/city';
import { StaticWorld } from '../../shared/world/collision';
import { Sound } from '../audio/sound';
import { Hud } from '../hud/hud';
import { openMenu } from '../hud/menu';
import { Minimap } from '../hud/minimap';
import { Pane } from '../hud/pane';
import type { Connection } from '../net/connection';
import { EntityStore } from '../net/entities';
import { ChaseCamera } from '../render/camera';
import { CityMeshes } from '../render/cityMeshes';
import { Effects } from '../render/effects';
import { Ground } from '../render/ground';
import { Stage } from '../render/scene';
import type { StreetProps } from '../render/streetProps';
import { Water } from '../render/water';
import { type OwnState, type PlayerTag, WorldView } from '../render/worldView';
import { routeFx } from './fxRouter';
import { Input } from './input';
import { Interact } from './interact';
import { Predictor } from './predict';

const STEP = 1 / TICK_HZ;
const LAW = new Set(PEDS.map((p, i) => (p.behaviour === 'police' || p.behaviour === 'military' ? i : -1)).filter((i) => i >= 0));

export class Game {
  private map: CityMap;
  private stage: Stage;
  private store = new EntityStore();
  private cam: ChaseCamera;
  private ground: Ground;
  private view: WorldView;
  private fx: Effects;
  private input: Input;
  private predict: Predictor;
  private hud = new Hud();
  private radar: Minimap;
  private pane = new Pane();
  private interact: Interact;
  private sound = new Sound();
  private you: YouState | null = null;
  private players: PlayerInfo[] = [];
  private owners = new Map<number, string>();
  private profile: Profile = { garage: [], owned: [] };
  private gameMinutes = 720;
  private seq = 0;
  private acc = 0;
  private last = performance.now();
  private running = true;
  private mapOpen = false;
  private chatting = false;

  constructor(private conn: Connection, private myId: number, private myName: string, private code: string, seed: number, private onLeave: () => void) {
    const city = generateCity(seed);
    this.map = new CityMap(city);
    const statics = new StaticWorld(city);
    const canvas = document.getElementById('view') as HTMLCanvasElement;
    this.stage = new Stage(canvas);
    this.cam = new ChaseCamera(this.stage.camera);
    this.ground = new Ground(this.stage.scene, this.map, this.stage.renderer.capabilities.getMaxAnisotropy());
    const meshes = new CityMeshes(this.stage.scene, city);
    this.fx = new Effects(this.stage.scene, this.stage.flash);
    this.view = new WorldView(this.stage.scene, this.fx, city, meshes.lamps);
    this.input = new Input(canvas);
    this.predict = new Predictor(statics, this.map);
    this.radar = new Minimap(this.map);
    this.interact = new Interact(city, this.pane);
    this.hud.onChat = (text) => conn.send({ t: 'chat', text });
    this.input.onUi = (a) => this.ui(a);
    conn.on((m) => this.onMessage(m));
    this.buildingUniforms = meshes.uniforms;
    this.props = meshes.props;
    this.water = new Water(this.stage.scene, this.map);
    requestAnimationFrame(() => this.frame());
  }

  private buildingUniforms: { uNight: { value: number } };
  private props: StreetProps;
  private water: Water;

  /** Signal lamps follow the server clock; they also cast a small coloured glow. */
  private signals(night: number, vr: { x0: number; y0: number; x1: number; y1: number }): void {
    const t = this.store.serverNow() / 1000;
    for (const s of this.props.updateSignals(t)) {
      if (s.x < vr.x0 || s.x > vr.x1 || s.y < vr.y0 || s.y > vr.y1) continue;
      const st = this.props.stateOf(s, t);
      const [r, g, b] = st === 2 ? [0.2, 1, 0.4] : st === 1 ? [1, 0.7, 0.1] : [1, 0.15, 0.1];
      this.fx.glow.put(s.x, s.y, 5.9, 1.5 + night * 1.5, 1, 0, r, g, b, 0.45 + night * 0.4);
    }
  }

  private ui(a: string): void {
    switch (a) {
      case 'interact':
        if (this.you) this.interact.toggle(() => this.you!, () => this.profile, this.owners, this.myName, (kind, id, place) => this.conn.send({ t: 'buy', kind, id, place }));
        break;
      case 'chat':
        if (this.chatting) return;
        this.chatting = true;
        this.input.enabled = false;
        this.input.release();
        this.hud.openChat(() => { this.chatting = false; this.input.enabled = true; });
        break;
      case 'map': this.mapOpen = !this.mapOpen; this.hud.bigmap.hidden = !this.mapOpen; break;
      case 'menu':
        if (this.mapOpen) { this.mapOpen = false; this.hud.bigmap.hidden = true; return; }
        if (this.pane.isOpen) this.pane.close();
        else openMenu(this.pane, this.sound, this.code, () => this.leave());
        break;
      case 'scoreOn': this.hud.showScore(true, this.players, this.code); break;
      case 'scoreOff': this.hud.showScore(false, this.players, this.code); break;
    }
  }

  private onMessage(m: S2C): void {
    switch (m.t) {
      case 's':
        if (!this.you) document.getElementById('loading')!.hidden = true;
        this.store.ingest(m.st, m.e);
        this.gameMinutes = m.gt;
        this.you = m.you;
        this.predict.reconcile(m.you, m.ack);
        routeFx(m.fx, this.fx, this.sound, this.store, this.cam);
        break;
      case 'players': this.players = m.list; break;
      case 'owners': this.owners = new Map(m.list.filter((o): o is [number, string] => o[1] !== null)); break;
      case 'profile': this.profile = m.p; break;
      case 'msg':
        if (m.kind === 'chat') this.hud.chatLine(m.text);
        else if (m.kind === 'money') { this.hud.notify(m.text, 'money'); this.sound.play('cash'); }
        else if (m.kind === 'warn') this.hud.notify(m.text, 'warn');
        else this.hud.feedLine(m.text, m.kind);
        break;
    }
  }

  /** Where the local player is right now (predicted when possible). */
  private ownState(alpha: number): OwnState | null {
    const y = this.you;
    if (!y) return null;
    const p = this.predict;
    if (p.active) {
      const b = p.body, a = p.prev;
      const lerp = (u: number, v: number) => u + (v - u) * alpha;
      return { pid: y.pid, vid: y.vid, driving: y.mode === Mode.Driver, x: lerp(a.x, b.x) + p.errX, y: lerp(a.y, b.y) + p.errY,
        angle: y.mode === Mode.Driver ? a.angle + (b.angle - a.angle) * alpha : this.aimAngle, alt: lerp(a.alt, b.alt), vx: b.vx, vy: b.vy };
    }
    const ent = this.store.all.get(y.vid || y.pid);
    if (ent) return { pid: y.pid, vid: y.vid, driving: false, x: ent.x, y: ent.y, angle: ent.angle, alt: ent.alt, vx: ent.vx, vy: ent.vy };
    return { pid: y.pid, vid: y.vid, driving: false, x: y.body[0], y: y.body[1], angle: y.body[2], alt: y.body[6], vx: 0, vy: 0 };
  }

  private aimAngle = 0;

  private tick(own: OwnState | null): void {
    const inp = this.input;
    const alt = own?.alt ?? 0;
    const aim = this.cam.screenToWorld(inp.mouseX, inp.mouseY, alt > 3 ? 0 : 0);
    if (own) this.aimAngle = Math.atan2(aim.y - own.y, aim.x - own.x);
    const msg: InputMsg = [
      ++this.seq,
      inp.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']),
      inp.axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']),
      inp.axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']),
      inp.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']),
      Math.round(this.aimAngle * 1000) / 1000,
      inp.takeButtons(),
      inp.takeWeaponWish(),
    ];
    if (!inp.enabled) { msg[1] = msg[2] = msg[3] = msg[4] = 0; }
    this.predict.apply(msg);
    this.conn.send({ t: 'in', i: [msg] });
  }

  private frame(): void {
    if (!this.running) return;
    requestAnimationFrame(() => this.frame());
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 4) {
      this.acc -= STEP;
      n++;
      this.tick(this.ownState(1));
    }
    if (this.acc > STEP * 4) this.acc = 0;
    this.predict.decay(dt);
    this.store.update();
    const own = this.ownState(this.acc / STEP);
    if (own) {
      const ax = this.cam.screenToWorld(this.input.mouseX, this.input.mouseY);
      this.cam.update(dt, own.x, own.y, own.vx, own.vy, own.alt, ax.x, ax.y, !!own.vid);
      this.sound.listenerX = own.x; this.sound.listenerY = own.y;
    }
    const vr = this.cam.viewRect();
    this.ground.update(vr);
    // Dev hook: window.__forceTime = minutes previews any time of day locally.
    const forced = (window as unknown as { __forceTime?: number }).__forceTime;
    this.stage.setTime(forced ?? this.gameMinutes, this.cam.x, this.cam.y);
    const night = this.stage.lighting.night;
    this.buildingUniforms.uNight.value = night;
    this.signals(night, vr);
    this.view.sync(this.store, dt, own, this.tags(), night, vr);
    this.fx.update(dt);
    this.water.update(dt);
    this.sirens(own);
    this.stage.render();
    this.updateHud(own);
  }

  private tags(): Map<number, PlayerTag> {
    const m = new Map<number, PlayerTag>();
    for (const p of this.players) m.set(p.pid, { name: p.name, color: p.color });
    const me = this.players.find((p) => p.id === this.myId);
    if (this.you && me) m.set(this.you.pid, { name: me.name, color: me.color });
    return m;
  }

  private sirens(own: OwnState | null): void {
    if (!own) return;
    let best: { x: number; y: number } | null = null, bd = 90;
    for (const e of this.store.all.values()) {
      if (e.kind !== 1 || !(e.data[7] & VF.siren)) continue;
      const d = Math.hypot(e.x - own.x, e.y - own.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (best) this.sound.siren(best.x, best.y);
  }

  private updateHud(own: OwnState | null): void {
    const you = this.you;
    if (!you || !own) return;
    const seen = you.wl > 0;
    this.hud.update(you, this.gameMinutes, seen);
    const spot = this.interact.find(own.x, own.y, you);
    this.interact.current = spot;
    this.hud.setPrompt(this.pane.isOpen ? null : this.interact.promptText(spot, this.owners, this.myName));
    this.interact.tick(own.x, own.y);
    this.pane.refresh();
    const ctx = this.hud.radar.getContext('2d')!;
    const range = own.vid ? 260 : 170;
    const hostiles: { x: number; y: number }[] = [];
    if (you.wl > 0) {
      for (const e of this.store.all.values()) {
        if ((e.kind === 0 && LAW.has(e.data[2]) && !(e.data[6] & 1)) || (e.kind === 1 && (VEHICLES[e.data[2]].roles.some((r) => r.startsWith('police') || r.startsWith('military'))) && (e.data[7] & VF.driven))) hostiles.push(e);
      }
    }
    const owned = new Set(this.profile.owned);
    this.radar.drawRadar(ctx, 220, own.x, own.y, own.angle, range, this.players, this.myId, owned, hostiles);
    if (this.mapOpen) {
      const c = this.hud.bigmapCanvas;
      const size = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9);
      if (c.width !== Math.round(size)) { c.width = c.height = Math.round(size); }
      this.radar.drawFull(c.getContext('2d')!, c.width, this.players, this.myId, owned, this.owners);
    }
  }

  private leave(): void {
    this.running = false;
    this.conn.close();
    this.onLeave();
  }
}
