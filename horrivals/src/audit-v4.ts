import type { CardData } from './game/types';
import type { CardArtStore } from './game/storage/CardArtStore';
import type { AppShell } from './game/ui/AppShell';

function makeFileList(files: File[]): FileList {
  const transfer = new DataTransfer();
  files.forEach(file => transfer.items.add(file));
  return transfer.files;
}

export function installAuditV4(shell: AppShell, root: HTMLElement, roster: CardData[], artStore: CardArtStore): void {
  const anyShell = shell as unknown as {
    openImport?: (onlyId?: string) => void;
    showMenu: () => void;
    showCollection: () => void;
  };

  const openImport = (onlyId?: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.multiple = !onlyId;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    document.body.appendChild(input);

    const cleanup = () => window.setTimeout(() => input.remove(), 50);
    input.addEventListener('cancel', cleanup, { once: true });
    input.addEventListener('change', async () => {
      try {
        if (!input.files?.length) return;
        let files: FileList | File[] = input.files;
        if (onlyId && input.files.length === 1) {
          const original = input.files[0];
          const ext = original.name.split('.').pop() || 'png';
          files = makeFileList([new File([original], `${onlyId}.${ext}`, { type: original.type })]);
        }
        const result = await artStore.importFiles(files, new Set(roster.map(card => card.id)));
        const rejected = result.rejected.length ? `\nRefusés : ${result.rejected.join(', ')}` : '';
        alert(`${result.imported.length} illustration(s) ajoutée(s).${rejected}\n\nNomme tes fichiers HOR-001, SCI-001, etc. Format conseillé : 2:3 vertical Jumbo XL.`);
        if (onlyId) anyShell.showCollection(); else anyShell.showMenu();
      } finally {
        cleanup();
      }
    }, { once: true });
    input.click();
  };

  anyShell.openImport = openImport;

  const enhanceCurrentScreen = () => {
    const options = root.querySelector('.options-screen .option-list');
    if (options && !options.querySelector('[data-import-art-v4]')) {
      const row = document.createElement('button');
      row.className = 'option-row import-art-row';
      row.setAttribute('data-import-art-v4', '');
      row.innerHTML = `<span><b>MES ILLUSTRATIONS</b><small>Ajouter ou remplacer mes cartes PNG / JPG / WebP</small></span><strong>IMPORTER</strong>`;
      row.addEventListener('click', () => openImport());
      options.prepend(row);
    }

    const collection = root.querySelector('.collection-screen .panel-trailing');
    if (collection && !collection.querySelector('[data-import-art-v4]')) {
      const shortcut = document.createElement('button');
      shortcut.className = 'panel-import-shortcut';
      shortcut.setAttribute('data-import-art-v4', '');
      shortcut.textContent = 'PHOTOS';
      shortcut.addEventListener('click', () => openImport());
      collection.appendChild(shortcut);
    }
  };

  const observer = new MutationObserver(enhanceCurrentScreen);
  observer.observe(root, { childList: true, subtree: true });
  enhanceCurrentScreen();
}
