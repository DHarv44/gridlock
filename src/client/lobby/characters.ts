// Lobby character picker: up to MAX_CHARACTERS saved characters per browser, a creator with look
// swatches and a live preview, and delete with an inline confirm. Characters live on the server,
// owned by a random key this browser keeps.
import { CHARACTER_LOOKS, type CharacterSummary, type CharLook, DEFAULT_LOOK, FELONIES, LOOK_PARTS, type LookPart, MAX_CHARACTERS } from '../../shared/packs';
import { figureCanvas } from './figure';

const KEY_STORE = 'gridlock.key';
const SEL_STORE = 'gridlock.char';

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

function playerKey(): string {
  let k = store.get(KEY_STORE);
  if (!k || !/^[a-f0-9]{32}$/.test(k)) {
    k = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
    store.set(KEY_STORE, k);
  }
  return k;
}

const PART_LABEL: Record<LookPart, string> = { skin: 'Skin', hair: 'Hair colour', hairStyle: 'Hair', top: 'Top', bottom: 'Trousers', hat: 'Hat' };

export class CharacterPicker {
  readonly key = playerKey();
  private list: CharacterSummary[] = [];
  private sel = store.get(SEL_STORE) ?? '';
  private creating = false;
  private confirm = '';
  private draft: { name: string; look: CharLook } = { name: '', look: { ...DEFAULT_LOOK } };
  private error = '';
  onMode: (creating: boolean) => void = () => {};

  constructor(private root: HTMLElement) {
    void this.load();
  }

  get selected(): CharacterSummary | null {
    return this.list.find((c) => c.id === this.sel) ?? null;
  }

  private async api(path: string, init: RequestInit = {}): Promise<{ ok: boolean; body: unknown }> {
    try {
      const r = await fetch(path, { ...init, headers: { 'content-type': 'application/json', 'x-gridlock-key': this.key } });
      return { ok: r.ok, body: await r.json().catch(() => ({})) };
    } catch {
      return { ok: false, body: { error: 'Server not reachable.' } };
    }
  }

  private async load(): Promise<void> {
    const r = await this.api('/api/characters');
    this.list = r.ok && Array.isArray(r.body) ? (r.body as CharacterSummary[]) : [];
    if (!this.selected) this.sel = this.list[0]?.id ?? '';
    if (!this.list.length) this.openCreator();
    else this.render();
  }

  private openCreator(): void {
    this.draft = { name: '', look: randomLook(false) };
    this.undo = []; this.redo = [];
    this.creating = true;
    this.error = '';
    this.render();
  }

  /** Look edits (swatches, Random) go through here so Undo / Redo can step through them. */
  private undo: CharLook[] = [];
  private redo: CharLook[] = [];
  private setLook(look: CharLook): void {
    this.undo.push({ ...this.draft.look });
    this.redo = [];
    this.draft.look = look;
    this.render();
  }

  private step(from: CharLook[], to: CharLook[]): void {
    const prev = from.pop();
    if (!prev) return;
    to.push({ ...this.draft.look });
    this.draft.look = prev;
    this.render();
  }

  private select(id: string): void {
    this.sel = id;
    store.set(SEL_STORE, id);
    this.render();
  }

  private async create(): Promise<void> {
    const r = await this.api('/api/characters', { method: 'POST', body: JSON.stringify(this.draft) });
    if (!r.ok) { this.error = (r.body as { error?: string }).error ?? 'Could not create the character.'; this.render(); return; }
    const c = r.body as CharacterSummary;
    this.list.unshift(c);
    this.creating = false;
    this.select(c.id);
  }

  private async remove(id: string): Promise<void> {
    await this.api(`/api/characters/${encodeURIComponent(id)}`, { method: 'DELETE' });
    this.list = this.list.filter((c) => c.id !== id);
    this.confirm = '';
    if (this.sel === id) this.sel = this.list[0]?.id ?? '';
    if (!this.list.length) this.openCreator(); else this.render();
  }

  private render(): void {
    this.onMode(this.creating);
    this.root.innerHTML = '';
    this.root.className = 'chars';
    if (this.creating) this.renderCreator(); else this.renderList();
  }

