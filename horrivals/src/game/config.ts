import type { BattleRules } from './types';

export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;
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
  handCardHeight: 168,
  aiBackHeight: 128,
  duelCardHeight: 390,
  duelCardGap: 76,
  maxPersistentHudCoverage: 0.14,
};
