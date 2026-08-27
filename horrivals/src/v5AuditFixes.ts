import Phaser from 'phaser';
import { AppShell } from './game/ui/AppShell';
import { ArenaScene } from './game/scenes/ArenaScene';
import { CardView } from './game/view/CardView';
import type { CardData } from './game/types';
import './v5-audit.css';

type ShellAny = {
  root: HTMLElement;
  roster: CardData[];
  artStore: { importFiles: (files: FileList | File[], knownIds: Set<string>) => Promise<{ imported: string[]; rejected: string[] }> };
  showMenu: () => void;
  showCollection: () => void;
  cardTile: (card: CardData, selected?: boolean, extraClass?: string, index?: number, eager?: boolean) => HTMLElement;
  __importManagerActive?: boolean;
};

function cleanCardPlaceholder(scene: Phaser.Scene, w: number, h: number): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const bg = scene.add.rectangle(0, 0, w, h, 0x090b12).setStrokeStyle(3, 0xff4f8b, 0.22);
  const glow = scene.add.rectangle(0, 0, w * 0.88, h * 0.88, 0x131723, 1).setStrokeStyle(2, 0x64c8ff, 0.08);
  const slash1 = scene.add.rectangle(-w * 0.06, -h * 0.04, w * 1.12, Math.max(8, h * 0.032), 0xff4f8b, 0.12).setRotation(-0.42);
  const slash2 = scene.add.rectangle(w * 0.04, h * 0.09, w * 1.12, Math.max(5, h * 0.018), 0x64c8ff, 0.08).setRotation(-0.42);
  const diamond = scene.add.rectangle(0, 0, w * 0.34, w * 0.34, 0x06070b, 0.9).setRotation(Math.PI / 4).setStrokeStyle(3, 0xff4f8b, 0.18);
  c.add([bg, glow, slash1, slash2, diamond]);
  return c;
}

function createCleanFallbackTexture(scene: Phaser.Scene, key: string): string {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, 600, 900)!;
  const ctx = texture.context;
  ctx.fillStyle = '#080a10';
  ctx.fillRect(0, 0, 600, 900);
  const gradient = ctx.createLinearGradient(0, 0, 600, 900);
  gradient.addColorStop(0, 'rgba(255,47,120,.16)');
  gradient.addColorStop(.48, 'rgba(8,10,16,.95)');
  gradient.addColorStop(1, 'rgba(51,214,255,.12)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 600, 900);
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, 564, 864);
  ctx.strokeStyle = 'rgba(255,47,120,.18)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-80, 640);
  ctx.lineTo(680, 245);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(51,214,255,.10)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-60, 735);
  ctx.lineTo(660, 360);
  ctx.stroke();
  ctx.save();
  ctx.translate(300, 450);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = 'rgba(4,5,9,.82)';
  ctx.strokeStyle = 'rgba(255,47,120,.18)';
  ctx.lineWidth = 9;
  ctx.fillRect(-92, -92, 184, 184);
  ctx.strokeRect(-92, -92, 184, 184);
  ctx.restore();
  texture.refresh();
  return key;
}

function toast(text: string): void {
  document.querySelector('.horrivals-toast')?.remove();
  const el = document.createElement('div');
  el.className = 'horrivals-toast';
  el.textContent = text;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  window.setTimeout(() => {
    el.classList.remove('show');
    window.setTimeout(() => el.remove(), 220);
  }, 1700);
}

function pickPhoto(shell: ShellAny, cardId: string, returnToManager: boolean): void {
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
      const result = await shell.artStore.importFiles([renamed], new Set(shell.roster.map((c: CardData) => c.id)));
      if (result.imported.includes(cardId)) toast(`${cardId} · illustration ajoutée`);
      else toast(`Import impossible pour ${cardId}`);
    } catch (error) {
      console.error(error);
      toast('Import impossible');
    } finally {
      cleanup();
      if (returnToManager) showImportManager(shell, cardId);
      else shell.showCollection();
    }
  }, { once: true });
  input.addEventListener('cancel', cleanup, { once: true });
  input.click();
}

