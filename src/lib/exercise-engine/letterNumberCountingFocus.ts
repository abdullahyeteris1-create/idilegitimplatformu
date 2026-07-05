export type CountingMode = "letters" | "numbers" | "mixed";
export type CountingDifficulty = "normal" | "hard";

export type CountingCharacter = {
  id: string;
  value: string;
  x: number;
  y: number;
  rotation: number;
  size: number;
};

export type CountingRound = {
  characters: CountingCharacter[];
  target: string;
  targetCount: number;
};

type GenerateCountingRoundOptions = {
  level: number;
  difficulty: CountingDifficulty;
  mode: CountingMode;
};

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "K", "L", "M", "N", "P", "R", "S", "T", "Y", "Z"];
const NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

const LEVEL_COUNTS: Record<number, number[]> = {
  1: [8, 10, 11, 12],
  2: [13, 14, 15, 18, 19],
  3: [18, 19, 20, 21, 22],
  4: [23, 24, 25, 26, 27, 28],
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCharacterPool(mode: CountingMode): string[] {
  if (mode === "letters") {
    return LETTERS;
  }

  if (mode === "numbers") {
    return NUMBERS;
  }

  return [...LETTERS, ...NUMBERS];
}

function pickDifferent(pool: string[], target: string): string {
  const available = pool.filter((item) => item !== target);
  return available[randomInt(0, available.length - 1)] ?? target;
}

function createPosition(existing: CountingCharacter[], level: number): { x: number; y: number } {
  const minDistance = Math.max(10, 18 - level * 2.1);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const x = randomInt(8, 92);
    const y = randomInt(12, 82);
    const isFarEnough = existing.every((item) => {
      const dx = item.x - x;
      const dy = item.y - y;
      return Math.sqrt(dx * dx + dy * dy) >= minDistance;
    });

    if (isFarEnough) {
      return { x, y };
    }
  }

  return { x: randomInt(8, 92), y: randomInt(12, 82) };
}

function createCharacter(value: string, index: number, existing: CountingCharacter[], level: number): CountingCharacter {
  const { x, y } = createPosition(existing, level);
  const size = Math.max(22, 36 - level * 2 + randomInt(-2, 3));

  return {
    id: `${value}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    value,
    x,
    y,
    rotation: randomInt(-10, 10),
    size,
  };
}

export function shuffleCharacters<T>(items: T[]): T[] {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInt(0, index);
    [nextItems[index], nextItems[randomIndex]] = [nextItems[randomIndex], nextItems[index]];
  }

  return nextItems;
}

export function getCharacterCountByLevel(level: number, difficulty: CountingDifficulty): number {
  const safeLevel = Math.min(4, Math.max(1, Math.round(level)));
  const counts = LEVEL_COUNTS[safeLevel] ?? LEVEL_COUNTS[1];
  const baseCount = counts[randomInt(0, counts.length - 1)] ?? 10;

  return difficulty === "hard" ? Math.min(30, baseCount + randomInt(1, 3)) : baseCount;
}

export function getRoundDurationBySpeed(speedSeconds: number): number {
  return Math.min(15, Math.max(3, Math.round(speedSeconds)));
}

export function pickTargetCharacter(characters: string[]): string {
  return characters[randomInt(0, characters.length - 1)] ?? "A";
}

export function countTargetCharacter(characters: Array<string | CountingCharacter>, target: string): number {
  return characters.filter((item) => (typeof item === "string" ? item : item.value) === target).length;
}

export function generateCharactersForLevel(
  level: number,
  difficulty: CountingDifficulty,
  mode: CountingMode,
): string[] {
  const pool = getCharacterPool(mode);
  const totalCount = getCharacterCountByLevel(level, difficulty);
  const target = pickTargetCharacter(pool);
  const minTargetCount = Math.max(1, Math.floor(totalCount * 0.18));
  const maxTargetCount = Math.min(30, Math.max(minTargetCount, Math.ceil(totalCount * 0.55)));
  const targetCount = randomInt(minTargetCount, maxTargetCount);
  const characters = Array.from({ length: targetCount }, () => target);

  while (characters.length < totalCount) {
    characters.push(pickDifferent(pool, target));
  }

  return shuffleCharacters(characters);
}

export function generateCountingRound(options: GenerateCountingRoundOptions): CountingRound {
  const pool = getCharacterPool(options.mode);
  const totalCount = getCharacterCountByLevel(options.level, options.difficulty);
  const target = pickTargetCharacter(pool);
  const minTargetCount = Math.max(1, Math.floor(totalCount * 0.18));
  const maxTargetCount = Math.min(30, Math.max(minTargetCount, Math.ceil(totalCount * 0.55)));
  const targetCount = randomInt(minTargetCount, maxTargetCount);
  const rawCharacters = Array.from({ length: targetCount }, () => target);

  while (rawCharacters.length < totalCount) {
    rawCharacters.push(pickDifferent(pool, target));
  }

  const characters = shuffleCharacters(rawCharacters).reduce<CountingCharacter[]>((items, value, index) => {
    items.push(createCharacter(value, index, items, options.level));
    return items;
  }, []);

  return {
    characters,
    target,
    targetCount,
  };
}

export function calculateNet(correctCount: number, wrongCount: number): number {
  return correctCount - wrongCount;
}

export function shouldLevelUp(net: number): boolean {
  return net >= 10;
}

export function getNextLevel(level: number): number {
  return Math.min(4, level + 1);
}
