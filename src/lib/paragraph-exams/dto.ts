import type {
  ParagraphExam,
  ParagraphExamAnswer,
  ParagraphExamAttempt,
  ParagraphExamPassage,
  ParagraphExamQuestion,
  ParagraphExamResultDto,
  ParagraphExamSummaryDto,
  ParagraphExamStudentState,
  ParagraphExamAttemptDto,
  ParagraphExamResultQuestionDto,
  SafeParagraphExamPassage,
  SafeParagraphExamQuestion,
} from "./types";

export function toExamSummaryDto(exam: ParagraphExam, includeStatus = false): ParagraphExamSummaryDto {
  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    gradeBand: exam.gradeBand,
    durationSeconds: exam.durationSeconds,
    version: exam.version,
    ...(includeStatus ? { status: exam.status } : {}),
  };
}

export function toStudentExamSummaryDto(exam: ParagraphExam, state: ParagraphExamStudentState): ParagraphExamSummaryDto {
  return {
    ...toExamSummaryDto(exam),
    studentStatus: state.status,
    attemptId: state.attemptId,
    completedAt: state.completedAt,
    score: state.score,
    resultAvailable: state.resultAvailable,
  };
}

function safePassageDto(passage: ParagraphExamPassage): SafeParagraphExamPassage {
  return {
    id: passage.id,
    label: passage.label,
    passageText: passage.passageText,
    position: passage.position,
  };
}

function safeQuestionDto(question: ParagraphExamQuestion, answer: ParagraphExamAnswer | undefined): SafeParagraphExamQuestion {
  return {
    id: question.id,
    passageId: question.passageId,
    questionText: question.questionText,
    options: question.options,
    position: question.position,
    selectedOption: answer?.selectedOption ?? null,
  };
}

export function toAttemptDto(
  exam: ParagraphExam,
  attempt: ParagraphExamAttempt,
  passages: readonly ParagraphExamPassage[],
  questions: readonly ParagraphExamQuestion[],
  answers: readonly ParagraphExamAnswer[],
): ParagraphExamAttemptDto {
  const answerByQuestion = new Map(answers.map((answer) => [answer.examQuestionId, answer]));
  return {
    attemptId: attempt.id,
    exam: toExamSummaryDto(exam),
    status: attempt.status,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt,
    passages: [...passages].sort((left, right) => left.position - right.position).map(safePassageDto),
    questions: [...questions]
      .sort((left, right) => left.position - right.position)
      .map((question) => safeQuestionDto(question, answerByQuestion.get(question.id))),
  };
}

function resultQuestionDto(question: ParagraphExamQuestion, answer: ParagraphExamAnswer | undefined): ParagraphExamResultQuestionDto {
  return {
    id: question.id,
    passageId: question.passageId,
    questionText: question.questionText,
    options: question.options,
    selectedOption: answer?.selectedOption ?? null,
    correctOption: question.correctOption,
    explanation: question.explanation,
    category: question.category,
    position: question.position,
    points: question.points,
  };
}

export function toResultDto(
  exam: ParagraphExam,
  attempt: ParagraphExamAttempt,
  passages: readonly ParagraphExamPassage[],
  questions: readonly ParagraphExamQuestion[],
  answers: readonly ParagraphExamAnswer[],
): ParagraphExamResultDto | null {
  if ((attempt.status !== "submitted" && attempt.status !== "expired") || !attempt.submittedAt) return null;
  const answerByQuestion = new Map(answers.map((answer) => [answer.examQuestionId, answer]));
  return {
    attemptId: attempt.id,
    exam: toExamSummaryDto(exam),
    status: attempt.status,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    submittedAt: attempt.submittedAt,
    durationSeconds: attempt.durationSeconds ?? 0,
    correctCount: attempt.correctCount ?? 0,
    wrongCount: attempt.wrongCount ?? 0,
    blankCount: attempt.blankCount ?? 0,
    totalPoints: attempt.totalPoints ?? 0,
    score: attempt.score ?? 0,
    accuracy: attempt.accuracy ?? 0,
    passages: [...passages].sort((left, right) => left.position - right.position).map(safePassageDto),
    questions: [...questions]
      .sort((left, right) => left.position - right.position)
      .map((question) => resultQuestionDto(question, answerByQuestion.get(question.id))),
  };
}
