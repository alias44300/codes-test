import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './game/config';
import { CardCatalog } from './game/data/CardCatalog';
import { CardArtStore } from './game/storage/CardArtStore';
import { ArenaScene } from './game/scenes/ArenaScene';
import { AppShell } from './game/ui/AppShell';
import './styles.css';

async function boot(): Promise<void> {
  const catalog = new CardCatalog();
  const roster = await catalog.load();
  const artStore = new CardArtStore();
  const uiRoot = document.getElementById('game-ui')!;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-canvas',
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    backgroundColor: '#06070b',
    render: { antialias: true, pixelArt: false, roundPixels: false },
    fps: { target: 60, min: 30 },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: DESIGN_WIDTH, height: DESIGN_HEIGHT },
    scene: [ArenaScene],
  });

  const shell = new AppShell(uiRoot, roster, artStore, team => {
    uiRoot.innerHTML = '';
    game.scene.start('arena', { roster, team, artStore });
  });
  shell.showMenu();

  window.addEventListener('horrivals:menu', () => {
    game.scene.stop('arena');
    shell.showMenu();
  });

  const rotate = document.getElementById('rotate-warning')!;
  let frame = 0;
  const refreshViewport = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      rotate.classList.toggle('visible', window.innerHeight > window.innerWidth);
      document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      game.scale.refresh();
    });
  };

  refreshViewport();
  window.addEventListener('resize', refreshViewport, { passive: true });
  window.addEventListener('orientationchange', refreshViewport, { passive: true });
  window.visualViewport?.addEventListener('resize', refreshViewport, { passive: true });
}

boot().catch(err => {
  console.error(err);
  document.body.innerHTML = `<pre class="fatal">HORRIVALS failed to boot:\n${String(err)}</pre>`;
});
