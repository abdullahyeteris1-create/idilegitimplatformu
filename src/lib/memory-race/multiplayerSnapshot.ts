import { isMemoryRaceLevel } from "./multiplayerConfig";
import type { MemoryRaceBoardCard, MemoryRacePhase, MemoryRaceSnapshot } from "./multiplayerTypes";

export type MemoryRaceSnapshotRow = {
  room_id: string;
  level: number;
  board: unknown;
  phase: MemoryRacePhase;
  current_player_id: string | null;
  first_card_index: number | null;
  second_card_index: number | null;
  matched_card_indices: number[] | null;
  scores: Record<string, number> | null;
  version: number;
  phase_ends_at: string | null;
};

function parseBoard(value: unknown): MemoryRaceBoardCard[] {
  if (!Array.isArray(value)) throw new Error("invalid_memory_race_board");
  const board = value.filter((card): card is MemoryRaceBoardCard => {
    if (!card || typeof card !== "object") return false;
    const candidate = card as Partial<MemoryRaceBoardCard>;
    return typeof candidate.pairId === "string" && typeof candidate.emoji === "string";
  });
  if (board.length !== value.length) throw new Error("invalid_memory_race_board");
  return board;
}

export function buildMemoryRaceSnapshot(
  game: MemoryRaceSnapshotRow,
  playerIds: string[],
  eligibleWinnerIds: string[] = playerIds,
): MemoryRaceSnapshot {
  if (!isMemoryRaceLevel(game.level)) throw new Error("invalid_memory_race_level");
  const board = parseBoard(game.board);
  const matched = new Set((game.matched_card_indices ?? []).map(Number));
  const visible = new Set<number>(matched);
  if (game.first_card_index !== null) visible.add(Number(game.first_card_index));
  if (game.second_card_index !== null) visible.add(Number(game.second_card_index));

  const scores = playerIds.map((playerId) => ({
    playerId,
    score: Math.max(0, Number(game.scores?.[playerId] ?? 0)),
  }));
  const finished = game.phase === "finished" || game.phase === "closed";
  const eligibleScores = scores.filter((entry) => eligibleWinnerIds.includes(entry.playerId));
  const topScore = game.phase === "finished" && eligibleScores.length ? Math.max(...eligibleScores.map((entry) => entry.score)) : null;

  return {
    roomId: game.room_id,
    phase: game.phase,
    level: game.level,
    cardCount: board.length,
    cards: board.map((card, index) => ({
      index,
      matched: matched.has(index),
      revealed: visible.has(index),
      emoji: visible.has(index) ? card.emoji : null,
    })),
    currentPlayerId: game.current_player_id,
    scores,
    matchedCount: matched.size,
    version: Number(game.version),
    phaseEndsAt: game.phase_ends_at,
    finished,
    winners: topScore === null ? [] : eligibleScores.filter((entry) => entry.score === topScore).map((entry) => entry.playerId),
  };
}
