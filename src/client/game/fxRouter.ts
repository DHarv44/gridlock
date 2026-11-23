// Routes server FX events to visual effects and sounds.
import { VEHICLES, WEAPONS } from '../../shared/packs';
import { FX } from '../../shared/protocol';
import type { Sound } from '../audio/sound';
import type { EntityStore } from '../net/entities';
import type { ChaseCamera } from '../render/camera';
import type { Effects } from '../render/effects';

export function routeFx(events: number[][], fx: Effects, sound: Sound, store: EntityStore, cam: ChaseCamera): void {
  for (const e of events) {
    switch (e[0]) {
      case FX.Shot: {
        const [, x0, y0, x1, y1, wi, hit] = e;
        fx.shot(x0, y0, x1, y1, wi, hit);
        sound.play(WEAPONS[wi]?.sound ?? 'pistol', x0, y0);
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
      case FX.Swing: case FX.Throw: case FX.Horn: {
        const ent = store.all.get(e[1]);
        if (!ent) break;
        // A horn is the vehicle's own (pack field); vehicles without one stay quiet.
        const voice = e[0] === FX.Horn ? VEHICLES[ent.data[2]]?.horn : e[0] === FX.Throw ? 'throw' : 'swing';
        if (voice) sound.play(voice, ent.x, ent.y);
        break;
      }
    }
  }
}
