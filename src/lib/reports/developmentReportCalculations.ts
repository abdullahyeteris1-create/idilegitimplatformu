import type { DevelopmentMetric } from "./developmentReportTypes";

export type { DevelopmentMetric } from "./developmentReportTypes";

export function calculateDevelopmentMetric(values: Array<number | null>): DevelopmentMetric {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const first = valid[0] ?? null;
  const last = valid[valid.length - 1] ?? null;
  const delta = first !== null && last !== null ? last - first : null;
  const percent = first !== null && first !== 0 && delta !== null ? (delta / first) * 100 : null;
  return { first, last, delta, percent };
}
