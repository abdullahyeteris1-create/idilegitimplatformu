import {
  TWO_SIDE_FOCUS_WORDS,
  type TwoSideFocusCategory,
} from "@/lib/data/twoSideFocusWords";

export const MAX_TWO_SIDE_FOCUS_LEVEL = 10;

export type TwoSideFocusPair = {
  id: string;
  leftWord: string;
  rightWord: string;
  isSame: boolean;
};

export type TwoSideFocusGroup = {
  id: string;
  pairs: TwoSideFocusPair[];
  pairCount: number;
  isSame: boolean;
};

export type TwoSideFocusAnswer = "same" | "different";

type GenerateWordPairOptions = {
  category: TwoSideFocusCategory;
  level: 1 | 2 | 3 | 4 | 5;
  seed?: number;
};

type GenerateExercisePairsOptions = {
  category: TwoSideFocusCategory;
  level: 1 | 2 | 3 | 4 | 5;
  totalQuestions: number;
};

type GenerateExerciseGroupOptions = {
  level: number;
};

function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function getAllSameWords(): string[] {
  return Object.values(TWO_SIDE_FOCUS_WORDS).flatMap((pool) => pool.sameWords);
}

function getAllSimilarPairs(): Array<[string, string]> {
  return Object.values(TWO_SIDE_FOCUS_WORDS).flatMap((pool) => pool.similarPairs);
}

function getPairCountForLevel(level: number): number {
  return Math.max(1, Math.min(5, Math.floor(level)));
}

function getSameProbabilityForGroup(level: number, pairCount: number): number {
  const baseProbability = level <= 2 ? 0.58 : level <= 4 ? 0.5 : 0.42;
  return Math.max(0.28, Math.min(0.62, baseProbability - (pairCount - 1) * 0.02));
}

function getSameProbability(level: 1 | 2 | 3 | 4 | 5): number {
  if (level <= 2) {
    return 0.56;
  }

  if (level === 3) {
    return 0.5;
  }

  return 0.44;
}

export function generateWordPair(options: GenerateWordPairOptions): TwoSideFocusPair {
  const pool = TWO_SIDE_FOCUS_WORDS[options.category];
  const sameProbability = getSameProbability(options.level);
  const isSame = Math.random() < sameProbability;

  if (isSame) {
    const word = pool.sameWords[randomIndex(pool.sameWords.length)] ?? "kelime";

    return {
      id: createId("same"),
      leftWord: word,
      rightWord: word,
      isSame: true,
    };
  }

  const pair = pool.similarPairs[randomIndex(pool.similarPairs.length)] ?? ["kelime", "keline"];
  const leftFirst = Math.random() < 0.5;

  return {
    id: createId("diff"),
    leftWord: leftFirst ? pair[0] : pair[1],
    rightWord: leftFirst ? pair[1] : pair[0],
    isSame: false,
  };
}

export function generateExerciseGroup(options: GenerateExerciseGroupOptions): TwoSideFocusGroup {
  const sameWords = getAllSameWords();
  const similarPairs = getAllSimilarPairs();
  const pairCount = getPairCountForLevel(options.level);
  const shouldBeSame = Math.random() < getSameProbabilityForGroup(options.level, pairCount);

  const pairs = Array.from({ length: pairCount }, (_, index) => {
    if (shouldBeSame) {
      const word = sameWords[randomIndex(sameWords.length)] ?? "kelime";

      return {
        id: createId(`same-${index + 1}`),
        leftWord: word,
        rightWord: word,
        isSame: true,
      } satisfies TwoSideFocusPair;
    }

    const useDifferentPair = index === pairCount - 1 || Math.random() < 0.72;
    if (useDifferentPair) {
      const pair = similarPairs[randomIndex(similarPairs.length)] ?? ["kelime", "keline"];
      const leftFirst = Math.random() < 0.5;

      return {
        id: createId(`diff-${index + 1}`),
        leftWord: leftFirst ? pair[0] : pair[1],
        rightWord: leftFirst ? pair[1] : pair[0],
        isSame: false,
      } satisfies TwoSideFocusPair;
    }

    const word = sameWords[randomIndex(sameWords.length)] ?? "kelime";

    return {
      id: createId(`same-${index + 1}`),
      leftWord: word,
      rightWord: word,
      isSame: true,
    } satisfies TwoSideFocusPair;
  });

  return {
    id: createId("group"),
    pairs,
    pairCount,
    isSame: pairs.every((pair) => pair.isSame),
  };
}

export function generateExercisePairs(options: GenerateExercisePairsOptions): TwoSideFocusPair[] {
  const total = Math.max(1, Math.floor(options.totalQuestions));

  return Array.from({ length: total }, (_, index) => {
    const pair = generateWordPair({
      category: options.category,
      level: options.level,
      seed: index,
    });

    return {
      ...pair,
      id: `${pair.id}-${index + 1}`,
    };
  });
}

export function isPairSame(pair: TwoSideFocusPair): boolean {
  return pair.isSame;
}

export function checkAnswer(pair: TwoSideFocusPair, answer: TwoSideFocusAnswer): boolean {
  if (pair.isSame) {
    return answer === "same";
  }

  return answer === "different";
}

export function checkGroupAnswer(group: TwoSideFocusGroup, answer: TwoSideFocusAnswer): boolean {
  if (group.isSame) {
    return answer === "same";
  }

  return answer === "different";
}

export function calculateScore(correctCount: number, wrongCount: number): number {
  return correctCount * 10 - wrongCount * 5;
}

export function calculateSuccessRate(correctCount: number, wrongCount: number): number {
  const answeredTotal = correctCount + wrongCount;

  if (answeredTotal <= 0) {
    return 0;
  }

  return Math.round((correctCount / answeredTotal) * 100);
}
