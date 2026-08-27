import type { BattleRules } from './types';

// HORRIVALS is designed first for modern Android landscape screens.
// 1536x709 matches the validated Samsung viewport and the illustrated arena ratio.
export const DESIGN_WIDTH = 1536;
export const DESIGN_HEIGHT = 709;
export const CARD_RATIO = 2 / 3;

export const RULES: BattleRules = {
  teamSize: 5,
  winScore: 3,
  startingFear: 10,
  maxFearPerDuel: 3,
  fearBonus: 4,
  defenderWinsTie: true,
};

export const UI = {
  handCardHeight: 138,
  aiBackHeight: 108,
  duelCardHeight: 420,
  duelCardGap: 64,
  maxPersistentHudCoverage: 0.11,
};
