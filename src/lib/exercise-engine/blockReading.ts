import { normalizeDelayMs, normalizeReadingSpeed, wordsPerMinuteToDelay } from "@/lib/exercises/timing";

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
  const safeWordsPerMinute = normalizeReadingSpeed(wordsPerMinute, 150, 1);
  return wordsPerMinuteToDelay(safeWordsPerMinute, normalizedBlockSize);
}

// Egitim Programi coklu-metin sure modeli icin saf (side-effect'siz) yardimci
// fonksiyonlar. Toplam aktif sure = onceki metinlerde biriken sure +
// su anki metinde gecen sure; bu deger yalniz "phase === running && !paused"
// iken artan mevcut elapsedSeconds sayacindan turetilir (Date.now() farki
// KULLANILMAZ, cunku o fark pause suresini de icerir).
export function calculateTotalActiveSeconds(
  cumulativeActiveSeconds: number,
  currentTextActiveSeconds: number,
): number {
  return Math.max(0, cumulativeActiveSeconds) + Math.max(0, currentTextActiveSeconds);
}

export function calculateRemainingActiveSeconds(
  assignedDurationSeconds: number,
  cumulativeActiveSeconds: number,
  currentTextActiveSeconds: number,
): number {
  if (!Number.isFinite(assignedDurationSeconds)) {
    return Number.POSITIVE_INFINITY;
  }

  const totalActiveSeconds = calculateTotalActiveSeconds(cumulativeActiveSeconds, currentTextActiveSeconds);
  return Math.max(assignedDurationSeconds - totalActiveSeconds, 0);
}

export function hasReachedAssignedDuration(
  assignedDurationSeconds: number,
  cumulativeActiveSeconds: number,
  currentTextActiveSeconds: number,
): boolean {
  if (!Number.isFinite(assignedDurationSeconds)) {
    return false;
  }

  return (
    calculateTotalActiveSeconds(cumulativeActiveSeconds, currentTextActiveSeconds) >= assignedDurationSeconds
  );
}

