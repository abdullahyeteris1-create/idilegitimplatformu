import type { ExerciseResult } from "@/lib/results/types";

export const READING_TEST_TYPES = ["reading-speed-test", "reading-comprehension"] as const;

export type ReadingTestType = (typeof READING_TEST_TYPES)[number];

export type NormalizedReadingTestResult = {
  id: string;
  type: ReadingTestType;
  title: string;
  completedAt: string | null;
  timestamp: number | null;
  durationSeconds: number | null;
  readingSpeedWpm: number | null;
  successRate: number | null;
  correctCount: number | null;
  wrongCount: number | null;
  emptyCount: number | null;
  questionCount: number | null;
  wordCount: number | null;
  category: string | null;
  readingLevel: string | null;
  pausedCount: number | null;
  totalPausedSeconds: number | null;
  source: ExerciseResult;
};

export type ReadingTestSummary = {
  latestSpeedWpm: number | null;
  highestSpeedWpm: number | null;
  latestComprehensionRate: number | null;
  totalTests: number;
};

export type ReadingTestStatistics = {
  recordsNewestFirst: NormalizedReadingTestResult[];
  recordsChronological: NormalizedReadingTestResult[];
  speedPoints: NormalizedReadingTestResult[];
  comprehensionPoints: NormalizedReadingTestResult[];
  summary: ReadingTestSummary;
};

function isReadingTestType(value: ExerciseResult["exerciseType"]): value is ReadingTestType {
  return value === "reading-speed-test" || value === "reading-comprehension";
}

function readString(details: Record<string, unknown>, key: string): string | null {
  const value = details[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readPositiveNumber(value: unknown): number | null {
  const number = readFiniteNumber(value);
  return number !== null && number > 0 ? number : null;
}

function readNonNegativeNumber(value: unknown): number | null {
  const number = readFiniteNumber(value);
  return number !== null && number >= 0 ? number : null;
}

function readPercentage(value: unknown): number | null {
  const number = readFiniteNumber(value);
  return number !== null && number >= 0 && number <= 100 ? number : null;
}

function firstValue<T>(...values: Array<T | null>): T | null {
  return values.find((value): value is T => value !== null) ?? null;
}

function normalizeCompletedAt(result: ExerciseResult, details: Record<string, unknown>): {
  completedAt: string | null;
  timestamp: number | null;
} {
  const candidates = [result.date, readString(details, "completedAt")];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const timestamp = new Date(candidate).getTime();
    if (Number.isFinite(timestamp)) return { completedAt: candidate, timestamp };
  }
  return { completedAt: null, timestamp: null };
}

export function filterReadingTestResults(results: ExerciseResult[]): ExerciseResult[] {
  return results.filter((result) => isReadingTestType(result.exerciseType));
}

export function normalizeReadingTestResult(result: ExerciseResult): NormalizedReadingTestResult | null {
  if (!isReadingTestType(result.exerciseType)) return null;

  const details = result.details ?? {};
  const date = normalizeCompletedAt(result, details);
  const isComprehension = result.exerciseType === "reading-comprehension";
  const durationSeconds = firstValue(
    readPositiveNumber(result.durationSeconds),
    readPositiveNumber(details.durationSeconds),
    readPositiveNumber(details.readingDurationSeconds),
    readPositiveNumber(details.activeReadingSeconds),
  );

  return {
    id: result.id,
    type: result.exerciseType,
    title: readString(details, "textTitle") ?? result.exerciseTitle,
    completedAt: date.completedAt,
    timestamp: date.timestamp,
    durationSeconds,
    readingSpeedWpm: readPositiveNumber(details.readingSpeedWpm),
    successRate: isComprehension
      ? firstValue(readPercentage(result.successRate), readPercentage(details.comprehensionScore))
      : null,
    correctCount: isComprehension
      ? firstValue(readNonNegativeNumber(result.correctCount), readNonNegativeNumber(details.correctAnswers))
      : null,
    wrongCount: isComprehension
      ? firstValue(readNonNegativeNumber(result.wrongCount), readNonNegativeNumber(details.wrongAnswers))
      : null,
    emptyCount: isComprehension ? readNonNegativeNumber(details.emptyAnswers) : null,
    questionCount: isComprehension ? readNonNegativeNumber(details.totalQuestions) : null,
    wordCount: firstValue(readPositiveNumber(details.wordCount), readPositiveNumber(details.totalWords)),
    category: readString(details, "category"),
    readingLevel: readString(details, "readingLevel"),
    pausedCount: readNonNegativeNumber(details.pausedCount),
    totalPausedSeconds: readNonNegativeNumber(details.totalPausedSeconds),
    source: result,
  };
}

function sortNewestFirst(records: NormalizedReadingTestResult[]): NormalizedReadingTestResult[] {
  return [...records].sort((left, right) => {
    if (left.timestamp === null && right.timestamp === null) return 0;
    if (left.timestamp === null) return 1;
    if (right.timestamp === null) return -1;
    return right.timestamp - left.timestamp;
  });
}

export function createReadingTestStatistics(results: ExerciseResult[], limit = 10): ReadingTestStatistics {
  const allRecords = sortNewestFirst(
    filterReadingTestResults(results)
      .map(normalizeReadingTestResult)
      .filter((record): record is NormalizedReadingTestResult => record !== null),
  );
  const recordsNewestFirst = allRecords.slice(0, Math.max(0, limit));
  const recordsChronological = [...recordsNewestFirst].reverse();
  const speedTests = allRecords.filter((record) => record.type === "reading-speed-test");
  const latestSpeed = speedTests[0];
  const speedValues = speedTests.flatMap((record) =>
    record.readingSpeedWpm === null ? [] : [record.readingSpeedWpm],
  );
  const latestComprehension = allRecords.find((record) => record.type === "reading-comprehension");

  return {
    recordsNewestFirst,
    recordsChronological,
    speedPoints: recordsChronological.filter(
      (record) => record.timestamp !== null && record.readingSpeedWpm !== null,
    ),
    comprehensionPoints: recordsChronological.filter(
      (record) => record.timestamp !== null && record.type === "reading-comprehension" && record.successRate !== null,
    ),
    summary: {
      latestSpeedWpm: latestSpeed?.readingSpeedWpm ?? null,
      highestSpeedWpm: speedValues.length ? Math.max(...speedValues) : null,
      latestComprehensionRate: latestComprehension?.successRate ?? null,
      totalTests: allRecords.length,
    },
  };
}
