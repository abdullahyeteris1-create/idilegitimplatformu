export type MazePoint = {
  x: number;
  y: number;
};

export type MazeExit = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export type MazePath = {
  id: string;
  points: MazePoint[];
  exitId: string;
  isCorrect: boolean;
};

export type MazeRound = {
  id: string;
  level: number;
  start: MazePoint;
  exits: MazeExit[];
  paths: MazePath[];
  correctExitId: string;
};

export type MazeConfig = {
  level: number;
  exitCount: number;
  strokeWidth: number;
  turnCountLabel: string;
};

export type MazeLevelOption = {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
};

export type MazeTimeOption = {
  value: 10 | 15 | 20 | 30;
  label: string;
};

type MazeTemplate = MazePoint[][];

export const MAX_ATTENTION_MAZE_LEVEL = 5;

const EXIT_LABELS = ["A", "B", "C", "D", "E", "F"];

const EXIT_POSITIONS: Record<number, MazePoint[]> = {
  2: [
    { x: 88, y: 32 },
    { x: 88, y: 68 },
  ],
  3: [
    { x: 88, y: 24 },
    { x: 88, y: 50 },
    { x: 88, y: 76 },
  ],
  4: [
    { x: 88, y: 18 },
    { x: 88, y: 40 },
    { x: 88, y: 62 },
    { x: 88, y: 84 },
  ],
  5: [
    { x: 88, y: 14 },
    { x: 88, y: 32 },
    { x: 88, y: 50 },
    { x: 88, y: 68 },
    { x: 88, y: 86 },
  ],
  6: [
    { x: 88, y: 10 },
    { x: 88, y: 26 },
    { x: 88, y: 42 },
    { x: 88, y: 58 },
    { x: 88, y: 74 },
    { x: 88, y: 90 },
  ],
};

