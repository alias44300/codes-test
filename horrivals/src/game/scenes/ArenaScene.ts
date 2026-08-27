import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH, RULES, UI } from '../config';
import type { CardData, RoundResolution, StatKey } from '../types';
import { BattleEngine, buildMatchedAiTeam } from '../systems/BattleEngine';
import { CardArtStore } from '../storage/CardArtStore';
import { CardView } from '../view/CardView';

export interface ArenaPayload { roster: CardData[]; team: CardData[]; artStore: CardArtStore; }
interface HandEntry { view: CardView; card: CardData; index: number; }

export class ArenaScene extends Phaser.Scene {
  private payload!: ArenaPayload;
  private engine!: BattleEngine;
  private playerHand: HandEntry[] = [];
  private aiHand: HandEntry[] = [];
  private selected: HandEntry | null = null;
  private fearSpend = 0;
  private locked = false;
  private hud!: HTMLDivElement;
  private message!: HTMLDivElement;
  private score!: HTMLDivElement;
  private round!: HTMLDivElement;
  private fear!: HTMLDivElement;
  private role!: HTMLDivElement;
  private fearValue!: HTMLSpanElement;

  constructor() { super('arena'); }

  init(payload: ArenaPayload): void {
    this.payload = payload;
    this.playerHand = [];
    this.aiHand = [];
    this.selected = null;
    this.fearSpend = 0;
    this.locked = false;
    const ai = buildMatchedAiTeam(payload.roster, payload.team);
    this.engine = new BattleEngine(payload.team, ai, RULES);
  }

  preload(): void { this.load.image('__card_back', '/assets/ui/card-back.svg'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#09070d');
    this.drawArena();
    this.createHud();
    void this.createHands();
    this.refreshHud('Choisis une carte. Elle montera en JUMBO XL au centre.');
  }

  private drawArena(): void {
    const g = this.add.graphics().setDepth(-10);
    g.fillGradientStyle(0x0b0710, 0x140915, 0x070b12, 0x190b18, 1);
    g.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    for (let i = 0; i < 13; i++) {
      const x = i * 120 - 160;
      g.fillStyle(i % 2 ? 0x4d1438 : 0x17122a, 0.16);
      g.fillTriangle(x, 0, x + 340, 0, x + 140, DESIGN_HEIGHT);
    }
    g.lineStyle(2, 0xf14a91, 0.15);
    g.lineBetween(DESIGN_WIDTH * 0.5, 90, DESIGN_WIDTH * 0.5, DESIGN_HEIGHT - 120);
    this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, 'VS', { fontFamily: 'Arial Black', fontSize: '76px', color: '#68264d', stroke: '#140a16', strokeThickness: 8 }).setOrigin(0.5).setAlpha(0.56).setDepth(-2);
  }

  private createHud(): void {
    const root = document.getElementById('game-ui')!;
    root.innerHTML = '';
    this.hud = document.createElement('div');
    this.hud.className = 'battle-hud';
    this.hud.innerHTML = `
      <div class="hud-score"></div><div class="hud-round"></div>
      <div class="hud-fear">EFFROI <span class="fear-reserve"></span></div><div class="hud-role"></div>
      <div class="fear-picker" aria-label="Effroi à dépenser"><button data-fear="minus">−</button><span class="fear-spend">0</span><button data-fear="plus">+</button><small>+${RULES.fearBonus} / EFFROI · max ${RULES.maxFearPerDuel}</small></div>
      <div class="battle-message"></div><button class="battle-exit">QUITTER</button>`;
    root.appendChild(this.hud);
    this.message = this.hud.querySelector('.battle-message')!;
    this.score = this.hud.querySelector('.hud-score')!;
    this.round = this.hud.querySelector('.hud-round')!;
    this.fear = this.hud.querySelector('.hud-fear')!;
    this.role = this.hud.querySelector('.hud-role')!;
    this.fearValue = this.hud.querySelector('.fear-spend')!;
    this.hud.querySelector('[data-fear="minus"]')!.addEventListener('click', () => this.changeFear(-1));
    this.hud.querySelector('[data-fear="plus"]')!.addEventListener('click', () => this.changeFear(1));
    this.hud.querySelector('.battle-exit')!.addEventListener('click', () => {
      root.innerHTML = '';
      this.scene.stop();
      window.dispatchEvent(new CustomEvent('horrivals:menu'));
    });
  }

