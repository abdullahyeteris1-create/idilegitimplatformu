import { normalizeDelayMs, wordsPerMinuteToDelay } from "@/lib/exercises/timing";

export type ShadowReadingSpeedMode = "interval" | "wpm";

export type CalculateIntervalOptions = {
  mode: ShadowReadingSpeedMode;
  blockSize: number;
  intervalMs?: number;
  wordsPerMinute?: number;
  totalWords?: number;
};

export type ActiveBlockRange = {
  startIndex: number;
  endIndex: number;
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

export function calculateReadingDuration(options: CalculateIntervalOptions): number {
  const totalWords = Number.isFinite(options.totalWords) ? Math.max(0, Math.floor(options.totalWords ?? 0)) : 0;

  if (totalWords === 0) {
    return 0;
  }

  if (options.mode === "wpm") {
    const wordsPerMinute = options.wordsPerMinute ?? 150;
    const safeWordsPerMinute = Number.isFinite(wordsPerMinute)
      ? Math.max(1, Math.round(wordsPerMinute))
      : 150;

    return Math.round((totalWords / safeWordsPerMinute) * 60);
  }

  const normalizedBlockSize = Number.isFinite(options.blockSize)
    ? Math.max(1, Math.floor(options.blockSize))
    : 1;
  const totalBlocks = Math.ceil(totalWords / normalizedBlockSize);
  const intervalMs = calculateIntervalMs(options);

  return Math.round((totalBlocks * intervalMs) / 1000);
}

export function calculateCharacterCount(text: string): number {
  return text.replace(/\s+/g, "").length;
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function getActiveBlockRange(currentBlockIndex: number, blockSize: number): ActiveBlockRange {
  const safeBlockIndex = Number.isFinite(currentBlockIndex) ? Math.max(0, Math.floor(currentBlockIndex)) : 0;
  const safeBlockSize = Number.isFinite(blockSize) ? Math.max(1, Math.floor(blockSize)) : 1;
  const startIndex = safeBlockIndex * safeBlockSize;

  return {
    startIndex,
    endIndex: startIndex + safeBlockSize - 1,
  };
}
