export type TargetTotalLevel = "beginner" | "advanced" | "master" | "expert";
export type TargetTotalSpeed = "relaxed" | "normal" | "fast";

export type TargetTotalCard = {
  id: string;
  value: number;
  isSolution: boolean;
};

export type TargetTotalRound = {
  target: number;
  solution: number[];
  cards: TargetTotalCard[];
  signature: string;
};

export const TARGET_TOTAL_TOTAL_ROUNDS = 10;
export const TARGET_TOTAL_CARD_COUNT = 8;

export const TARGET_TOTAL_LEVEL_CONFIG = {
  beginner: { label: "Başlangıç", minTarget: 10, maxTarget: 25, minParts: 2, maxParts: 2, minValue: 2 },
  advanced: { label: "İleri", minTarget: 20, maxTarget: 50, minParts: 2, maxParts: 3, minValue: 3 },
  master: { label: "Usta", minTarget: 40, maxTarget: 90, minParts: 3, maxParts: 4, minValue: 4 },
  expert: { label: "Uzman", minTarget: 70, maxTarget: 150, minParts: 3, maxParts: 5, minValue: 5 },
} as const;

export const TARGET_TOTAL_SPEED_CONFIG = {
  relaxed: { label: "Rahat", seconds: null },
  normal: { label: "Normal", seconds: 35 },
  fast: { label: "Hızlı", seconds: 22 },
} as const;

type GenerateOptions = {
  level: TargetTotalLevel;
  roundNumber: number;
  previousTarget: number | null;
  previousCardSignature: string;
  random?: () => number;
};

function randomInt(min: number, max: number, random: () => number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index, random);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createTargetTotalSolutionParts(
  target: number,
  count: number,
  minimum: number,
  random: () => number = Math.random,
): number[] {
  const parts: number[] = [];
  let remaining = target;
  for (let index = 0; index < count - 1; index += 1) {
    const slotsLeft = count - index - 1;
    const maxForPart = remaining - slotsLeft * minimum;
    const balancedMax = Math.max(
      minimum,
      Math.min(maxForPart, Math.ceil((remaining / (slotsLeft + 1)) * 1.7)),
    );
    const part = randomInt(minimum, balancedMax, random);
    parts.push(part);
    remaining -= part;
  }
  parts.push(remaining);
  return shuffle(parts, random);
}

export function generateTargetTotalRound({
  level,
  roundNumber,
  previousTarget,
  previousCardSignature,
  random = Math.random,
}: GenerateOptions): TargetTotalRound {
  const config = TARGET_TOTAL_LEVEL_CONFIG[level];
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const target = randomInt(config.minTarget, config.maxTarget, random);
    if (target === previousTarget) continue;

    const partCount = randomInt(config.minParts, config.maxParts, random);
    const solution = createTargetTotalSolutionParts(target, partCount, config.minValue, random);
    const values = [...solution];
    const usedDistractors = new Set(values);
    const nearby = shuffle(
      solution.flatMap((value) => [value - 2, value - 1, value + 1, value + 2]),
      random,
    );
    const upperLimit = target - 1;

    while (values.length < TARGET_TOTAL_CARD_COUNT) {
      const candidate = nearby.length
        ? nearby.pop()!
        : randomInt(config.minValue, upperLimit, random);
      if (
        candidate < config.minValue
        || candidate >= target
        || usedDistractors.has(candidate)
      ) continue;
      values.push(candidate);
      usedDistractors.add(candidate);
    }

    const signature = [...values].sort((first, second) => first - second).join(",");
    if (signature === previousCardSignature) continue;

    const solutionCounts = solution.reduce<Record<number, number>>((counts, value) => {
      counts[value] = (counts[value] || 0) + 1;
      return counts;
    }, {});
    const markedCounts: Record<number, number> = {};
    const cards = shuffle(values, random).map((value, index) => {
      markedCounts[value] = (markedCounts[value] || 0) + 1;
      return {
        id: `r${roundNumber}-c${index}`,
        value,
        isSolution: markedCounts[value] <= (solutionCounts[value] || 0),
      };
    });

    return { target, solution, cards, signature };
  }

  throw new Error("Yeni tur üretilemedi.");
}

export function getTargetTotalStatus(selectedCount: number, total: number, target: number): string {
  const difference = target - total;
  if (selectedCount === 0) return "Henüz kart seçmedin";
  if (difference > 0) return `Hedefe ${difference} kaldı`;
  if (difference === 0) return "Hedefi buldun, cevapla!";
  return `Hedefi ${Math.abs(difference)} aştın`;
}

export function getTargetTotalPoints(secondsLimit: number | null, elapsedSeconds: number): number {
  const timeBonus = secondsLimit
    ? Math.max(0, Math.round((secondsLimit - elapsedSeconds) * 2))
    : 0;
  return 100 + timeBonus;
}

export function getTargetTotalSummary(correct: number, wrong: number, elapsedTimes: number[]) {
  const total = correct + wrong;
  return {
    successRate: total ? Math.round((correct / total) * 100) : 0,
    averageSeconds: elapsedTimes.length
      ? elapsedTimes.reduce((sum, time) => sum + time, 0) / elapsedTimes.length
      : 0,
  };
}