  private async createHands(): Promise<void> {
    const pStart = DESIGN_WIDTH / 2 - 2 * 142;
    for (let i = 0; i < RULES.teamSize; i++) {
      const card = this.payload.team[i];
      const texture = await this.resolveTexture(card);
      const view = new CardView(this, card, texture, UI.handCardHeight, false);
      view.setPosition(pStart + i * 142, DESIGN_HEIGHT - 92 + Math.abs(i - 2) * 7).setRotation(Phaser.Math.DegToRad((i - 2) * 3)).setDepth(10 + i);
      view.frame.setInteractive({ useHandCursor: true }).on('pointerdown', () => void this.selectPlayerCard(i));
      this.playerHand.push({ view, card, index: i });
    }
    const aStart = DESIGN_WIDTH / 2 - 2 * 112;
    for (let i = 0; i < RULES.teamSize; i++) {
      const card = this.engine.aiTeam[i];
      const view = new CardView(this, card, '__card_back', UI.aiBackHeight, false);
      view.setPosition(aStart + i * 112, 105 + Math.abs(i - 2) * 5).setRotation(Phaser.Math.DegToRad((2 - i) * 2.2)).setDepth(5 + i);
      this.aiHand.push({ view, card, index: i });
    }
  }

  private async resolveTexture(card: CardData): Promise<string | null> {
    const imported = await this.payload.artStore.getObjectUrl(card.id);
    if (!imported) return null;
    const key = `imported:${card.id}`;
    if (!this.textures.exists(key)) await this.loadExternalTexture(key, imported);
    return key;
  }

