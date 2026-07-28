import type { ExerciseResult } from "@/lib/results/types";
import type {
  TeacherStudentPerformanceHistory,
  TeacherStudentPerformanceHistoryItem,
  TeacherStudentPerformanceMetricSummary,
  TeacherStudentPerformanceTrendDirection,
  TeacherStudentProgramContext,
  TeacherStudentProgramTaskProgress,
} from "./studentTrackingTypes";

type DatabaseRow = Record<string, unknown>;

export type TeacherStudentXpEventRow = {
  idempotency_key: string;
  xp_amount: number;
  event_type: string;
  source_type: string | null;
  source_id: string | null;
  earned_at: string | null;
};

export type TeacherStudentPerformanceHistoryInput = {
  results: readonly ExerciseResult[];
  activeProgram: TeacherStudentProgramContext | null;
  programTasks: readonly TeacherStudentProgramTaskProgress[];
  xpEvents: readonly TeacherStudentXpEventRow[];
  analysisLimit?: number;
};

export type TeacherStudentPerformanceHistoryResult = {
  performanceHistory: TeacherStudentPerformanceHistory;
  performanceHistoryError: string | null;
};

const DEFAULT_ANALYSIS_LIMIT = 100;
const RECENT_RESULT_LIMIT = 5;
const PERFORMANCE_HISTORY_ERROR_MESSAGE = "Performans geçmişi şu anda yüklenemiyor.";

type PerformanceMetric = "reading" | "comprehension";

type PerformanceEntry = TeacherStudentPerformanceHistoryItem & {
  metric: PerformanceMetric;
  dedupeKey: string;
  timestamp: number | null;
  sortKey: string;
};

function readString(row: DatabaseRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return null;
}

