import type { AppShell } from './game/ui/AppShell';

export function installV5ShellEnhancements(shell: AppShell, root: HTMLElement): void {
  const anyShell = shell as unknown as { openImport: (onlyId?: string) => void };

  const enhance = () => {
    const options = root.querySelector('.options-screen .option-list');
    if (options && !options.querySelector('[data-v5-photo-manager]')) {
      const row = document.createElement('button');
      row.className = 'option-row import-art-row';
      row.setAttribute('data-v5-photo-manager', '');
      row.innerHTML = `<span><b>MES ILLUSTRATIONS</b><small>Choisir une carte puis une photo de ma galerie</small></span><strong>OUVRIR</strong>`;
      row.addEventListener('click', () => anyShell.openImport());
      options.prepend(row);
    }

    const collection = root.querySelector('.collection-screen .panel-trailing');
    if (collection && !collection.querySelector('[data-v5-photo-manager]')) {
      const shortcut = document.createElement('button');
      shortcut.className = 'panel-import-shortcut';
      shortcut.setAttribute('data-v5-photo-manager', '');
      shortcut.textContent = 'PHOTOS';
      shortcut.addEventListener('click', () => anyShell.openImport());
      collection.appendChild(shortcut);
    }
  };

  const observer = new MutationObserver(enhance);
  observer.observe(root, { childList: true, subtree: true });
  enhance();
}