  private renderList(): void {
    const head = el('div', 'chars-head', `Characters ${this.list.length}/${MAX_CHARACTERS}`);
    this.root.appendChild(head);
    for (const c of this.list) {
      const card = el('div', `char${c.id === this.sel ? ' on' : ''}`);
      card.appendChild(figureCanvas(c.look, 26, 52));
      const info = el('div', 'char-info');
      info.appendChild(el('b', '', c.name));
      const total = Object.values(c.felonies).reduce((a, n) => a + n, 0);
      info.appendChild(el('span', '', `$${c.cash.toLocaleString('en-US')} · ${total} ${total === 1 ? 'felony' : 'felonies'} · ${c.cars} car${c.cars === 1 ? '' : 's'}`));
      card.title = FELONIES.filter((f) => c.felonies[f.kind]).map((f) => `${f.label}: ${c.felonies[f.kind]}`).join('\n') || 'Clean record';
      card.appendChild(info);
      if (this.confirm === c.id) {
        const yes = el('button', 'danger', 'Delete');
        yes.addEventListener('click', (e) => { e.stopPropagation(); void this.remove(c.id); });
        const no = el('button', '', 'Keep');
        no.addEventListener('click', (e) => { e.stopPropagation(); this.confirm = ''; this.render(); });
        card.append(yes, no);
      } else {
        const del = el('button', 'char-del', '×');
        del.title = `Delete ${c.name}`;
        del.addEventListener('click', (e) => { e.stopPropagation(); this.confirm = c.id; this.render(); });
        card.appendChild(del);
      }
      card.addEventListener('click', () => this.select(c.id));
      this.root.appendChild(card);
    }
    if (this.list.length < MAX_CHARACTERS) {
      const add = el('button', 'char-add', '+ New character');
      add.addEventListener('click', () => this.openCreator());
      this.root.appendChild(add);
    }
  }

  private renderCreator(): void {
    const L = CHARACTER_LOOKS;
    this.root.appendChild(el('div', 'chars-head', 'New character'));
    const wrap = el('div', 'creator');
    const side = el('div', 'creator-side');
    side.appendChild(figureCanvas(this.draft.look, 70, 140));
    const tools = el('div', 'creator-tools');
    const tool = (label: string, title: string, enabled: boolean, act: () => void) => {
      const b = el('button', '', label);
      b.title = title;
      b.disabled = !enabled;
      b.addEventListener('click', act);
      tools.appendChild(b);
    };
    tool('Random', 'Random look', true, () => this.setLook(randomLook(true)));
    tool('↶', 'Undo', this.undo.length > 0, () => this.step(this.undo, this.redo));
    tool('↷', 'Redo', this.redo.length > 0, () => this.step(this.redo, this.undo));
    side.appendChild(tools);
    wrap.appendChild(side);
    const form = el('div', 'creator-form');
    const name = document.createElement('input');
    name.maxLength = 16;
    name.placeholder = 'Name';
    name.autocomplete = 'off';
    name.spellcheck = false;
    name.value = this.draft.name;
    name.addEventListener('input', () => { this.draft.name = name.value; });
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') void this.create(); });
    form.appendChild(name);
    for (const part of LOOK_PARTS) {
      const row = el('div', 'swatches');
      row.appendChild(el('small', '', PART_LABEL[part]));
      L[part].forEach((v, i) => {
        const text = part === 'hairStyle' ? v : part === 'hat' && i === 0 ? 'None' : '';
        const b = el('button', `sw${this.draft.look[part] === i ? ' on' : ''}${text ? ' text' : ''}`, text);
        if (!text) b.style.background = v;
        b.addEventListener('click', () => { if (this.draft.look[part] !== i) this.setLook({ ...this.draft.look, [part]: i }); });
        row.appendChild(b);
      });
      form.appendChild(row);
    }
    wrap.appendChild(form);
    this.root.appendChild(wrap);
    if (this.error) this.root.appendChild(el('p', 'error', this.error));
    const actions = el('div', 'row');
    const ok = el('button', 'primary', 'Create character');
    ok.addEventListener('click', () => void this.create());
    actions.appendChild(ok);
    if (this.list.length) {
      const cancel = el('button', '', 'Cancel');
      cancel.addEventListener('click', () => { this.creating = false; this.render(); });
      actions.appendChild(cancel);
    }
    this.root.appendChild(actions);
    if (!this.draft.name) setTimeout(() => name.focus(), 0);
  }
}

/** A random look; hats only sometimes (and never on a brand-new draft). */
function randomLook(hats: boolean): CharLook {
  const L = CHARACTER_LOOKS;
  const rnd = (n: number) => Math.floor(Math.random() * n);
  return {
    skin: rnd(L.skin.length), hair: rnd(L.hair.length), hairStyle: rnd(L.hairStyle.length), top: rnd(L.top.length),
    bottom: rnd(L.bottom.length), hat: hats && Math.random() < 0.35 ? 1 + rnd(L.hat.length - 1) : 0,
  };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
