export type ClickableWord = {
  id: string;
  raw: string;
  normalized: string;
};

export type WordFindingRoundOptions = {
  text: string;
  targetCount: number;
};

export type WordFindingRound = {
  words: ClickableWord[];
  targets: ClickableWord[];
};

export function normalizeWord(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function splitTextIntoClickableWords(text: string): ClickableWord[] {
  return text
    .trim()
    .split(/\s+/)
    .map((raw, index) => ({
      id: `word-${index}`,
      raw,
      normalized: normalizeWord(raw),
    }))
    .filter((word) => word.normalized.length > 0);
}

export function pickTargetWordsFromText(words: ClickableWord[], count: number): ClickableWord[] {
  const uniqueWords = new Map<string, ClickableWord>();

  words.forEach((word) => {
    if (word.normalized.length >= 3 && !uniqueWords.has(word.normalized)) {
      uniqueWords.set(word.normalized, word);
    }
  });

  const candidates = Array.from(uniqueWords.values());
  const shuffled = candidates
    .map((word) => ({ word, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.word);

  return shuffled.slice(0, Math.max(1, Math.min(count, shuffled.length)));
}

export function createWordFindingRound(options: WordFindingRoundOptions): WordFindingRound {
  const words = splitTextIntoClickableWords(options.text);
  const targets = pickTargetWordsFromText(words, options.targetCount);

  return {
    words,
    targets,
  };
}

export function calculateScore(correctCount: number, wrongCount: number): number {
  return correctCount * 10 - wrongCount * 5;
}

export function calculateSuccessRate(correctCount: number, wrongCount: number): number {
  const totalClicks = correctCount + wrongCount;

  if (totalClicks === 0) {
    return 0;
  }

  return Math.round((correctCount / totalClicks) * 100);
}
