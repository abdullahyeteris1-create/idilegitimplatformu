export const ONE_MINUTE_SECONDS = 60;
const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?(?:-[\p{L}\p{N}]+)*/gu;

export type ReadingDisplayToken = {
  display: string;
  wordIndex: number;
};

export function tokenizeReadingText(text: string): string[] {
  return Array.from(text.matchAll(WORD_PATTERN), (match) => match[0]);
}

export function countReadingWords(text: string): number {
  return tokenizeReadingText(text).length;
}

export function splitParagraphForDisplay(paragraph: string, startWordIndex = 0): Array<ReadingDisplayToken | { display: string; wordIndex: null }> {
  let wordIndex = startWordIndex;

  return paragraph.split(/(\s+)/u).filter(Boolean).map((part) => {
    const isWord = WORD_PATTERN.test(part);
    WORD_PATTERN.lastIndex = 0;
    if (!isWord) return { display: part, wordIndex: null };

    const token = { display: part, wordIndex };
    wordIndex += 1;
    return token;
  });
}

export function getRemainingSeconds(startedAtMs: number, nowMs: number, durationSeconds = ONE_MINUTE_SECONDS): number {
  const elapsedMs = Math.max(0, nowMs - startedAtMs);
  return Math.max(0, Math.ceil((durationSeconds * 1000 - elapsedMs) / 1000));
}

export function isTimerFinished(startedAtMs: number, nowMs: number, durationSeconds = ONE_MINUTE_SECONDS): boolean {
  return nowMs - startedAtMs >= durationSeconds * 1000;
}

export function calculateWordsRead(lastWordIndex: number | null, totalWords: number): number {
  if (lastWordIndex === null || totalWords <= 0) return 0;
  return Math.min(totalWords, Math.max(0, lastWordIndex + 1));
}

export function validateReadingErrors(errorCount: number, wordsRead: number): number {
  if (!Number.isFinite(errorCount)) return 0;
  return Math.min(Math.max(0, Math.floor(errorCount)), Math.max(0, wordsRead));
}

export function calculateCorrectWords(wordsRead: number, errorCount: number): number {
  return Math.max(0, wordsRead - validateReadingErrors(errorCount, wordsRead));
}

export function calculateComprehensionScore(correctAnswers: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  return Math.round((Math.max(0, correctAnswers) / totalQuestions) * 100);
}
