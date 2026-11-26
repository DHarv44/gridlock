// Routes server FX events to visual effects and sounds.
import { VEHICLES, WEAPONS } from '../../shared/packs';
import { FX } from '../../shared/protocol';
import type { Sound } from '../audio/sound';
import type { EntityStore } from '../net/entities';
import type { ChaseCamera } from '../render/camera';
import type { Effects } from '../render/effects';

/** `swing`: a ped swung a melee weapon (their arm animates); `myPid`: your own ped, whose blows
 *  landing (and blows landing on you) shake the camera a little. */
export function routeFx(events: number[][], fx: Effects, sound: Sound, store: EntityStore, cam: ChaseCamera, swing: (pid: number) => void = () => {}, myPid = 0,
  muzzle: (pid: number) => { x: number; y: number; z: number } | null = () => null): void {
  for (const e of events) {
    switch (e[0]) {
      case FX.Shot: {
        // From the shooter's gun as it's drawn, when we can see it; else from where the server fired.
        const [, x0, y0, x1, y1, wi, hit, by] = e;
        const m = by ? muzzle(by) : null;
        fx.shot(m?.x ?? x0, m?.y ?? y0, x1, y1, wi, hit, m?.z);
        if (WEAPONS[wi]) sound.play(WEAPONS[wi].sound, x0, y0);
        break;
      }
      case FX.Boom: {
        const [, x, y, r] = e;
        fx.explosion(x, y, r);
        // Shake by blast size and distance from the camera: point-blank rockets hit hard,
        // a car going up across the block is a rumble, molotovs barely register.
        const d = Math.hypot(x - cam.x, y - cam.y);
        cam.addShake(Math.min(1, r / 8) * Math.max(0, 1 - d / 140) * 0.9);
        sound.play(r > 3 ? 'boom' : 'splash', x, y);
        break;
      }
      case FX.Blood: fx.blood(e[1], e[2]); break;
      case FX.Splash: fx.splash(e[1], e[2]); sound.play('splash', e[1], e[2]); break;
      case FX.Spark: fx.spark(e[1], e[2]); sound.play('crash', e[1], e[2]); break;
      case FX.Hit: {
        // A blow landing: its thud, and a jolt for you if you threw it or took it.
        const [, by, on, wi] = e;
        const victim = store.all.get(on);
        const w = WEAPONS[wi];
        if (victim && w) sound.play(w.hitSound ?? w.sound, victim.x, victim.y);
        if (on === myPid) cam.addShake(0.3);
        else if (by === myPid) cam.addShake(0.12);
        break;
      }
      case FX.Swing: case FX.Throw: case FX.Horn: {
        const ent = store.all.get(e[1]);
        if (!ent) break;
        if (e[0] === FX.Swing) swing(e[1]);
        // A horn is the vehicle's own (pack field); vehicles without one stay quiet.
        const voice = e[0] === FX.Horn ? VEHICLES[ent.data[2]]?.horn : e[0] === FX.Throw ? 'throw' : 'swing';
        if (voice) sound.play(voice, ent.x, ent.y);
        break;
      }
    }
  }
}
