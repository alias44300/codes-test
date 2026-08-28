import { RULES } from '../config';
import type { BattleRules, CardData, Role, RoundResolution, Side, StatKey } from '../types';

export interface BattleSnapshot {
  round: number;
  playerScore: number;
  aiScore: number;
  playerFear: number;
  aiFear: number;
  playerUsed: boolean[];
  aiUsed: boolean[];
  playerRole: Role;
  ended: boolean;
}

export class BattleEngine {
  readonly rules: BattleRules;
  readonly playerTeam: CardData[];
  readonly aiTeam: CardData[];
  private round = 0;
  private playerScore = 0;
  private aiScore = 0;
  private playerFear: number;
  private aiFear: number;
  private playerUsed: boolean[];
  private aiUsed: boolean[];

  constructor(playerTeam: CardData[], aiTeam: CardData[], rules: BattleRules = RULES) {
    if (playerTeam.length !== rules.teamSize || aiTeam.length !== rules.teamSize) throw new Error(`HORRIVALS requires exactly ${rules.teamSize} cards per team.`);
    this.rules = rules;
    this.playerTeam = playerTeam;
    this.aiTeam = aiTeam;
    this.playerFear = rules.startingFear;
    this.aiFear = rules.startingFear;
    this.playerUsed = Array(rules.teamSize).fill(false);
    this.aiUsed = Array(rules.teamSize).fill(false);
  }

  snapshot(): BattleSnapshot {
    return { round: this.round, playerScore: this.playerScore, aiScore: this.aiScore, playerFear: this.playerFear, aiFear: this.aiFear, playerUsed: [...this.playerUsed], aiUsed: [...this.aiUsed], playerRole: this.playerRole(), ended: this.isEnded() };
  }

  playerRole(): Role { return this.round % 2 === 0 ? 'attacker' : 'defender'; }
  defenderSide(): Side { return this.playerRole() === 'defender' ? 'player' : 'ai'; }
  availableAiIndices(): number[] { return this.aiUsed.map((used, i) => used ? -1 : i).filter(i => i >= 0); }

  resolve(playerCardIndex: number, playerStat: StatKey, requestedFear: number): RoundResolution {
    if (this.isEnded()) throw new Error('Match already ended.');
    if (this.playerUsed[playerCardIndex]) throw new Error('This player card has already been used.');
    const playerFearSpent = Math.max(0, Math.min(this.rules.maxFearPerDuel, this.playerFear, Math.floor(requestedFear)));
    const aiCardIndex = this.chooseAiCardIndex(playerCardIndex);
    const aiCard = this.aiTeam[aiCardIndex];
    const aiStat = this.chooseAiStat(aiCard);
    const playerBase = this.playerTeam[playerCardIndex][playerStat];
    const aiBase = aiCard[aiStat];
    const aiFearSpent = this.chooseAiFear(playerBase + playerFearSpent * this.rules.fearBonus, aiBase);
    const playerTotal = playerBase + playerFearSpent * this.rules.fearBonus;
    const aiTotal = aiBase + aiFearSpent * this.rules.fearBonus;
    const defender = this.defenderSide();
    const winner: Side = playerTotal > aiTotal ? 'player' : aiTotal > playerTotal ? 'ai' : (this.rules.defenderWinsTie ? defender : 'player');
    this.playerFear -= playerFearSpent;
    this.aiFear -= aiFearSpent;
    this.playerUsed[playerCardIndex] = true;
    this.aiUsed[aiCardIndex] = true;
    if (winner === 'player') this.playerScore += 1; else this.aiScore += 1;
    const resolvedRound = this.round++;
    return { round: resolvedRound, playerCardIndex, aiCardIndex, playerStat, aiStat, playerFearSpent, aiFearSpent, playerBase, aiBase, playerTotal, aiTotal, winner, defender, playerScore: this.playerScore, aiScore: this.aiScore, ended: this.isEnded() };
  }

  private isEnded(): boolean { return this.playerScore >= this.rules.winScore || this.aiScore >= this.rules.winScore || this.round >= this.rules.teamSize; }

  private chooseAiCardIndex(playerCardIndex: number): number {
    const player = this.playerTeam[playerCardIndex];
    const playerPower = (player.attack + player.defense) / 2;
    let best = -1, bestScore = -Infinity;
    for (const i of this.availableAiIndices()) {
      const c = this.aiTeam[i];
      const power = (c.attack + c.defense) / 2;
      const score = 24 - Math.abs(power - playerPower) + Math.max(c.attack, c.defense) * 0.35 + Math.random() * 8;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) throw new Error('AI has no card available.');
    return best;
  }

  private chooseAiStat(card: CardData): StatKey {
    if (Math.random() < 0.18) return card.attack >= card.defense ? 'defense' : 'attack';
    return card.attack >= card.defense ? 'attack' : 'defense';
  }

  private chooseAiFear(playerProjected: number, aiBase: number): number {
    const max = Math.min(this.rules.maxFearPerDuel, this.aiFear);
    if (max <= 0) return 0;
    const deficit = playerProjected - aiBase;
    if (deficit < -8) return 0;
    if (deficit <= 0) return Math.random() < 0.35 ? 1 : 0;
    return Math.min(max, Math.max(0, Math.ceil((deficit + 1) / this.rules.fearBonus)));
  }
}

export function buildMatchedAiTeam(roster: CardData[], playerTeam: CardData[], teamSize = RULES.teamSize): CardData[] {
  const target = playerTeam.reduce((sum, c) => sum + (c.attack + c.defense) / 2, 0) / playerTeam.length;
  const sorted = roster.filter(c => !playerTeam.some(p => p.id === c.id)).map(c => ({ c, d: Math.abs(((c.attack + c.defense) / 2) - target) + Math.random() * 4 })).sort((a, b) => a.d - b.d).slice(0, Math.max(teamSize * 3, teamSize));
  for (let i = sorted.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sorted[i], sorted[j]] = [sorted[j], sorted[i]]; }
  return sorted.slice(0, teamSize).map(x => x.c);
}
