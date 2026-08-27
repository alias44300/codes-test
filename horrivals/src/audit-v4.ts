import type { CardData } from './game/types';
import type { CardArtStore } from './game/storage/CardArtStore';
import type { AppShell } from './game/ui/AppShell';

function esc(value: string): string {
  return value.replace(/[&<>'\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[char] || char));
}

export function installAuditV4(shell: AppShell, root: HTMLElement, roster: CardData[], artStore: CardArtStore): void {
  const anyShell = shell as unknown as {
    openImport?: (onlyId?: string) => void;
    showMenu: () => void;
    showCollection: () => void;
  };

  const createPicker = (multiple: boolean, onFiles: (files: File[]) => Promise<void> | void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.multiple = multiple;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '0';
    input.style.width = '1px';
    input.style.height = '1px';
    input.style.opacity = '0';
    document.body.appendChild(input);

    const cleanup = () => window.setTimeout(() => input.remove(), 80);
    input.addEventListener('cancel', cleanup, { once: true });
    input.addEventListener('change', async () => {
      try {
        const files = Array.from(input.files || []);
        if (files.length) await onFiles(files);
      } finally {
        cleanup();
      }
    }, { once: true });
    input.click();
  };

  const notice = (title: string, message: string, action?: () => void) => {
    root.querySelector('.art-notice')?.remove();
    const box = document.createElement('div');
    box.className = 'art-notice';
    box.innerHTML = `<div><small>HORRIVALS</small><strong>${esc(title)}</strong><p>${esc(message)}</p><button>OK</button></div>`;
    box.querySelector('button')!.addEventListener('click', () => {
      box.remove();
      action?.();
    });
    root.appendChild(box);
  };

  const assignPhoto = (card: CardData, after?: () => void) => {
    createPicker(false, async files => {
      const file = files[0];
      if (!file) return;
      try {
        await artStore.putForCard(card.id, file);
        notice('ILLUSTRATION AJOUTÉE', `${card.id} · ${card.name}\nLe nom original « ${file.name} » a été accepté.`, after);
      } catch (error) {
        notice('IMPORT IMPOSSIBLE', error instanceof Error ? error.message : 'Le fichier n’a pas pu être enregistré.');
      }
    });
  };

  const showManager = () => {
    root.innerHTML = `
      <section class="modern-panel art-manager-screen">
        <header class="panel-topbar art-manager-topbar">
          <button class="icon-back" data-art-back aria-label="Retour">‹</button>
          <div><small>JUMBO XL · 2:3</small><h1>MES ILLUSTRATIONS</h1></div>
          <div class="panel-trailing"><b>120</b><span>CARTES</span></div>
        </header>
        <div class="art-manager-body">
          <aside class="art-manager-help">
            <small>GALERIE ANDROID</small>
            <h2>CHOISIS LA CARTE.<br>PUIS TA PHOTO.</h2>
            <p>Le nom du fichier n’a plus aucune importance. Une photo appelée <b>1000034293.png</b> peut être affectée directement à HOR-001, SCI-014 ou n’importe quelle autre carte.</p>
            <div class="art-manager-rule"><b>FORMAT</b><span>2:3 VERTICAL · JUMBO XL</span></div>
            <button class="art-bulk" data-art-bulk>IMPORT MULTIPLE NOMMÉ</button>
            <small class="art-bulk-note">Option avancée : fichiers déjà nommés HOR-001, SCI-001, etc.</small>
          </aside>
          <main class="art-manager-library">
            <label class="search-box art-search"><span>⌕</span><input type="search" placeholder="Nom ou ID de carte…" data-art-search></label>
            <div class="art-card-grid" data-art-grid></div>
          </main>
        </div>
      </section>`;

    const grid = root.querySelector('[data-art-grid]')!;
    const search = root.querySelector('[data-art-search]') as HTMLInputElement;

    const render = () => {
      const q = search.value.trim().toLowerCase();
      const cards = roster.filter(card => !q || `${card.id} ${card.name}`.toLowerCase().includes(q));
      grid.innerHTML = '';
      const fragment = document.createDocumentFragment();
      cards.forEach(card => {
        const tile = document.createElement('button');
        tile.className = 'art-card-choice';
        tile.dataset.cardId = card.id;
        tile.innerHTML = `<div class="art-choice-preview"><span>+</span></div><div><b>${esc(card.id)}</b><strong>${esc(card.name)}</strong><small>TOUCHER POUR CHOISIR UNE PHOTO</small></div>`;
        const preview = tile.querySelector('.art-choice-preview') as HTMLElement;
        const fallbackArt = card.art;
        if (fallbackArt) preview.innerHTML = `<img src="${esc(fallbackArt)}" alt="">`;
        void artStore.getObjectUrl(card.id).then(url => {
          if (url && tile.isConnected) preview.innerHTML = `<img src="${esc(url)}" alt="">`;
        });
        tile.addEventListener('click', () => assignPhoto(card, showManager));
        fragment.appendChild(tile);
      });
      grid.appendChild(fragment);
    };

    search.addEventListener('input', render);
    root.querySelector('[data-art-back]')!.addEventListener('click', () => anyShell.showMenu());
    root.querySelector('[data-art-bulk]')!.addEventListener('click', () => {
      createPicker(true, async files => {
        const result = await artStore.importFiles(files, new Set(roster.map(card => card.id)));
        const message = result.rejected.length
          ? `${result.imported.length} ajoutée(s). ${result.rejected.length} fichier(s) sans ID HOR/SCI n’ont pas été affectés. Utilise le mode carte par carte pour ceux-là.`
          : `${result.imported.length} illustration(s) ajoutée(s).`;
        notice('IMPORT TERMINÉ', message, showManager);
      });
    });
    render();
  };

  const openImport = (onlyId?: string) => {
    if (onlyId) {
      const card = roster.find(entry => entry.id === onlyId);
      if (!card) {
        notice('CARTE INTROUVABLE', onlyId);
        return;
      }
      assignPhoto(card, () => anyShell.showCollection());
      return;
    }
    showManager();
  };

  anyShell.openImport = openImport;

  const enhanceCurrentScreen = () => {
    const options = root.querySelector('.options-screen .option-list');
    if (options && !options.querySelector('[data-import-art-v4]')) {
      const row = document.createElement('button');
      row.className = 'option-row import-art-row';
      row.setAttribute('data-import-art-v4', '');
      row.innerHTML = `<span><b>MES ILLUSTRATIONS</b><small>Choisir une carte puis une photo de la galerie Android</small></span><strong>GÉRER</strong>`;
      row.addEventListener('click', () => showManager());
      options.prepend(row);
    }

    const collection = root.querySelector('.collection-screen .panel-trailing');
    if (collection && !collection.querySelector('[data-import-art-v4]')) {
      const shortcut = document.createElement('button');
      shortcut.className = 'panel-import-shortcut';
      shortcut.setAttribute('data-import-art-v4', '');
      shortcut.textContent = 'PHOTOS';
      shortcut.addEventListener('click', () => showManager());
      collection.appendChild(shortcut);
    }
  };

  const observer = new MutationObserver(enhanceCurrentScreen);
  observer.observe(root, { childList: true, subtree: true });
  enhanceCurrentScreen();
}