function showImportManager(shell: ShellAny, preferredId?: string): void {
  shell.__importManagerActive = true;
  shell.root.innerHTML = `
    <section class="modern-panel import-manager sc-card-roster">
      <header class="sc-roster-topbar">
        <button class="sc-square-button" data-import-back aria-label="Retour">‹</button>
        <div class="sc-roster-brand"><small>HORRIVALS</small><h1>COLLECTION</h1></div>
        <div class="sc-roster-counter"><strong data-roster-visible>${shell.roster.length}</strong><span>/ ${shell.roster.length}</span></div>
        <button class="sc-filter-button" data-tools-toggle><span>☷</span> FILTRES</button>
      </header>

      <main class="sc-roster-body">
        <section class="sc-focus-stage">
          <div class="sc-focus-beams" aria-hidden="true"></div>
          <div class="sc-focus-card-wrap" data-focus-slot></div>
          <div class="sc-focus-copy">
            <span class="sc-focus-series" data-focus-series></span>
            <h2 data-focus-name></h2>
            <small data-focus-id></small>
            <div class="sc-focus-stats">
              <span><small>ATTAQUE</small><b data-focus-attack></b></span>
              <i></i>
              <span><small>DÉFENSE</small><b data-focus-defense></b></span>
            </div>
            <button class="sc-change-art" data-change-art><span>✦</span><b>CHANGER L’ILLUSTRATION</b><small>Choisir une photo dans la galerie</small></button>
          </div>
        </section>

        <section class="sc-roster-rail-shell">
          <button class="sc-rail-arrow" data-rail-prev aria-label="Cartes précédentes">‹</button>
          <div class="sc-roster-rail" data-roster-rail></div>
          <button class="sc-rail-arrow" data-rail-next aria-label="Cartes suivantes">›</button>
        </section>

        <aside class="sc-tools-drawer" data-tools-drawer>
          <div class="sc-tools-head"><span>FILTRER LE ROSTER</span><button data-tools-close>×</button></div>
          <label class="sc-search"><span>⌕</span><input type="search" placeholder="Nom ou numéro de carte" data-import-search></label>
          <div class="sc-filter-chips">
            <button class="active" data-import-filter="all">TOUTES</button>
            <button data-import-filter="HOR">HORREUR</button>
            <button data-import-filter="SCI">SCI-FI</button>
          </div>
        </aside>
      </main>
    </section>`;

  const rail = shell.root.querySelector('[data-roster-rail]') as HTMLElement;
  const focusSlot = shell.root.querySelector('[data-focus-slot]') as HTMLElement;
  const focusName = shell.root.querySelector('[data-focus-name]') as HTMLElement;
  const focusId = shell.root.querySelector('[data-focus-id]') as HTMLElement;
  const focusSeries = shell.root.querySelector('[data-focus-series]') as HTMLElement;
  const focusAttack = shell.root.querySelector('[data-focus-attack]') as HTMLElement;
  const focusDefense = shell.root.querySelector('[data-focus-defense]') as HTMLElement;
  const search = shell.root.querySelector('[data-import-search]') as HTMLInputElement;
  const visibleCounter = shell.root.querySelector('[data-roster-visible]') as HTMLElement;
  const drawer = shell.root.querySelector('[data-tools-drawer]') as HTMLElement;
  let filter = 'all';
  let filtered = [...shell.roster];
  let active = filtered.find(card => card.id === preferredId) || filtered[0];

  const renderFocus = () => {
    if (!active) return;
    focusSlot.innerHTML = '';
    const tile = shell.cardTile(active, true, 'sc-focus-card', 0, true);
    tile.setAttribute('aria-label', active.name);
    focusSlot.appendChild(tile);
    focusName.textContent = active.name;
    focusId.textContent = active.id;
    focusSeries.textContent = active.id.startsWith('SCI-') ? 'SCI-FI' : 'HORREUR';
    focusAttack.textContent = String(active.attack);
    focusDefense.textContent = String(active.defense);
  };

  const selectCard = (card: CardData) => {
    active = card;
    renderFocus();
    rail.querySelectorAll<HTMLElement>('[data-card-id]').forEach(el => el.classList.toggle('selected', el.dataset.cardId === active.id));
    const selected = rail.querySelector<HTMLElement>(`[data-card-id="${active.id}"]`);
    selected?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const renderRail = () => {
    const q = search.value.trim().toLowerCase();
    filtered = shell.roster.filter((card: CardData) => {
      const series = card.id.startsWith('SCI-') ? 'SCI' : 'HOR';
      const matchesFilter = filter === 'all' || filter === series;
      const matchesSearch = !q || `${card.id} ${card.name} ${card.universe}`.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
    visibleCounter.textContent = String(filtered.length);
    rail.innerHTML = '';

    if (!filtered.length) {
      rail.innerHTML = `<div class="sc-no-cards">AUCUNE CARTE</div>`;
      focusSlot.innerHTML = '';
      focusName.textContent = 'AUCUN RÉSULTAT';
      focusId.textContent = '';
      focusSeries.textContent = '';
      focusAttack.textContent = '—';
      focusDefense.textContent = '—';
      return;
    }

    if (!active || !filtered.some(card => card.id === active.id)) active = filtered[0];
    const frag = document.createDocumentFragment();
    filtered.forEach((card: CardData, index: number) => {
      const tile = shell.cardTile(card, card.id === active.id, 'sc-roster-thumb', index, index < 12);
      tile.dataset.cardId = card.id;
      tile.setAttribute('aria-label', card.name);
      tile.addEventListener('click', () => selectCard(card));
      frag.appendChild(tile);
    });
    rail.appendChild(frag);
    renderFocus();
    requestAnimationFrame(() => rail.querySelector<HTMLElement>(`[data-card-id="${active.id}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' }));
  };

  shell.root.querySelector('[data-change-art]')!.addEventListener('click', () => {
    if (active) pickPhoto(shell, active.id, true);
  });
  shell.root.querySelector('[data-tools-toggle]')!.addEventListener('click', () => drawer.classList.toggle('open'));
  shell.root.querySelector('[data-tools-close]')!.addEventListener('click', () => drawer.classList.remove('open'));
  shell.root.querySelector('[data-rail-prev]')!.addEventListener('click', () => rail.scrollBy({ left: -Math.max(320, rail.clientWidth * 0.72), behavior: 'smooth' }));
  shell.root.querySelector('[data-rail-next]')!.addEventListener('click', () => rail.scrollBy({ left: Math.max(320, rail.clientWidth * 0.72), behavior: 'smooth' }));
  search.addEventListener('input', renderRail);
  shell.root.querySelectorAll('[data-import-filter]').forEach((button: Element) => button.addEventListener('click', () => {
    filter = (button as HTMLElement).dataset.importFilter || 'all';
    shell.root.querySelectorAll('[data-import-filter]').forEach((b: Element) => b.classList.toggle('active', b === button));
    renderRail();
  }));
  shell.root.querySelector('[data-import-back]')!.addEventListener('click', () => {
    shell.__importManagerActive = false;
    shell.showMenu();
  });

  renderRail();
}

export function installV5AuditFixes(): void {
  const cardProto = CardView.prototype as any;
  cardProto.makeFallback = function(scene: Phaser.Scene, _card: CardData, w: number, h: number) {
    return cleanCardPlaceholder(scene, w, h);
  };

  const arenaProto = ArenaScene.prototype as any;
  arenaProto.ensureFallbackTexture = function(_card: CardData) {
    return createCleanFallbackTexture(this as Phaser.Scene, '__clean_missing_art');
  };

  const shellProto = AppShell.prototype as any;
  shellProto.openImport = function(onlyId?: string) {
    const shell = this as unknown as ShellAny;
    if (onlyId) {
      pickPhoto(shell, onlyId, false);
      return;
    }
    showImportManager(shell);
  };
}
