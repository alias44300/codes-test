import type { CardData } from '../types';
import { CardArtStore } from '../storage/CardArtStore';

const PAGE_SIZE = 36;

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
      <main class="home-screen">
        <header class="home-header">
          <div class="home-brand"><span>HORRIVALS</span><small>MASTER 120 · V8</small></div>
          <div class="home-status"><b>120</b><span>CARTES</span></div>
        </header>

        <section class="home-main">
          <div class="home-copy">
            <span class="eyebrow">JUMBO XL · 2:3</span>
            <h1>L’ARÈNE<br>DES MONSTRES</h1>
            <p>Compose 5 cartes, affronte le rival et remporte 3 confrontations.</p>
          </div>

          <div class="mode-grid">
            <button class="mode-tile mode-combat" data-action="battle">
              <span class="mode-number">01</span><strong>COMBAT</strong><small>5 cartes · premier à 3</small><b>JOUER ›</b>
            </button>
            <button class="mode-tile mode-packs" data-action="packs">
              <span class="mode-number">02</span><strong>PACKS</strong><small>Frisson · Cauchemar · Maudit</small><b>OUVRIR ›</b>
            </button>
            <button class="mode-tile" data-action="collection">
              <span class="mode-number">03</span><strong>COLLECTION</strong><small>120 personnages V8</small>
            </button>
            <button class="mode-tile" data-action="team">
              <span class="mode-number">04</span><strong>ÉQUIPE</strong><small>Composer mes 5 cartes</small>
            </button>
          </div>
        </section>

        <footer class="home-footer">
          <button data-action="import">IMPORTER MES ILLUSTRATIONS</button>
          <span>ATTAQUE · DÉFENSE</span>
        </footer>
      </main>`;

    this.root.querySelector('[data-action="battle"]')!.addEventListener('click', () => {
      if (this.team.length === 5) this.startBattle(this.team);
      else this.showTeam();
    });
    this.root.querySelector('[data-action="packs"]')!.addEventListener('click', () => this.showPacks());
    this.root.querySelector('[data-action="team"]')!.addEventListener('click', () => this.showTeam());
    this.root.querySelector('[data-action="collection"]')!.addEventListener('click', () => this.showCollection());
    this.root.querySelector('[data-action="import"]')!.addEventListener('click', () => this.openImport());
  }

  private showPacks(): void {
    this.root.innerHTML = `
      <section class="modern-panel packs-screen">
        ${this.panelHeader('PACKS', 'OUVERTURE', '<b>3</b><span>PACKS</span>')}
        <main class="packs-content">
          <div class="packs-intro"><span>CHOISIS TON PACK</span><p>Une carte révélée à la fois. Aucun système de rareté n’est appliqué.</p></div>
          <div class="packs-grid">
            <button class="pack-card pack-frisson" data-pack="frisson"><i>01</i><strong>FRISSON</strong><small>1 CARTE</small><b>OUVRIR</b></button>
            <button class="pack-card pack-cauchemar" data-pack="cauchemar"><i>02</i><strong>CAUCHEMAR</strong><small>1 CARTE</small><b>OUVRIR</b></button>
            <button class="pack-card pack-maudit" data-pack="maudit"><i>03</i><strong>MAUDIT</strong><small>1 CARTE</small><b>OUVRIR</b></button>
          </div>
          <div class="pack-reveal-zone" aria-live="polite"></div>
        </main>
      </section>`;

    this.root.querySelector('[data-back]')!.addEventListener('click', () => this.showMenu());
    this.root.querySelectorAll('[data-pack]').forEach(button => button.addEventListener('click', () => {
      this.openPack((button as HTMLElement).dataset.pack || 'frisson');
    }));
  }

  private openPack(packId: string): void {
    const zone = this.root.querySelector('.pack-reveal-zone') as HTMLElement | null;
    if (!zone) return;
    const card = this.roster[Math.floor(Math.random() * this.roster.length)];
    const label = packId === 'cauchemar' ? 'CAUCHEMAR' : packId === 'maudit' ? 'MAUDIT' : 'FRISSON';
    zone.innerHTML = `<div class="pack-result-copy"><small>PACK ${label}</small><strong>${this.escape(card.name)}</strong><span>${this.escape(card.id)} · ATQ ${card.attack} · DEF ${card.defense}</span></div><div class="pack-result-card"></div>`;
    zone.querySelector('.pack-result-card')!.appendChild(this.cardTile(card, false, 'pack-reveal-card', 0, true));
    zone.classList.remove('revealed');
    requestAnimationFrame(() => zone.classList.add('revealed'));
  }

  private showTeam(): void {
    const selected = new Set(this.team.map(c => c.id));
    this.root.innerHTML = `
      <section class="modern-panel team-screen">
        ${this.panelHeader('TON ÉQUIPE', 'COMPOSITION', `<b class="team-count-value">${selected.size}</b><span>/ 5</span>`)}
        <div class="team-layout">
          <aside class="team-stage">
            <div class="stage-heading"><span>ESCOUADE ACTUELLE</span><small>5 cartes pour entrer dans l’arène</small></div>
            <div class="team-fan"></div>
            <div class="team-summary"></div>
            <button class="primary-cta team-battle" data-battle ${selected.size === 5 ? '' : 'disabled'}>COMBATTRE <b>›</b></button>
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
    let visibleCount = PAGE_SIZE;

    const refreshFan = () => {
      fan.innerHTML = '';
      const current = this.roster.filter(c => selected.has(c.id));
      current.forEach((card, index) => fan.appendChild(this.cardTile(card, true, 'team-card', index, true)));
      for (let i = current.length; i < 5; i++) {
        const empty = document.createElement('div');
        empty.className = 'team-slot-empty';
        empty.innerHTML = `<span>${i + 1}</span><small>CHOISIR</small>`;
        fan.appendChild(empty);
      }
      const avgAttack = current.length ? Math.round(current.reduce((n, c) => n + c.attack, 0) / current.length) : 0;
      const avgDefense = current.length ? Math.round(current.reduce((n, c) => n + c.defense, 0) / current.length) : 0;
      summary.innerHTML = `<span><small>ATTAQUE MOY.</small><b>${avgAttack}</b></span><i></i><span><small>DÉFENSE MOY.</small><b>${avgDefense}</b></span>`;
      const counter = this.root.querySelector('.team-count-value')!;
      counter.textContent = String(current.length);
      const battle = this.root.querySelector('[data-battle]') as HTMLButtonElement;
      battle.disabled = current.length !== 5;
      this.team = current;
    };

    const renderGrid = () => {
      const q = search.value.trim().toLowerCase();
      const cards = this.roster.filter(card => {
        const series = card.id.startsWith('SCI-') ? 'SCI' : 'HOR';
        return (filter === 'all' || series === filter) && (!q || `${card.id} ${card.name} ${card.universe}`.toLowerCase().includes(q));
      });
      grid.innerHTML = '';
      const fragment = document.createDocumentFragment();
      cards.slice(0, visibleCount).forEach(card => {
        const tile = this.cardTile(card, selected.has(card.id));
        tile.addEventListener('click', () => {
          if (selected.has(card.id)) selected.delete(card.id);
          else if (selected.size < 5) selected.add(card.id);
          refreshFan();
          renderGrid();
        });
        fragment.appendChild(tile);
      });
      grid.appendChild(fragment);
      if (visibleCount < cards.length) {
        const more = document.createElement('button');
        more.className = 'load-more';
        more.textContent = `AFFICHER PLUS · ${cards.length - visibleCount}`;
        more.addEventListener('click', () => { visibleCount += PAGE_SIZE; renderGrid(); });
        grid.appendChild(more);
      }
    };

    this.root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
      filter = (button as HTMLElement).dataset.filter || 'all';
      visibleCount = PAGE_SIZE;
      this.root.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button));
      renderGrid();
    }));
    search.addEventListener('input', () => { visibleCount = PAGE_SIZE; renderGrid(); });
    this.root.querySelector('[data-back]')!.addEventListener('click', () => this.showMenu());
    this.root.querySelector('[data-battle]')!.addEventListener('click', () => { if (this.team.length === 5) this.startBattle(this.team); });
    refreshFan();
    renderGrid();
  }

  private showCollection(): void {
    let active = this.roster[0];
    this.root.innerHTML = `
      <section class="modern-panel collection-screen">
        ${this.panelHeader('COLLECTION', 'MASTER 120 · V8', '<b>120</b><span>CARTES</span>')}
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
    let visibleCount = PAGE_SIZE;

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
      spotlight.querySelector('.spotlight-card')!.appendChild(this.cardTile(card, false, 'preview-card', 0, true));
      spotlight.querySelector('[data-import-one]')!.addEventListener('click', () => this.openImport(card.id));
    };

    const renderGrid = () => {
      const q = search.value.trim().toLowerCase();
      const cards = this.roster.filter(card => {
        const series = card.id.startsWith('SCI-') ? 'SCI' : 'HOR';
        return (filter === 'all' || series === filter) && (!q || `${card.id} ${card.name} ${card.universe}`.toLowerCase().includes(q));
      });
      grid.innerHTML = '';
      const fragment = document.createDocumentFragment();
      cards.slice(0, visibleCount).forEach(card => {
        const tile = this.cardTile(card, card.id === active.id);
        tile.addEventListener('click', () => { renderSpotlight(card); renderGrid(); });
        fragment.appendChild(tile);
      });
      grid.appendChild(fragment);
      if (visibleCount < cards.length) {
        const more = document.createElement('button');
        more.className = 'load-more';
        more.textContent = `AFFICHER PLUS · ${cards.length - visibleCount}`;
        more.addEventListener('click', () => { visibleCount += PAGE_SIZE; renderGrid(); });
        grid.appendChild(more);
      }
    };

    this.root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
      filter = (button as HTMLElement).dataset.filter || 'all';
      visibleCount = PAGE_SIZE;
      this.root.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button));
      renderGrid();
    }));
    search.addEventListener('input', () => { visibleCount = PAGE_SIZE; renderGrid(); });
    this.root.querySelector('[data-back]')!.addEventListener('click', () => this.showMenu());
    renderSpotlight(active);
    renderGrid();
  }

  private panelHeader(title: string, eyebrow: string, trailing: string): string {
    return `<header class="panel-topbar"><button class="icon-back" data-back aria-label="Retour">‹</button><div><small>${eyebrow}</small><h1>${title}</h1></div><div class="panel-trailing">${trailing}</div></header>`;
  }

  private cardTile(card: CardData, selected: boolean, extraClass = '', index = 0, eager = false): HTMLElement {
    const el = document.createElement('button');
    el.className = `collection-card ${extraClass}${selected ? ' selected' : ''}`.trim();
    el.style.setProperty('--card-index', String(index));
    el.innerHTML = `<div class="card-fallback"><b>${this.escape(card.id)}</b><strong>${this.escape(card.name)}</strong><small>ATQ ${card.attack} · DEF ${card.defense}</small></div>`;

    if (card.art) this.setCardImage(el, card, card.art, eager);
    void this.artStore.getObjectUrl(card.id).then(importedUrl => {
      if (!el.isConnected || !importedUrl) return;
      this.setCardImage(el, card, importedUrl, eager);
    });
    return el;
  }

  private setCardImage(el: HTMLElement, card: CardData, url: string, eager: boolean): void {
    el.innerHTML = `<img src="${this.escape(url)}" alt="${this.escape(card.name)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"><span>${this.escape(card.id)}</span>`;
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
    return value.replace(/[&<>'\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[char] || char));
  }
}
