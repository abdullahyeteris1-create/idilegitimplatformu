import type { ParagraphExamAttempt, ParagraphExamStudentState } from "./types";

export const PARAGRAPH_EXAM_COMPLETED_ATTEMPT_STATUSES = ["submitted", "expired"] as const;

type AttemptStateInput = Pick<ParagraphExamAttempt, "id" | "status" | "submittedAt" | "score" | "createdAt" | "updatedAt">;

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function deriveStudentExamState(attempts: readonly AttemptStateInput[]): ParagraphExamStudentState {
  const newestFirst = [...attempts].sort((left, right) => timestamp(right.createdAt) - timestamp(left.createdAt));
  const completed = newestFirst.find((attempt) => PARAGRAPH_EXAM_COMPLETED_ATTEMPT_STATUSES.includes(attempt.status as (typeof PARAGRAPH_EXAM_COMPLETED_ATTEMPT_STATUSES)[number]));
  if (completed) {
    return {
      status: "completed",
      attemptId: completed.id,
      completedAt: completed.submittedAt ?? completed.updatedAt,
      score: completed.score,
      resultAvailable: true,
    };
  }
  const active = newestFirst.find((attempt) => attempt.status === "in_progress");
  if (active) {
    return {
      status: "in_progress",
      attemptId: active.id,
      completedAt: null,
      score: null,
      resultAvailable: false,
    };
  }
  return {
    status: "not_started",
    attemptId: null,
    completedAt: null,
    score: null,
    resultAvailable: false,
  };
}