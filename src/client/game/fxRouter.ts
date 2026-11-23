// Routes server FX events to visual effects and sounds.
import { WEAPONS } from '../../shared/packs';
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
        if (r > 3) {
          sound.play('boom', x, y);
          const d = Math.hypot(x - cam.x, y - cam.y);
          cam.addShake(Math.max(0, 2.5 - d / 40));
        } else sound.play('splash', x, y);
        break;
      }
      case FX.Blood: fx.blood(e[1], e[2]); break;
      case FX.Splash: fx.splash(e[1], e[2]); sound.play('splash', e[1], e[2]); break;
      case FX.Spark: fx.spark(e[1], e[2]); sound.play('crash', e[1], e[2]); break;
      case FX.Swing: case FX.Throw: case FX.Horn: {
        const ent = store.all.get(e[1]);
        if (!ent) break;
        const voice = e[0] === FX.Horn ? 'horn' : e[0] === FX.Throw ? 'throw' : 'swing';
        sound.play(voice, ent.x, ent.y);
        break;
      }
    }
  }
}
