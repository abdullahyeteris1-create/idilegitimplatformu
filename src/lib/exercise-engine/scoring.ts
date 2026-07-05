import type { TachistoscopeAttempt } from "@/lib/exercise-engine/tachistoscope";

export type TachistoscopeScore = {
  correctCount: number;
  wrongCount: number;
  successPercent: number;
  score: number;
};

export function calculateTachistoscopeScore(
  attempts: TachistoscopeAttempt[],
): TachistoscopeScore {
  const total = attempts.length;
  const correctCount = attempts.filter((attempt) => attempt.isCorrect).length;
  const wrongCount = total - correctCount;
  const successPercent = total === 0 ? 0 : Math.round((correctCount / total) * 100);

  const baseScore = correctCount * 60;
  const accuracyBonus = successPercent * 2;
  const score = Math.max(0, Math.min(1000, baseScore + accuracyBonus));

  return {
    correctCount,
    wrongCount,
    successPercent,
    score,
  };
}
