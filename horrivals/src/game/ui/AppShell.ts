import type { CardData } from '../types';
import { CardArtStore } from '../storage/CardArtStore';

const PAGE_SIZE = 30;
const TEAM_KEY = 'horrivals-team-v2';
const SETTINGS_KEY = 'horrivals-settings-v2';

type ReturnScreen = 'illustrations' | 'collection';

interface UiSettings {
  reducedMotion: boolean;
  showHints: boolean;
}

export class AppShell {
  private root: HTMLElement;
  private roster: CardData[];
  private artStore: CardArtStore;
  private team: CardData[];
  private startBattle: (team: CardData[]) => void;
  private settings: UiSettings;
  private splashTimer: number | null = null;

  constructor(root: HTMLElement, roster: CardData[], artStore: CardArtStore, startBattle: (team: CardData[]) => void) {
    this.root = root;
    this.roster = roster;
    this.artStore = artStore;
    this.startBattle = startBattle;
    this.team = this.loadTeam();
    this.settings = this.loadSettings();
    this.applySettings();
  }

  showSplash(): void {
    if (this.splashTimer !== null) window.clearTimeout(this.splashTimer);
    this.root.innerHTML = `
      <main class="game-splash" role="button" aria-label="Entrer dans HORRIVALS">
        <div class="splash-mark">H</div>
        <div class="splash-title">HORRIVALS</div>
        <div class="splash-sub">MASTER 120 · JUMBO XL</div>
        <div class="splash-line"></div>
      </main>`;
    const leave = () => {
      if (this.splashTimer !== null) window.clearTimeout(this.splashTimer);
      this.splashTimer = null;
      this.showMenu();
    };
    this.root.querySelector('.game-splash')!.addEventListener('click', leave, { once: true });
    this.splashTimer = window.setTimeout(leave, this.settings.reducedMotion ? 350 : 950);
  }

  showMenu(): void {
    if (this.splashTimer !== null) {
      window.clearTimeout(this.splashTimer);
      this.splashTimer = null;
    }

    this.root.innerHTML = `
      <main class="premium-home">
        <div class="premium-atmosphere" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <header class="premium-topline">
          <div class="premium-brand"><span>HORRIVALS</span><small>MASTER 120 · V8</small></div>
          <div class="premium-count"><b>120</b><span>CARTES</span></div>
        </header>

        <section class="premium-hero">
          <div class="premium-copy">
            <span class="eyebrow">ARÈNE JUMBO XL · 2:3</span>
            <h1>CHOISIS 5.<br>FAIS TOMBER 3.</h1>
            <p>Compose ton équipe, lance le duel et joue tes cartes en grand. Tes illustrations restent entièrement visibles, sans recadrage.</p>
            <button class="premium-battle" data-action="battle"><span>COMBATTRE</span><b>›</b></button>
          </div>
          <div class="premium-team" aria-label="Ton équipe actuelle"></div>
        </section>

        <nav class="premium-nav">
          <button data-action="packs"><span>01</span><b>PACKS</b><small>Frisson · Cauchemar · Maudit</small></button>
          <button data-action="team"><span>02</span><b>ÉQUIPE</b><small>Composer mes 5 cartes</small></button>
          <button data-action="collection"><span>03</span><b>COLLECTION</b><small>Explorer les 120 cartes</small></button>
          <button data-action="import"><span>04</span><b>MES ILLUSTRATIONS</b><small>Ajouter mes photos 2:3</small></button>
          <button data-action="options"><span>05</span><b>OPTIONS</b><small>Affichage et confort</small></button>
        </nav>

        <footer class="premium-footer"><span>ATTAQUE</span><i></i><span>DÉFENSE</span><i></i><span>ANDROID</span></footer>
      </main>`;

    const fan = this.root.querySelector('.premium-team')!;
    this.team.forEach((card, index) => fan.appendChild(this.cardTile(card, false, 'premium-hero-card', index, true)));

    this.root.querySelector('[data-action="battle"]')!.addEventListener('click', () => this.launchBattle());
    this.root.querySelector('[data-action="packs"]')!.addEventListener('click', () => this.showPacks());
    this.root.querySelector('[data-action="team"]')!.addEventListener('click', () => this.showTeam());
    this.root.querySelector('[data-action="collection"]')!.addEventListener('click', () => this.showCollection());
    this.root.querySelector('[data-action="import"]')!.addEventListener('click', () => void this.showIllustrations());
    this.root.querySelector('[data-action="options"]')!.addEventListener('click', () => this.showOptions());
  }

