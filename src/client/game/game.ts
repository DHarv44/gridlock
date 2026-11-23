// Client game: owns rendering, input, prediction and HUD for one connected session.
import { type InputMsg, Mode, type PlayerInfo, type Profile, type S2C, TICK_HZ, type YouState } from '../../shared/protocol';
import { CityMap, generateCity } from '../../shared/world/city';
import { StaticWorld } from '../../shared/world/collision';
import { Radio } from '../audio/radio';
import { Sound } from '../audio/sound';
import { Hud } from '../hud/hud';
import { openMenu } from '../hud/menu';
import { GunShop } from '../hud/gunShop';
import { PaintGarage } from '../hud/paintGarage';
import { SERVICES } from '../../shared/packs';
import type { Place } from '../../shared/world/cityTypes';
import { BigMap } from '../hud/bigMap';
import { saveProgress } from '../lobby/characterStore';
import { Minimap } from '../hud/minimap';
import { Waypoint } from './waypoint';
import { Pane } from '../hud/pane';
import type { Connection } from '../net/connection';
import { EntityStore } from '../net/entities';
import { ChaseCamera } from '../render/camera';
import { CityMeshes } from '../render/cityMeshes';
import { Effects } from '../render/effects';
import { Graffiti } from '../render/graffiti';
import { Ground } from '../render/ground';
import { Stage } from '../render/scene';
import type { StreetProps } from '../render/streetProps';
import { Storefronts } from '../render/storefronts';
import { Water } from '../render/water';
import { type OwnState, type PlayerTag, WorldView } from '../render/worldView';
import { routeFx } from './fxRouter';
import { makeAimAssist } from './aimAssist';
import { Steering } from './steering';
import { Input } from './input';
import { lawUnits, nearestSiren, ownEngine, signalGlows, trafficEngines } from './ambient';
import { Interact } from './interact';
import { Jobs } from './jobs';
import { Predictor } from './predict';
import { QualityGovernor } from './quality';

