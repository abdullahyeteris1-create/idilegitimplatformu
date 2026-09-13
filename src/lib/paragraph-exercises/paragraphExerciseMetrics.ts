export function calculateParagraphAccuracy(correctCount: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  return Math.round((correctCount / totalQuestions) * 100);
}

export function calculateAverageResponseTimeMs(responseTimes: number[], totalQuestions = responseTimes.length): number {
  if (totalQuestions <= 0) return 0;
  return Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / totalQuestions);
}