const MAZE_TEMPLATES: Record<number, MazeTemplate[]> = {
  1: [
    [
      [{ x: 12, y: 50 }, { x: 38, y: 50 }, { x: 38, y: 32 }, { x: 88, y: 32 }],
      [{ x: 12, y: 50 }, { x: 30, y: 50 }, { x: 30, y: 68 }, { x: 88, y: 68 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 28, y: 50 }, { x: 28, y: 28 }, { x: 58, y: 28 }, { x: 58, y: 32 }, { x: 88, y: 32 }],
      [{ x: 12, y: 50 }, { x: 44, y: 50 }, { x: 44, y: 68 }, { x: 88, y: 68 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 34, y: 50 }, { x: 34, y: 32 }, { x: 88, y: 32 }],
      [{ x: 12, y: 50 }, { x: 26, y: 50 }, { x: 26, y: 72 }, { x: 62, y: 72 }, { x: 62, y: 68 }, { x: 88, y: 68 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 48, y: 50 }, { x: 48, y: 32 }, { x: 88, y: 32 }],
      [{ x: 12, y: 50 }, { x: 36, y: 50 }, { x: 36, y: 68 }, { x: 88, y: 68 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 24, y: 50 }, { x: 24, y: 34 }, { x: 70, y: 34 }, { x: 70, y: 32 }, { x: 88, y: 32 }],
      [{ x: 12, y: 50 }, { x: 52, y: 50 }, { x: 52, y: 68 }, { x: 88, y: 68 }],
    ],
  ],
  2: [
    [
      [{ x: 12, y: 50 }, { x: 28, y: 50 }, { x: 28, y: 24 }, { x: 88, y: 24 }],
      [{ x: 12, y: 50 }, { x: 42, y: 50 }, { x: 88, y: 50 }],
      [{ x: 12, y: 50 }, { x: 24, y: 50 }, { x: 24, y: 76 }, { x: 88, y: 76 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 34, y: 50 }, { x: 34, y: 24 }, { x: 66, y: 24 }, { x: 66, y: 24 }, { x: 88, y: 24 }],
      [{ x: 12, y: 50 }, { x: 58, y: 50 }, { x: 88, y: 50 }],
      [{ x: 12, y: 50 }, { x: 38, y: 50 }, { x: 38, y: 76 }, { x: 88, y: 76 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 22, y: 50 }, { x: 22, y: 22 }, { x: 54, y: 22 }, { x: 54, y: 24 }, { x: 88, y: 24 }],
      [{ x: 12, y: 50 }, { x: 46, y: 50 }, { x: 46, y: 44 }, { x: 88, y: 50 }],
      [{ x: 12, y: 50 }, { x: 30, y: 50 }, { x: 30, y: 78 }, { x: 70, y: 78 }, { x: 70, y: 76 }, { x: 88, y: 76 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 44, y: 50 }, { x: 44, y: 24 }, { x: 88, y: 24 }],
      [{ x: 12, y: 50 }, { x: 30, y: 50 }, { x: 30, y: 56 }, { x: 88, y: 50 }],
      [{ x: 12, y: 50 }, { x: 52, y: 50 }, { x: 52, y: 76 }, { x: 88, y: 76 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 26, y: 50 }, { x: 26, y: 24 }, { x: 88, y: 24 }],
      [{ x: 12, y: 50 }, { x: 64, y: 50 }, { x: 88, y: 50 }],
      [{ x: 12, y: 50 }, { x: 36, y: 50 }, { x: 36, y: 80 }, { x: 68, y: 80 }, { x: 68, y: 76 }, { x: 88, y: 76 }],
    ],
  ],
  3: [
    [
      [{ x: 12, y: 50 }, { x: 24, y: 50 }, { x: 24, y: 18 }, { x: 88, y: 18 }],
      [{ x: 12, y: 50 }, { x: 44, y: 50 }, { x: 44, y: 40 }, { x: 88, y: 40 }],
      [{ x: 12, y: 50 }, { x: 38, y: 50 }, { x: 38, y: 62 }, { x: 88, y: 62 }],
      [{ x: 12, y: 50 }, { x: 28, y: 50 }, { x: 28, y: 84 }, { x: 88, y: 84 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 30, y: 50 }, { x: 30, y: 20 }, { x: 56, y: 20 }, { x: 56, y: 18 }, { x: 88, y: 18 }],
      [{ x: 12, y: 50 }, { x: 40, y: 50 }, { x: 40, y: 38 }, { x: 72, y: 38 }, { x: 72, y: 40 }, { x: 88, y: 40 }],
      [{ x: 12, y: 50 }, { x: 52, y: 50 }, { x: 52, y: 62 }, { x: 88, y: 62 }],
      [{ x: 12, y: 50 }, { x: 34, y: 50 }, { x: 34, y: 84 }, { x: 88, y: 84 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 22, y: 50 }, { x: 22, y: 16 }, { x: 70, y: 16 }, { x: 70, y: 18 }, { x: 88, y: 18 }],
      [{ x: 12, y: 50 }, { x: 34, y: 50 }, { x: 34, y: 42 }, { x: 88, y: 40 }],
      [{ x: 12, y: 50 }, { x: 62, y: 50 }, { x: 62, y: 62 }, { x: 88, y: 62 }],
      [{ x: 12, y: 50 }, { x: 28, y: 50 }, { x: 28, y: 86 }, { x: 64, y: 86 }, { x: 64, y: 84 }, { x: 88, y: 84 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 46, y: 50 }, { x: 46, y: 18 }, { x: 88, y: 18 }],
      [{ x: 12, y: 50 }, { x: 26, y: 50 }, { x: 26, y: 40 }, { x: 88, y: 40 }],
      [{ x: 12, y: 50 }, { x: 54, y: 50 }, { x: 54, y: 62 }, { x: 88, y: 62 }],
      [{ x: 12, y: 50 }, { x: 38, y: 50 }, { x: 38, y: 84 }, { x: 88, y: 84 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 28, y: 50 }, { x: 28, y: 18 }, { x: 88, y: 18 }],
      [{ x: 12, y: 50 }, { x: 52, y: 50 }, { x: 52, y: 40 }, { x: 88, y: 40 }],
      [{ x: 12, y: 50 }, { x: 36, y: 50 }, { x: 36, y: 64 }, { x: 68, y: 64 }, { x: 68, y: 62 }, { x: 88, y: 62 }],
      [{ x: 12, y: 50 }, { x: 24, y: 50 }, { x: 24, y: 84 }, { x: 88, y: 84 }],
    ],
  ],
  4: [
    [
      [{ x: 12, y: 50 }, { x: 22, y: 50 }, { x: 22, y: 14 }, { x: 88, y: 14 }],
      [{ x: 12, y: 50 }, { x: 38, y: 50 }, { x: 38, y: 32 }, { x: 88, y: 32 }],
      [{ x: 12, y: 50 }, { x: 60, y: 50 }, { x: 88, y: 50 }],
      [{ x: 12, y: 50 }, { x: 42, y: 50 }, { x: 42, y: 68 }, { x: 88, y: 68 }],
      [{ x: 12, y: 50 }, { x: 26, y: 50 }, { x: 26, y: 86 }, { x: 88, y: 86 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 28, y: 50 }, { x: 28, y: 14 }, { x: 64, y: 14 }, { x: 64, y: 14 }, { x: 88, y: 14 }],
      [{ x: 12, y: 50 }, { x: 34, y: 50 }, { x: 34, y: 34 }, { x: 70, y: 34 }, { x: 70, y: 32 }, { x: 88, y: 32 }],
      [{ x: 12, y: 50 }, { x: 58, y: 50 }, { x: 88, y: 50 }],
      [{ x: 12, y: 50 }, { x: 46, y: 50 }, { x: 46, y: 70 }, { x: 88, y: 68 }],
      [{ x: 12, y: 50 }, { x: 24, y: 50 }, { x: 24, y: 88 }, { x: 74, y: 88 }, { x: 74, y: 86 }, { x: 88, y: 86 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 24, y: 50 }, { x: 24, y: 16 }, { x: 74, y: 16 }, { x: 74, y: 14 }, { x: 88, y: 14 }],
      [{ x: 12, y: 50 }, { x: 52, y: 50 }, { x: 52, y: 32 }, { x: 88, y: 32 }],
      [{ x: 12, y: 50 }, { x: 32, y: 50 }, { x: 32, y: 48 }, { x: 88, y: 50 }],
      [{ x: 12, y: 50 }, { x: 44, y: 50 }, { x: 44, y: 68 }, { x: 88, y: 68 }],
      [{ x: 12, y: 50 }, { x: 30, y: 50 }, { x: 30, y: 86 }, { x: 88, y: 86 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 42, y: 50 }, { x: 42, y: 14 }, { x: 88, y: 14 }],
      [{ x: 12, y: 50 }, { x: 30, y: 50 }, { x: 30, y: 32 }, { x: 88, y: 32 }],
      [{ x: 12, y: 50 }, { x: 66, y: 50 }, { x: 88, y: 50 }],
      [{ x: 12, y: 50 }, { x: 36, y: 50 }, { x: 36, y: 68 }, { x: 88, y: 68 }],
      [{ x: 12, y: 50 }, { x: 50, y: 50 }, { x: 50, y: 86 }, { x: 88, y: 86 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 20, y: 50 }, { x: 20, y: 14 }, { x: 88, y: 14 }],
      [{ x: 12, y: 50 }, { x: 36, y: 50 }, { x: 36, y: 30 }, { x: 66, y: 30 }, { x: 66, y: 32 }, { x: 88, y: 32 }],
      [{ x: 12, y: 50 }, { x: 54, y: 50 }, { x: 54, y: 50 }, { x: 88, y: 50 }],
      [{ x: 12, y: 50 }, { x: 44, y: 50 }, { x: 44, y: 70 }, { x: 70, y: 70 }, { x: 70, y: 68 }, { x: 88, y: 68 }],
      [{ x: 12, y: 50 }, { x: 26, y: 50 }, { x: 26, y: 86 }, { x: 88, y: 86 }],
    ],
  ],
  5: [
    [
      [{ x: 12, y: 50 }, { x: 20, y: 50 }, { x: 20, y: 10 }, { x: 88, y: 10 }],
      [{ x: 12, y: 50 }, { x: 32, y: 50 }, { x: 32, y: 26 }, { x: 88, y: 26 }],
      [{ x: 12, y: 50 }, { x: 48, y: 50 }, { x: 48, y: 42 }, { x: 88, y: 42 }],
      [{ x: 12, y: 50 }, { x: 64, y: 50 }, { x: 64, y: 58 }, { x: 88, y: 58 }],
      [{ x: 12, y: 50 }, { x: 38, y: 50 }, { x: 38, y: 74 }, { x: 88, y: 74 }],
      [{ x: 12, y: 50 }, { x: 24, y: 50 }, { x: 24, y: 90 }, { x: 88, y: 90 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 26, y: 50 }, { x: 26, y: 10 }, { x: 62, y: 10 }, { x: 62, y: 10 }, { x: 88, y: 10 }],
      [{ x: 12, y: 50 }, { x: 44, y: 50 }, { x: 44, y: 26 }, { x: 88, y: 26 }],
      [{ x: 12, y: 50 }, { x: 34, y: 50 }, { x: 34, y: 42 }, { x: 88, y: 42 }],
      [{ x: 12, y: 50 }, { x: 66, y: 50 }, { x: 66, y: 58 }, { x: 88, y: 58 }],
      [{ x: 12, y: 50 }, { x: 52, y: 50 }, { x: 52, y: 74 }, { x: 88, y: 74 }],
      [{ x: 12, y: 50 }, { x: 22, y: 50 }, { x: 22, y: 90 }, { x: 88, y: 90 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 22, y: 50 }, { x: 22, y: 12 }, { x: 76, y: 12 }, { x: 76, y: 10 }, { x: 88, y: 10 }],
      [{ x: 12, y: 50 }, { x: 36, y: 50 }, { x: 36, y: 26 }, { x: 88, y: 26 }],
      [{ x: 12, y: 50 }, { x: 58, y: 50 }, { x: 58, y: 42 }, { x: 88, y: 42 }],
      [{ x: 12, y: 50 }, { x: 46, y: 50 }, { x: 46, y: 58 }, { x: 88, y: 58 }],
      [{ x: 12, y: 50 }, { x: 30, y: 50 }, { x: 30, y: 74 }, { x: 88, y: 74 }],
      [{ x: 12, y: 50 }, { x: 40, y: 50 }, { x: 40, y: 90 }, { x: 88, y: 90 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 40, y: 50 }, { x: 40, y: 10 }, { x: 88, y: 10 }],
      [{ x: 12, y: 50 }, { x: 24, y: 50 }, { x: 24, y: 26 }, { x: 88, y: 26 }],
      [{ x: 12, y: 50 }, { x: 52, y: 50 }, { x: 52, y: 42 }, { x: 88, y: 42 }],
      [{ x: 12, y: 50 }, { x: 68, y: 50 }, { x: 68, y: 58 }, { x: 88, y: 58 }],
      [{ x: 12, y: 50 }, { x: 44, y: 50 }, { x: 44, y: 74 }, { x: 88, y: 74 }],
      [{ x: 12, y: 50 }, { x: 28, y: 50 }, { x: 28, y: 90 }, { x: 88, y: 90 }],
    ],
    [
      [{ x: 12, y: 50 }, { x: 18, y: 50 }, { x: 18, y: 10 }, { x: 88, y: 10 }],
      [{ x: 12, y: 50 }, { x: 30, y: 50 }, { x: 30, y: 24 }, { x: 62, y: 24 }, { x: 62, y: 26 }, { x: 88, y: 26 }],
      [{ x: 12, y: 50 }, { x: 56, y: 50 }, { x: 56, y: 42 }, { x: 88, y: 42 }],
      [{ x: 12, y: 50 }, { x: 70, y: 50 }, { x: 70, y: 58 }, { x: 88, y: 58 }],
      [{ x: 12, y: 50 }, { x: 48, y: 50 }, { x: 48, y: 76 }, { x: 70, y: 76 }, { x: 70, y: 74 }, { x: 88, y: 74 }],
      [{ x: 12, y: 50 }, { x: 34, y: 50 }, { x: 34, y: 90 }, { x: 88, y: 90 }],
    ],
  ],
};

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function clampLevel(level: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(MAX_ATTENTION_MAZE_LEVEL, Math.floor(level))) as 1 | 2 | 3 | 4 | 5;
}

