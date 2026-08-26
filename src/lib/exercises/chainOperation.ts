export type ChainOperationLevel = "beginner" | "advanced" | "master" | "expert";
export type ChainOperationSpeed = "relaxed" | "normal" | "fast";
export type ChainOperationSign = "+" | "-";

export type ChainOperationStep = {
  operation: ChainOperationSign;
  number: number;
  value: number;
};

export type ChainOperationRound = {
  start: number;
  steps: ChainOperationStep[];
  answer: number;
};

export type ChainOperationStats = {
  correct: number;
  wrong: number;
  score: number;
  streak: number;
  bestStreak: number;
};

export const CHAIN_OPERATION_LEVEL_CONFIG = {
  beginner: { label: "Başlangıç", steps: 3, start: [5, 20], add: [1, 9], sub: [1, 8], points: 100 },
  advanced: { label: "İleri", steps: 4, start: [10, 30], add: [2, 15], sub: [2, 12], points: 120 },
  master: { label: "Usta", steps: 5, start: [10, 40], add: [3, 18], sub: [3, 15], points: 140 },
  expert: { label: "Uzman", steps: 6, start: [15, 50], add: [4, 22], sub: [4, 18], points: 160 },
} as const;

export const CHAIN_OPERATION_SPEED_CONFIG = {
  relaxed: { label: "Rahat", milliseconds: 1800, description: "İşlem başına 1,8 sn" },
  normal: { label: "Normal", milliseconds: 1200, description: "İşlem başına 1,2 sn" },
  fast: { label: "Hızlı", milliseconds: 800, description: "İşlem başına 0,8 sn" },
} as const;

export const CHAIN_OPERATION_ROUND_OPTIONS = [5, 10, 15] as const;
export const CHAIN_OPERATION_DEFAULT_ROUNDS = 10;
export const CHAIN_OPERATION_MIN_START_MS = 1300;
export const CHAIN_OPERATION_ANSWER_DELAY_MS = 350;

function randomInt(minimum: number, maximum: number, random: () => number): number {
  return Math.floor(random() * (maximum - minimum + 1)) + minimum;
}

export function generateChainOperationRound(
  level: ChainOperationLevel,
  random: () => number = Math.random,
): ChainOperationRound {
  const config = CHAIN_OPERATION_LEVEL_CONFIG[level];
  let current = randomInt(config.start[0], config.start[1], random);
  const start = current;
  const steps: ChainOperationStep[] = [];

  for (let index = 0; index < config.steps; index += 1) {
    let operation: ChainOperationSign = random() < 0.5 ? "+" : "-";
    let number: number;

    if (operation === "+") {
      number = randomInt(config.add[0], config.add[1], random);
      current += number;
    } else {
      const maximumSubtraction = Math.max(
        config.sub[0],
        Math.min(config.sub[1], current - 1),
      );
      number = randomInt(config.sub[0], maximumSubtraction, random);
      current -= number;
      if (current < 0) {
        current += number;
        operation = "+";
        number = randomInt(config.add[0], config.add[1], random);
        current += number;
      }
    }

    steps.push({ operation, number, value: current });
  }

  return { start, steps, answer: current };
}

export function getChainOperationInitialDisplayMs(speed: ChainOperationSpeed): number {
  return Math.max(CHAIN_OPERATION_MIN_START_MS, CHAIN_OPERATION_SPEED_CONFIG[speed].milliseconds);
}

export function getChainOperationProgress(currentStep: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return Math.max(0, Math.min(100, (currentStep / totalSteps) * 100));
}

export function getChainOperationPoints(level: ChainOperationLevel): number {
  return CHAIN_OPERATION_LEVEL_CONFIG[level].points;
}

export function parseChainOperationAnswer(rawValue: string): { value: number | null; error: string | null } {
  const normalized = rawValue.trim();
  if (!normalized) return { value: null, error: "Önce cevabını yaz." };
  const value = Number(normalized.replace(",", "."));
  if (!Number.isFinite(value)) return { value: null, error: "Geçerli bir sayı yaz." };
  return { value, error: null };
}

export function resolveChainOperationAnswer(
  stats: ChainOperationStats,
  level: ChainOperationLevel,
  expectedAnswer: number,
  submittedAnswer: number,
): ChainOperationStats {
  if (submittedAnswer === expectedAnswer) {
    const streak = stats.streak + 1;
    return {
      ...stats,
      correct: stats.correct + 1,
      score: stats.score + getChainOperationPoints(level),
      streak,
      bestStreak: Math.max(stats.bestStreak, streak),
    };
  }

  return { ...stats, wrong: stats.wrong + 1, streak: 0 };
}

export function createChainOperationStats(): ChainOperationStats {
  return { correct: 0, wrong: 0, score: 0, streak: 0, bestStreak: 0 };
}

export function formatChainOperationFlow(round: ChainOperationRound): string {
  return [String(round.start), ...round.steps.map((step) => `${step.operation}${step.number}`)].join("  ");
}

export function getChainOperationNextLabel(roundNumber: number, roundLimit: number): string {
  return roundNumber >= roundLimit ? "Sonuçları Gör →" : "Sonraki Tur →";
}
