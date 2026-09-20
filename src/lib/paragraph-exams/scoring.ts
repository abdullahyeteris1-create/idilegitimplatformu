export type ScoreQuestion = {
  id: string;
  correctOption: number;
  points: number;
  optionCount?: number;
};

export type ScoreAnswer = {
  examQuestionId: string;
  selectedOption: number | null;
};

export type ParagraphExamScore = {
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  totalPoints: number;
  score: number;
  accuracy: number;
};

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Scores only against server-loaded question snapshots. Blank answers are not
 * counted as wrong and negative marking is intentionally not supported in V1.
 */
export function scoreParagraphExam(
  questions: readonly ScoreQuestion[],
  answers: readonly ScoreAnswer[],
): ParagraphExamScore {
  const answerByQuestion = new Map(answers.map((answer) => [answer.examQuestionId, answer.selectedOption]));
  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  let totalPoints = 0;
  let score = 0;

  for (const question of questions) {
    const points = Number.isFinite(question.points) && question.points > 0 ? question.points : 1;
    totalPoints += points;
    const selectedOption = answerByQuestion.get(question.id) ?? null;
    if (selectedOption === null || selectedOption === undefined) {
      blankCount += 1;
      continue;
    }
    if (question.optionCount !== undefined && selectedOption >= question.optionCount) {
      wrongCount += 1;
      continue;
    }
    if (selectedOption === question.correctOption) {
      correctCount += 1;
      score += points;
    } else {
      wrongCount += 1;
    }
  }

  return {
    correctCount,
    wrongCount,
    blankCount,
    totalPoints,
    score: round(score),
    accuracy: questions.length > 0 ? round((correctCount / questions.length) * 100) : 0,
  };
}

export function calculateAttemptDurationSeconds(startedAt: string, now = new Date()): number {
  const started = Date.parse(startedAt);
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, Math.floor((now.getTime() - started) / 1000));
}
