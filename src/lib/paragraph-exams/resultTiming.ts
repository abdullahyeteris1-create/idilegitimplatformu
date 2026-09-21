export type ResultTiming = {
  durationSeconds: number | null;
  totalQuestions: number;
  averageSecondsPerQuestion: number | null;
};

function isNonNegativeFinite(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}

export function deriveResultTiming(durationSeconds: number | null, totalQuestions: number): ResultTiming {
  const safeDuration = isNonNegativeFinite(durationSeconds) ? durationSeconds : null;
  const safeQuestionCount = Number.isFinite(totalQuestions) && totalQuestions > 0 ? Math.floor(totalQuestions) : 0;

  return {
    durationSeconds: safeDuration,
    totalQuestions: safeQuestionCount,
    averageSecondsPerQuestion: safeDuration !== null && safeQuestionCount > 0 ? safeDuration / safeQuestionCount : null,
  };
}

export function formatDuration(seconds: number | null): string {
  if (!isNonNegativeFinite(seconds)) return "—";

  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainingSeconds = wholeSeconds % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} sa`);
  if (minutes > 0) parts.push(`${minutes} dk`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds} sn`);
  return parts.join(" ");
}

export function formatAverageSecondsPerQuestion(seconds: number | null): string {
  if (!isNonNegativeFinite(seconds)) return "—";
  if (seconds >= 60) return formatDuration(Math.round(seconds));

  const rounded = Math.round(seconds * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1).replace(".", ",")} sn`;
}
