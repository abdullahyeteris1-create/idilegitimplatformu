import type { Difficulty } from "@/lib/data/wordPools";
import { SIMILAR_WORD_POOLS, type SimilarWordPools } from "@/lib/data/similarWordPools";

export type SimilarWordsConfig = {
  difficulty: Difficulty;
  durationSeconds: 60 | 120 | 180;
  pairCount?: number;
};

export type SimilarWordsPair = {
  id: string;
  leftWord: string;
  rightWord: string;
  isDifferent: boolean;
};

export type SimilarWordsSession = {
  config: SimilarWordsConfig;
  pairs: SimilarWordsPair[];
};

export type SimilarWordsStats = {
  correctCount: number;
  wrongCount: number;
  score: number;
  successPercent: number;
};

const PAIR_COUNT_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 12,
  medium: 14,
  hard: 16,
};

function randomize<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function pickDifferentWord(base: string, variants: string[]): string {
  const different = variants.filter((item) => item !== base);
  if (different.length === 0) {
    return `${base.slice(0, -1)}x`;
  }
  return randomize(different)[0];
}

export function createSimilarWordsSession(
  config: SimilarWordsConfig,
  pools: SimilarWordPools = SIMILAR_WORD_POOLS,
): SimilarWordsSession {
  const source = pools[config.difficulty];
  const defaultPairCount = PAIR_COUNT_BY_DIFFICULTY[config.difficulty];
  const pairCount = Math.max(1, Math.floor(config.pairCount ?? defaultPairCount));

  const randomizedTemplates = randomize(source);
  const selectedTemplates = Array.from({ length: pairCount }, (_, index) => {
    const templateIndex = index % randomizedTemplates.length;
    return randomizedTemplates[templateIndex];
  });

  const sameCount = Math.floor(pairCount * 0.45);
  const sameIndexes = new Set(randomize(Array.from({ length: pairCount }, (_, index) => index)).slice(0, sameCount));

  const pairs = selectedTemplates.map((template, index) => {
    const isDifferent = !sameIndexes.has(index);
    const rightWord = isDifferent
      ? pickDifferentWord(template.base, template.variants)
      : template.base;

    return {
      id: `${index + 1}-${template.base}`,
      leftWord: template.base,
      rightWord,
      isDifferent,
    };
  });

  return {
    config,
    pairs: randomize(pairs),
  };
}

export function evaluateSimilarWordsSelection(pair: SimilarWordsPair): {
  isCorrect: boolean;
  scoreDelta: number;
} {
  if (pair.isDifferent) {
    return { isCorrect: true, scoreDelta: 10 };
  }

  return { isCorrect: false, scoreDelta: -5 };
}

export function calculateSimilarWordsSuccessPercent(correctCount: number, wrongCount: number): number {
  const totalSelections = correctCount + wrongCount;
  if (totalSelections === 0) {
    return 0;
  }

  return Math.round((correctCount / totalSelections) * 100);
}
