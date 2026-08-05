import { normalizeTachistoscopeLevel } from "@/lib/exercise-engine/tachistoscopeWords";

export type TachistoscopeContentType = "letter" | "number" | "mixed";

const LETTERS = Array.from("ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ");
const NUMBERS = Array.from("0123456789");

function getCharacters(contentType: TachistoscopeContentType): string[] {
  if (contentType === "letter") return LETTERS;
  if (contentType === "number") return NUMBERS;
  return [...LETTERS, ...NUMBERS];
}

export function generateTachistoscopeContent(
  level: unknown,
  contentType: TachistoscopeContentType,
  previousContent?: string,
  random: () => number = Math.random,
): string {
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
