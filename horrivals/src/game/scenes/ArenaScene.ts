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
  private round!: HTMLDivElement;
  private role!: HTMLDivElement;
  private fear!: HTMLDivElement;
  private fearValue!: HTMLSpanElement;
  private controls!: HTMLDivElement;
  private playerPips!: HTMLDivElement;
  private aiPips!: HTMLDivElement;
  private duelBadge!: HTMLDivElement;

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
    this.cameras.main.setBackgroundColor('#06070b');
    this.drawArena();
    this.createHud();
    void this.createHands();
    this.refreshHud('Choisis une carte pour ouvrir le duel.');
  }

  private drawArena(): void {
    const g = this.add.graphics().setDepth(-20);
    g.fillGradientStyle(0x07080d, 0x11131d, 0x090910, 0x05060a, 1);
    g.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

    g.fillStyle(0x2a1022, 0.78);
    g.fillTriangle(0, 0, DESIGN_WIDTH * 0.47, 0, DESIGN_WIDTH * 0.29, DESIGN_HEIGHT);
    g.fillStyle(0x092031, 0.58);
    g.fillTriangle(DESIGN_WIDTH, 0, DESIGN_WIDTH * 0.57, 0, DESIGN_WIDTH * 0.72, DESIGN_HEIGHT);

    for (let i = 0; i < 9; i++) {
      const x = i * 170 - 120;
      g.lineStyle(2, i % 2 ? 0xff4f8b : 0x64c8ff, 0.055);
      g.lineBetween(x, 0, x + 430, DESIGN_HEIGHT);
    }

    g.lineStyle(1, 0xffffff, 0.08);
    g.lineBetween(DESIGN_WIDTH * 0.5, 74, DESIGN_WIDTH * 0.5, DESIGN_HEIGHT - 72);
    g.fillStyle(0xffffff, 0.035);
    g.fillCircle(DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, 112);
    g.lineStyle(2, 0xff4f8b, 0.14);
    g.strokeCircle(DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, 130);
    g.lineStyle(2, 0x64c8ff, 0.10);
    g.strokeCircle(DESIGN_WIDTH * 0.5, DESIGN_HEIGHT * 0.5, 154);

    const slashA = this.add.rectangle(-100, DESIGN_HEIGHT * 0.33, 560, 10, 0xff4f8b, 0.10).setRotation(-0.34).setDepth(-12);
    const slashB = this.add.rectangle(DESIGN_WIDTH + 80, DESIGN_HEIGHT * 0.68, 560, 8, 0x64c8ff, 0.09).setRotation(-0.34).setDepth(-12);
    this.tweens.add({ targets: slashA, x: DESIGN_WIDTH + 100, duration: 8200, repeat: -1, ease: 'Linear' });
    this.tweens.add({ targets: slashB, x: -100, duration: 9600, repeat: -1, ease: 'Linear' });

    this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, 'VS', {
      fontFamily: 'Arial Black', fontSize: '92px', color: '#ffffff', stroke: '#08080d', strokeThickness: 10,
    }).setOrigin(0.5).setAlpha(0.065).setDepth(-5).setRotation(-0.08);
  }

  private createHud(): void {
    const root = document.getElementById('game-ui')!;
    root.innerHTML = '';
    this.hud = document.createElement('div');
    this.hud.className = 'battle-hud';
    this.hud.innerHTML = `
      <div class="battle-top">
        <div class="hud-side player"><div class="hud-side-label"><small>JOUEUR</small><b>TOI</b></div><div class="score-pips player-pips"></div></div>
        <div class="hud-round"></div>
        <div class="hud-side rival"><div class="score-pips ai-pips"></div><div class="hud-side-label"><small>ADVERSAIRE</small><b>RIVAL</b></div></div>
      </div>
      <div class="hud-role"></div>
      <div class="hud-fear"><span>RÉSERVE D’EFFROI</span><b class="fear-reserve"></b></div>
      <div class="arena-duel-badge"><span>CHOISIS TA STAT</span></div>
      <div class="duel-controls" aria-label="Effroi à dépenser">
        <strong>EFFROI</strong><button data-fear="minus">−</button><span class="fear-spend">0</span><button data-fear="plus">+</button><small>ressource générale<br>+${RULES.fearBonus} par point</small>
      </div>
      <div class="battle-message"></div>
      <button class="battle-exit">QUITTER</button>`;
    root.appendChild(this.hud);

    this.message = this.hud.querySelector('.battle-message')!;
    this.round = this.hud.querySelector('.hud-round')!;
    this.role = this.hud.querySelector('.hud-role')!;
    this.fear = this.hud.querySelector('.hud-fear')!;
    this.fearValue = this.hud.querySelector('.fear-spend')!;
    this.controls = this.hud.querySelector('.duel-controls')!;
    this.playerPips = this.hud.querySelector('.player-pips')!;
    this.aiPips = this.hud.querySelector('.ai-pips')!;
    this.duelBadge = this.hud.querySelector('.arena-duel-badge')!;

    this.hud.querySelector('[data-fear="minus"]')!.addEventListener('click', () => this.changeFear(-1));
    this.hud.querySelector('[data-fear="plus"]')!.addEventListener('click', () => this.changeFear(1));
    this.hud.querySelector('.battle-exit')!.addEventListener('click', () => {
      root.innerHTML = '';
      this.scene.stop();
      window.dispatchEvent(new CustomEvent('horrivals:menu'));
    });
  }

  private async createHands(): Promise<void> {
    const pStart = DESIGN_WIDTH / 2 - 2 * 148;
    for (let i = 0; i < RULES.teamSize; i++) {
      const card = this.payload.team[i];
      const texture = await this.resolveTexture(card);
      const view = new CardView(this, card, texture, UI.handCardHeight, false);
      view.setPosition(pStart + i * 148, DESIGN_HEIGHT - 32 + Math.abs(i - 2) * 7)
        .setRotation(Phaser.Math.DegToRad((i - 2) * 4.3)).setDepth(20 + i);
      view.frame.setInteractive({ useHandCursor: true }).on('pointerdown', () => void this.selectPlayerCard(i));
      this.playerHand.push({ view, card, index: i });
    }

    const aStart = DESIGN_WIDTH / 2 - 2 * 118;
    for (let i = 0; i < RULES.teamSize; i++) {
      const card = this.engine.aiTeam[i];
      const view = new CardView(this, card, '__card_back', UI.aiBackHeight, false);
      view.setPosition(aStart + i * 118, 32 + Math.abs(i - 2) * 5)
        .setRotation(Phaser.Math.DegToRad((2 - i) * 3.2)).setDepth(8 + i);
      this.aiHand.push({ view, card, index: i });
    }
  }

  private async resolveTexture(card: CardData): Promise<string> {
    const imported = await this.payload.artStore.getObjectUrl(card.id);
    const source = imported || card.art || '';
    if (!source) return this.ensureFallbackTexture(card);
    const key = imported ? `imported:${card.id}` : `bundled:${card.id}`;
    if (!this.textures.exists(key)) {
      try { await this.loadExternalTexture(key, source); }
      catch { return this.ensureFallbackTexture(card); }
    }
    return key;
  }

  private ensureFallbackTexture(card: CardData): string {
    const key = `fallback:${card.id}`;
    if (this.textures.exists(key)) return key;
    const texture = this.textures.createCanvas(key, 600, 900)!;
    const ctx = texture.context;
    ctx.fillStyle = '#10121a';
    ctx.fillRect(0, 0, 600, 900);
    const gradient = ctx.createLinearGradient(0, 0, 600, 900);
    gradient.addColorStop(0, 'rgba(255,79,139,.25)');
    gradient.addColorStop(.55, 'rgba(17,18,26,.15)');
    gradient.addColorStop(1, 'rgba(100,200,255,.18)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 900);
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, 564, 864);
    ctx.fillStyle = '#ff4f8b';
    ctx.font = '900 34px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(card.id, 300, 92);
    ctx.fillStyle = '#fff7fb';
    ctx.font = '900 54px Arial';
    const words = card.name.toUpperCase().split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > 490 && line) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((text, i) => ctx.fillText(text, 300, 380 + i * 62));
    ctx.font = '900 38px Arial';
    ctx.fillStyle = '#ff825f';
    ctx.fillText(`ATTAQUE ${card.attack}`, 300, 710);
    ctx.fillStyle = '#64c8ff';
    ctx.fillText(`DÉFENSE ${card.defense}`, 300, 772);
    texture.refresh();
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
    this.focusHands(index);
    this.selected.view.container.setDepth(120);
    await this.selected.view.tweenTo(this, DESIGN_WIDTH * 0.33, DESIGN_HEIGHT * 0.50, UI.duelCardHeight / UI.handCardHeight, 320, Phaser.Math.DegToRad(-2));
    this.selected.view.setStatInteractive(true, stat => void this.chooseStat(stat));
    this.controls.classList.add('visible');
    this.duelBadge.classList.add('visible');
    this.locked = false;
    this.refreshHud(`${this.selected.card.name} est en jeu. Touche ATTAQUE ou DÉFENSE directement sur la carte.`);
  }

  private async chooseStat(stat: StatKey): Promise<void> {
    if (!this.selected || this.locked) return;
    this.locked = true;
    this.selected.view.setStatInteractive(false);
    this.controls.classList.remove('visible');
    this.duelBadge.classList.remove('visible');

    const resolution = this.engine.resolve(this.selected.index, stat, this.fearSpend);
    const ai = this.aiHand[resolution.aiCardIndex];
    ai.view.container.setDepth(121);
    await ai.view.tweenTo(this, DESIGN_WIDTH * 0.67, DESIGN_HEIGHT * 0.50, UI.duelCardHeight / UI.aiBackHeight, 340, Phaser.Math.DegToRad(2));
    await this.revealAiCard(ai);
    await this.showImpact(resolution, ai);

    this.fearSpend = 0;
    this.selected = null;
    this.locked = false;
    this.focusHands(-1);
    if (resolution.ended) this.showMatchResult(resolution);
    else this.refreshHud('Choisis la prochaine carte.');
  }

  private async revealAiCard(entry: HandEntry): Promise<void> {
    const texture = await this.resolveTexture(entry.card);
    if (!entry.view.art) return;
    const duelScale = UI.duelCardHeight / UI.aiBackHeight;
    await new Promise<void>(resolve => this.tweens.add({
      targets: entry.view.container, scaleX: 0.025, duration: 145, ease: 'Sine.In',
      onComplete: () => {
        entry.view.art!.setTexture(texture);
        entry.view.fitCurrentArt();
        this.tweens.add({ targets: entry.view.container, scaleX: duelScale, duration: 165, ease: 'Back.Out', onComplete: () => resolve() });
      }
    }));
  }

  private async showImpact(r: RoundResolution, ai: HandEntry): Promise<void> {
    const player = this.playerHand[r.playerCardIndex];
    const playerLabel = r.playerStat === 'attack' ? 'ATTAQUE' : 'DÉFENSE';
    const aiLabel = r.aiStat === 'attack' ? 'ATTAQUE' : 'DÉFENSE';
    this.refreshHud(`${playerLabel} ${r.playerTotal}  ·  ${aiLabel} ${r.aiTotal}`);

    await Promise.all([
      new Promise<void>(resolve => this.tweens.add({ targets: player.view.container, x: DESIGN_WIDTH * 0.40, rotation: -0.01, duration: 125, ease: 'Cubic.In', onComplete: () => resolve() })),
      new Promise<void>(resolve => this.tweens.add({ targets: ai.view.container, x: DESIGN_WIDTH * 0.60, rotation: 0.01, duration: 125, ease: 'Cubic.In', onComplete: () => resolve() })),
    ]);

    this.cameras.main.shake(210, 0.008);
    const impactColor = r.winner === 'player' ? 0xff4f8b : 0x64c8ff;
    const flash = this.add.rectangle(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT, impactColor, 0).setDepth(180);
    const ring = this.add.circle(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, 18, impactColor, 0).setStrokeStyle(7, impactColor, 0.9).setDepth(181);
    this.tweens.add({ targets: flash, alpha: 0.22, yoyo: true, duration: 85, onComplete: () => flash.destroy() });
    this.tweens.add({ targets: ring, radius: 150, alpha: 0, duration: 280, ease: 'Cubic.Out', onComplete: () => ring.destroy() });

    const resultText = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, r.winner === 'player' ? 'POINT' : 'RIVAL', {
      fontFamily: 'Arial Black', fontSize: '44px', color: '#ffffff', stroke: '#09090e', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(190).setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: resultText, alpha: 1, scale: 1.15, duration: 120, yoyo: true, hold: 270, onComplete: () => resultText.destroy() });

    await new Promise(resolve => setTimeout(resolve, 640));
    await Promise.all([
      new Promise<void>(resolve => this.tweens.add({ targets: player.view.container, x: -190, y: DESIGN_HEIGHT + 160, rotation: -0.22, alpha: 0, duration: 360, ease: 'Cubic.In', onComplete: () => { player.view.setVisible(false); resolve(); } })),
      new Promise<void>(resolve => this.tweens.add({ targets: ai.view.container, x: DESIGN_WIDTH + 190, y: -160, rotation: 0.22, alpha: 0, duration: 360, ease: 'Cubic.In', onComplete: () => { ai.view.setVisible(false); resolve(); } })),
    ]);
  }

  private showMatchResult(r: RoundResolution): void {
    const won = r.playerScore > r.aiScore;
    this.refreshHud(won ? 'Victoire de l’équipe.' : 'Le rival remporte le duel.');
    const root = document.getElementById('game-ui')!;
    const panel = document.createElement('div');
    panel.className = 'match-result';
    panel.innerHTML = `<small>FIN DU MATCH</small><strong>${won ? 'VICTOIRE' : 'DÉFAITE'}</strong><span>${r.playerScore} — ${r.aiScore}</span><div><button>REJOUER</button><button data-menu>MENU</button></div>`;
    root.appendChild(panel);
    panel.querySelector('button')!.addEventListener('click', () => this.scene.restart(this.payload));
    panel.querySelector('[data-menu]')!.addEventListener('click', () => window.dispatchEvent(new CustomEvent('horrivals:menu')));
  }

  private async returnSelectedHome(entry: HandEntry): Promise<void> {
    const i = entry.index;
    const pStart = DESIGN_WIDTH / 2 - 2 * 148;
    entry.view.setStatInteractive(false);
    await entry.view.tweenTo(this, pStart + i * 148, DESIGN_HEIGHT - 32 + Math.abs(i - 2) * 7, 1, 220, Phaser.Math.DegToRad((i - 2) * 4.3));
    entry.view.container.setDepth(20 + i);
    this.controls.classList.remove('visible');
    this.duelBadge.classList.remove('visible');
    this.focusHands(-1);
  }

  private focusHands(selectedIndex: number): void {
    this.playerHand.forEach(entry => {
      if (!entry.view.container.visible) return;
      const used = this.engine.snapshot().playerUsed[entry.index];
      if (used) return;
      this.tweens.add({
        targets: entry.view.container,
        alpha: selectedIndex < 0 || entry.index === selectedIndex ? 1 : 0.34,
        duration: 160,
      });
    });
    this.aiHand.forEach(entry => {
      if (!entry.view.container.visible) return;
      const used = this.engine.snapshot().aiUsed[entry.index];
      if (used) return;
      this.tweens.add({ targets: entry.view.container, alpha: selectedIndex < 0 ? 1 : 0.48, duration: 160 });
    });
  }

  private changeFear(delta: number): void {
    if (this.locked) return;
    const reserve = this.engine.snapshot().playerFear;
    this.fearSpend = Phaser.Math.Clamp(this.fearSpend + delta, 0, Math.min(RULES.maxFearPerDuel, reserve));
    this.fearValue.textContent = String(this.fearSpend);
  }

  private refreshHud(message?: string): void {
    const s = this.engine.snapshot();
    this.round.textContent = `CONFRONTATION ${Math.min(s.round + 1, RULES.teamSize)} / ${RULES.teamSize}`;
    this.role.textContent = s.playerRole === 'attacker' ? 'TU ATTAQUES' : 'TU DÉFENDS';
    this.role.dataset.role = s.playerRole;
    this.fear.innerHTML = `<span>RÉSERVE D’EFFROI</span><b class="fear-reserve">${s.playerFear}</b>`;
    this.fearValue.textContent = String(this.fearSpend);
    this.renderPips(this.playerPips, s.playerScore, 'player');
    this.renderPips(this.aiPips, s.aiScore, 'ai');
    if (message) this.message.textContent = message;
  }

  private renderPips(root: HTMLDivElement, score: number, owner: 'player' | 'ai'): void {
    root.innerHTML = '';
    for (let i = 0; i < RULES.winScore; i++) {
      const pip = document.createElement('i');
      if (i < score) pip.className = `on ${owner}`;
      root.appendChild(pip);
    }
  }
}
