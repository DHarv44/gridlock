// Lobby character picker: up to MAX_CHARACTERS saved characters per browser, the creator (see
// creator.ts), and delete with an inline confirm. Characters live on the server, owned by a random
// key this browser keeps.
import { type CharacterSummary, FELONIES, MAX_CHARACTERS } from '../../shared/packs';
import { Creator, type Draft, el } from './creator';
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

export class CharacterPicker {
  readonly key = playerKey();
  private list: CharacterSummary[] = [];
  private sel = store.get(SEL_STORE) ?? '';
  private creator: Creator | null = null;
  private confirm = '';
  onMode: (creating: boolean) => void = () => {};

  constructor(private root: HTMLElement) {
    root.className = 'chars';
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
    if (!this.list.length) this.openCreator(); else this.renderList();
  }

  private openCreator(): void {
    this.onMode(true);
    this.creator = new Creator(this.root, this.list.length > 0, (d) => void this.create(d), () => this.closeCreator());
  }

  private closeCreator(): void {
    this.creator?.dispose();
    this.creator = null;
    this.renderList();
  }

  private select(id: string): void {
    this.sel = id;
    store.set(SEL_STORE, id);
    this.renderList();
  }

  private async create(d: Draft): Promise<void> {
    const r = await this.api('/api/characters', { method: 'POST', body: JSON.stringify(d) });
    if (!r.ok && this.creator) {
      this.creator.error = (r.body as { error?: string }).error ?? 'Could not create the character.';
      this.creator.render();
      return;
    }
    const c = r.body as CharacterSummary;
    this.list.unshift(c);
    this.sel = c.id;
    store.set(SEL_STORE, c.id);
    this.closeCreator();
  }

  private async remove(id: string): Promise<void> {
    await this.api(`/api/characters/${encodeURIComponent(id)}`, { method: 'DELETE' });
    this.list = this.list.filter((c) => c.id !== id);
    this.confirm = '';
    if (this.sel === id) this.sel = this.list[0]?.id ?? '';
    if (!this.list.length) this.openCreator(); else this.renderList();
  }

  private renderList(): void {
    this.onMode(false);
    const r = this.root;
    r.innerHTML = '';
    r.appendChild(el('div', 'chars-head', `Characters ${this.list.length}/${MAX_CHARACTERS}`));
    for (const c of this.list) r.appendChild(this.card(c));
    if (this.list.length < MAX_CHARACTERS) {
      const add = el('button', 'char-add', '+ New character');
      add.addEventListener('click', () => this.openCreator());
      r.appendChild(add);
    }
  }

  private card(c: CharacterSummary): HTMLElement {
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
      no.addEventListener('click', (e) => { e.stopPropagation(); this.confirm = ''; this.renderList(); });
      card.append(yes, no);
    } else {
      const del = el('button', 'char-del', '×');
      del.title = `Delete ${c.name}`;
      del.addEventListener('click', (e) => { e.stopPropagation(); this.confirm = c.id; this.renderList(); });
      card.appendChild(del);
    }
    card.addEventListener('click', () => this.select(c.id));
    return card;
  }
}
