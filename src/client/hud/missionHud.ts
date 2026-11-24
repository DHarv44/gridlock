// Job panel (giver, objective, timer, progress), job result banner, gang respect bars, and the
// room's mode / round results.
import { FACTIONS, GANGS, type GameMode, MODES } from '../../shared/packs';
import type { MissionInfo, PlayerInfo } from '../../shared/protocol';

const el = (tag: string, cls: string, parent: HTMLElement) => {
  const e = document.createElement(tag);
  e.className = cls;
  parent.appendChild(e);
  return e;
};
const gang = (id: string) => FACTIONS.find((f) => f.id === id);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export class MissionHud {
  private panel: HTMLElement;
  private title: HTMLElement;
  private objective: HTMLElement;
  private meta: HTMLElement;
  private banner: HTMLElement;
  private respect: HTMLElement;
  private bars: HTMLElement[] = [];
  private modeLine: HTMLElement;
  private results: HTMLElement;
  private mission: MissionInfo | null = null;
  mode: GameMode = MODES[0];
  round = 1;

  constructor(root: HTMLElement) {
    this.panel = el('div', 'hud-mission', root);
    this.title = el('div', 'hm-title', this.panel);
    this.objective = el('div', 'hm-obj', this.panel);
    this.meta = el('div', 'hm-meta', this.panel);
    this.panel.hidden = true;
    this.banner = el('div', 'hud-banner', root);
    this.banner.hidden = true;
    const tr = root.querySelector('.hud-tr') as HTMLElement;
    this.respect = el('div', 'hud-respect', tr);
    for (const g of GANGS) {
      const row = el('div', 'hr-row', this.respect);
      const sw = el('i', '', row);
      sw.style.background = gang(g)?.color ?? '#888';
      const bar = el('div', 'hr-bar', row);
      this.bars.push(el('div', '', bar));
      row.title = gang(g)?.name ?? g;
    }
    this.modeLine = el('div', 'hud-mode', tr);
    this.results = el('div', 'hud-results', root);
    this.results.hidden = true;
  }

  setMission(m: MissionInfo | null, result?: 'passed' | 'failed'): void {
    const started = m && !this.mission;
    this.mission = m;
    this.panel.hidden = !m;
    if (m) {
      const g = gang(m.giver);
      this.title.textContent = `${g ? g.name : 'Kill Frenzy'} · ${m.title}`;
      this.title.style.color = g?.color ?? '#ff5a4f';
      this.objective.textContent = m.objective;
      // Gang work is briefed by its caller on the phone (hud/talk.ts); a kill-frenzy crate has no
      // one to say it, so its brief shows here.
      if (started && !g) this.flash(m.brief, 'brief', 6000);
    }
    if (result) this.flash(result === 'passed' ? 'JOB DONE!' : 'JOB FAILED', result, 3000);
  }

  private flash(text: string, kind: string, ms: number): void {
    this.banner.hidden = false;
    this.banner.className = `hud-banner ${kind}`;
    this.banner.textContent = text;
    window.clearTimeout(Number(this.banner.dataset.t));
    this.banner.dataset.t = String(window.setTimeout(() => { this.banner.hidden = true; }, ms));
  }

  /** Per-frame: timer, progress, respect, mode score. */
  update(serverNow: number, respect: number[], me: PlayerInfo | undefined, players: PlayerInfo[] = []): void {
    if (this.mission) {
      const left = this.mission.ends ? Math.max(0, Math.ceil((this.mission.ends - serverNow) / 1000)) : -1;
      const time = left >= 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '';
      const text = [time, this.mission.progress ?? ''].filter(Boolean).join(' · ');
      if (this.meta.textContent !== text) this.meta.textContent = text;
      this.meta.classList.toggle('urgent', left >= 0 && left <= 10);
    }
    respect.forEach((r, i) => {
      const bar = this.bars[i];
      if (!bar) return;
      const w = `${Math.abs(r) / 2}%`, left = r >= 0 ? '50%' : `${50 - Math.abs(r) / 2}%`;
      if (bar.style.width !== w) { bar.style.width = w; bar.style.left = left; bar.className = r < -40 ? 'bad' : r > 40 ? 'good' : ''; }
    });
    const line = this.mode.score === 'none' ? ''
      : this.mode.score === 'tag' ? this.tagLine(serverNow, me, players)
      : `${this.mode.name} · ${this.mode.score === 'frags' ? me?.frags ?? 0 : `$${(me?.earned ?? 0).toLocaleString('en-US')}`} / ${this.mode.score === 'frags' ? this.mode.target : `$${this.mode.target.toLocaleString('en-US')}`}`;
    if (this.modeLine.textContent !== line) this.modeLine.textContent = line;
    this.modeLine.classList.toggle('it', this.mode.score === 'tag' && !!me && me.id === this.it);
  }

  /** Tag: who's it, the clock, and your own time as it. */
  private tagLine(serverNow: number, me: PlayerInfo | undefined, players: PlayerInfo[]): string {
    if (!this.it) return 'Tag · waiting for another player';
    const left = Math.max(0, Math.ceil((this.ends - serverNow) / 1000));
    const who = me && me.id === this.it ? "YOU'RE IT" : `${players.find((p) => p.id === this.it)?.name ?? '?'} is it`;
    return `Tag · ${clock(left)} left · ${who} · your time ${clock(me?.itS ?? 0)}`;
  }

  /** Tag: who's it (player id) and when the round ends (server ms). */
  it = 0;
  private ends = 0;

  setMode(id: string, round: number, ends = 0, it = 0, meId = 0): void {
    this.mode = MODES.find((m) => m.id === id) ?? MODES[0];
    this.round = round;
    this.ends = ends;
    if (it && it !== this.it && it === meId) this.flash("YOU'RE IT!", 'it', 3000);
    this.it = it;
  }

  showRound(winner: string, standings: [string, number][]): void {
    const money = this.mode.score === 'earned', tag = this.mode.score === 'tag';
    this.results.hidden = false;
    this.results.innerHTML = '';
    el('div', 'hres-title', this.results).textContent = tag ? `${winner} wins tag! Least time it.` : `${winner} wins the ${this.mode.name.toLowerCase()}!`;
    for (const [name, score] of standings) {
      const row = el('div', 'hres-row', this.results);
      el('span', '', row).textContent = name;
      el('b', '', row).textContent = money ? `$${score.toLocaleString('en-US')}` : tag ? `${clock(score)} it` : String(score);
    }
    el('div', 'hres-next', this.results).textContent = `Round ${this.round} starting…`;
    window.setTimeout(() => { this.results.hidden = true; }, 8000);
  }
}