function readNumber(row: DatabaseRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function readPositiveNumber(row: DatabaseRow, keys: string[]): number | null {
  const value = readNumber(row, keys);
  return value !== null && value > 0 ? value : null;
}

function readNonNegativeNumber(row: DatabaseRow, keys: string[]): number | null {
  const value = readNumber(row, keys);
  return value !== null && value >= 0 ? value : null;
}

function normalizeTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatSourceLabel(result: ExerciseResult): string {
  const details = (result.details ?? {}) as DatabaseRow;
  return readString(details, ["textTitle", "title", "sourceTitle"]) ?? result.exerciseTitle ?? "Okuma sonucu";
}

function formatResultDate(result: ExerciseResult): string | null {
  const details = (result.details ?? {}) as DatabaseRow;
  const candidates = [
    result.date,
    result.createdAt ?? null,
    readString(details, ["completedAt", "createdAt", "occurredAt"]),
  ];

  for (const candidate of candidates) {
    const timestamp = normalizeTimestamp(candidate);
    if (timestamp !== null) {
      return new Date(timestamp).toISOString();
    }
  }

  return null;
}

function formatResultTimestamp(result: ExerciseResult): number | null {
  const details = (result.details ?? {}) as DatabaseRow;
  const candidates = [
    result.date,
    result.createdAt ?? null,
    readString(details, ["completedAt", "createdAt", "occurredAt"]),
  ];

  for (const candidate of candidates) {
    const timestamp = normalizeTimestamp(candidate);
    if (timestamp !== null) {
      return timestamp;
    }
  }

  return null;
}

function normalizeReadingSpeedValue(result: ExerciseResult): number | null {
  if (result.exerciseType !== "reading-speed-test" && result.exerciseType !== "reading-comprehension") {
    return null;
  }

  const details = (result.details ?? {}) as DatabaseRow;
  const speed = readPositiveNumber(details, ["readingSpeedWpm", "wordsPerMinute"]);
  return speed !== null ? speed : null;
}

function normalizeComprehensionValue(result: ExerciseResult): number | null {
  if (result.exerciseType !== "reading-comprehension") {
    return null;
  }

  const details = (result.details ?? {}) as DatabaseRow;
  const raw = readNumber(details, ["comprehensionScore", "successRate"]);
  const fallback = Number.isFinite(result.successRate) ? result.successRate : null;
  const value = raw ?? fallback;

  if (value === null || !Number.isFinite(value) || value < 0) {
    return null;
  }

  const normalized = value <= 1 ? value * 100 : value;
  return normalized >= 0 && normalized <= 100 ? normalized : null;
}

function normalizeDurationSeconds(result: ExerciseResult): number | null {
  const details = (result.details ?? {}) as DatabaseRow;
  return readPositiveNumber(details, ["durationSeconds", "readingDurationSeconds", "activeReadingSeconds"]) ??
    (Number.isFinite(result.durationSeconds) && result.durationSeconds > 0 ? result.durationSeconds : null);
}

function buildProgramTaskLookup(programTasks: readonly TeacherStudentProgramTaskProgress[]): {
  byTaskId: Map<string, TeacherStudentProgramTaskProgress>;
  byResultId: Map<string, TeacherStudentProgramTaskProgress>;
} {
  const byTaskId = new Map<string, TeacherStudentProgramTaskProgress>();
  const byResultId = new Map<string, TeacherStudentProgramTaskProgress>();

  for (const task of programTasks) {
    byTaskId.set(task.taskId, task);
    if (task.resultId) {
      byResultId.set(task.resultId, task);
    }
  }

  return { byTaskId, byResultId };
}

function buildXpLookup(xpEvents: readonly TeacherStudentXpEventRow[]): Map<string, number> {
  const lookup = new Map<string, number>();

  for (const event of xpEvents) {
    if (!event.idempotency_key || !Number.isFinite(event.xp_amount)) {
      continue;
    }

    lookup.set(event.idempotency_key, event.xp_amount);
  }

  return lookup;
}

function resolveProgramContext(
  result: ExerciseResult,
  activeProgram: TeacherStudentProgramContext | null,
  taskById: Map<string, TeacherStudentProgramTaskProgress>,
  taskByResultId: Map<string, TeacherStudentProgramTaskProgress>,
): { programName: string | null; programTaskName: string | null; sourceId: string | null } {
  const taskId = typeof result.programTaskId === "string" ? result.programTaskId.trim() : "";
  const matchedTask = taskId
    ? taskById.get(taskId) ?? null
    : result.id
      ? taskByResultId.get(result.id) ?? null
      : null;

  if (!matchedTask) {
    return {
      programName: null,
      programTaskName: null,
      sourceId: taskId || result.id || null,
    };
  }

  return {
    programName:
      activeProgram && matchedTask.programId === activeProgram.id ? activeProgram.visibleName : null,
    programTaskName: matchedTask.exerciseTitle,
    sourceId: matchedTask.resultId ?? matchedTask.taskId,
  };
}

function resolveAwardedXp(
  result: ExerciseResult,
  xpLookup: Map<string, number>,
): number | null {
  const submissionKey = typeof result.submissionKey === "string" ? result.submissionKey.trim() : "";
  const candidates = submissionKey ? [`result:${submissionKey}`, `result:${result.id}`] : [`result:${result.id}`];

  for (const key of candidates) {
    const value = xpLookup.get(key);
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function toMetricEntry(
  result: ExerciseResult,
  metric: PerformanceMetric,
  value: number,
  activeProgram: TeacherStudentProgramContext | null,
  taskLookups: ReturnType<typeof buildProgramTaskLookup>,
  xpLookup: Map<string, number>,
): PerformanceEntry {
  const details = (result.details ?? {}) as DatabaseRow;
  const sourceLabel = formatSourceLabel(result);
  const occurredAt = formatResultDate(result);
  const timestamp = formatResultTimestamp(result);
  const context = resolveProgramContext(result, activeProgram, taskLookups.byTaskId, taskLookups.byResultId);
  const submissionKey = typeof result.submissionKey === "string" && result.submissionKey.trim()
    ? result.submissionKey.trim()
    : null;
  const durationSeconds = normalizeDurationSeconds(result);
  const correctCount = metric === "comprehension" ? readNonNegativeNumber(result as DatabaseRow, ["correctCount"]) ?? readNonNegativeNumber(details, ["correctAnswers"]) : null;
  const wrongCount = metric === "comprehension" ? readNonNegativeNumber(result as DatabaseRow, ["wrongCount"]) ?? readNonNegativeNumber(details, ["wrongAnswers"]) : null;
  const netCount = metric === "comprehension" && correctCount !== null && wrongCount !== null ? correctCount - wrongCount : null;

  const baseId = `${metric}:${submissionKey ?? result.id}`;

  return {
    id: baseId,
    metric,
    dedupeKey: baseId,
    timestamp,
    sortKey: `${timestamp ?? 0}:${result.id}`,
    occurredAt,
    title: result.exerciseTitle,
    sourceLabel,
    sourceType: result.exerciseType,
    sourceId: context.sourceId,
    submissionKey,
    value,
    correctCount,
    wrongCount,
    netCount,
    durationSeconds,
    programName: context.programName,
    programTaskName: context.programTaskName,
    awardedXp: resolveAwardedXp(result, xpLookup),
  };
}

function compareEntries(left: PerformanceEntry, right: PerformanceEntry): number {
  if (left.timestamp === null && right.timestamp === null) {
    return right.sortKey.localeCompare(left.sortKey);
  }

  if (left.timestamp === null) {
    return 1;
  }

  if (right.timestamp === null) {
    return -1;
  }

  if (left.timestamp !== right.timestamp) {
    return right.timestamp - left.timestamp;
  }

  return right.sortKey.localeCompare(left.sortKey);
}

function pickBetterEntry(existing: PerformanceEntry, next: PerformanceEntry): PerformanceEntry {
  if (existing.timestamp === null && next.timestamp !== null) {
    return next;
  }

  if (existing.timestamp !== null && next.timestamp !== null && next.timestamp > existing.timestamp) {
    return next;
  }

  if (existing.timestamp !== null && next.timestamp !== null && next.timestamp < existing.timestamp) {
    return existing;
  }

  if (next.sortKey.localeCompare(existing.sortKey) > 0) {
    return next;
  }

  return existing;
}

function dedupeEntries(entries: readonly PerformanceEntry[]): PerformanceEntry[] {
  const deduped = new Map<string, PerformanceEntry>();

  for (const entry of entries) {
    const existing = deduped.get(entry.dedupeKey);
    if (!existing) {
      deduped.set(entry.dedupeKey, entry);
      continue;
    }

    deduped.set(entry.dedupeKey, pickBetterEntry(existing, entry));
  }

  return Array.from(deduped.values()).sort(compareEntries);
}

function roundToPrecision(value: number, precision = 1): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function buildMetricSummary(entries: readonly PerformanceEntry[]): TeacherStudentPerformanceMetricSummary {
  const values = entries.map((entry) => entry.value).filter((value): value is number => Number.isFinite(value));
  const latestValue = entries[0]?.value ?? null;
  const previousValue = entries[1]?.value ?? null;
  const highestValue = values.length > 0 ? Math.max(...values) : null;
  const averageValue = values.length > 0 ? roundToPrecision(values.reduce((sum, value) => sum + value, 0) / values.length) : null;

  let changeValue: number | null = null;
  let changePercent: number | null = null;
  let trendDirection: TeacherStudentPerformanceTrendDirection = "unavailable";

  if (latestValue !== null && previousValue !== null) {
    changeValue = roundToPrecision(latestValue - previousValue);
    if (previousValue > 0) {
      changePercent = roundToPrecision((changeValue / previousValue) * 100);
    }

    trendDirection =
      Math.round(latestValue) === Math.round(previousValue)
        ? "stable"
        : latestValue > previousValue
          ? "up"
          : "down";
  }

  return {
    latestValue,
    highestValue,
    averageValue,
    previousValue,
    changeValue,
    changePercent,
    trendDirection,
    totalResultCount: entries.length,
    recentResults: entries.slice(0, RECENT_RESULT_LIMIT).map((entry) => {
      const { metric, dedupeKey, timestamp, sortKey, ...item } = entry;
      void metric;
      void dedupeKey;
      void timestamp;
      void sortKey;
      return item;
    }),
  };
}

function buildEntries(input: TeacherStudentPerformanceHistoryInput): PerformanceEntry[] {
  const taskLookups = buildProgramTaskLookup(input.programTasks);
  const xpLookup = buildXpLookup(input.xpEvents);
  const entries: PerformanceEntry[] = [];

  for (const result of input.results) {
    if (result.exerciseType !== "reading-speed-test" && result.exerciseType !== "reading-comprehension") {
      continue;
    }

    const occurredAt = formatResultTimestamp(result);
    if (occurredAt === null) {
      continue;
    }

    const speedValue = normalizeReadingSpeedValue(result);
    if (speedValue !== null) {
      entries.push(
        toMetricEntry(result, "reading", speedValue, input.activeProgram, taskLookups, xpLookup),
      );
    }

    const comprehensionValue = normalizeComprehensionValue(result);
    if (comprehensionValue !== null) {
      entries.push(
        toMetricEntry(result, "comprehension", comprehensionValue, input.activeProgram, taskLookups, xpLookup),
      );
    }
  }

  return entries;
}

function emptySummary(): TeacherStudentPerformanceMetricSummary {
  return {
    latestValue: null,
    highestValue: null,
    averageValue: null,
    previousValue: null,
    changeValue: null,
    changePercent: null,
    trendDirection: "unavailable",
    totalResultCount: 0,
    recentResults: [],
  };
}

export function buildTeacherStudentPerformanceHistory(
  input: TeacherStudentPerformanceHistoryInput,
): TeacherStudentPerformanceHistoryResult {
  try {
    const analysisLimit = Math.min(
      DEFAULT_ANALYSIS_LIMIT,
      Math.max(1, Math.trunc(input.analysisLimit ?? DEFAULT_ANALYSIS_LIMIT)),
    );
    const dedupedEntries = dedupeEntries(buildEntries(input));
    const readingEntries = dedupedEntries.filter((entry) => entry.metric === "reading").slice(0, analysisLimit);
    const comprehensionEntries = dedupedEntries
      .filter((entry) => entry.metric === "comprehension")
      .slice(0, analysisLimit);

    return {
      performanceHistory: {
        reading: buildMetricSummary(readingEntries),
        comprehension: buildMetricSummary(comprehensionEntries),
      },
      performanceHistoryError: null,
    };
  } catch {
    return {
      performanceHistory: {
        reading: emptySummary(),
        comprehension: emptySummary(),
      },
      performanceHistoryError: PERFORMANCE_HISTORY_ERROR_MESSAGE,
    };
  }
}