function createExits(exitCount: number): MazeExit[] {
  const positions = EXIT_POSITIONS[exitCount] ?? EXIT_POSITIONS[2];

  return positions.map((point, index) => ({
    id: `exit-${EXIT_LABELS[index]}`,
    label: EXIT_LABELS[index] ?? String(index + 1),
    x: point.x,
    y: point.y,
  }));
}

export function getMazeConfigByLevel(level: number): MazeConfig {
  const safeLevel = clampLevel(level);

  if (safeLevel === 1) {
    return { level: safeLevel, exitCount: 2, strokeWidth: 4.8, turnCountLabel: "Az donus" };
  }

  if (safeLevel === 2) {
    return { level: safeLevel, exitCount: 3, strokeWidth: 4.3, turnCountLabel: "Orta" };
  }

  if (safeLevel === 3) {
    return { level: safeLevel, exitCount: 4, strokeWidth: 3.8, turnCountLabel: "Artan dikkat" };
  }

  if (safeLevel === 4) {
    return { level: safeLevel, exitCount: 5, strokeWidth: 3.3, turnCountLabel: "Yakın yollar" };
  }

  return { level: safeLevel, exitCount: 6, strokeWidth: 3, turnCountLabel: "Uzun takip" };
}

export function getTimeOptions(): MazeTimeOption[] {
  return [
    { value: 10, label: "10 saniye" },
    { value: 15, label: "15 saniye" },
    { value: 20, label: "20 saniye" },
    { value: 30, label: "30 saniye" },
  ];
}

