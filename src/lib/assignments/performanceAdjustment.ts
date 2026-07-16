import type { AssignmentSettings } from "@/lib/assignments/assignmentTypes";

const MIN_SUCCESS_FOR_REDUCE = 75;
const MIN_SUCCESS_FOR_STRONG_REDUCE = 60;
const MAX_SUCCESS_FOR_INCREASE = 90;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getAdjustmentFactorBySuccessRate(averageSuccessRate: number): number {
  if (averageSuccessRate >= MAX_SUCCESS_FOR_INCREASE) {
    return 1.1;
  }

  if (averageSuccessRate >= MIN_SUCCESS_FOR_REDUCE) {
    return 1;
  }

  if (averageSuccessRate >= MIN_SUCCESS_FOR_STRONG_REDUCE) {
    return 0.92;
  }

  return 0.85;
}

export function adjustSpeedMs(speedMs: number, factor: number): number {
  if (!Number.isFinite(speedMs) || speedMs <= 0) {
    return speedMs;
  }

  if (factor > 1) {
    return Math.max(80, Math.round(speedMs * 0.9));
  }

  if (factor < 1) {
    return Math.round(speedMs * (1 + (1 - factor)));
  }

  return speedMs;
}

export function adjustWordsPerMinute(wordsPerMinute: number, factor: number): number {
  if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) {
    return wordsPerMinute;
  }

  return Math.max(20, Math.round(wordsPerMinute * factor));
}

export function adjustLevel(level: number, factor: number, maxLevel = 5): number {
  if (!Number.isFinite(level) || level <= 0) {
    return 1;
  }

  if (factor > 1) {
    return clamp(level + 1, 1, maxLevel);
  }

  if (factor < 1) {
    return clamp(level - 1, 1, maxLevel);
  }

  return clamp(level, 1, maxLevel);
}

export function calculateAverageSuccessRate(results: Array<{ success_rate?: number | null; successRate?: number | null }>): number | null {
  const values = results
    .map((item) => item.success_rate ?? item.successRate ?? null)
    .filter((item): item is number => typeof item === "number" && Number.isFinite(item));

  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function applyPerformanceAdjustment(
  settings: AssignmentSettings,
  averageSuccessRate: number | null,
  maxLevel = 5,
): AssignmentSettings {
  if (averageSuccessRate === null) {
    return settings;
  }

  const factor = getAdjustmentFactorBySuccessRate(averageSuccessRate);
  const next = { ...settings };

  if (typeof next.speedMs === "number") {
    next.speedMs = adjustSpeedMs(next.speedMs, factor);
  }

  if (typeof next.wordsPerMinute === "number") {
    next.wordsPerMinute = adjustWordsPerMinute(next.wordsPerMinute, factor);
  }

  if (typeof next.level === "number") {
    next.level = adjustLevel(next.level, factor, maxLevel);
  }

  if (typeof next.targetSuccessRate === "number" && averageSuccessRate < MIN_SUCCESS_FOR_REDUCE) {
    next.targetSuccessRate = Math.max(next.targetSuccessRate, MIN_SUCCESS_FOR_REDUCE);
  }

  return next;
}
