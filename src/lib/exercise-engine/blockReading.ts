import { normalizeDelayMs, wordsPerMinuteToDelay } from "@/lib/exercises/timing";

export type BlockReadingSpeedMode = "interval" | "wpm";

export type CalculateIntervalOptions = {
  mode: BlockReadingSpeedMode;
  blockSize: number;
  intervalMs?: number;
  wordsPerMinute?: number;
};

export function splitTextIntoWords(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

export function createWordBlocks(words: string[], blockSize: number): string[] {
  const normalizedBlockSize = Number.isFinite(blockSize) ? Math.max(1, Math.floor(blockSize)) : 1;
  const blocks: string[] = [];

  for (let index = 0; index < words.length; index += normalizedBlockSize) {
    blocks.push(words.slice(index, index + normalizedBlockSize).join(" "));
  }

  return blocks;
}

export function calculateIntervalMs(options: CalculateIntervalOptions): number {
  const normalizedBlockSize = Number.isFinite(options.blockSize)
    ? Math.max(1, Math.floor(options.blockSize))
    : 1;

  if (options.mode === "interval") {
    return normalizeDelayMs(options.intervalMs, 1000);
  }

  const wordsPerMinute = options.wordsPerMinute ?? 150;
  const safeWordsPerMinute = Number.isFinite(wordsPerMinute)
    ? Math.max(1, Math.round(wordsPerMinute))
    : 150;

  return wordsPerMinuteToDelay(safeWordsPerMinute, normalizedBlockSize);
}
