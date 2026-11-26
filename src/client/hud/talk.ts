// Phone conversations (packs/calls.ts) as comic speech bubbles beside your character. The caller's
// bubble has the jagged lightning tail comics give a voice coming down a phone line, and their line
// plays through a payphone's or a cell's sound (audio/phoneVoice.ts); your turns get a plain tail
// on the other side and play in your character's voice, clean. One bubble at a time; a call that
// comes in during another waits its turn.
import * as THREE from 'three';
import { CALLERS, CALLS, type CallSituation, DEFAULT_VOICE, FACTIONS, GANG_CALLERS, genderOf, PLAYER_LINES, PLAYER_SAYS, type PlayerSituation, YOU, youLineId } from '../../shared/packs';
import type { S2C, TalkVia } from '../../shared/protocol';
import type { Line } from '../audio/phoneVoice';
import type { Sound } from '../audio/sound';
import { clipOf } from '../audio/voiceClips';

/** One bubble: a voiced line (`id` names its clip): the caller's, or yours (`who` empty). */
interface Step { who: string; text: string; id?: string }
type TalkMsg = Extract<S2C, { t: 'talk' }>;

/** Bubble text: escaped, with a line's breaks kept (a blank line shows as one break). */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
  .replace(/\n{2,}/g, '\n');
/** Long enough to read a bubble with no voice to time it. */
const readTime = (text: string) => 0.9 + text.length * 0.055;
const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

function colorOf(who: string): string {
  const gang = Object.entries(GANG_CALLERS).find(([, crew]) => crew.includes(who))?.[0];
  return FACTIONS.find((f) => f.id === gang)?.color ?? '#5a6470';
}

const BOLT = '<svg class="tb-bolt" viewBox="0 0 40 46" aria-hidden="true"><path d="M13 0 L30 0 L21 13 L29 14 L13 29 L19 30 L0 46 L7 27 L1 26 L11 12 L5 11 Z"/></svg>';

/** An exchange waiting to play: how it reaches you, and face to face whose ped is speaking. */
interface Exchange { via: TalkVia; ped: number; steps: Step[] }

export class Talk {
  private root = document.createElement('div');
  private queue: Exchange[] = [];
  private busy = false;
  private v = new THREE.Vector3();
  /** Face to face: who's speaking now (their ped), so their bubble is drawn over them; 0 you. */
  private speaker = 0;
  /** A call is on the line (who's speaking, and how it came in), or it's over (null). */
  onLine: (who: string | null, via: TalkVia) => void = () => {};
  /** Where a ped's head is (world x, height, y), for bubbles said face to face. */
  locate: (ped: number) => { x: number; h: number; y: number } | null = () => null;
  /** The colour of a ped's side (their faction), for their name face to face. */
  pedColor: (ped: number) => string = () => '#5a6470';
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
      // A line of yours on its own (picking up, asking for work).
      if (who === YOU) {
        const key = PLAYER_SAYS[s as PlayerSituation]?.[x];
        if (key) steps.push({ who: '', text: PLAYER_LINES[key].text, id: youLineId(this.voice, key) });
        continue;
      }
      const situation = s as CallSituation;
      const turns = CALLS[who]?.[situation]?.[x];
      if (!turns) continue;
      for (const t of turns) {
        if (t.by === 'you') steps.push({ who: '', text: t.text, id: youLineId(this.voice, t.key) });
        else if (typeof t.text === 'string') steps.push({ who, text: t.text, id: t.clip });
        else {
          const g = genderOf(this.voice);
          steps.push({ who, text: t.text[g], id: `${t.clip}_${g}` });
        }
      }
    }
    if (!steps.length) return;
    this.queue.push({ via: m.via, ped: m.ped ?? 0, steps });
    if (!this.busy) void this.run();
  }

  private async run(): Promise<void> {
    this.busy = true;
    while (this.queue.length) {
      const call = this.queue.shift()!;
      this.onLine(call.steps.find((s) => s.who)?.who ?? null, call.via);
      for (const s of call.steps) {
        const face = call.via === 'face';
        this.speaker = face && s.who ? call.ped : 0;
        this.show(s, face ? this.pedColor(call.ped) : null);
        // The caller comes down the line; you're speaking where you stand, as is anyone in person.
        const spoke = await this.sound.line(s.id ? clipOf(s.id) : undefined, s.who && !face ? call.via as Line : 'local');
        await sleep(spoke > 0 ? 0.45 : readTime(s.text));
      }
      this.hide();
      this.onLine(null, call.via);
      await sleep(0.25);
    }
    this.busy = false;
  }

  /** `face`: said in person (a plain tail, over them), in their side's colour; null on the phone. */
  private show(s: Step, face: string | null): void {
    const name = s.who ? CALLERS.find((c) => c.id === s.who)?.name ?? s.who : '';
    this.root.innerHTML = !s.who
      ? `<div class="tb tb-you"><span>${esc(s.text)}</span></div>`
      : face !== null
        // Side colours can be pale (townsfolk's tan): darkened so the name reads on the bubble.
        ? `<div class="tb tb-face"><b class="tb-name" style="color:color-mix(in srgb, ${face} 60%, #121417)">${esc(name)}</b><span>${esc(s.text)}</span></div>`
        : `<div class="tb tb-them">${BOLT}<b class="tb-name" style="color:${colorOf(s.who)}">${esc(name)}</b><span>${esc(s.text)}</span></div>`;
    this.root.classList.add('on');
  }

  private hide(): void {
    this.root.classList.remove('on');
  }

  /** Every frame: keeps the bubbles beside your character's head (`you`: world x, height, y), or
   *  over whoever's talking to you face to face. */
  update(camera: THREE.Camera, you: { x: number; h: number; y: number } | null): void {
    const at = (this.speaker && this.locate(this.speaker)) || you;
    if (!this.busy || !at) return;
    this.v.set(at.x, at.h, at.y).project(camera);
    const w = window.innerWidth, h = window.innerHeight;
    const sx = Math.min(w - 40, Math.max(40, (this.v.x * 0.5 + 0.5) * w));
    const sy = Math.min(h - 40, Math.max(160, (-this.v.y * 0.5 + 0.5) * h));
    this.root.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
  }
}
