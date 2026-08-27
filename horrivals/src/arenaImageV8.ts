import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH, RULES } from './game/config';
import { ArenaScene } from './game/scenes/ArenaScene';

// Presentation patch intentionally talks to ArenaScene's runtime fields through
// one isolated bridge. Gameplay state remains owned by BattleEngine.
type ArenaAny = any;

const ARENA_KEY = '__horrivals_arena_v8';
const ARENA_URL = '/assets/arena/horrivals-arena-v8.webp';

function drawIllustratedArena(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor('#03040a');

  const bg = scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, ARENA_KEY)
    .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
    .setDepth(-100);
  bg.setTint(0xf8fbff);

  // Live energy is deliberately restrained. The illustration remains the star.
  const playerGlow = scene.add.ellipse(DESIGN_WIDTH * 0.335, DESIGN_HEIGHT * 0.59, 390, 92, 0xff296e, 0.04)
    .setDepth(-12)
    .setBlendMode(Phaser.BlendModes.ADD);
  const rivalGlow = scene.add.ellipse(DESIGN_WIDTH * 0.665, DESIGN_HEIGHT * 0.59, 390, 92, 0x18d7ff, 0.04)
    .setDepth(-12)
    .setBlendMode(Phaser.BlendModes.ADD);

  scene.tweens.add({
    targets: [playerGlow, rivalGlow],
    scaleX: 1.08,
    scaleY: 1.18,
    alpha: 0.10,
    duration: 1700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });

  const leftMist = scene.add.ellipse(180, DESIGN_HEIGHT - 60, 360, 90, 0xff2c72, 0.025)
    .setDepth(-10)
    .setBlendMode(Phaser.BlendModes.ADD);
  const rightMist = scene.add.ellipse(DESIGN_WIDTH - 180, DESIGN_HEIGHT - 60, 360, 90, 0x27d9ff, 0.025)
    .setDepth(-10)
    .setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: leftMist, x: 310, alpha: 0, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  scene.tweens.add({ targets: rightMist, x: DESIGN_WIDTH - 310, alpha: 0, duration: 4600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
}

function createIllustratedHud(arena: ArenaAny): void {
  const root = document.getElementById('game-ui')!;
  root.innerHTML = '';

  arena.hud = document.createElement('div');
  arena.hud.className = 'battle-hud v8-battle-hud';
  arena.hud.innerHTML = `
    <div class="v8-score v8-score-player">
      <b>TOI</b><div class="score-pips player-pips"></div>
    </div>
    <div class="hud-round v8-round"></div>
    <div class="v8-score v8-score-rival">
      <div class="score-pips ai-pips"></div><b>RIVAL</b>
    </div>

    <div class="hud-fear v8-fear v8-fear-player"><small>RÉSERVE</small><b class="fear-reserve"></b></div>
    <div class="v8-fear v8-fear-ai"><small>RÉSERVE</small><b class="ai-fear-reserve"></b></div>

    <div class="hud-role v8-role"></div>
    <div class="arena-duel-badge" aria-hidden="true"></div>

    <div class="duel-controls v8-fear-controls" aria-label="Effroi à dépenser">
      <button data-fear="minus" aria-label="Retirer un point d'Effroi">−</button>
      <div><small>EFFROI</small><span class="fear-spend">0</span><em>+${RULES.fearBonus} / POINT</em></div>
      <button data-fear="plus" aria-label="Ajouter un point d'Effroi">+</button>
    </div>

    <div class="battle-message v8-message" aria-live="polite"></div>
    <button class="battle-exit v8-exit" aria-label="Quitter le combat">×</button>`;
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
}

function refreshIllustratedHud(arena: ArenaAny, message?: string): void {
  const s = arena.engine.snapshot();
  arena.round.textContent = `MANCHE ${Math.min(s.round + 1, RULES.teamSize)} / ${RULES.teamSize}`;
  arena.role.textContent = s.playerRole === 'attacker' ? 'ATTAQUANT' : 'DÉFENSEUR';
  arena.role.dataset.role = s.playerRole;

  const playerFear = arena.hud.querySelector('.fear-reserve');
  const aiFear = arena.hud.querySelector('.ai-fear-reserve');
  if (playerFear) playerFear.textContent = String(s.playerFear);
  if (aiFear) aiFear.textContent = String(s.aiFear);
  arena.fearValue.textContent = String(arena.fearSpend);

  arena.renderPips(arena.playerPips, s.playerScore, 'player');
  arena.renderPips(arena.aiPips, s.aiScore, 'ai');

  // No persistent instruction box over the cards. Only round results become brief toasts.
  const important = !!message && (
    message.includes('ATTAQUE ') ||
    message.includes('DÉFENSE ') ||
    message.includes('Victoire') ||
    message.includes('rival remporte')
  );
  if (important && message) {
    arena.message.textContent = message;
    arena.message.classList.remove('show');
    requestAnimationFrame(() => arena.message.classList.add('show'));
    window.setTimeout(() => arena.message.classList.remove('show'), 950);
  } else {
    arena.message.textContent = '';
    arena.message.classList.remove('show');
  }
}

export function installArenaImageV8(): void {
  const proto = ArenaScene.prototype as any;
  const previousPreload = proto.preload;

  proto.preload = function(): void {
    previousPreload.call(this);
    if (!this.textures.exists(ARENA_KEY)) this.load.image(ARENA_KEY, ARENA_URL);
  };

  proto.drawArena = function(): void {
    drawIllustratedArena(this as Phaser.Scene);
  };

  proto.createHud = function(): void {
    createIllustratedHud(this as ArenaAny);
  };

  proto.refreshHud = function(message?: string): void {
    refreshIllustratedHud(this as ArenaAny, message);
  };

  document.documentElement.classList.add('arena-image-v8-enabled');
}
