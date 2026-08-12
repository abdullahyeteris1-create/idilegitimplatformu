import type { MemoryRaceLevel } from "./multiplayerConfig";

export type MemoryRacePhase =
  | "awaiting_first"
  | "awaiting_second"
  | "revealing_match"
  | "revealing_mismatch"
  | "finished"
  | "closed";

export type MemoryRaceBoardCard = {
  pairId: string;
  emoji: string;
};
export type MemoryRacePublicCard = {
  index: number;
  matched: boolean;
  revealed: boolean;
  emoji: string | null;
};

export type MemoryRaceScore = {
  playerId: string;
  score: number;
};

export type MemoryRaceSnapshot = {
  roomId: string;
  phase: MemoryRacePhase;
  level: MemoryRaceLevel;
  cardCount: number;
  cards: MemoryRacePublicCard[];
  currentPlayerId: string | null;
  scores: MemoryRaceScore[];
  matchedCount: number;
  version: number;
  phaseEndsAt: string | null;
  finished: boolean;
  winners: string[];
};
