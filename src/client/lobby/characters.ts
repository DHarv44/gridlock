// Lobby character picker: up to MAX_CHARACTERS characters kept in this browser (see
// characterStore.ts), the creator (creator.ts), and delete with an inline confirm.
import { type CharacterSave, FELONIES, MAX_CHARACTERS } from '../../shared/packs';
import { createCharacter, deleteCharacter, loadCharacters } from './characterStore';
import { Creator, type Draft, el } from './creator';
import { figureCanvas } from './figure';

const SEL_STORE = 'gridlock.char';

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

export class CharacterPicker {
  private list: CharacterSave[] = [];
  private sel = store.get(SEL_STORE) ?? '';
  private creator: Creator | null = null;
  private confirm = '';
  onMode: (creating: boolean) => void = () => {};

  constructor(private root: HTMLElement) {
    root.className = 'chars';
    // After the caller has hooked up onMode.
    queueMicrotask(() => this.load());
  }

  /** The chosen character as saved right now (re-read, so it carries the latest progress). */
  get selected(): CharacterSave | null {
    return loadCharacters().find((c) => c.id === this.sel) ?? null;
  }

  private load(): void {
    this.list = loadCharacters().sort((a, b) => b.lastPlayed - a.lastPlayed);
    if (!this.list.some((c) => c.id === this.sel)) this.sel = this.list[0]?.id ?? '';
    if (!this.list.length) this.openCreator(); else this.renderList();
  }

  private openCreator(): void {
    this.onMode(true);
    this.creator = new Creator(this.root, this.list.length > 0, (d) => this.create(d), () => this.closeCreator());
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

  private create(d: Draft): void {
    const c = createCharacter(d.name, d.look);
    if (typeof c === 'string') {
      if (this.creator) { this.creator.error = c; this.creator.render(); }
      return;
    }
    this.list.unshift(c);
    this.sel = c.id;
    store.set(SEL_STORE, c.id);
    this.closeCreator();
  }

  private remove(id: string): void {
    deleteCharacter(id);
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

  private card(c: CharacterSave): HTMLElement {
    const card = el('div', `char${c.id === this.sel ? ' on' : ''}`);
    card.appendChild(figureCanvas(c.look, 26, 52));
    const info = el('div', 'char-info');
    info.appendChild(el('b', '', c.name));
    const total = Object.values(c.felonies).reduce((a, n) => a + n, 0);
    info.appendChild(el('span', '', `$${c.cash.toLocaleString('en-US')} · ${total} ${total === 1 ? 'felony' : 'felonies'} · ${c.garage.length} car${c.garage.length === 1 ? '' : 's'}`));
    card.title = FELONIES.filter((f) => c.felonies[f.kind]).map((f) => `${f.label}: ${c.felonies[f.kind]}`).join('\n') || 'Clean record';
    card.appendChild(info);
    if (this.confirm === c.id) {
      const yes = el('button', 'danger', 'Delete');
      yes.addEventListener('click', (e) => { e.stopPropagation(); this.remove(c.id); });
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