  private launchBattle(): void {
    if (this.team.length !== 5) {
      this.showTeam();
      return;
    }
    this.startBattle([...this.team]);
  }

  private showPacks(): void {
    this.root.innerHTML = `
      <section class="modern-panel packs-screen">
        ${this.panelHeader('PACKS', 'OUVERTURE', '<b>3</b><span>PACKS</span>')}
        <main class="packs-content packs-content-v2">
          <div class="packs-intro">
            <div><small>OUVERTURE</small><span>CHOISIS TON PACK</span></div>
            <p>Une carte révélée à la fois. Aucun niveau de rareté n’est imprimé sur les cartes.</p>
          </div>
          <div class="packs-grid packs-grid-v2">
            <button class="pack-card pack-frisson" data-pack="frisson"><i>01</i><strong>FRISSON</strong><small>1 CARTE</small><b>OUVRIR ›</b></button>
            <button class="pack-card pack-cauchemar" data-pack="cauchemar"><i>02</i><strong>CAUCHEMAR</strong><small>1 CARTE</small><b>OUVRIR ›</b></button>
            <button class="pack-card pack-maudit" data-pack="maudit"><i>03</i><strong>MAUDIT</strong><small>1 CARTE</small><b>OUVRIR ›</b></button>
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
    zone.innerHTML = `
      <div class="pack-result-copy">
        <small>PACK ${label}</small>
        <strong>${this.escape(card.name)}</strong>
        <span>${this.escape(card.id)} · ATQ ${card.attack} · DEF ${card.defense}</span>
        <button data-open-again>OUVRIR UN AUTRE PACK</button>
      </div>
      <div class="pack-result-card"></div>`;
    zone.querySelector('.pack-result-card')!.appendChild(this.cardTile(card, false, 'pack-reveal-card', 0, true));
    zone.querySelector('[data-open-again]')!.addEventListener('click', () => {
      zone.classList.remove('revealed');
      window.setTimeout(() => this.openPack(packId), this.settings.reducedMotion ? 0 : 120);
    });
    zone.classList.remove('revealed');
    requestAnimationFrame(() => zone.classList.add('revealed'));
  }

  public showTeam(): void {
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
              <button class="art-shortcut" data-art-manager>+ PHOTOS</button>
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
      const avgAttack = current.length ? Math.round(current.reduce((sum, c) => sum + c.attack, 0) / current.length) : 0;
      const avgDefense = current.length ? Math.round(current.reduce((sum, c) => sum + c.defense, 0) / current.length) : 0;
      summary.innerHTML = `<span><small>ATTAQUE MOY.</small><b>${avgAttack}</b></span><i></i><span><small>DÉFENSE MOY.</small><b>${avgDefense}</b></span>`;
      this.team = current;
      this.saveTeam();
      (this.root.querySelector('.team-count-value') as HTMLElement).textContent = String(current.length);
      (this.root.querySelector('[data-battle]') as HTMLButtonElement).disabled = current.length !== 5;
    };

    const renderGrid = () => {
      const q = search.value.trim().toLowerCase();
      const cards = this.filteredRoster(filter, q);
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
      this.appendLoadMore(grid, cards.length, visibleCount, () => { visibleCount += PAGE_SIZE; renderGrid(); });
    };

    this.bindFilters(value => { filter = value; visibleCount = PAGE_SIZE; renderGrid(); });
    search.addEventListener('input', () => { visibleCount = PAGE_SIZE; renderGrid(); });
    this.root.querySelector('[data-back]')!.addEventListener('click', () => this.showMenu());
    this.root.querySelector('[data-battle]')!.addEventListener('click', () => this.launchBattle());
    this.root.querySelector('[data-art-manager]')!.addEventListener('click', () => void this.showIllustrations());
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
              <button class="art-shortcut" data-art-manager>+ PHOTOS</button>
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
          <button data-import-one>AJOUTER / REMPLACER MA PHOTO</button>
        </div>`;
      spotlight.querySelector('.spotlight-card')!.appendChild(this.cardTile(card, false, 'preview-card', 0, true));
      spotlight.querySelector('[data-import-one]')!.addEventListener('click', () => this.openImport(card.id, 'collection'));
    };

