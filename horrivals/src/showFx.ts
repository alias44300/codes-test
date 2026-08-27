const vibrate = (pattern: number | number[]) => {
  try { navigator.vibrate?.(pattern); } catch { /* haptics are best effort */ }
};

export function installShowFx(): void {
  document.addEventListener('pointerdown', event => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('[data-action="battle"], [data-battle]')) vibrate([18, 22, 38]);
    else if (target.closest('[data-pack]')) vibrate([12, 20, 18, 24, 42]);
    else if (target.closest('.collection-card')) vibrate(8);
  }, { passive: true });

  const ensurePackClose = () => {
    document.querySelectorAll<HTMLElement>('.pack-reveal-zone.revealed').forEach(zone => {
      if (zone.querySelector('.pack-close')) return;
      const close = document.createElement('button');
      close.className = 'pack-close';
      close.type = 'button';
      close.setAttribute('aria-label', 'Fermer la révélation');
      close.textContent = '×';
      close.addEventListener('click', () => {
        vibrate(10);
        zone.classList.remove('revealed');
        window.setTimeout(() => { zone.innerHTML = ''; }, 280);
      });
      zone.appendChild(close);
      vibrate([18, 16, 26, 18, 54]);
    });
  };

  const observer = new MutationObserver(ensurePackClose);
  observer.observe(document.getElementById('game-ui') ?? document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const zone = document.querySelector<HTMLElement>('.pack-reveal-zone.revealed');
    if (!zone) return;
    zone.classList.remove('revealed');
    window.setTimeout(() => { zone.innerHTML = ''; }, 280);
  });
}