  private loadExternalTexture(key: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { if (!this.textures.exists(key)) this.textures.addImage(key, image); resolve(); };
      image.onerror = () => reject(new Error(`Unable to load ${key}`));
      image.src = url;
    });
  }

  private async selectPlayerCard(index: number): Promise<void> {
    if (this.locked || this.engine.snapshot().playerUsed[index]) return;
    this.locked = true;
    if (this.selected && this.selected.index !== index) await this.returnSelectedHome(this.selected);
    this.selected = this.playerHand[index];
    this.selected.view.container.setDepth(100);
    await this.selected.view.tweenTo(this, DESIGN_WIDTH * 0.31, DESIGN_HEIGHT * 0.50, UI.duelCardHeight / UI.handCardHeight, 290, Phaser.Math.DegToRad(-2));
    this.selected.view.setStatInteractive(true, stat => void this.chooseStat(stat));
    this.locked = false;
    this.refreshHud(`${this.selected.card.name} est prêt. Touche ATTAQUE ou DÉFENSE sur la grande carte.`);
  }

  private async chooseStat(stat: StatKey): Promise<void> {
    if (!this.selected || this.locked) return;
    this.locked = true;
    this.selected.view.setStatInteractive(false);
    const resolution = this.engine.resolve(this.selected.index, stat, this.fearSpend);
    const ai = this.aiHand[resolution.aiCardIndex];
    ai.view.container.setDepth(101);
    await ai.view.tweenTo(this, DESIGN_WIDTH * 0.69, DESIGN_HEIGHT * 0.50, UI.duelCardHeight / UI.aiBackHeight, 320, Phaser.Math.DegToRad(2));
    await this.revealAiCard(ai);
    await this.showImpact(resolution, ai);
    this.fearSpend = 0;
    this.selected = null;
    this.locked = false;
    if (resolution.ended) this.showMatchResult(resolution); else this.refreshHud('Choisis ta prochaine carte.');
  }

  private async revealAiCard(entry: HandEntry): Promise<void> {
    const texture = await this.resolveTexture(entry.card);
    if (!texture || !entry.view.art) return;
    await new Promise<void>(resolve => this.tweens.add({
      targets: entry.view.container, scaleX: 0.02, duration: 130, ease: 'Sine.In',
      onComplete: () => {
        entry.view.art!.setTexture(texture);
        this.tweens.add({ targets: entry.view.container, scaleX: UI.duelCardHeight / UI.aiBackHeight, duration: 150, ease: 'Sine.Out', onComplete: () => resolve() });
      }
    }));
  }

  private async showImpact(r: RoundResolution, ai: HandEntry): Promise<void> {
    const player = this.playerHand[r.playerCardIndex];
    this.refreshHud(`${r.playerStat === 'attack' ? 'ATTAQUE' : 'DÉFENSE'} ${r.playerTotal}  VS  ${r.aiStat === 'attack' ? 'ATTAQUE' : 'DÉFENSE'} ${r.aiTotal}`);
    this.cameras.main.shake(160, 0.006);
    const flash = this.add.rectangle(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT, r.winner === 'player' ? 0x2ee6a6 : 0xff3b6e, 0).setDepth(180);
    this.tweens.add({ targets: flash, alpha: 0.26, yoyo: true, duration: 90, onComplete: () => flash.destroy() });
    this.tweens.add({ targets: player.view.container, x: '+=38', duration: 90, yoyo: true, ease: 'Back.Out' });
    this.tweens.add({ targets: ai.view.container, x: '-=38', duration: 90, yoyo: true, ease: 'Back.Out' });
    await new Promise(resolve => setTimeout(resolve, 760));
    await Promise.all([
      new Promise<void>(resolve => this.tweens.add({ targets: player.view.container, x: -180, y: DESIGN_HEIGHT + 160, alpha: 0, duration: 330, onComplete: () => { player.view.setVisible(false); resolve(); } })),
      new Promise<void>(resolve => this.tweens.add({ targets: ai.view.container, x: DESIGN_WIDTH + 180, y: -160, alpha: 0, duration: 330, onComplete: () => { ai.view.setVisible(false); resolve(); } })),
    ]);
  }

  private showMatchResult(r: RoundResolution): void {
    const won = r.playerScore > r.aiScore;
    this.refreshHud(won ? 'VICTOIRE HORRIVALS' : 'DÉFAITE');
    const root = document.getElementById('game-ui')!;
    const panel = document.createElement('div');
    panel.className = 'match-result';
    panel.innerHTML = `<strong>${won ? 'VICTOIRE' : 'DÉFAITE'}</strong><span>${r.playerScore} - ${r.aiScore}</span><button>REJOUER</button><button data-menu>MENU</button>`;
    root.appendChild(panel);
    panel.querySelector('button')!.addEventListener('click', () => this.scene.restart(this.payload));
    panel.querySelector('[data-menu]')!.addEventListener('click', () => window.dispatchEvent(new CustomEvent('horrivals:menu')));
  }

  private async returnSelectedHome(entry: HandEntry): Promise<void> {
    const i = entry.index;
    const pStart = DESIGN_WIDTH / 2 - 2 * 142;
    entry.view.setStatInteractive(false);
    await entry.view.tweenTo(this, pStart + i * 142, DESIGN_HEIGHT - 92 + Math.abs(i - 2) * 7, 1, 220, Phaser.Math.DegToRad((i - 2) * 3));
    entry.view.container.setDepth(10 + i);
  }

  private changeFear(delta: number): void {
    if (this.locked) return;
    const reserve = this.engine.snapshot().playerFear;
    this.fearSpend = Phaser.Math.Clamp(this.fearSpend + delta, 0, Math.min(RULES.maxFearPerDuel, reserve));
    this.fearValue.textContent = String(this.fearSpend);
  }

  private refreshHud(message?: string): void {
    const s = this.engine.snapshot();
    this.score.textContent = `TOI ${s.playerScore}  ·  ${s.aiScore} IA`;
    this.round.textContent = `CONFRONTATION ${Math.min(s.round + 1, RULES.teamSize)}/${RULES.teamSize}`;
    this.fear.innerHTML = `EFFROI <span class="fear-reserve">${s.playerFear}</span>`;
    this.role.textContent = s.playerRole === 'attacker' ? 'TU ATTAQUES' : 'TU DÉFENDS';
    this.role.dataset.role = s.playerRole;
    this.fearValue.textContent = String(this.fearSpend);
    if (message) this.message.textContent = message;
  }
}
