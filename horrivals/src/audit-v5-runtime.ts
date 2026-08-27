import { ArenaScene } from './game/scenes/ArenaScene';
import type { CardData } from './game/types';

export function installAuditV5Runtime(): void {
  const proto = ArenaScene.prototype as unknown as {
    ensureFallbackTexture?: (card: CardData) => string;
  };

  proto.ensureFallbackTexture = function(this: ArenaScene, card: CardData): string {
    const key = `fallback-clean:${card.id}`;
    if (this.textures.exists(key)) return key;

    const texture = this.textures.createCanvas(key, 600, 900)!;
    const ctx = texture.context;
    ctx.fillStyle = '#080a11';
    ctx.fillRect(0, 0, 600, 900);

    const glow = ctx.createRadialGradient(300, 420, 30, 300, 420, 430);
    glow.addColorStop(0, 'rgba(255,47,120,.16)');
    glow.addColorStop(.48, 'rgba(51,214,255,.07)');
    glow.addColorStop(1, 'rgba(3,4,9,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 600, 900);

    ctx.save();
    ctx.translate(300, 450);
    ctx.rotate(-0.18);
    ctx.fillStyle = 'rgba(255,47,120,.10)';
    ctx.fillRect(-420, -68, 840, 136);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, 564, 864);
    ctx.strokeStyle = 'rgba(255,47,120,.30)';
    ctx.lineWidth = 3;
    ctx.strokeRect(34, 34, 532, 832);

    ctx.beginPath();
    ctx.arc(300, 450, 92, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(248, 450);
    ctx.lineTo(352, 450);
    ctx.moveTo(300, 398);
    ctx.lineTo(300, 502);
    ctx.strokeStyle = 'rgba(255,47,120,.26)';
    ctx.lineWidth = 8;
    ctx.stroke();

    texture.refresh();
    return key;
  };
}
