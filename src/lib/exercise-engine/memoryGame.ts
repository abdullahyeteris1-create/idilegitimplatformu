export type MemoryGridLayout = "5x5" | "5x10" | "10x10";
export type MemoryLevel = 1 | 2 | 3 | 4 | 5;

export type MemoryGridConfig = {
  rows: number;
  cols: number;
  totalBoxes: number;
  gridLabel: string;
};

export type MemoryGameConfig = {
  gridLayout: MemoryGridLayout;
  level: MemoryLevel;
  displayMs: 500 | 750 | 1000 | 1500 | 2000;
  totalRounds: 5 | 10 | 15 | 20;
};

export type MemoryGameSession = {
  config: MemoryGameConfig;
  grid: MemoryGridConfig;
  targetCountPerRound: number;
};

export function getGridConfig(layout: MemoryGridLayout): MemoryGridConfig {
  if (layout === "5x5") {
    return { rows: 5, cols: 5, totalBoxes: 25, gridLabel: "5 x 5" };
  }

  if (layout === "5x10") {
    return { rows: 5, cols: 10, totalBoxes: 50, gridLabel: "5 x 10" };
  }

  return { rows: 10, cols: 10, totalBoxes: 100, gridLabel: "10 x 10" };
}

export function getTargetCountPerRound(level: MemoryLevel, totalBoxes: number): number {
  const baseMap: Record<MemoryLevel, number> = {
    1: 3,
    2: 4,
    3: 5,
    4: 6,
    5: 7,
  };

  const requested = baseMap[level];
  const maxSafe = Math.max(2, Math.min(totalBoxes - 1, Math.floor(totalBoxes * 0.25)));
  return Math.min(requested, maxSafe);
}

function randomize<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function generateRoundTargets(totalBoxes: number, targetCount: number): Set<number> {
  const allIndexes = Array.from({ length: totalBoxes }, (_, index) => index);
  const picked = randomize(allIndexes).slice(0, Math.max(1, targetCount));
  return new Set(picked);
}

export function createMemoryGameSession(config: MemoryGameConfig): MemoryGameSession {
  const grid = getGridConfig(config.gridLayout);
  const targetCountPerRound = getTargetCountPerRound(config.level, grid.totalBoxes);

  return {
    config,
    grid,
    targetCountPerRound,
  };
}
