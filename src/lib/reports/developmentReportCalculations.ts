import type { DevelopmentMetric, DevelopmentReportDailyAverage, DevelopmentReportLesson } from "./developmentReportTypes";

export type { DevelopmentMetric } from "./developmentReportTypes";

export function calculateDevelopmentMetric(values: Array<number | null>): DevelopmentMetric {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const first = valid[0] ?? null;
  const last = valid[valid.length - 1] ?? null;
  const delta = first !== null && last !== null ? last - first : null;
  const percent = first !== null && first !== 0 && delta !== null ? (delta / first) * 100 : null;
  return { first, last, delta, percent };
}

const ISTANBUL_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getDevelopmentDateKey(value: string): string | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) return dateOnly[0];
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return ISTANBUL_DATE_FORMATTER.format(date);
}

function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return valid.length > 0 ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

export function calculateDailyDevelopmentAverages(lessons: DevelopmentReportLesson[]): DevelopmentReportDailyAverage[] {
  const groups = new Map<string, DevelopmentReportLesson[]>();
  for (const lesson of lessons) {
    const dateKey = getDevelopmentDateKey(lesson.lessonDate);
    if (!dateKey) continue;
    const group = groups.get(dateKey) ?? [];
    group.push(lesson);
    groups.set(dateKey, group);
  }

  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([dateKey, group]) => ({
    dateKey,
    lessonCount: group.length,
    wordsPerMinute: average(group.map((lesson) => lesson.wordsPerMinute)),
    comprehensionScore: average(group.map((lesson) => lesson.comprehensionScore)),
    focusScore: average(group.map((lesson) => lesson.focusScore)),
  }));
}
