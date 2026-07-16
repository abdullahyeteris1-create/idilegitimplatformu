export const MIN_EXERCISE_DELAY_MS = 50;
export const MAX_EXERCISE_DELAY_MS = 60_000;


export const MIN_READING_SPEED = 1;
export const MAX_READING_SPEED = Number.MAX_SAFE_INTEGER;

type NormalizeOptions = {
  min?: number;
  max?: number;
};

export function normalizePositiveNumber(
  value: unknown,
  fallback: number,
  options: NormalizeOptions = {},
): number {
  const numericValue = Number(value);
  const numericFallback = Number(fallback);
  const safeFallback = Number.isFinite(numericFallback) && numericFallback > 0 ? numericFallback : 1;
  const min = options.min ?? Number.MIN_VALUE;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  const candidate = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : safeFallback;

  return Math.min(max, Math.max(min, candidate));
}

export function normalizeReadingSpeed(
  value: unknown,
  fallback = 150,
  min = MIN_READING_SPEED,
  max = MAX_READING_SPEED,
): number {
  return Math.round(normalizePositiveNumber(value, fallback, { min, max }));
}

export function normalizeDelayMs(
  value: unknown,
  fallback = 1_000,
  min = MIN_EXERCISE_DELAY_MS,
  max = MAX_EXERCISE_DELAY_MS,
): number {
  return Math.round(normalizePositiveNumber(value, fallback, { min, max }));
}

export function wordsPerMinuteToDelay(
  wordsPerMinute: unknown,
  wordCount: unknown = 1,
): number {
  const safeWordsPerMinute = normalizeReadingSpeed(wordsPerMinute, 150, 1);
  const safeWordCount = normalizePositiveNumber(wordCount, 1, { min: 1, max: 10_000 });

  return Math.max(1, Math.round((60_000 * safeWordCount) / safeWordsPerMinute));
}

