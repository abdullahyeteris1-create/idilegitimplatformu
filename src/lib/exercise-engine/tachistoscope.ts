import {
  DISPLAY_DURATION_BY_DIFFICULTY,
  type Difficulty,
  type WordPools,
} from "@/lib/data/wordPools";

export type TachistoscopeConfig = {
  letterCount: 3 | 4 | 5 | 6 | 7 | 8;
  difficulty: Difficulty;
  roundCount?: number;
};

export type TachistoscopeRound = {
  round: number;
  word: string;
  displayDurationMs: number;
};

export type TachistoscopeAttempt = {
  expectedWord: string;
  userInput: string;
  isCorrect: boolean;
};

export type TachistoscopeSession = {
  rounds: TachistoscopeRound[];
  config: Required<TachistoscopeConfig>;
};

const DEFAULT_ROUND_COUNT = 10;

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function randomize<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function fallbackWords(letterCount: number): string[] {
  const alphabet = "abcdeghiklmnoprstuvyz";

  return Array.from({ length: 20 }, (_, seed) => {
    let word = "";
    for (let index = 0; index < letterCount; index += 1) {
      const letterIndex = (seed * 7 + index * 11) % alphabet.length;
      word += alphabet[letterIndex];
    }
    return word;
  });
}

function pickWords(
  pools: WordPools,
  letterCount: number,
  difficulty: Difficulty,
  roundCount: number,
): string[] {
  const bucket = pools[letterCount];

  if (!bucket) {
    return fallbackWords(letterCount).slice(0, roundCount);
  }

  const strictPool = bucket[difficulty].filter((word) => word.length === letterCount);
  const mixedPool = [...bucket.easy, ...bucket.medium, ...bucket.hard].filter(
    (word) => word.length === letterCount,
  );
  const source = strictPool.length >= roundCount ? strictPool : mixedPool;

  if (source.length >= roundCount) {
    return randomize(source).slice(0, roundCount);
  }

  const padded = [...source, ...fallbackWords(letterCount)];
  return randomize(padded).slice(0, roundCount);
}

export function createTachistoscopeSession(
  config: TachistoscopeConfig,
  pools: WordPools,
): TachistoscopeSession {
  const roundCount = config.roundCount ?? DEFAULT_ROUND_COUNT;
  const words = pickWords(pools, config.letterCount, config.difficulty, roundCount);
  const displayDurationMs = DISPLAY_DURATION_BY_DIFFICULTY[config.difficulty];

  return {
    config: {
      letterCount: config.letterCount,
      difficulty: config.difficulty,
      roundCount,
    },
    rounds: words.map((word, index) => ({
      round: index + 1,
      word,
      displayDurationMs,
    })),
  };
}

export function evaluateTachistoscopeAttempt(
  expectedWord: string,
  userInput: string,
): TachistoscopeAttempt {
  const normalizedExpected = normalizeText(expectedWord);
  const normalizedUserInput = normalizeText(userInput);

  return {
    expectedWord,
    userInput,
    isCorrect: normalizedExpected === normalizedUserInput,
  };
}
