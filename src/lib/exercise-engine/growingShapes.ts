export type GrowingShapesSpeedMode = "fixed" | "variable";
export type GrowingShapesClearMode = "without-clearing" | "with-clearing";

export type GrowingShapesMotorState = {
  currentStep: number;
  currentRadius: number;
  cycleIndex: number;
  shapesDisplayed: number;
  currentJumpDurationMs: number;
  accumulatedActiveTimeMs: number;
  nextStepAtMs: number;
  layers: number[];
};

export type GrowingShapesMotorOptions = {
  minRadius: number;
  maxRadius: number;
  stepSize: number;
  speedMode: GrowingShapesSpeedMode;
  jumpDurationMs: number;
  jumpEndDurationMs: number;
};

export function clampGrowingShapesProgress(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getGrowingShapesJumpDurationMs(
  speedMode: GrowingShapesSpeedMode,
  activeTimeMs: number,
  totalDurationMs: number,
  jumpDurationMs: number,
  jumpEndDurationMs: number,
): number {
  const start = Math.max(50, jumpDurationMs);
  if (speedMode === "fixed") return start;
  const end = Math.max(50, jumpEndDurationMs);
  const progress = clampGrowingShapesProgress(activeTimeMs / Math.max(1, totalDurationMs));
  return Math.max(end, Math.round(start + (end - start) * progress));
}

export function createGrowingShapesMotor(options: GrowingShapesMotorOptions): GrowingShapesMotorState {
  return {
    currentStep: 0,
    currentRadius: options.minRadius,
    cycleIndex: 0,
    shapesDisplayed: 0,
    currentJumpDurationMs: Math.max(50, options.jumpDurationMs),
    accumulatedActiveTimeMs: 0,
    nextStepAtMs: 0,
    layers: [],
  };
}

export function advanceGrowingShapesMotor(
  state: GrowingShapesMotorState,
  activeTimeMs: number,
  totalDurationMs: number,
  options: GrowingShapesMotorOptions,
): { state: GrowingShapesMotorState; stepsCreated: number } {
  const next = { ...state, layers: [...state.layers] };
  const targetTime = Math.max(next.accumulatedActiveTimeMs, activeTimeMs);
  let stepsCreated = 0;
  let guard = 0;

  while (targetTime >= next.nextStepAtMs && guard < 100) {
    const candidateStep = next.currentStep + 1;
    const candidateRadius = options.minRadius + candidateStep * options.stepSize;
    if (candidateRadius > options.maxRadius) {
      next.cycleIndex += 1;
      next.currentStep = 1;
      next.currentRadius = options.minRadius + options.stepSize;
      next.layers = [];
    } else {
      next.currentStep = candidateStep;
      next.currentRadius = candidateRadius;
    }
    next.layers.push(next.currentRadius);
    next.shapesDisplayed += 1;
    stepsCreated += 1;
    next.accumulatedActiveTimeMs = targetTime;
    next.currentJumpDurationMs = getGrowingShapesJumpDurationMs(
      options.speedMode,
      targetTime,
      totalDurationMs,
      options.jumpDurationMs,
      options.jumpEndDurationMs,
    );
    next.nextStepAtMs = targetTime + next.currentJumpDurationMs;
    guard += 1;
  }

  next.accumulatedActiveTimeMs = targetTime;
  return { state: next, stepsCreated };
}

export function getGrowingShapesResponsiveMetrics(canvasWidth: number, canvasHeight: number) {
  const shortSide = Math.max(1, Math.min(canvasWidth, canvasHeight));
  const minRadius = shortSide * 0.05;
  const maxRadius = shortSide * 0.42;
  const stepSize = (maxRadius - minRadius) / 10;
  return { minRadius, maxRadius, stepSize };
}
