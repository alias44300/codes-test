import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './game/config';
import { ArenaScene } from './game/scenes/ArenaScene';

function addLandingPad(scene: Phaser.Scene, x: number, side: 'player' | 'rival'): void {
  const color = side === 'player' ? 0xff3f7f : 0x43d8ff;
  const g = scene.add.graphics().setDepth(-4);
  const w = 330;
  const h = 460;
  const left = x - w / 2;
  const top = DESIGN_HEIGHT * 0.50 - h / 2;

  g.fillStyle(0x05060a, 0.28);
  g.fillRoundedRect(left, top, w, h, 30);
  g.lineStyle(3, color, 0.16);
  g.strokeRoundedRect(left, top, w, h, 30);
  g.lineStyle(1, 0xffffff, 0.055);
  g.strokeRoundedRect(left + 14, top + 14, w - 28, h - 28, 22);

  const base = scene.add.ellipse(x, DESIGN_HEIGHT * 0.79, 320, 70, color, 0.055).setDepth(-3);
  base.setStrokeStyle(2, color, 0.18);
  scene.tweens.add({ targets: base, scaleX: 1.05, scaleY: 1.08, alpha: 0.09, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
}

function addPylon(scene: Phaser.Scene, x: number, mirrored: boolean): void {
  const g = scene.add.graphics().setDepth(-14);
  const dir = mirrored ? -1 : 1;
  const accent = mirrored ? 0x43d8ff : 0xff3f7f;

  g.fillStyle(0x11131d, 0.96);
  g.fillPoints([
    new Phaser.Geom.Point(x, 92),
    new Phaser.Geom.Point(x + dir * 104, 128),
    new Phaser.Geom.Point(x + dir * 86, 512),
    new Phaser.Geom.Point(x + dir * 28, 608),
    new Phaser.Geom.Point(x - dir * 34, 520),
  ], true);
  g.lineStyle(4, accent, 0.24);
  g.strokePoints([
    new Phaser.Geom.Point(x, 92),
    new Phaser.Geom.Point(x + dir * 104, 128),
    new Phaser.Geom.Point(x + dir * 86, 512),
    new Phaser.Geom.Point(x + dir * 28, 608),
    new Phaser.Geom.Point(x - dir * 34, 520),
  ], true);

  for (let i = 0; i < 4; i++) {
    const y = 175 + i * 88;
    g.fillStyle(accent, 0.10 + i * 0.015);
    g.fillTriangle(x + dir * 12, y, x + dir * 62, y + 26, x + dir * 18, y + 50);
  }
}

function addChain(scene: Phaser.Scene, x: number, y: number, length: number, tint: number): void {
  const container = scene.add.container(x, y).setDepth(-10).setAlpha(0.34);
  for (let i = 0; i < length; i++) {
    const link = scene.add.ellipse(0, i * 22, 13, 22, 0x08090e, 0.12).setStrokeStyle(2, tint, 0.38);
    link.setRotation(i % 2 ? Math.PI / 2 : 0);
    container.add(link);
  }
  scene.tweens.add({ targets: container, rotation: Phaser.Math.DegToRad(2.2), duration: 2500 + x, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
}

function addSmoke(scene: Phaser.Scene, x: number, y: number, tint: number, delay: number): void {
  const puff = scene.add.ellipse(x, y, 170, 58, tint, 0.035).setDepth(-8).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: puff,
    x: x + (x < DESIGN_WIDTH / 2 ? 180 : -180),
    y: y - 46,
    scaleX: 1.8,
    scaleY: 1.35,
    alpha: 0,
    duration: 5200,
    delay,
    repeat: -1,
    repeatDelay: 350,
    ease: 'Sine.Out',
  });
}

function drawV7Arena(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor('#030409');

  const back = scene.add.graphics().setDepth(-30);
  back.fillGradientStyle(0x05050a, 0x090b14, 0x170711, 0x04131b, 1);
  back.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  // Cartoon cursed coliseum wall.
  back.fillStyle(0x0c0d14, 0.94);
  back.fillRect(0, 0, DESIGN_WIDTH, 250);
  back.lineStyle(3, 0xffffff, 0.035);
  for (let x = 0; x < DESIGN_WIDTH; x += 150) back.lineBetween(x, 0, x + 90, 250);

  // Huge broken arch around the central pit.
  back.lineStyle(30, 0x171923, 0.96);
  back.strokeEllipse(DESIGN_WIDTH / 2, 255, 790, 340);
  back.lineStyle(7, 0xff3f7f, 0.10);
  back.strokeEllipse(DESIGN_WIDTH / 2 - 20, 258, 720, 300);
  back.lineStyle(7, 0x43d8ff, 0.09);
  back.strokeEllipse(DESIGN_WIDTH / 2 + 22, 258, 650, 270);

  // Teeth / shards make the arch feel monstrous rather than architectural.
  for (let i = 0; i < 9; i++) {
    const x = 390 + i * 66;
    const size = 22 + (i % 3) * 8;
    back.fillStyle(i % 2 ? 0x20111b : 0x101b23, 0.85);
    back.fillTriangle(x, 116, x + size, 158, x + size * 1.75, 112);
  }

  // Perspective arena floor.
  back.fillStyle(0x080910, 0.98);
  back.fillPoints([
    new Phaser.Geom.Point(0, DESIGN_HEIGHT),
    new Phaser.Geom.Point(DESIGN_WIDTH, DESIGN_HEIGHT),
    new Phaser.Geom.Point(DESIGN_WIDTH * 0.77, 330),
    new Phaser.Geom.Point(DESIGN_WIDTH * 0.23, 330),
  ], true);
  for (let i = 0; i <= 8; i++) {
    const bottomX = (DESIGN_WIDTH / 8) * i;
    back.lineStyle(2, i < 4 ? 0xff3f7f : 0x43d8ff, 0.045);
    back.lineBetween(DESIGN_WIDTH / 2, 330, bottomX, DESIGN_HEIGHT);
  }
  for (let i = 0; i < 5; i++) {
    const y = 390 + i * 62;
    const spread = 260 + i * 160;
    back.lineStyle(2, 0xffffff, 0.035 + i * 0.008);
    back.lineBetween(DESIGN_WIDTH / 2 - spread, y, DESIGN_WIDTH / 2 + spread, y);
  }

  // Central cursed pit. Kept low-contrast so two duel cards remain the stars.
  const pit = scene.add.ellipse(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.61, 610, 185, 0x020307, 0.76).setDepth(-7);
  pit.setStrokeStyle(5, 0xffffff, 0.06);
  const ringA = scene.add.ellipse(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.61, 520, 138, 0xff3f7f, 0.015).setDepth(-6).setStrokeStyle(3, 0xff3f7f, 0.13);
  const ringB = scene.add.ellipse(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.61, 410, 100, 0x43d8ff, 0.012).setDepth(-6).setStrokeStyle(3, 0x43d8ff, 0.11);
  scene.tweens.add({ targets: [ringA, ringB], scaleX: 1.045, scaleY: 1.10, alpha: 0.16, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

  addPylon(scene, 104, false);
  addPylon(scene, DESIGN_WIDTH - 104, true);
  addChain(scene, 202, 10, 10, 0xff557f);
  addChain(scene, DESIGN_WIDTH - 202, 10, 10, 0x55dfff);
  addChain(scene, 315, -18, 7, 0xffffff);
  addChain(scene, DESIGN_WIDTH - 315, -18, 7, 0xffffff);

  // Stage lights sweep slowly. Strong motion only in the environment, never over cards.
  const lights = [
    { x: 235, color: 0xff2e75, rot: -0.22 },
    { x: 390, color: 0xff6aa5, rot: -0.12 },
    { x: DESIGN_WIDTH - 235, color: 0x35d7ff, rot: 0.22 },
    { x: DESIGN_WIDTH - 390, color: 0x80eaff, rot: 0.12 },
  ];
  lights.forEach((light, i) => {
    const beam = scene.add.triangle(light.x, -10, -55, 0, 55, 0, 165, 760, light.color, 0.035)
      .setOrigin(0.5, 0)
      .setRotation(light.rot)
      .setDepth(-12)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: beam, rotation: light.rot + (i < 2 ? 0.12 : -0.12), duration: 2300 + i * 280, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  });

  addSmoke(scene, 140, 560, 0xff3f7f, 0);
  addSmoke(scene, 330, 610, 0xff3f7f, 1200);
  addSmoke(scene, DESIGN_WIDTH - 140, 560, 0x43d8ff, 500);
  addSmoke(scene, DESIGN_WIDTH - 330, 610, 0x43d8ff, 1700);

  // The two duel-card landing zones align with ArenaScene's 33% / 67% positions.
  addLandingPad(scene, DESIGN_WIDTH * 0.33, 'player');
  addLandingPad(scene, DESIGN_WIDTH * 0.67, 'rival');

  // Back-wall branding, intentionally ghosted behind the playfield.
  scene.add.text(DESIGN_WIDTH / 2, 158, 'HORRIVALS', {
    fontFamily: 'Arial Black',
    fontSize: '76px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 10,
  }).setOrigin(0.5).setAlpha(0.055).setDepth(-9);

  scene.add.text(DESIGN_WIDTH / 2, 215, 'MONSTER ARENA', {
    fontFamily: 'Arial Black',
    fontSize: '16px',
    color: '#ffffff',
    letterSpacing: 10,
  }).setOrigin(0.5).setAlpha(0.13).setDepth(-9);
}

export function installArenaV7(): void {
  const proto = ArenaScene.prototype as any;
  proto.drawArena = function(): void { drawV7Arena(this as Phaser.Scene); };
  document.documentElement.classList.add('arena-v7-enabled');
}
