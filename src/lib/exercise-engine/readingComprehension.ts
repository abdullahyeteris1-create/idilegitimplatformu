import type { ReadingQuestion } from "@/lib/data/readingComprehensionTexts";

export type AnswerEvaluation = {
  questionId: string;
  selectedAnswerIndex: number | null;
  correctAnswerIndex: number;
  isCorrect: boolean;
  isEmpty: boolean;
};

export type AnswerEvaluationSummary = {
  correctCount: number;
  wrongCount: number;
  emptyCount: number;
  evaluations: AnswerEvaluation[];
};

export function countWords(text: string): number {
  const words = text.trim().match(/\S+/g);

  return words?.length ?? 0;
}

export function countCharacters(text: string): number {
  return text.replace(/\s/g, "").length;
}

export function calculateReadingSpeed(wordsCount: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0 || wordsCount <= 0) {
    return 0;
  }

  return Math.round((wordsCount / elapsedSeconds) * 60);
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function calculateComprehensionScore(correctCount: number, totalQuestions: number): number {
  if (totalQuestions <= 0) {
    return 0;
  }

  return Math.round((correctCount / totalQuestions) * 100);
}

export function evaluateAnswers(
  questions: ReadingQuestion[],
  selectedAnswers: Record<string, number | undefined>,
): AnswerEvaluationSummary {
  const evaluations = questions.map((question) => {
    const selectedAnswerIndex = selectedAnswers[question.id] ?? null;
    const isEmpty = selectedAnswerIndex === null;
    const isCorrect = selectedAnswerIndex === question.correctAnswerIndex;

    return {
      questionId: question.id,
      selectedAnswerIndex,
      correctAnswerIndex: question.correctAnswerIndex,
      isCorrect,
      isEmpty,
    };
  });

  const correctCount = evaluations.filter((item) => item.isCorrect).length;
  const emptyCount = evaluations.filter((item) => item.isEmpty).length;

  return {
    correctCount,
    wrongCount: questions.length - correctCount,
    emptyCount,
    evaluations,
  };
}
