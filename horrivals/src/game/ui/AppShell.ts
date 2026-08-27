import type { CardData } from '../types';
import { CardArtStore } from '../storage/CardArtStore';

export class AppShell {
  private root: HTMLElement;
  private roster: CardData[];
  private artStore: CardArtStore;
  private team: CardData[];
  private startBattle: (team: CardData[]) => void;

  constructor(root: HTMLElement, roster: CardData[], artStore: CardArtStore, startBattle: (team: CardData[]) => void) {
    this.root = root;
    this.roster = roster;
    this.artStore = artStore;
    this.team = roster.slice(0, 5);
    this.startBattle = startBattle;
  }

  showMenu(): void {
    this.root.innerHTML = `
      <main class="menu-screen">
        <div class="brand"><span>HORRIVALS</span><small>RIVALS ARENA</small></div>
        <div class="menu-actions">
          <button data-action="battle">COMBAT RAPIDE</button>
          <button data-action="team">ÉQUIPE</button>
          <button data-action="collection">COLLECTION</button>
          <button data-action="import">IMPORTER MES CARTES</button>
        </div>
        <div class="menu-note">Cartes verrouillées en <b>2:3 JUMBO XL</b> · zéro crop · zéro étirement</div>
      </main>`;
    this.root.querySelector('[data-action="battle"]')!.addEventListener('click', () => this.startBattle(this.team));
    this.root.querySelector('[data-action="team"]')!.addEventListener('click', () => this.showTeam());
    this.root.querySelector('[data-action="collection"]')!.addEventListener('click', () => this.showCollection());
    this.root.querySelector('[data-action="import"]')!.addEventListener('click', () => this.openImport());
  }

  private showTeam(): void {
    const selected = new Set(this.team.map(c => c.id));
    this.root.innerHTML = `<section class="panel-screen"><header><button data-back>‹</button><h1>ÉQUIPE 5 CARTES</h1><strong>${this.team.length}/5</strong></header><div class="card-grid"></div></section>`;
    const grid = this.root.querySelector('.card-grid')!;
    for (const card of this.roster) {
      const item = this.cardTile(card, selected.has(card.id));
      item.addEventListener('click', () => {
        if (selected.has(card.id)) selected.delete(card.id);
        else if (selected.size < 5) selected.add(card.id);
        this.team = this.roster.filter(c => selected.has(c.id));
        this.showTeam();
      });
      grid.appendChild(item);
    }
    this.root.querySelector('[data-back]')!.addEventListener('click', () => this.showMenu());
  }

  private showCollection(): void {
    this.root.innerHTML = `<section class="panel-screen"><header><button data-back>‹</button><h1>COLLECTION</h1><strong>${this.roster.length}</strong></header><div class="card-grid"></div></section>`;
    const grid = this.root.querySelector('.card-grid')!;
    for (const card of this.roster) grid.appendChild(this.cardTile(card, false));
    this.root.querySelector('[data-back]')!.addEventListener('click', () => this.showMenu());
  }

  private cardTile(card: CardData, selected: boolean): HTMLElement {
    const el = document.createElement('button');
    el.className = `collection-card${selected ? ' selected' : ''}`;
    el.innerHTML = `<div class="card-fallback"><b>${card.id}</b><strong>${card.name}</strong><small>ATQ ${card.attack} · DEF ${card.defense}</small></div>`;
    void this.artStore.getObjectUrl(card.id).then(url => {
      if (!url || !el.isConnected) return;
      el.innerHTML = `<img src="${url}" alt="${card.name}"><span>${card.id}</span>`;
    });
    return el;
  }

  private openImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files) return;
      const result = await this.artStore.importFiles(input.files, new Set(this.roster.map(c => c.id)));
      const rejected = result.rejected.length ? `\nNon reconnus: ${result.rejected.join(', ')}` : '';
      alert(`${result.imported.length} carte(s) importée(s).${rejected}\n\nNom conseillé: HOR-001.png, HOR-002.webp, etc.`);
      this.showMenu();
    };
    input.click();
  }
}
