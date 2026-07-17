import { normalizeDelayMs, normalizeReadingSpeed, wordsPerMinuteToDelay } from "@/lib/exercises/timing";

export type FocusedReadingSpeedMode = "interval" | "wpm";

export type CalculateFocusedReadingOptions = {
  mode: FocusedReadingSpeedMode;
  groupSize: number;
  intervalMs?: number;
  wordsPerMinute?: number;
  totalWords?: number;
};

export function splitTextIntoWords(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

export function createWordGroups(words: string[], groupSize: number): string[] {
  const normalizedGroupSize = Number.isFinite(groupSize) ? Math.max(1, Math.floor(groupSize)) : 1;
  const groups: string[] = [];

  for (let index = 0; index < words.length; index += normalizedGroupSize) {
    groups.push(words.slice(index, index + normalizedGroupSize).join(" "));
  }

  return groups;
}

export function calculateIntervalMs(options: CalculateFocusedReadingOptions): number {
  const normalizedGroupSize = Number.isFinite(options.groupSize)
    ? Math.max(1, Math.floor(options.groupSize))
    : 1;

  if (options.mode === "interval") {
    return normalizeDelayMs(options.intervalMs, 500);
  }

  const wordsPerMinute = options.wordsPerMinute ?? 200;
  const safeWordsPerMinute = normalizeReadingSpeed(wordsPerMinute, 200, 1);

  return wordsPerMinuteToDelay(safeWordsPerMinute, normalizedGroupSize);
}

export function calculateReadingDuration(options: CalculateFocusedReadingOptions): number {
  const totalWords = Number.isFinite(options.totalWords) ? Math.max(0, Math.floor(options.totalWords ?? 0)) : 0;

  if (totalWords === 0) {
    return 0;
  }

  if (options.mode === "wpm") {
    const wordsPerMinute = options.wordsPerMinute ?? 200;
    const safeWordsPerMinute = normalizeReadingSpeed(wordsPerMinute, 200, 1);

    return Math.round((totalWords / safeWordsPerMinute) * 60);
  }

  const normalizedGroupSize = Number.isFinite(options.groupSize)
    ? Math.max(1, Math.floor(options.groupSize))
    : 1;
  const totalGroups = Math.ceil(totalWords / normalizedGroupSize);
  const intervalMs = calculateIntervalMs(options);

  return Math.round((totalGroups * intervalMs) / 1000);
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

