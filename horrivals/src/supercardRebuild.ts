import Phaser from 'phaser';
import { AppShell } from './game/ui/AppShell';
import { ArenaScene } from './game/scenes/ArenaScene';
import type { CardData } from './game/types';
import { DESIGN_HEIGHT, DESIGN_WIDTH, RULES } from './game/config';
import './supercard-rebuild.css';

type Settings = { reducedMotion: boolean; showHints: boolean };
type Shell = {
  root: HTMLElement;
  roster: CardData[];
  artStore: {
    getObjectUrl: (id: string) => Promise<string | null>;
    importFiles: (files: FileList | File[], knownIds: Set<string>) => Promise<{ imported: string[]; rejected: string[] }>;
  };
  team: CardData[];
  settings: Settings;
  splashTimer: number | null;
  startBattle: (team: CardData[]) => void;
  cardTile: (card: CardData, selected?: boolean, extraClass?: string, index?: number, eager?: boolean) => HTMLElement;
  setCardImage: (el: HTMLElement, card: CardData, url: string, eager: boolean) => void;
  showMenu: () => void;
  showTeam: () => void;
  showCollection: () => void;
  showOptions: () => void;
  showSplash: () => void;
  openImport: (onlyId?: string) => void;
  launchBattle: () => void;
  saveTeam: () => void;
  saveSettings: () => void;
  applySettings: () => void;
  escape: (value: string) => string;
};

type ArenaAny = {
  hud: HTMLDivElement;
  message: HTMLDivElement;
  round: HTMLDivElement;
  role: HTMLDivElement;
  fear: HTMLDivElement;
  fearValue: HTMLSpanElement;
  controls: HTMLDivElement;
  playerPips: HTMLDivElement;
  aiPips: HTMLDivElement;
  duelBadge: HTMLDivElement;
  changeFear: (delta: number) => void;
  scene: Phaser.Scenes.ScenePlugin;
};

