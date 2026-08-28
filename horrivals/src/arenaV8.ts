import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './game/config';
import { ArenaScene } from './game/scenes/ArenaScene';

const ARENA_KEY = '__arena_v8_illustrated';
const ARENA_URL = 'assets/ui/arena-v8.webp';

function drawIllustratedArena(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor('#020307');
  scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, ARENA_KEY)
    .setOrigin(0.5)
    .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
    .setDepth(-30);

  const floorGlowLeft = scene.add.ellipse(DESIGN_WIDTH * 0.33, DESIGN_HEIGHT * 0.74, 250, 48, 0xff3f7f, 0.025).setDepth(-20);
  const floorGlowRight = scene.add.ellipse(DESIGN_WIDTH * 0.67, DESIGN_HEIGHT * 0.74, 250, 48, 0x43d8ff, 0.025).setDepth(-20);
  scene.tweens.add({
    targets: [floorGlowLeft, floorGlowRight],
    alpha: 0.055,
    scaleX: 1.04,
    scaleY: 1.05,
    duration: 1900,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });
}

export function installArenaV8(): void {
  const proto = ArenaScene.prototype as any;
  const originalPreload = proto.preload;

  proto.preload = function(): void {
    originalPreload?.call(this);
    if (!this.textures.exists(ARENA_KEY)) this.load.image(ARENA_KEY, ARENA_URL);
  };

  proto.drawArena = function(): void {
    drawIllustratedArena(this as Phaser.Scene);
  };

  document.documentElement.classList.remove('arena-v7-enabled');
  document.documentElement.classList.add('arena-v8-illustrated', 'arena-v9-clean');
}