export function getLevelOptions(): MazeLevelOption[] {
  return [
    { value: 1, label: "Seviye 1" },
    { value: 2, label: "Seviye 2" },
    { value: 3, label: "Seviye 3" },
    { value: 4, label: "Seviye 4" },
    { value: 5, label: "Seviye 5" },
  ];
}

export function calculateScore(correctCount: number, wrongCount: number): number {
  return correctCount * 10 - wrongCount * 5;
}

export function calculateSuccessRate(correctCount: number, wrongCount: number): number {
  const total = correctCount + wrongCount;

  if (total <= 0) {
    return 0;
  }

  return Math.round((correctCount / total) * 100);
}

export function calculateNet(correctCount: number, wrongCount: number): number {
  return correctCount - wrongCount;
}

export function shouldLevelUp(net: number): boolean {
  return net >= 10;
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (safeSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

export function generateMazeRound(level: number): MazeRound {
  const config = getMazeConfigByLevel(level);
  const templates = MAZE_TEMPLATES[config.level] ?? MAZE_TEMPLATES[1];
  const template = templates[randomIndex(templates.length)] ?? templates[0];
  const exits = createExits(config.exitCount);
  const correctIndex = randomIndex(config.exitCount);
  const correctExit = exits[correctIndex] ?? exits[0];

  const paths = exits.map((exit, index) => {
    const fallbackPoints = [
      { x: 12, y: 50 },
      { x: 44, y: 50 },
      { x: 44, y: exit.y },
      { x: exit.x, y: exit.y },
    ];
    const points = template[index] ?? fallbackPoints;

    return {
      id: createId(`path-${exit.label}`),
      points,
      exitId: exit.id,
      isCorrect: index === correctIndex,
    } satisfies MazePath;
  });

  return {
    id: createId("maze"),
    level: config.level,
    start: { x: 12, y: 50 },
    exits,
    paths,
    correctExitId: correctExit.id,
  };
}
