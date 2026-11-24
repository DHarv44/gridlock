// Phone conversations (packs/calls.ts) as comic speech bubbles beside your character. The caller's
// bubble has the jagged lightning tail comics give a voice coming down a phone line, and their line
// plays through a payphone's or a cell's sound (audio/phoneVoice.ts); your replies get a plain tail
// on the other side and aren't voiced. One bubble at a time; a call that comes in during another
// waits its turn.
import * as THREE from 'three';
import { CALLERS, CALLS, type CallSituation, DEFAULT_VOICE, FACTIONS, GANG_CALLERS, lineId, REPLIES, youLineId } from '../../shared/packs';
import type { S2C } from '../../shared/protocol';
import type { Line } from '../audio/phoneVoice';
import type { Sound } from '../audio/sound';
import { clipOf } from '../audio/voiceClips';

/** Which list of your lines back follows a situation (none after an introduction). */
const REPLY_FOR: Partial<Record<CallSituation, keyof typeof REPLIES>> = {
  hit: 'brief', torch: 'brief', steal: 'brief', courier: 'brief', frenzy: 'brief', pass: 'pass', fail: 'fail', busy: 'busy', nothing: 'nothing',
};

/** One bubble: a voiced line (`id` names its clip): the caller's, or yours (`who` empty). */
interface Step { who: string; text: string; id?: string }
type TalkMsg = Extract<S2C, { t: 'talk' }>;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
/** Long enough to read a bubble with no voice to time it. */
const readTime = (text: string) => 0.9 + text.length * 0.055;
const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

function colorOf(who: string): string {
  const gang = Object.entries(GANG_CALLERS).find(([, crew]) => crew.includes(who))?.[0];
  return FACTIONS.find((f) => f.id === gang)?.color ?? '#5a6470';
}

const BOLT = '<svg class="tb-bolt" viewBox="0 0 40 46" aria-hidden="true"><path d="M13 0 L30 0 L21 13 L29 14 L13 29 L19 30 L0 46 L7 27 L1 26 L11 12 L5 11 Z"/></svg>';

export class Talk {
  private root = document.createElement('div');
  private queue: { via: Line; steps: Step[] }[] = [];
  private busy = false;
  private v = new THREE.Vector3();
  /** A call is on the line (who's speaking, and how it came in), or it's over (null). */
  onLine: (who: string | null, via: Line) => void = () => {};
  /** Your character's voice (packs/calls.ts PLAYER_VOICES). */
  voice = DEFAULT_VOICE;

  constructor(parent: HTMLElement, private sound: Sound) {
    this.root.className = 'talk';
    parent.appendChild(this.root);
  }

  get active(): boolean { return this.busy; }

  play(m: TalkMsg): void {
    const steps: Step[] = [];
    for (const [who, s, x] of m.parts) {
      const situation = s as CallSituation;
      const turns = CALLS[who]?.[situation]?.[x];
      if (!turns) continue;
      turns.forEach((t, k) => steps.push(typeof t === 'string'
        ? { who, text: t, id: lineId(who, situation, x, k) }
        : { who: '', text: t.you, id: youLineId(this.voice, lineId(who, situation, x, k)) }));
      // And you answer back (unless the exchange already ended on you).
      const list = REPLY_FOR[situation];
      if (list && typeof turns[turns.length - 1] === 'string') {
        const i = Math.floor(Math.random() * REPLIES[list].length);
        steps.push({ who: '', text: REPLIES[list][i], id: youLineId(this.voice, `reply_${list}_${i}`) });
      }
    }
    if (!steps.length) return;
    this.queue.push({ via: m.via, steps });
    if (!this.busy) void this.run();
  }

  private async run(): Promise<void> {
    this.busy = true;
    while (this.queue.length) {
      const call = this.queue.shift()!;
      this.onLine(call.steps.find((s) => s.who)?.who ?? null, call.via);
      for (const s of call.steps) {
        this.show(s);
        // The caller comes down the line; you're speaking where you stand.
        const spoke = await this.sound.line(s.id ? clipOf(s.id) : undefined, s.who ? call.via : 'local');
        await sleep(spoke > 0 ? 0.45 : readTime(s.text));
      }
      this.hide();
      this.onLine(null, call.via);
      await sleep(0.25);
    }
    this.busy = false;
  }

  private show(s: Step): void {
    const name = s.who ? CALLERS.find((c) => c.id === s.who)?.name ?? s.who : '';
    this.root.innerHTML = s.who
      ? `<div class="tb tb-them">${BOLT}<b class="tb-name" style="color:${colorOf(s.who)}">${esc(name)}</b><span>${esc(s.text)}</span></div>`
      : `<div class="tb tb-you"><span>${esc(s.text)}</span></div>`;
    this.root.classList.add('on');
  }

  private hide(): void {
    this.root.classList.remove('on');
  }

  /** Every frame: keeps the bubbles beside your character's head (`at`: world x, height, y). */
  update(camera: THREE.Camera, at: { x: number; h: number; y: number } | null): void {
    if (!this.busy || !at) return;
    this.v.set(at.x, at.h, at.y).project(camera);
    const w = window.innerWidth, h = window.innerHeight;
    const sx = Math.min(w - 40, Math.max(40, (this.v.x * 0.5 + 0.5) * w));
    const sy = Math.min(h - 40, Math.max(160, (-this.v.y * 0.5 + 0.5) * h));
    this.root.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
  }
}
