export type GrowingShapesSpeedMode = "fixed" | "variable";

export function clampGrowingShapesProgress(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getGrowingShapesProgress(
  elapsedMs: number,
  totalMs: number,
  speedMode: GrowingShapesSpeedMode,
  jumpDurationMs: number,
  jumpEndDurationMs: number,
): number {
  const normalized = clampGrowingShapesProgress(elapsedMs / Math.max(1, totalMs));
  const start = Math.max(50, jumpDurationMs);
  const end = Math.max(50, jumpEndDurationMs);
  if (speedMode === "fixed") return normalized;

  const durationRatio = start / Math.max(start, end);
  const exponent = Math.max(0.35, Math.min(2.5, durationRatio));
  return clampGrowingShapesProgress(Math.pow(normalized, exponent));
}

export function getGrowingShapesCount(
  elapsedMs: number,
  jumpDurationMs: number,
  jumpEndDurationMs: number,
): number {
  const start = Math.max(50, jumpDurationMs);
  const end = Math.max(50, jumpEndDurationMs);
  const average = (start + end) / 2;
  return Math.max(0, Math.floor(Math.max(0, elapsedMs) / average));
}
