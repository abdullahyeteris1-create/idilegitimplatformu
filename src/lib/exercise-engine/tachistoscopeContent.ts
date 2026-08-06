import { normalizeTachistoscopeLevel } from "@/lib/exercise-engine/tachistoscopeWords";
import type { TachistoscopeWords } from "@/lib/tachistoscope/tachistoscopeShared";

export type TachistoscopeContentType = "letter" | "number" | "mixed";

const LETTERS = Array.from("ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ");
const NUMBERS = Array.from("0123456789");

function getCharacters(contentType: TachistoscopeContentType): string[] {
  if (contentType === "number") return NUMBERS;
  return [...LETTERS, ...NUMBERS];
}

function getWordLength(word: string): number {
  return Array.from(word.trim()).length;
}

function getRandomWord(
  level: unknown,
  wordsByLevel: TachistoscopeWords,
  previousContent: string | undefined,
  random: () => number,
): string {
  const normalizedLevel = normalizeTachistoscopeLevel(level);
  const levelWords = wordsByLevel[normalizedLevel] ?? [];
  const matchingWords = levelWords.filter((word) => {
    const wordLength = getWordLength(word);
    return normalizedLevel === 15 ? wordLength >= 15 : wordLength === normalizedLevel;
  });
  const source = matchingWords.length > 0 ? matchingWords : levelWords;

  if (source.length === 0) return "";
  if (source.length === 1) return source[0].toLocaleUpperCase("tr-TR");

  let selectedWord = source[Math.floor(random() * source.length)];
  let tryCount = 0;

  while (selectedWord.toLocaleUpperCase("tr-TR") === previousContent && tryCount < 10) {
    selectedWord = source[Math.floor(random() * source.length)];
    tryCount += 1;
  }

  return selectedWord.toLocaleUpperCase("tr-TR");
}

export function generateTachistoscopeContent(
  level: unknown,
  contentType: TachistoscopeContentType,
  wordsByLevel: TachistoscopeWords,
  previousContent?: string,
  random: () => number = Math.random,
): string {
  if (contentType === "letter") {
    return getRandomWord(level, wordsByLevel, previousContent, random);
  }

  const length = normalizeTachistoscopeLevel(level);
  const characters = getCharacters(contentType);
  const createContent = () =>
    Array.from({ length }, () => characters[Math.floor(random() * characters.length)]).join("");

  let content = createContent();
  let tryCount = 0;

  while (content === previousContent && tryCount < 10) {
    content = createContent();
    tryCount += 1;
  }

  return content;
}
