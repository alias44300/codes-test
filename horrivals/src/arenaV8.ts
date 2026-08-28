import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './game/config';
import { ArenaScene } from './game/scenes/ArenaScene';

const ARENA_KEY = '__arena_v8_illustrated';
const ARENA_URL = '/assets/ui/arena-v8.webp';

function addUiMask(scene: Phaser.Scene, x: number, y: number, width: number, height: number, alpha: number): void {
  scene.add.rectangle(x, y, width, height, 0x030409, alpha).setDepth(-24);
}

function drawIllustratedArena(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor('#020307');

  const arena = scene.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, ARENA_KEY)
    .setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT)
    .setDepth(-30);
  arena.setOrigin(0.5);

  // The generated illustration is the real arena art. These quiet masks only
  // cover baked-in sample HUD text so live game state can be drawn on top.
  addUiMask(scene, DESIGN_WIDTH / 2, 42, DESIGN_WIDTH, 84, 0.54);
  addUiMask(scene, 54, 222, 108, 286, 0.42);
  addUiMask(scene, DESIGN_WIDTH - 54, 222, 108, 286, 0.42);
  addUiMask(scene, DESIGN_WIDTH / 2, DESIGN_HEIGHT - 54, DESIGN_WIDTH, 108, 0.57);

  // Keep the centre alive without competing with the cards.
  const floorGlowLeft = scene.add.ellipse(DESIGN_WIDTH * 0.33, DESIGN_HEIGHT * 0.77, 300, 64, 0xff3f7f, 0.035).setDepth(-20);
  const floorGlowRight = scene.add.ellipse(DESIGN_WIDTH * 0.67, DESIGN_HEIGHT * 0.77, 300, 64, 0x43d8ff, 0.035).setDepth(-20);
  scene.tweens.add({
    targets: [floorGlowLeft, floorGlowRight],
    alpha: 0.08,
    scaleX: 1.06,
    scaleY: 1.08,
    duration: 1800,
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
  document.documentElement.classList.add('arena-v8-illustrated');
}