    const renderGrid = () => {
      const q = search.value.trim().toLowerCase();
      const cards = this.filteredRoster(filter, q);
      grid.innerHTML = '';
      const fragment = document.createDocumentFragment();
      cards.slice(0, visibleCount).forEach(card => {
        const tile = this.cardTile(card, card.id === active.id);
        tile.addEventListener('click', () => { renderSpotlight(card); renderGrid(); });
        fragment.appendChild(tile);
      });
      grid.appendChild(fragment);
      this.appendLoadMore(grid, cards.length, visibleCount, () => { visibleCount += PAGE_SIZE; renderGrid(); });
    };

    this.bindFilters(value => { filter = value; visibleCount = PAGE_SIZE; renderGrid(); });
    search.addEventListener('input', () => { visibleCount = PAGE_SIZE; renderGrid(); });
    this.root.querySelector('[data-back]')!.addEventListener('click', () => this.showMenu());
    this.root.querySelector('[data-art-manager]')!.addEventListener('click', () => void this.showIllustrations());
    renderSpotlight(active);
    renderGrid();
  }

  private async showIllustrations(): Promise<void> {
    const importedIds = new Set(await this.artStore.getStoredIds().catch(() => []));
    this.root.innerHTML = `
      <section class="modern-panel illustrations-screen">
        ${this.panelHeader('MES ILLUSTRATIONS', 'JUMBO XL · 2:3', `<b class="art-imported-count">${importedIds.size}</b><span>/ 120</span>`)}
        <main class="illustrations-layout">
          <aside class="art-command">
            <span class="art-kicker">TES CARTES. TES IMAGES.</span>
            <h2>AJOUTE TES PHOTOS<br>SANS CHERCHER<br>UN MENU CACHÉ.</h2>
            <p>Pour une carte précise, touche <b>AJOUTER</b>. Pour plusieurs images d’un coup, leurs noms doivent contenir l’ID de la carte, par exemple <b>HOR-001.png</b> ou <b>SCI-014.jpg</b>.</p>
            <button class="art-batch" data-import-batch><strong>IMPORTER PLUSIEURS PHOTOS</strong><small>PNG · JPG · WEBP · vertical 2:3 recommandé</small></button>
            <div class="art-note">Les images sont enregistrées sur ton téléphone et remplacent immédiatement les visuels du menu, de la collection, de l’équipe et du combat.</div>
          </aside>
          <section class="art-browser">
            <div class="browser-tools">
              <label class="search-box"><span>⌕</span><input type="search" placeholder="Trouver une carte…" data-search></label>
              <div class="filter-chips"><button class="active" data-filter="all">TOUS</button><button data-filter="HOR">HORREUR</button><button data-filter="SCI">SCI-FI</button></div>
            </div>
            <div class="art-grid"></div>
          </section>
        </main>
      </section>`;

    const grid = this.root.querySelector('.art-grid')!;
    const search = this.root.querySelector('[data-search]') as HTMLInputElement;
    let filter = 'all';
    let visibleCount = PAGE_SIZE;

    const render = () => {
      const cards = this.filteredRoster(filter, search.value.trim().toLowerCase());
      grid.innerHTML = '';
      const fragment = document.createDocumentFragment();
      cards.slice(0, visibleCount).forEach(card => {
        const entry = document.createElement('article');
        entry.className = `art-entry${importedIds.has(card.id) ? ' has-art' : ''}`;
        const preview = document.createElement('div');
        preview.className = 'art-entry-preview';
        preview.appendChild(this.cardTile(card, false));
        const actions = document.createElement('div');
        actions.className = 'art-entry-actions';
        actions.innerHTML = `<span><b>${this.escape(card.id)}</b><small>${this.escape(card.name)}</small></span><button data-add>${importedIds.has(card.id) ? 'REMPLACER' : 'AJOUTER'}</button>${importedIds.has(card.id) ? '<button class="art-remove" data-remove aria-label="Supprimer l’illustration importée">×</button>' : ''}`;
        actions.querySelector('[data-add]')!.addEventListener('click', () => this.openImport(card.id, 'illustrations'));
        actions.querySelector('[data-remove]')?.addEventListener('click', async () => {
          await this.artStore.remove(card.id);
          await this.showIllustrations();
          this.showToast(`${card.id} : illustration importée supprimée.`);
        });
        entry.append(preview, actions);
        fragment.appendChild(entry);
      });
      grid.appendChild(fragment);
      this.appendLoadMore(grid, cards.length, visibleCount, () => { visibleCount += PAGE_SIZE; render(); });
    };

    this.bindFilters(value => { filter = value; visibleCount = PAGE_SIZE; render(); });
    search.addEventListener('input', () => { visibleCount = PAGE_SIZE; render(); });
    this.root.querySelector('[data-back]')!.addEventListener('click', () => this.showMenu());
    this.root.querySelector('[data-import-batch]')!.addEventListener('click', () => this.openImport(undefined, 'illustrations'));
    render();
  }

  private showOptions(): void {
    this.root.innerHTML = `
      <section class="modern-panel options-screen">
        ${this.panelHeader('OPTIONS', 'HORRIVALS', '<b>V4</b><span>MOBILE</span>')}
        <main class="options-content">
          <div class="options-copy"><span>CONFORT DE JEU</span><h2>À TOI DE RÉGLER L’ARÈNE.</h2><p>Réglages et illustrations sont sauvegardés sur ton téléphone.</p></div>
          <div class="option-list">
            <button class="option-row option-art" data-open-art><span><b>MES ILLUSTRATIONS</b><small>Ajouter ou remplacer les photos de tes 120 cartes Jumbo XL</small></span><strong>OUVRIR ›</strong></button>
            <button class="option-row" data-setting="motion"><span><b>ANIMATIONS RÉDUITES</b><small>Réduit les transitions et mouvements non essentiels</small></span><i class="toggle ${this.settings.reducedMotion ? 'on' : ''}"></i></button>
            <button class="option-row" data-setting="hints"><span><b>INDICATIONS DE COMBAT</b><small>Affiche les messages contextuels dans l’arène</small></span><i class="toggle ${this.settings.showHints ? 'on' : ''}"></i></button>
            <button class="option-row danger" data-reset-team><span><b>RÉINITIALISER L’ÉQUIPE</b><small>Remet les cinq premières cartes du roster</small></span><strong>RÉINITIALISER</strong></button>
          </div>
        </main>
      </section>`;

    this.root.querySelector('[data-back]')!.addEventListener('click', () => this.showMenu());
    this.root.querySelector('[data-open-art]')!.addEventListener('click', () => void this.showIllustrations());
    this.root.querySelector('[data-setting="motion"]')!.addEventListener('click', () => {
      this.settings.reducedMotion = !this.settings.reducedMotion;
      this.saveSettings();
      this.applySettings();
      this.showOptions();
    });
    this.root.querySelector('[data-setting="hints"]')!.addEventListener('click', () => {
      this.settings.showHints = !this.settings.showHints;
      this.saveSettings();
      this.applySettings();
      this.showOptions();
    });
    this.root.querySelector('[data-reset-team]')!.addEventListener('click', () => {
      this.team = this.roster.slice(0, 5);
      this.saveTeam();
      this.showOptions();
      this.showToast('Équipe réinitialisée.');
    });
  }

  private panelHeader(title: string, eyebrow: string, trailing: string): string {
    return `<header class="panel-topbar"><button class="icon-back" data-back aria-label="Retour">‹</button><div><small>${eyebrow}</small><h1>${title}</h1></div><div class="panel-trailing">${trailing}</div></header>`;
  }

  private filteredRoster(filter: string, q: string): CardData[] {
    return this.roster.filter(card => {
      const series = card.id.startsWith('SCI-') ? 'SCI' : 'HOR';
      const filterOk = filter === 'all' || series === filter;
      const textOk = !q || `${card.id} ${card.name} ${card.universe}`.toLowerCase().includes(q);
      return filterOk && textOk;
    });
  }

  private bindFilters(onChange: (value: string) => void): void {
    this.root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
      const value = (button as HTMLElement).dataset.filter || 'all';
      this.root.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button));
      onChange(value);
    }));
  }

  private appendLoadMore(grid: Element, total: number, visible: number, onMore: () => void): void {
    if (visible >= total) return;
    const more = document.createElement('button');
    more.className = 'load-more';
    more.textContent = `AFFICHER PLUS · ${total - visible}`;
    more.addEventListener('click', onMore);
    grid.appendChild(more);
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

  private openImport(onlyId?: string, returnTo: ReturnScreen = 'illustrations'): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = !onlyId;
    input.hidden = true;
    document.body.appendChild(input);

    const cleanup = () => input.remove();
    input.addEventListener('cancel', cleanup, { once: true });
    input.onchange = async () => {
      if (!input.files?.length) { cleanup(); return; }
      const knownIds = new Set(this.roster.map(c => c.id));
      try {
        if (onlyId) {
          const ok = await this.artStore.importForId(onlyId, input.files[0], knownIds);
          if (returnTo === 'collection') this.showCollection(); else await this.showIllustrations();
          this.showToast(ok ? `${onlyId} : photo ajoutée.` : 'Fichier image non reconnu.');
        } else {
          const result = await this.artStore.importFiles(input.files, knownIds);
          await this.showIllustrations();
          const rejected = result.rejected.length ? ` · ${result.rejected.length} fichier(s) ignoré(s)` : '';
          this.showToast(`${result.imported.length} illustration(s) importée(s)${rejected}.`);
        }
      } catch (error) {
        if (returnTo === 'collection') this.showCollection(); else await this.showIllustrations();
        this.showToast(`Import impossible : ${String(error)}`);
      } finally {
        cleanup();
      }
    };
    input.click();
  }

  private showToast(message: string): void {
    this.root.querySelector('.game-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'game-toast';
    toast.textContent = message;
    this.root.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    window.setTimeout(() => {
      toast.classList.remove('visible');
      window.setTimeout(() => toast.remove(), 180);
    }, 2400);
  }

  private loadTeam(): CardData[] {
    try {
      const ids = JSON.parse(localStorage.getItem(TEAM_KEY) || '[]') as string[];
      const cards = ids.map(id => this.roster.find(card => card.id === id)).filter((card): card is CardData => Boolean(card));
      return cards.length === 5 ? cards : this.roster.slice(0, 5);
    } catch {
      return this.roster.slice(0, 5);
    }
  }

  private saveTeam(): void {
    localStorage.setItem(TEAM_KEY, JSON.stringify(this.team.map(card => card.id)));
  }

  private loadSettings(): UiSettings {
    try {
      return { reducedMotion: false, showHints: true, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') as Partial<UiSettings>) };
    } catch {
      return { reducedMotion: false, showHints: true };
    }
  }

  private saveSettings(): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
  }

  private applySettings(): void {
    document.documentElement.classList.toggle('reduce-motion', this.settings.reducedMotion);
    document.documentElement.dataset.showHints = this.settings.showHints ? 'true' : 'false';
  }

  private escape(value: string): string {
    return value.replace(/[&<>'\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[char] || char));
  }
}
