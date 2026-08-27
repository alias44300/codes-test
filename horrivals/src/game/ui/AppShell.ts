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
      <main class="modern-menu">
        <div class="menu-atmosphere" aria-hidden="true"><i></i><i></i><i></i></div>
        <header class="menu-topline">
          <div class="brand-lockup"><span>HORRIVALS</span><small>MASTER 120 · V8</small></div>
          <div class="collection-count"><b>120</b><span>RIVAUX</span></div>
        </header>

        <section class="menu-hero">
          <div class="hero-copy">
            <span class="eyebrow">ARÈNE JUMBO XL</span>
            <h1>CHOISIS 5.<br>FAIS TOMBER 3.</h1>
            <p>Des duels courts, des cartes immenses et aucune illustration sacrifiée. Chaque carte reste entièrement visible en 2:3.</p>
            <button class="primary-cta" data-action="battle"><span>COMBATTRE</span><b>›</b></button>
          </div>
          <div class="hero-team" aria-label="Équipe actuelle"></div>
        </section>

        <nav class="modern-nav">
          <button data-action="team"><span>01</span><b>ÉQUIPE</b><small>Composer mes 5 cartes</small></button>
          <button data-action="collection"><span>02</span><b>COLLECTION</b><small>Explorer les 120 rivaux</small></button>
          <button data-action="import"><span>03</span><b>MES ILLUSTRATIONS</b><small>Importer HOR-XXX / SCI-XXX</small></button>
        </nav>

        <footer class="menu-footer"><span>2:3 JUMBO XL</span><i></i><span>ATTAQUE / DÉFENSE</span><i></i><span>ANDROID</span></footer>
      </main>`;

    const teamStrip = this.root.querySelector('.hero-team')!;
    this.team.forEach((card, index) => teamStrip.appendChild(this.cardTile(card, false, 'hero-card', index)));

    this.root.querySelector('[data-action="battle"]')!.addEventListener('click', () => {
      if (this.team.length === 5) this.startBattle(this.team);
      else this.showTeam();
    });
    this.root.querySelector('[data-action="team"]')!.addEventListener('click', () => this.showTeam());
    this.root.querySelector('[data-action="collection"]')!.addEventListener('click', () => this.showCollection());
    this.root.querySelector('[data-action="import"]')!.addEventListener('click', () => this.openImport());
  }

  private showTeam(): void {
    const selected = new Set(this.team.map(c => c.id));
    this.root.innerHTML = `
      <section class="modern-panel team-screen">
        <header class="panel-topbar">
          <button class="icon-back" data-back aria-label="Retour">‹</button>
          <div><small>COMPOSITION</small><h1>TON ÉQUIPE</h1></div>
          <div class="team-counter"><b>${selected.size}</b><span>/ 5</span></div>
        </header>
        <div class="team-layout">
          <aside class="team-stage">
            <div class="stage-heading"><span>ESCOUADE ACTUELLE</span><small>5 cartes pour entrer dans l’arène</small></div>
            <div class="team-fan"></div>
            <div class="team-summary"></div>
            <button class="primary-cta team-battle" data-battle ${selected.size === 5 ? '' : 'disabled'}><span>ENTRER DANS L’ARÈNE</span><b>›</b></button>
          </aside>
          <main class="team-browser">
            <div class="browser-tools">
              <label class="search-box"><span>⌕</span><input type="search" placeholder="Nom, univers ou ID…" data-search></label>
              <div class="filter-chips"><button class="active" data-filter="all">TOUS</button><button data-filter="HOR">HORREUR</button><button data-filter="SCI">SCI-FI</button></div>
            </div>
            <div class="card-grid roster-grid"></div>
          </main>
        </div>
      </section>`;

    const fan = this.root.querySelector('.team-fan')!;
    const summary = this.root.querySelector('.team-summary')!;
    const grid = this.root.querySelector('.roster-grid')!;
    const search = this.root.querySelector('[data-search]') as HTMLInputElement;
    let filter = 'all';

    const refreshFan = () => {
      fan.innerHTML = '';
      const current = this.roster.filter(c => selected.has(c.id));
      current.forEach((card, index) => fan.appendChild(this.cardTile(card, true, 'team-card', index)));
      for (let i = current.length; i < 5; i++) {
        const empty = document.createElement('div');
        empty.className = 'team-slot-empty';
        empty.innerHTML = `<span>${i + 1}</span><small>CHOISIR</small>`;
        fan.appendChild(empty);
      }
      const avgAttack = current.length ? Math.round(current.reduce((n, c) => n + c.attack, 0) / current.length) : 0;
      const avgDefense = current.length ? Math.round(current.reduce((n, c) => n + c.defense, 0) / current.length) : 0;
      summary.innerHTML = `<span><small>ATTAQUE MOY.</small><b>${avgAttack}</b></span><i></i><span><small>DÉFENSE MOY.</small><b>${avgDefense}</b></span>`;
      const counter = this.root.querySelector('.team-counter b')!;
      counter.textContent = String(current.length);
      const battle = this.root.querySelector('[data-battle]') as HTMLButtonElement;
      battle.disabled = current.length !== 5;
      this.team = current;
    };

    const renderGrid = () => {
      const q = search.value.trim().toLowerCase();
      grid.innerHTML = '';
      const cards = this.roster.filter(card => {
        const series = card.id.startsWith('SCI-') ? 'SCI' : 'HOR';
        const matchesFilter = filter === 'all' || series === filter;
        const matchesText = !q || `${card.id} ${card.name} ${card.universe}`.toLowerCase().includes(q);
        return matchesFilter && matchesText;
      });
      cards.forEach(card => {
        const tile = this.cardTile(card, selected.has(card.id));
        tile.addEventListener('click', () => {
          if (selected.has(card.id)) selected.delete(card.id);
          else if (selected.size < 5) selected.add(card.id);
          refreshFan();
          renderGrid();
        });
        grid.appendChild(tile);
      });
    };

    this.root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
      filter = (button as HTMLElement).dataset.filter || 'all';
      this.root.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button));
      renderGrid();
    }));
    search.addEventListener('input', renderGrid);
    this.root.querySelector('[data-back]')!.addEventListener('click', () => this.showMenu());
    this.root.querySelector('[data-battle]')!.addEventListener('click', () => { if (this.team.length === 5) this.startBattle(this.team); });
    refreshFan();
    renderGrid();
  }

  private showCollection(): void {
    let active = this.roster[0];
    this.root.innerHTML = `
      <section class="modern-panel collection-screen">
        <header class="panel-topbar">
          <button class="icon-back" data-back aria-label="Retour">‹</button>
          <div><small>MASTER 120 · V8</small><h1>COLLECTION</h1></div>
          <div class="collection-total"><b>120</b><span>CARTES</span></div>
        </header>
        <div class="collection-layout">
          <aside class="collection-spotlight"></aside>
          <main class="collection-browser">
            <div class="browser-tools">
              <label class="search-box"><span>⌕</span><input type="search" placeholder="Rechercher une carte…" data-search></label>
              <div class="filter-chips"><button class="active" data-filter="all">TOUS</button><button data-filter="HOR">HORREUR</button><button data-filter="SCI">SCI-FI</button></div>
            </div>
            <div class="card-grid collection-grid"></div>
          </main>
        </div>
      </section>`;

    const spotlight = this.root.querySelector('.collection-spotlight')!;
    const grid = this.root.querySelector('.collection-grid')!;
    const search = this.root.querySelector('[data-search]') as HTMLInputElement;
    let filter = 'all';

    const renderSpotlight = (card: CardData) => {
      active = card;
      spotlight.innerHTML = `
        <div class="spotlight-card"></div>
        <div class="spotlight-copy">
          <span class="spotlight-id">${this.escape(card.id)}</span>
          <h2>${this.escape(card.name)}</h2>
          <p>${this.escape(card.universe)}</p>
          <div class="spotlight-stats"><span><small>ATTAQUE</small><b>${card.attack}</b></span><span><small>DÉFENSE</small><b>${card.defense}</b></span></div>
          <button data-import-one>REMPLACER L’ILLUSTRATION</button>
        </div>`;
      const cardSlot = spotlight.querySelector('.spotlight-card')!;
      cardSlot.appendChild(this.cardTile(card, false, 'preview-card'));
      spotlight.querySelector('[data-import-one]')!.addEventListener('click', () => this.openImport(card.id));
    };

    const renderGrid = () => {
      const q = search.value.trim().toLowerCase();
      grid.innerHTML = '';
      this.roster.filter(card => {
        const series = card.id.startsWith('SCI-') ? 'SCI' : 'HOR';
        return (filter === 'all' || series === filter) && (!q || `${card.id} ${card.name} ${card.universe}`.toLowerCase().includes(q));
      }).forEach(card => {
        const tile = this.cardTile(card, card.id === active.id);
        tile.addEventListener('click', () => { renderSpotlight(card); renderGrid(); });
        grid.appendChild(tile);
      });
    };

    this.root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
      filter = (button as HTMLElement).dataset.filter || 'all';
      this.root.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button));
      renderGrid();
    }));
    search.addEventListener('input', renderGrid);
    this.root.querySelector('[data-back]')!.addEventListener('click', () => this.showMenu());
    renderSpotlight(active);
    renderGrid();
  }

  private cardTile(card: CardData, selected: boolean, extraClass = '', index = 0): HTMLElement {
    const el = document.createElement('button');
    el.className = `collection-card ${extraClass}${selected ? ' selected' : ''}`.trim();
    el.style.setProperty('--card-index', String(index));
    el.innerHTML = `<div class="card-fallback"><b>${this.escape(card.id)}</b><strong>${this.escape(card.name)}</strong><small>ATQ ${card.attack} · DEF ${card.defense}</small></div>`;
    void this.artStore.getObjectUrl(card.id).then(url => {
      if (!url || !el.isConnected) return;
      el.innerHTML = `<img src="${url}" alt="${this.escape(card.name)}"><span>${this.escape(card.id)}</span>`;
    });
    return el;
  }

  private openImport(onlyId?: string): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.multiple = !onlyId;
    input.onchange = async () => {
      if (!input.files?.length) return;
      let files = input.files;
      if (onlyId && input.files.length === 1) {
        const original = input.files[0];
        const extension = original.name.split('.').pop() || 'png';
        files = this.fileListFrom([new File([original], `${onlyId}.${extension}`, { type: original.type })]);
      }
      const result = await this.artStore.importFiles(files, new Set(this.roster.map(c => c.id)));
      const rejected = result.rejected.length ? `\nNon reconnus: ${result.rejected.join(', ')}` : '';
      alert(`${result.imported.length} illustration(s) importée(s).${rejected}\n\nFormat recommandé : vertical 2:3 Jumbo XL.`);
      if (onlyId) this.showCollection(); else this.showMenu();
    };
    input.click();
  }

  private fileListFrom(files: File[]): FileList {
    const transfer = new DataTransfer();
    files.forEach(file => transfer.items.add(file));
    return transfer.files;
  }

  private escape(value: string): string {
    return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char));
  }
}