const STEP = 1 / TICK_HZ;

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
  private garage = new PaintGarage();
  private gunShop = new GunShop();
  private interact: Interact;
  private jobs: Jobs;
  private sound = new Sound();
  private radio = new Radio(new URLSearchParams(location.search).has('mute'));
  private you: YouState | null = null;
  private players: PlayerInfo[] = [];
  private owners = new Map<number, string>();
  private profile: Profile = { garage: [], owned: [] };
  private gameMinutes = 720;
  private seq = 0;
  private acc = 0;
  private last = performance.now();
  private running = true;
  private bigMap: BigMap;
  private waypoint: Waypoint;
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
    this.view = new WorldView(this.stage.scene, this.fx, meshes.lamps);
    this.input = new Input(canvas);
    this.predict = new Predictor(statics, this.map);
    this.radar = new Minimap(this.map);
    this.jobs = new Jobs(this.stage.scene, this.hud.root, city);
    this.interact = new Interact(city, this.pane);
    this.hud.onChat = (text) => conn.send({ t: 'chat', text });
    this.input.onUi = (a) => this.ui(a);
    // The pad drives whichever overlay is up: the paint shop, the map (B closes it) or the pane.
    this.input.onNav = (c) => {
      if (this.garage.isOpen) this.garage.nav(c);
      else if (this.gunShop.isOpen) this.gunShop.nav(c);
      else if (!this.bigMap.isOpen) this.pane.nav(c);
      else if (c === 'back') this.bigMap.close();
      else this.bigMap.nav(c);
    };
    this.bigMap = new BigMap(this.hud.bigmap, this.hud.bigmapCanvas, this.map);
    this.waypoint = new Waypoint(city);
    this.bigMap.onWaypoint = (p) => { const o = this.ownState(1); this.waypoint.set(p, o); };
    this.waypoint.onArrive = () => this.hud.notify('Waypoint reached', 'info');
    // Browsers only reveal a controller after one of its buttons is pressed: say when one is seen.
    // Only standard gamepads count (sticks, throttles and headsets also report as gamepads).
    const padName = (g: Gamepad) => g.id.replace(/\s*\(.*$/, '') || 'gamepad';
    window.addEventListener('gamepadconnected', (e) => { if (e.gamepad.mapping === 'standard') this.hud.notify(`Controller connected: ${padName(e.gamepad)}`, 'info'); });
    window.addEventListener('gamepaddisconnected', (e) => { if (e.gamepad.mapping === 'standard') this.hud.notify('Controller disconnected', 'warn'); });
    conn.on((m) => this.onMessage(m));
    // Ctrl is the default fire key: guard against Ctrl+W / Ctrl+R closing the game by accident.
    if (import.meta.env.PROD) window.onbeforeunload = (e) => { if (this.running) e.preventDefault(); };
    this.buildingUniforms = meshes.uniforms;
    this.props = meshes.props;
    this.water = new Water(this.stage.scene, this.map);
    this.storefronts = new Storefronts(this.stage.scene, city);
    new Graffiti(this.stage.scene, city, meshes.graffitiSpots);
    this.quality = new QualityGovernor(this.stage);
    this.quality.onAuto = (q) => this.hud.notify(`Graphics set to ${q} for a smoother frame rate (Esc to change)`, 'info');
    requestAnimationFrame(() => this.frame());
  }

  private buildingUniforms: { uNight: { value: number } };
  private props: StreetProps;
  private water: Water;
  private storefronts: Storefronts;
  private quality: QualityGovernor;

  /** Signal lamps follow the server clock; they also cast a small coloured glow. */

  private ui(a: string): void {
    switch (a) {
      case 'action':
        // One key for everything: a shop/property door (or the dealer lot) opens its menu,
        // otherwise get into the nearest car or out of this one.
        if (this.pane.isOpen) { this.pane.close(); break; }
        if (!this.interact.current) { this.input.pressEnter(); break; }
        if (!this.interact.current.property && SERVICES[this.interact.current.place.spec].verb === 'gunshop') { this.openGunShop(this.interact.current.place); break; }
        if (this.you) this.interact.toggle(() => this.you!, () => this.profile, this.owners, this.myName, (kind, id, place) => this.conn.send({ t: 'buy', kind, id, place }));
        break;
      case 'chat':
        if (this.chatting) return;
        this.chatting = true;
        this.input.enabled = false;
        this.input.release();
        this.hud.openChat(() => { this.chatting = false; this.input.enabled = true; });
        break;
      case 'map': {
        const o = this.ownState(1);
        if (this.bigMap.isOpen) this.bigMap.close(); else this.bigMap.open(o?.x ?? 1024, o?.y ?? 1024);
        break;
      }
      case 'menu':
        if (this.garage.isOpen) { this.garage.leave(); return; }
        if (this.gunShop.isOpen) { this.gunShop.leave(); return; }
        if (this.bigMap.isOpen) { this.bigMap.close(); return; }
        if (this.pane.isOpen) this.pane.close();
        else openMenu({ pane: this.pane, sound: this.sound, quality: this.quality, input: this.input, code: this.code, record: () => this.profile.felonies ?? {}, leave: () => this.leave() });
        break;
      case 'radio': this.radio.next(); break;
      case 'scoreOn': this.hud.showScore(true, this.players, this.code); break;
      case 'scoreOff': this.hud.showScore(false, this.players, this.code); break;
    }
  }

  private onMessage(m: S2C): void {
    if (this.jobs.onMessage(m)) return;
    switch (m.t) {
      case 's':
        if (!this.you) document.getElementById('loading')!.hidden = true;
        this.store.ingest(m.st, m.e, m.k);
        this.gameMinutes = m.gt;
        this.you = m.you;
        this.predict.reconcile(m.you, m.ack);
        routeFx(m.fx, this.fx, this.sound, this.store, this.cam);
        break;
      case 'players': this.players = m.list; break;
      case 'owners':
        this.owners = new Map(m.list.filter((o): o is [number, string] => o[1] !== null));
        this.storefronts.setOwners(this.owners);
        break;
      case 'profile': this.profile = m.p; break;
      case 'save': saveProgress(m.id, m.p); break;
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
        angle: y.mode === Mode.Driver ? a.angle + (b.angle - a.angle) * alpha : this.aimAngle, alt: lerp(a.alt, b.alt), vx: b.vx, vy: b.vy,
        trailer: p.prevTrailer + Math.atan2(Math.sin(p.trailer - p.prevTrailer), Math.cos(p.trailer - p.prevTrailer)) * alpha };
    }
    const ent = this.store.all.get(y.vid || y.pid);
    if (ent) return { pid: y.pid, vid: y.vid, driving: false, x: ent.x, y: ent.y, angle: ent.angle, alt: ent.alt, vx: ent.vx, vy: ent.vy };
    return { pid: y.pid, vid: y.vid, driving: false, x: y.body[0], y: y.body[1], angle: y.body[2], alt: y.body[6], vx: 0, vy: 0 };
  }

  private aimAngle = 0;
  private hudFrame = 0;
  private steering = new Steering();
  private autoAim = makeAimAssist(this.store, () => this.you?.pid ?? 0);

  private tick(own: OwnState | null): void {
    const inp = this.input;
    if (!this.you || !own) return;
    const c = this.steering.step(inp, this.you, own.angle, STEP, own, this.autoAim);
    this.aimAngle = c.aim;
    const msg: InputMsg = [
      ++this.seq, c.mx, c.my, c.throttle, c.steer,
      Math.round(c.aim * 1000) / 1000,
      inp.takeButtons(),
      inp.takeWeaponWish(),
    ];
    this.predict.apply(msg);
    this.conn.send({ t: 'in', i: [msg] });
  }

  private frame(): void {
    if (!this.running) return;
    requestAnimationFrame(() => this.frame());
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.input.pollPad(dt, this.pane.isOpen || this.bigMap.isOpen || this.garage.isOpen || this.gunShop.isOpen);
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 4) {
      this.acc -= STEP;
      n++;
      this.tick(this.ownState(1));
    }
    if (this.acc > STEP * 4) this.acc = 0;
    this.predict.decay(dt);
    this.radio.update(dt, this.you && this.you.mode !== Mode.Dead ? this.you.vid : 0, this.sound.musicLevel);
    if (this.you && !document.hidden) this.quality.sample(dt);
    this.store.update();
    const own = this.ownState(this.acc / STEP);
    if (own) {
      // GTA2: centred on you on foot; leads along travel in vehicles.
      this.cam.update(dt, own.x, own.y, own.vx, own.vy, own.alt, own.x, own.y, !!own.vid);
      this.sound.listenerX = own.x; this.sound.listenerY = own.y;
    }
    const vr = this.cam.viewRect();
    this.ground.update(vr);
    this.stage.fitShadow(Math.max(vr.x1 - vr.x0, vr.y1 - vr.y0) / 2 - 40);
    // Dev hook: window.__forceTime = minutes previews any time of day locally.
    const forced = (window as unknown as { __forceTime?: number }).__forceTime;
    this.stage.setTime(forced ?? this.gameMinutes, this.cam.x, this.cam.y);
    const night = this.stage.lighting.night;
    this.buildingUniforms.uNight.value = night;
    signalGlows(this.props, this.store, this.fx.glow, night, vr);
    this.storefronts.putGlows(this.fx.glow, night, vr);
    this.view.sync(this.store, dt, own, this.tags(), night, vr);
    this.fx.update(dt);
    this.water.update(dt);
    this.jobs.update(dt, this.you, own, this.fx.glow, night, vr, this.store.serverNow(), this.players.find((p) => p.id === this.myId), this.sound);
    nearestSiren(this.store, own, this.sound);
    ownEngine(this.store, this.you && this.you.mode !== Mode.Dead ? own : null, this.sound, dt);
    trafficEngines(this.store, own, this.sound, dt);
    this.stage.render();
    this.updateHud(own);
  }

  private tags(): Map<number, PlayerTag> {
    const m = new Map<number, PlayerTag>();
    for (const p of this.players) m.set(p.pid, { name: p.name, color: p.color, look: p.look });
    const me = this.players.find((p) => p.id === this.myId);
    if (this.you && me) m.set(this.you.pid, { name: me.name, color: me.color, look: me.look });
    return m;
  }


  private updateHud(own: OwnState | null): void {
    const you = this.you;
    if (!you || !own) return;
    const seen = you.wl > 0;
    this.hud.update(you, this.gameMinutes, seen);
    // Radar, place lookup and pane refresh don't need full frame rate.
    if ((this.hudFrame = (this.hudFrame + 1) % 2) !== 0) return;
    const spot = this.interact.find(own.x, own.y, you);
    this.interact.current = spot;
    const ring = this.jobs.touch(you, own);
    if (ring) this.conn.send({ t: 'job', booth: ring.id });
    this.hud.setPrompt(this.pane.isOpen ? null : this.interact.promptText(spot, this.owners, this.myName));
    this.interact.tick(own.x, own.y);
    this.interact.paintShop(own.x, own.y, Math.hypot(own.vx, own.vy), you, (place) => this.openPaint(place));
    this.pane.refresh();
    const ctx = this.hud.radar.getContext('2d')!;
    const range = own.vid ? 260 : 170;
    const hostiles = you.wl > 0 ? lawUnits(this.store) : [];
    const owned = new Set(this.profile.owned);
    const wp = this.waypoint;
    wp.update(own);
    this.radar.drawRadar(ctx, 220, own.x, own.y, own.angle, range, this.players, this.myId, owned, hostiles, this.jobs.blips(you), wp.point, wp.route);
    if (this.bigMap.isOpen) {
      this.bigMap.draw({ me: { x: own.x, y: own.y, angle: own.angle }, players: this.players, meId: this.myId, owned, owners: this.owners,
        blips: this.jobs.blips(you), waypoint: wp.point, route: wp.route });
    }
  }

  /** Gun shop: you step up to the counter (controls off) till you walk out. */
  private openGunShop(place: Place): void {
    if (this.gunShop.isOpen || this.you?.mode !== Mode.Foot) return;
    this.input.enabled = false;
    this.input.release();
    this.gunShop.open({ shop: place.name, stock: SERVICES[place.spec].stock ?? [], you: () => this.you,
      buy: (kind, id) => this.conn.send({ t: 'buy', kind, id, place: place.id }),
      close: () => { this.input.enabled = true; } });
  }

  /** Paint shop: the car goes into the garage (hidden on the street, controls off) till it's done. */
  private openPaint(place: Place): void {
    const you = this.you;
    if (!you?.vid || this.garage.isOpen) return;
    const vid = you.vid;
    this.view.hiddenVehicle = vid;
    this.input.enabled = false;
    this.input.release();
    this.garage.open({ shop: place.name, type: you.vt, color: this.store.all.get(vid)?.data[6] ?? 0, price: SERVICES[place.spec].price ?? 500,
      cash: you.cash, wanted: you.wl > 0, buy: (id) => this.conn.send({ t: 'buy', kind: 'respray', id, place: place.id }),
      paintNow: () => this.store.all.get(vid)?.data[6] ?? -1, close: () => { this.view.hiddenVehicle = 0; this.input.enabled = true; } });
  }

  private leave(): void {
    this.running = false;
    this.conn.close();
    this.onLeave();
  }
}
