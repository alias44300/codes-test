import { CARD_RATIO } from '../config';
import type { CardData, StatKey } from '../types';

export class CardView {
  readonly container: Phaser.GameObjects.Container;
  readonly frame: Phaser.GameObjects.Rectangle;
  readonly art: Phaser.GameObjects.Image | null;
  readonly fallback: Phaser.GameObjects.Container | null;
  readonly attackHit: Phaser.GameObjects.Zone;
  readonly defenseHit: Phaser.GameObjects.Zone;
  private targetHeight: number;
  private targetWidth: number;

  constructor(scene: Phaser.Scene, card: CardData, textureKey: string | null, height: number, interactive = false) {
    this.targetHeight = height;
    this.targetWidth = height * CARD_RATIO;
    const width = this.targetWidth;
    this.container = scene.add.container(0, 0);

    const shadow = scene.add.rectangle(10, 15, width + 6, height + 6, 0x000000, 0.56).setOrigin(0.5);
    this.frame = scene.add.rectangle(0, 0, width + 8, height + 8, 0x0a0b10, 1).setStrokeStyle(2, 0xffffff, 0.13);
    this.container.add([shadow, this.frame]);

    if (textureKey && scene.textures.exists(textureKey)) {
      const image = scene.add.image(0, 0, textureKey);
      this.fitInside(image, width, height);
      this.art = image;
      this.fallback = null;
      this.container.add(image);
    } else {
      this.art = null;
      this.fallback = this.makeFallback(scene, card, width, height);
      this.container.add(this.fallback);
    }

    this.attackHit = scene.add.zone(-width * 0.25, height * 0.36, width * 0.5, height * 0.24).setOrigin(0.5);
    this.defenseHit = scene.add.zone(width * 0.25, height * 0.36, width * 0.5, height * 0.24).setOrigin(0.5);
    this.container.add([this.attackHit, this.defenseHit]);
    this.setStatInteractive(interactive);
  }

  setPosition(x: number, y: number): this { this.container.setPosition(x, y); return this; }
  setRotation(radians: number): this { this.container.setRotation(radians); return this; }
  setDepth(depth: number): this { this.container.setDepth(depth); return this; }
  setVisible(v: boolean): this { this.container.setVisible(v); return this; }

  setStatInteractive(enabled: boolean, onChoice?: (stat: StatKey) => void): void {
    this.attackHit.disableInteractive();
    this.defenseHit.disableInteractive();
    this.attackHit.removeAllListeners();
    this.defenseHit.removeAllListeners();
    if (!enabled || !onChoice) return;
    this.attackHit.setInteractive({ useHandCursor: true }).on('pointerdown', () => onChoice('attack'));
    this.defenseHit.setInteractive({ useHandCursor: true }).on('pointerdown', () => onChoice('defense'));
  }

  tweenTo(scene: Phaser.Scene, x: number, y: number, scale = 1, duration = 300, rotation = 0): Promise<void> {
    return new Promise(resolve => scene.tweens.add({
      targets: this.container,
      x, y, scaleX: scale, scaleY: scale, rotation,
      duration,
      ease: 'Cubic.Out',
      onComplete: () => resolve(),
    }));
  }

  fitCurrentArt(): void {
    if (this.art) this.fitInside(this.art, this.targetWidth, this.targetHeight);
  }

  private fitInside(image: Phaser.GameObjects.Image, boxW: number, boxH: number): void {
    // Uniform scaling only. Never crop and never stretch. Exact 2:3 Jumbo XL sources fill the frame.
    const src = image.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const sw = Number((src as HTMLImageElement).naturalWidth || src.width || boxW);
    const sh = Number((src as HTMLImageElement).naturalHeight || src.height || boxH);
    const scale = Math.min(boxW / sw, boxH / sh);
    image.setDisplaySize(sw * scale, sh * scale);
  }

  private makeFallback(scene: Phaser.Scene, card: CardData, w: number, h: number): Phaser.GameObjects.Container {
    const c = scene.add.container(0, 0);
    const bg = scene.add.rectangle(0, 0, w, h, 0x11131b).setStrokeStyle(2, 0xff4f8b, 0.28);
    const accent = scene.add.rectangle(0, -h * 0.13, w * 1.1, h * 0.18, 0xff4f8b, 0.10).setRotation(-0.28);
    const id = scene.add.text(0, -h * 0.40, card.id, {
      fontFamily: 'Arial Black', fontSize: `${Math.max(12, h * 0.045)}px`, color: '#ff4f8b',
    }).setOrigin(0.5);
    const name = scene.add.text(0, -h * 0.08, card.name.toUpperCase(), {
      fontFamily: 'Arial Black', fontSize: `${Math.max(15, h * 0.055)}px`, color: '#ffffff', align: 'center', wordWrap: { width: w * 0.84 },
    }).setOrigin(0.5);
    const attack = scene.add.text(0, h * 0.29, `ATTAQUE ${card.attack}`, {
      fontFamily: 'Arial Black', fontSize: `${Math.max(12, h * 0.046)}px`, color: '#ff825f',
    }).setOrigin(0.5);
    const defense = scene.add.text(0, h * 0.38, `DÉFENSE ${card.defense}`, {
      fontFamily: 'Arial Black', fontSize: `${Math.max(12, h * 0.046)}px`, color: '#64c8ff',
    }).setOrigin(0.5);
    c.add([bg, accent, id, name, attack, defense]);
    return c;
  }
}
