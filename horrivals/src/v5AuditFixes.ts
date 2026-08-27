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
      if (returnToManager) showImportManager(shell);
      else shell.showCollection();
    }
  }, { once: true });
  input.addEventListener('cancel', cleanup, { once: true });
  input.click();
}

function showImportManager(shell: ShellAny): void {
  shell.__importManagerActive = true;
  shell.root.innerHTML = `
    <section class="modern-panel import-manager">
      <header class="panel-topbar import-topbar">
        <button class="icon-back" data-import-back aria-label="Retour">‹</button>
        <div><small>MES ILLUSTRATIONS</small><h1>CHOISIS LA CARTE</h1></div>
        <div class="panel-trailing"><b>2:3</b><span>JUMBO XL</span></div>
      </header>
      <main class="import-manager-body">
        <div class="import-manager-copy">
          <strong>1. CHOISIS UNE CARTE</strong>
          <span>2. CHOISIS N’IMPORTE QUELLE PHOTO DE TA GALERIE</span>
          <small>Le nom du fichier n’a plus aucune importance.</small>
        </div>
        <div class="browser-tools import-tools">
          <label class="search-box"><span>⌕</span><input type="search" placeholder="Freddy, HOR-001, SCI-014…" data-import-search></label>
          <div class="filter-chips"><button class="active" data-import-filter="all">TOUS</button><button data-import-filter="HOR">HORREUR</button><button data-import-filter="SCI">SCI-FI</button></div>
        </div>
        <div class="card-grid import-card-grid"></div>
      </main>
    </section>`;

  const grid = shell.root.querySelector('.import-card-grid')!;
  const search = shell.root.querySelector('[data-import-search]') as HTMLInputElement;
  let filter = 'all';

  const render = () => {
    const q = search.value.trim().toLowerCase();
    grid.innerHTML = '';
    const cards = shell.roster.filter((card: CardData) => {
      const series = card.id.startsWith('SCI-') ? 'SCI' : 'HOR';
      return (filter === 'all' || filter === series) && (!q || `${card.id} ${card.name} ${card.universe}`.toLowerCase().includes(q));
    });
    const frag = document.createDocumentFragment();
    cards.forEach((card: CardData) => {
      const tile = shell.cardTile(card, false, 'import-pick-card', 0, false);
      tile.setAttribute('aria-label', `Ajouter une illustration pour ${card.name}`);
      tile.addEventListener('click', () => pickPhoto(shell, card.id, true));
      frag.appendChild(tile);
    });
    grid.appendChild(frag);
  };

  search.addEventListener('input', render);
  shell.root.querySelectorAll('[data-import-filter]').forEach((button: Element) => button.addEventListener('click', () => {
    filter = (button as HTMLElement).dataset.importFilter || 'all';
    shell.root.querySelectorAll('[data-import-filter]').forEach((b: Element) => b.classList.toggle('active', b === button));
    render();
  }));
  shell.root.querySelector('[data-import-back]')!.addEventListener('click', () => {
    shell.__importManagerActive = false;
    shell.showMenu();
  });
  render();
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