const safe = (value: string): string => value.replace(/[&<>'\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[c] || c));

function tapPulse(): void {
  try { navigator.vibrate?.(10); } catch { /* Android WebView may refuse haptics. */ }
}

function toast(text: string): void {
  document.querySelector('.scx-toast')?.remove();
  const el = document.createElement('div');
  el.className = 'scx-toast';
  el.textContent = text;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  window.setTimeout(() => {
    el.classList.remove('show');
    window.setTimeout(() => el.remove(), 180);
  }, 1500);
}

function artButton(card: CardData, shell: Shell, extraClass = ''): HTMLElement {
  return shell.cardTile(card, false, extraClass, 0, true);
}

function pickPhoto(shell: Shell, cardId: string, after: () => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp';
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  input.style.opacity = '0';
  document.body.appendChild(input);
  const cleanup = () => input.remove();
  input.addEventListener('change', async () => {
    try {
      const original = input.files?.[0];
      if (!original) return;
      const ext = (original.name.split('.').pop() || 'png').toLowerCase();
      const renamed = new File([original], `${cardId}.${ext}`, { type: original.type || 'image/png' });
      const result = await shell.artStore.importFiles([renamed], new Set(shell.roster.map(card => card.id)));
      if (result.imported.includes(cardId)) {
        tapPulse();
        toast(`${cardId} · illustration enregistrée`);
      } else toast(`Impossible d'ajouter l'illustration ${cardId}`);
    } catch (error) {
      console.error(error);
      toast('Import impossible');
    } finally {
      cleanup();
      after();
    }
  }, { once: true });
  input.addEventListener('cancel', cleanup, { once: true });
  input.click();
}

function cardsMatching(shell: Shell, filter: string, q = ''): CardData[] {
  const needle = q.trim().toLowerCase();
  return shell.roster.filter(card => {
    const series = card.id.startsWith('SCI-') ? 'SCI' : 'HOR';
    return (filter === 'all' || filter === series) && (!needle || `${card.id} ${card.name} ${card.universe}`.toLowerCase().includes(needle));
  });
}

function topBar(title: string, kicker: string, trailing = ''): string {
  return `<header class="scx-topbar">
    <button class="scx-back" data-back aria-label="Retour">‹</button>
    <div class="scx-title"><small>${safe(kicker)}</small><strong>${safe(title)}</strong></div>
    <div class="scx-trailing">${trailing}</div>
  </header>`;
}

function renderHeroCard(shell: Shell, slot: HTMLElement, card: CardData, className: string): void {
  slot.innerHTML = '';
  const tile = artButton(card, shell, className);
  tile.setAttribute('aria-label', card.name);
  slot.appendChild(tile);
}

function showArtManager(shell: Shell, preferredId?: string): void {
  let active = shell.roster.find(card => card.id === preferredId) || shell.roster[0];
  let filter = 'all';
  let query = '';

  shell.root.innerHTML = `
    <section class="scx-screen scx-art-screen sc-card-roster">
      ${topBar('MES CARTES', 'ILLUSTRATIONS', '<span class="scx-mini-count">120</span>')}
      <main class="scx-art-layout">
        <section class="scx-art-stage">
          <div class="scx-lightburst"></div>
          <div class="scx-art-card" data-focus-slot></div>
          <div class="scx-art-meta">
            <small data-focus-series></small>
            <h2 data-focus-name></h2>
            <span data-focus-id></span>
            <div class="scx-stat-pair"><b><small>ATQ</small><em data-focus-attack></em></b><b><small>DEF</small><em data-focus-defense></em></b></div>
            <button class="scx-photo-cta" data-change-art><span>PHOTO</span><strong>CHANGER L’ILLUSTRATION</strong></button>
          </div>
        </section>
        <section class="scx-card-rail-shell">
          <button class="scx-rail-arrow prev" data-prev>‹</button>
          <div class="scx-card-rail" data-roster-rail></div>
          <button class="scx-rail-arrow next" data-next>›</button>
        </section>
        <button class="scx-filter-fab" data-tools-toggle>FILTRES</button>
        <aside class="scx-drawer" data-drawer>
          <div class="scx-drawer-head"><strong>FILTRER</strong><button data-drawer-close>×</button></div>
          <label class="scx-search"><span>⌕</span><input type="search" placeholder="Nom ou ID" data-search></label>
          <div class="scx-filter-row"><button class="active" data-filter="all">TOUS</button><button data-filter="HOR">HORREUR</button><button data-filter="SCI">SCI-FI</button></div>
        </aside>
      </main>
    </section>`;

  const rail = shell.root.querySelector('[data-roster-rail]') as HTMLElement;
  const focus = shell.root.querySelector('[data-focus-slot]') as HTMLElement;
  const name = shell.root.querySelector('[data-focus-name]') as HTMLElement;
  const id = shell.root.querySelector('[data-focus-id]') as HTMLElement;
  const series = shell.root.querySelector('[data-focus-series]') as HTMLElement;
  const attack = shell.root.querySelector('[data-focus-attack]') as HTMLElement;
  const defense = shell.root.querySelector('[data-focus-defense]') as HTMLElement;
  const drawer = shell.root.querySelector('[data-drawer]') as HTMLElement;
  const search = shell.root.querySelector('[data-search]') as HTMLInputElement;

  const refreshFocus = () => {
    renderHeroCard(shell, focus, active, 'scx-focus-card sc-focus-card');
    name.textContent = active.name;
    id.textContent = active.id;
    series.textContent = active.id.startsWith('SCI-') ? 'SCI-FI' : 'HORREUR';
    attack.textContent = String(active.attack);
    defense.textContent = String(active.defense);
  };

  const refreshRail = () => {
    const list = cardsMatching(shell, filter, query);
    if (!list.some(card => card.id === active.id) && list.length) active = list[0];
    rail.innerHTML = '';
    const fragment = document.createDocumentFragment();
    list.forEach((card, index) => {
      const tile = shell.cardTile(card, card.id === active.id, 'scx-rail-card sc-roster-thumb', index, index < 14);
      tile.dataset.cardId = card.id;
      tile.addEventListener('click', () => {
        active = card;
        refreshFocus();
        rail.querySelectorAll<HTMLElement>('[data-card-id]').forEach(el => el.classList.toggle('selected', el.dataset.cardId === card.id));
        tile.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
      fragment.appendChild(tile);
    });
    rail.appendChild(fragment);
    refreshFocus();
  };

  shell.root.querySelector('[data-change-art]')!.addEventListener('click', () => pickPhoto(shell, active.id, () => showArtManager(shell, active.id)));
  shell.root.querySelector('[data-tools-toggle]')!.addEventListener('click', () => drawer.classList.add('open'));
  shell.root.querySelector('[data-drawer-close]')!.addEventListener('click', () => drawer.classList.remove('open'));
  shell.root.querySelector('[data-prev]')!.addEventListener('click', () => rail.scrollBy({ left: -rail.clientWidth * 0.78, behavior: 'smooth' }));
  shell.root.querySelector('[data-next]')!.addEventListener('click', () => rail.scrollBy({ left: rail.clientWidth * 0.78, behavior: 'smooth' }));
  search.addEventListener('input', () => { query = search.value; refreshRail(); });
  shell.root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = (button as HTMLElement).dataset.filter || 'all';
    shell.root.querySelectorAll('[data-filter]').forEach(el => el.classList.toggle('active', el === button));
    refreshRail();
  }));
  shell.root.querySelector('[data-back]')!.addEventListener('click', () => shell.showMenu());
  refreshRail();
}

function installShellExperience(): void {
  const proto = AppShell.prototype as any;

  proto.cardTile = function(card: CardData, selected = false, extraClass = '', index = 0, eager = false): HTMLElement {
    const shell = this as Shell;
    const el = document.createElement('button');
    el.className = `collection-card scx-card ${extraClass}${selected ? ' selected' : ''}`.trim();
    el.style.setProperty('--card-index', String(index));
    el.setAttribute('aria-label', card.name);
    el.innerHTML = `<div class="scx-card-empty" aria-hidden="true"><i></i><i></i><i></i></div>`;
    if (card.art) shell.setCardImage(el, card, card.art, eager);
    void shell.artStore.getObjectUrl(card.id).then(url => {
      if (!el.isConnected || !url) return;
      shell.setCardImage(el, card, url, eager);
    });
    return el;
  };

  proto.setCardImage = function(el: HTMLElement, card: CardData, url: string, eager: boolean): void {
    el.innerHTML = `<img src="${safe(url)}" alt="${safe(card.name)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
  };

  proto.showSplash = function(): void {
    const shell = this as Shell;
    if (shell.splashTimer !== null) window.clearTimeout(shell.splashTimer);
    shell.root.innerHTML = `<main class="scx-splash" role="button" aria-label="Entrer dans HORRIVALS">
      <div class="scx-splash-rings"></div><div class="scx-splash-h">H</div><strong>HORRIVALS</strong><small>MASTER 120</small><span>TOUCHER POUR ENTRER</span>
    </main>`;
    const leave = () => {
      if (shell.splashTimer !== null) window.clearTimeout(shell.splashTimer);
      shell.splashTimer = null;
      shell.showMenu();
    };
    shell.root.querySelector('.scx-splash')!.addEventListener('click', leave, { once: true });
    shell.splashTimer = window.setTimeout(leave, shell.settings.reducedMotion ? 280 : 760);
  };

  proto.showMenu = function(): void {
    const shell = this as Shell;
    if (shell.splashTimer !== null) { window.clearTimeout(shell.splashTimer); shell.splashTimer = null; }
    shell.root.innerHTML = `<main class="scx-home premium-home">
      <div class="scx-home-bg"><i></i><i></i><i></i></div>
      <header class="scx-home-top">
        <div class="scx-profile"><span>H</span><div><small>HORRIVALS</small><b>MASTER 120</b></div></div>
        <div class="scx-home-count"><b>120</b><small>CARTES</small></div>
      </header>
      <section class="scx-home-stage">
        <div class="scx-mode-copy"><small>MODE PRINCIPAL</small><strong>COMBAT</strong><span>5 CARTES · PREMIER À 3</span></div>
        <div class="scx-home-team premium-team" aria-label="Équipe actuelle"></div>
        <button class="scx-main-play premium-battle" data-action="battle"><span>JOUER</span><b>›</b></button>
      </section>
      <nav class="scx-dock premium-nav">
        <button data-action="packs"><i class="scx-icon pack"></i><b>PACKS</b></button>
        <button data-action="collection"><i class="scx-icon cards"></i><b>CARTES</b></button>
        <button data-action="team"><i class="scx-icon team"></i><b>ÉQUIPE</b></button>
        <button data-action="import"><i class="scx-icon photo"></i><b>PHOTO</b></button>
        <button data-action="options"><i class="scx-icon gear"></i><b>OPTIONS</b></button>
      </nav>
    </main>`;

    const fan = shell.root.querySelector('.scx-home-team') as HTMLElement;
    shell.team.forEach((card, index) => {
      const tile = shell.cardTile(card, false, 'scx-home-card', index, true);
      tile.style.setProperty('--slot', String(index - 2));
      fan.appendChild(tile);
    });
    shell.root.querySelector('[data-action="battle"]')!.addEventListener('click', () => { tapPulse(); shell.launchBattle(); });
    shell.root.querySelector('[data-action="packs"]')!.addEventListener('click', () => (shell as any).showPacks());
    shell.root.querySelector('[data-action="collection"]')!.addEventListener('click', () => shell.showCollection());
    shell.root.querySelector('[data-action="team"]')!.addEventListener('click', () => shell.showTeam());
    shell.root.querySelector('[data-action="import"]')!.addEventListener('click', () => shell.openImport());
    shell.root.querySelector('[data-action="options"]')!.addEventListener('click', () => shell.showOptions());
  };

  proto.showPacks = function(): void {
    const shell = this as Shell;
    shell.root.innerHTML = `<section class="scx-screen scx-packs packs-screen">
      ${topBar('PACKS', 'OUVERTURE', '<span class="scx-mini-count">3</span>')}
      <main class="scx-pack-arena">
        <div class="scx-pack-copy"><small>CHOISIS UN BOOSTER</small><strong>OUVRE.<br>RÉVÈLE.</strong><span>1 carte par pack · aucune rareté affichée</span></div>
        <div class="scx-boosters">
          <button class="scx-booster frisson" data-pack="frisson"><i class="scx-seal">H</i><span>PACK</span><strong>FRISSON</strong><small>1 CARTE</small><b>OUVRIR</b></button>
          <button class="scx-booster cauchemar" data-pack="cauchemar"><i class="scx-seal">H</i><span>PACK</span><strong>CAUCHEMAR</strong><small>1 CARTE</small><b>OUVRIR</b></button>
          <button class="scx-booster maudit" data-pack="maudit"><i class="scx-seal">H</i><span>PACK</span><strong>MAUDIT</strong><small>1 CARTE</small><b>OUVRIR</b></button>
        </div>
        <div class="pack-reveal-zone scx-pack-reveal" aria-live="polite"></div>
      </main>
    </section>`;
    shell.root.querySelector('[data-back]')!.addEventListener('click', () => shell.showMenu());
    shell.root.querySelectorAll('[data-pack]').forEach(button => button.addEventListener('click', () => {
      tapPulse();
      const pack = (button as HTMLElement).dataset.pack || 'frisson';
      const card = shell.roster[Math.floor(Math.random() * shell.roster.length)];
      const label = pack === 'cauchemar' ? 'CAUCHEMAR' : pack === 'maudit' ? 'MAUDIT' : 'FRISSON';
      const zone = shell.root.querySelector('.pack-reveal-zone') as HTMLElement;
      zone.innerHTML = `<div class="scx-reveal-backdrop"></div><button class="pack-close" aria-label="Fermer">×</button>
        <div class="scx-reveal-pack ${pack}"><i>H</i><strong>${label}</strong></div>
        <div class="scx-reveal-card-slot"></div>
        <div class="scx-reveal-copy"><small>PACK ${label}</small><strong>${safe(card.name)}</strong><span>${safe(card.id)}</span></div>`;
      const slot = zone.querySelector('.scx-reveal-card-slot') as HTMLElement;
      slot.appendChild(shell.cardTile(card, false, 'scx-reveal-card', 0, true));
      zone.classList.add('revealed');
      zone.querySelector('.pack-close')!.addEventListener('click', () => { zone.classList.remove('revealed'); window.setTimeout(() => { zone.innerHTML = ''; }, 180); });
    }));
  };

  proto.showCollection = function(): void {
    const shell = this as Shell;
    let active = shell.roster[0];
    let filter = 'all';
    shell.root.innerHTML = `<section class="scx-screen scx-collection collection-screen">
      ${topBar('CARTES', 'COLLECTION', '<span class="scx-mini-count">120</span>')}
      <main class="scx-collection-stage">
        <section class="scx-collection-focus">
          <div class="scx-collection-card-slot"></div>
          <div class="scx-collection-info"><small data-series></small><h2 data-name></h2><span data-id></span><div class="scx-stat-pair"><b><small>ATQ</small><em data-atq></em></b><b><small>DEF</small><em data-def></em></b></div><button data-photo>PHOTO</button></div>
        </section>
        <section class="scx-card-rail-shell collection-grid"><button class="scx-rail-arrow prev" data-prev>‹</button><div class="scx-card-rail" data-rail></div><button class="scx-rail-arrow next" data-next>›</button></section>
        <div class="scx-filter-pills"><button class="active" data-filter="all">TOUTES</button><button data-filter="HOR">HORREUR</button><button data-filter="SCI">SCI-FI</button></div>
      </main>
    </section>`;
    const slot = shell.root.querySelector('.scx-collection-card-slot') as HTMLElement;
    const rail = shell.root.querySelector('[data-rail]') as HTMLElement;
    const name = shell.root.querySelector('[data-name]') as HTMLElement;
    const id = shell.root.querySelector('[data-id]') as HTMLElement;
    const series = shell.root.querySelector('[data-series]') as HTMLElement;
    const atq = shell.root.querySelector('[data-atq]') as HTMLElement;
    const def = shell.root.querySelector('[data-def]') as HTMLElement;
    const refreshFocus = () => {
      renderHeroCard(shell, slot, active, 'scx-collection-hero');
      name.textContent = active.name; id.textContent = active.id; series.textContent = active.id.startsWith('SCI-') ? 'SCI-FI' : 'HORREUR'; atq.textContent = String(active.attack); def.textContent = String(active.defense);
    };
    const refreshRail = () => {
      rail.innerHTML = '';
      cardsMatching(shell, filter).forEach((card, index) => {
        const tile = shell.cardTile(card, card.id === active.id, 'scx-collection-thumb', index, index < 14);
        tile.addEventListener('click', () => { active = card; refreshFocus(); rail.querySelectorAll('.scx-card').forEach(el => el.classList.toggle('selected', el === tile)); tile.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); });
        rail.appendChild(tile);
      });
      refreshFocus();
    };
    shell.root.querySelector('[data-photo]')!.addEventListener('click', () => pickPhoto(shell, active.id, () => shell.showCollection()));
    shell.root.querySelector('[data-prev]')!.addEventListener('click', () => rail.scrollBy({ left: -rail.clientWidth * .78, behavior: 'smooth' }));
    shell.root.querySelector('[data-next]')!.addEventListener('click', () => rail.scrollBy({ left: rail.clientWidth * .78, behavior: 'smooth' }));
    shell.root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = (button as HTMLElement).dataset.filter || 'all'; shell.root.querySelectorAll('[data-filter]').forEach(el => el.classList.toggle('active', el === button)); refreshRail(); }));
    shell.root.querySelector('[data-back]')!.addEventListener('click', () => shell.showMenu());
    refreshRail();
  };

  proto.showTeam = function(): void {
    const shell = this as Shell;
    const selected = new Set(shell.team.map(card => card.id));
    let active = shell.team[2] || shell.team[0] || shell.roster[0];
    let filter = 'all';
    shell.root.innerHTML = `<section class="scx-screen scx-team team-screen">
      ${topBar('ÉQUIPE', 'LINE-UP', '<span class="scx-team-count">5 / 5</span>')}
      <main class="scx-team-stage">
        <div class="scx-team-focus"><div class="team-fan scx-lineup"></div><div class="scx-team-active-copy"><small>CARTE ACTIVE</small><strong data-active-name></strong><span data-active-stats></span></div></div>
        <button class="scx-team-play" data-battle>COMBATTRE <b>›</b></button>
        <section class="scx-team-roster"><div class="scx-filter-pills"><button class="active" data-filter="all">TOUTES</button><button data-filter="HOR">HORREUR</button><button data-filter="SCI">SCI-FI</button></div><div class="scx-card-rail roster-grid" data-rail></div></section>
      </main>
    </section>`;
    const fan = shell.root.querySelector('.team-fan') as HTMLElement;
    const rail = shell.root.querySelector('[data-rail]') as HTMLElement;
    const activeName = shell.root.querySelector('[data-active-name]') as HTMLElement;
    const activeStats = shell.root.querySelector('[data-active-stats]') as HTMLElement;
    const count = shell.root.querySelector('.scx-team-count') as HTMLElement;
    const battle = shell.root.querySelector('[data-battle]') as HTMLButtonElement;
    const refreshFan = () => {
      fan.innerHTML = '';
      const current = shell.roster.filter(card => selected.has(card.id));
      shell.team = current;
      shell.saveTeam();
      current.forEach((card, index) => {
        const tile = shell.cardTile(card, card.id === active.id, 'scx-lineup-card', index, true);
        tile.style.setProperty('--slot', String(index - 2));
        tile.addEventListener('click', () => { active = card; refreshFan(); });
        fan.appendChild(tile);
      });
      for (let i = current.length; i < 5; i++) { const empty = document.createElement('div'); empty.className = 'scx-lineup-empty'; fan.appendChild(empty); }
      if (!selected.has(active.id) && current.length) active = current[0];
      activeName.textContent = active?.name || 'CHOISIS UNE CARTE';
      activeStats.textContent = active ? `ATQ ${active.attack} · DEF ${active.defense}` : '';
      count.textContent = `${current.length} / 5`;
      battle.disabled = current.length !== 5;
    };
    const refreshRail = () => {
      rail.innerHTML = '';
      cardsMatching(shell, filter).forEach((card, index) => {
        const tile = shell.cardTile(card, selected.has(card.id), 'scx-team-thumb', index, index < 14);
        tile.addEventListener('click', () => {
          if (selected.has(card.id)) selected.delete(card.id); else if (selected.size < 5) selected.add(card.id);
          active = card;
          refreshFan(); refreshRail();
        });
        rail.appendChild(tile);
      });
    };
    shell.root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = (button as HTMLElement).dataset.filter || 'all'; shell.root.querySelectorAll('[data-filter]').forEach(el => el.classList.toggle('active', el === button)); refreshRail(); }));
    shell.root.querySelector('[data-battle]')!.addEventListener('click', () => shell.launchBattle());
    shell.root.querySelector('[data-back]')!.addEventListener('click', () => shell.showMenu());
    refreshFan(); refreshRail();
  };

  proto.showOptions = function(): void {
    const shell = this as Shell;
    shell.root.innerHTML = `<section class="scx-screen scx-options options-screen">
      ${topBar('OPTIONS', 'RÉGLAGES', '<span class="scx-mini-count">V6</span>')}
      <main class="scx-options-stage">
        <div class="scx-options-hero"><span>H</span><strong>HORRIVALS</strong><small>EXPÉRIENCE MOBILE</small></div>
        <div class="scx-option-stack">
          <button class="scx-option" data-art><span>MES ILLUSTRATIONS</span><b>OUVRIR ›</b></button>
          <button class="scx-option" data-motion><span>ANIMATIONS RÉDUITES</span><i class="${shell.settings.reducedMotion ? 'on' : ''}"></i></button>
          <button class="scx-option" data-hints><span>INDICATIONS DE COMBAT</span><i class="${shell.settings.showHints ? 'on' : ''}"></i></button>
          <button class="scx-option danger" data-reset><span>RÉINITIALISER L’ÉQUIPE</span><b>RESET</b></button>
        </div>
      </main>
    </section>`;
    shell.root.querySelector('[data-back]')!.addEventListener('click', () => shell.showMenu());
    shell.root.querySelector('[data-art]')!.addEventListener('click', () => shell.openImport());
    shell.root.querySelector('[data-motion]')!.addEventListener('click', () => { shell.settings.reducedMotion = !shell.settings.reducedMotion; shell.saveSettings(); shell.applySettings(); shell.showOptions(); });
    shell.root.querySelector('[data-hints]')!.addEventListener('click', () => { shell.settings.showHints = !shell.settings.showHints; shell.saveSettings(); shell.applySettings(); shell.showOptions(); });
    shell.root.querySelector('[data-reset]')!.addEventListener('click', () => { shell.team = shell.roster.slice(0, 5); shell.saveTeam(); shell.showOptions(); });
  };

  proto.openImport = function(onlyId?: string): void { showArtManager(this as Shell, onlyId); };
}

function installArenaExperience(): void {
  const proto = ArenaScene.prototype as any;

  proto.drawArena = function(): void {
    const scene = this as Phaser.Scene;
    const g = scene.add.graphics().setDepth(-30);
    g.fillGradientStyle(0x05060b, 0x090a12, 0x140712, 0x05131b, 1);
    g.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    g.fillStyle(0x390b25, .72); g.fillTriangle(0, 0, 530, 0, 360, DESIGN_HEIGHT);
    g.fillStyle(0x052b3d, .55); g.fillTriangle(DESIGN_WIDTH, 0, 770, 0, 930, DESIGN_HEIGHT);
    g.fillStyle(0xffffff, .025); g.fillEllipse(DESIGN_WIDTH / 2, DESIGN_HEIGHT * .55, 880, 250);
    g.lineStyle(3, 0xff356f, .16); g.strokeEllipse(DESIGN_WIDTH / 2, DESIGN_HEIGHT * .57, 820, 220);
    g.lineStyle(3, 0x42d8ff, .12); g.strokeEllipse(DESIGN_WIDTH / 2, DESIGN_HEIGHT * .59, 700, 180);
    for (let i = 0; i < 7; i++) { g.lineStyle(2, i % 2 ? 0xff356f : 0x42d8ff, .045); g.lineBetween(i * 210 - 120, 0, i * 210 + 180, DESIGN_HEIGHT); }
    const beams: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 4; i++) {
      const color = i % 2 ? 0x42d8ff : 0xff356f;
      const beam = scene.add.rectangle(i < 2 ? 220 : DESIGN_WIDTH - 220, -80, 58, 900, color, .045).setOrigin(.5, 0).setRotation((i < 2 ? 1 : -1) * (.25 + i * .05)).setDepth(-18);
      beams.push(beam);
      scene.tweens.add({ targets: beam, rotation: beam.rotation + (i % 2 ? .18 : -.18), duration: 2200 + i * 340, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    scene.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT * .52, 'HORRIVALS', { fontFamily: 'Arial Black', fontSize: '82px', color: '#ffffff', stroke: '#000000', strokeThickness: 8 }).setOrigin(.5).setAlpha(.028).setDepth(-16);
    scene.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT * .67, 'MAIN EVENT', { fontFamily: 'Arial Black', fontSize: '18px', letterSpacing: 8, color: '#ffffff' }).setOrigin(.5).setAlpha(.06).setDepth(-16);
  };

  proto.createHud = function(): void {
    const arena = this as unknown as ArenaAny;
    const root = document.getElementById('game-ui')!;
    root.innerHTML = '';
    arena.hud = document.createElement('div');
    arena.hud.className = 'battle-hud scx-battle-hud';
    arena.hud.innerHTML = `
      <div class="scx-battle-score">
        <div class="scx-score-side player"><small>TOI</small><div class="score-pips player-pips"></div></div>
        <div class="hud-round"></div>
        <div class="scx-score-side rival"><div class="score-pips ai-pips"></div><small>RIVAL</small></div>
      </div>
      <div class="hud-role"></div>
      <div class="hud-fear"><small>EFFROI</small><b class="fear-reserve"></b></div>
      <div class="arena-duel-badge"><span>ATQ / DEF</span></div>
      <div class="duel-controls"><button data-fear="minus">−</button><span class="fear-spend">0</span><button data-fear="plus">+</button></div>
      <div class="battle-message" aria-live="polite"></div>
      <button class="battle-exit" aria-label="Quitter">×</button>`;
    root.appendChild(arena.hud);
    arena.message = arena.hud.querySelector('.battle-message')!;
    arena.round = arena.hud.querySelector('.hud-round')!;
    arena.role = arena.hud.querySelector('.hud-role')!;
    arena.fear = arena.hud.querySelector('.hud-fear')!;
    arena.fearValue = arena.hud.querySelector('.fear-spend')!;
    arena.controls = arena.hud.querySelector('.duel-controls')!;
    arena.playerPips = arena.hud.querySelector('.player-pips')!;
    arena.aiPips = arena.hud.querySelector('.ai-pips')!;
    arena.duelBadge = arena.hud.querySelector('.arena-duel-badge')!;
    arena.hud.querySelector('[data-fear="minus"]')!.addEventListener('click', () => arena.changeFear(-1));
    arena.hud.querySelector('[data-fear="plus"]')!.addEventListener('click', () => arena.changeFear(1));
    arena.hud.querySelector('.battle-exit')!.addEventListener('click', () => {
      root.innerHTML = '';
      arena.scene.stop();
      window.dispatchEvent(new CustomEvent('horrivals:menu'));
    });
  };
}

export function installSupercardRebuild(): void {
  installShellExperience();
  installArenaExperience();
  document.documentElement.classList.add('scx-enabled');
}
