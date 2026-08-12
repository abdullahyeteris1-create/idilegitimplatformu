import { randomInt } from "node:crypto";
import type { MemoryRaceBoardCard } from "./multiplayerTypes";

export const MEMORY_RACE_GAME_TYPE = "memory-race";

export const MEMORY_RACE_LEVELS = {
  1: { cards: 16, pairs: 8, emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼"] },
  2: { cards: 20, pairs: 10, emojis: ["🍎", "🍋", "🍇", "🍊", "🍓", "🍒", "🥝", "🍑", "🍌", "🫐"] },
  3: { cards: 24, pairs: 12, emojis: ["⚽", "🏀", "🎾", "🏈", "⚾", "🎱", "🏐", "🏉", "🎿", "⛷️", "🏒", "🥊"] },
  4: { cards: 32, pairs: 16, emojis: ["🦁", "🐯", "🐻‍❄️", "🐺", "🦊", "🐗", "🦬", "🦣", "🐘", "🦒", "🐴", "🦧", "🐮", "🦬", "🐑", "🐐"] },
  5: { cards: 40, pairs: 20, emojis: ["🌹", "🌻", "🌺", "🌸", "💐", "🌷", "🪻", "🌼", "🏵️", "🪷", "🌿", "🍀", "🍁", "🍂", "🍃", "🌾", "🪴", "🌵", "🎄", "🪹"] },
  6: { cards: 60, pairs: 30, emojis: ["🐶", "🐱", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐸", "🐵", "🐙", "🦄", "🐝", "🦋", "🌈", "⭐", "🌙", "☀️", "🍎", "🍋", "🍉", "🍇", "🍓", "⚽", "🏀", "🎯", "🚀", "🎸", "💎", "🔥"] },
} as const;

export type MemoryRaceLevel = keyof typeof MEMORY_RACE_LEVELS;

export function isMemoryRaceLevel(value: unknown): value is MemoryRaceLevel {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 6;
}

export function createMemoryRaceBoard(level: MemoryRaceLevel): MemoryRaceBoardCard[] {
  const config = MEMORY_RACE_LEVELS[level];
  const board = config.emojis.flatMap((emoji, pairIndex) => {
    const pairId = `pair-${pairIndex + 1}`;
    return [{ pairId, emoji }, { pairId, emoji }];
  });

  for (let index = board.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    [board[index], board[target]] = [board[target], board[index]];
  }
  return board;
}

export function isValidMemoryRaceBoard(level: MemoryRaceLevel, board: MemoryRaceBoardCard[]): boolean {
  const config = MEMORY_RACE_LEVELS[level];
  if (board.length !== config.cards) return false;

  const pairs = new Map<string, { count: number; emoji: string }>();
  for (const card of board) {
    if (!card.pairId || !card.emoji) return false;
    const current = pairs.get(card.pairId);
    if (!current) {
      pairs.set(card.pairId, { count: 1, emoji: card.emoji });
    } else {
      if (current.emoji !== card.emoji || current.count >= 2) return false;
      current.count += 1;
    }
  }

  return pairs.size === config.pairs && [...pairs.values()].every((pair) => pair.count === 2);
}
