export type StatKey = 'attack' | 'defense';
export type Side = 'player' | 'ai';
export type Role = 'attacker' | 'defender';

export interface CardData {
  id: string;
  name: string;
  universe: string;
  attack: number;
  defense: number;
  threat: number;
  art?: string;
}

export interface BattleRules {
  teamSize: number;
  winScore: number;
  startingFear: number;
  maxFearPerDuel: number;
  fearBonus: number;
  defenderWinsTie: boolean;
}

export interface RoundResolution {
  round: number;
  playerCardIndex: number;
  aiCardIndex: number;
  playerStat: StatKey;
  aiStat: StatKey;
  playerFearSpent: number;
  aiFearSpent: number;
  playerBase: number;
  aiBase: number;
  playerTotal: number;
  aiTotal: number;
  winner: Side;
  defender: Side;
  playerScore: number;
  aiScore: number;
  ended: boolean;
}
