export type { TachistoscopeLevel } from "@/lib/exercise-engine/tachistoscopeWords";

export type TachistoscopeAttempt = {
  word: string;
  answer: string;
  isCorrect: boolean;
  responseTimeMs?: number;
  level?: number;
  shownAt?: string;
  checkedAt?: string;
};

export {
  TACHISTOSCOPE_WORDS_BY_LEVEL,
  getRandomTachistoscopeWord,
  getTachistoscopeWords,
  normalizeTachistoscopeLevel,
} from "@/lib/exercise-engine/tachistoscopeWords";