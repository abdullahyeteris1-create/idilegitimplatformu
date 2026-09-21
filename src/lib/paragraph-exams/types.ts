import type { ParagraphCategory } from "@/lib/paragraph-exercises/paragraphQuestions";

export const PARAGRAPH_EXAM_STATUSES = ["draft", "published", "archived"] as const;
export type ParagraphExamStatus = (typeof PARAGRAPH_EXAM_STATUSES)[number];

export const PARAGRAPH_EXAM_ATTEMPT_STATUSES = [
  "in_progress",
  "submitted",
  "expired",
  "abandoned",
] as const;
export type ParagraphExamAttemptStatus = (typeof PARAGRAPH_EXAM_ATTEMPT_STATUSES)[number];

export const PARAGRAPH_EXAM_STUDENT_STATUSES = ["not_started", "in_progress", "completed"] as const;
export type ParagraphExamStudentStatus = (typeof PARAGRAPH_EXAM_STUDENT_STATUSES)[number];

export type ParagraphExamStudentState = {
  status: ParagraphExamStudentStatus;
  attemptId: string | null;
  completedAt: string | null;
  score: number | null;
  resultAvailable: boolean;
};

export const PARAGRAPH_EXAM_GRADE_BANDS = ["4-5", "6-7", "8", "high-school"] as const;
export type ParagraphExamGradeBand = (typeof PARAGRAPH_EXAM_GRADE_BANDS)[number];

export const PARAGRAPH_EXAM_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type ParagraphExamDifficulty = (typeof PARAGRAPH_EXAM_DIFFICULTIES)[number];
export type ParagraphExamQuestionOptions =
  | [string, string, string, string]
  | [string, string, string, string, string];

export type ParagraphExam = {
  id: string;
  title: string;
  description: string | null;
  gradeBand: ParagraphExamGradeBand;
  durationSeconds: number;
  status: ParagraphExamStatus;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ParagraphExamPassage = {
  id: string;
  examId: string;
  label: string | null;
  passageText: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type ParagraphExamQuestion = {
  id: string;
  examId: string;
  passageId: string | null;
  sourceQuestionId: string | null;
  questionText: string;
  options: ParagraphExamQuestionOptions;
  correctOption: number;
  explanation: string;
  category: ParagraphCategory;
  difficulty: ParagraphExamDifficulty;
  gradeBand: ParagraphExamGradeBand;
  position: number;
  points: number;
  createdAt: string;
  updatedAt: string;
};

export type ParagraphExamAttempt = {
  id: string;
  examId: string;
  examVersion: number;
  studentId: string;
  status: ParagraphExamAttemptStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  correctCount: number | null;
  wrongCount: number | null;
  blankCount: number | null;
  totalPoints: number | null;
  score: number | null;
  accuracy: number | null;
  durationSeconds: number | null;
  submissionKey: string;
  createdAt: string;
  updatedAt: string;
};

export type ParagraphExamAnswer = {
  id: string;
  attemptId: string;
  examQuestionId: string;
  selectedOption: number | null;
  savedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ParagraphExamInput = {
  title: string;
  description?: string | null;
  gradeBand: ParagraphExamGradeBand;
  durationSeconds: number;
};

export type ParagraphExamPassageInput = {
  label?: string | null;
  passageText: string;
  position: number;
};

export type ParagraphExamQuestionInput = {
  passageId?: string | null;
  sourceQuestionId?: string | null;
  questionText: string;
  options: string[];
  correctOption: number;
  explanation: string;
  category: ParagraphCategory;
  difficulty: ParagraphExamDifficulty;
  gradeBand: ParagraphExamGradeBand;
  position: number;
  points?: number;
};

export type SafeParagraphExamQuestion = {
  id: string;
  passageId: string | null;
  questionText: string;
  options: ParagraphExamQuestionOptions;
  position: number;
  selectedOption: number | null;
};

export type SafeParagraphExamPassage = {
  id: string;
  label: string | null;
  passageText: string;
  position: number;
};

export type ParagraphExamSummaryDto = {
  id: string;
  title: string;
  description: string | null;
  gradeBand: ParagraphExamGradeBand;
  durationSeconds: number;
  version: number;
  status?: ParagraphExamStatus;
  studentStatus?: ParagraphExamStudentStatus;
  attemptId?: string | null;
  completedAt?: string | null;
  score?: number | null;
  resultAvailable?: boolean;
};

export type ParagraphExamAttemptDto = {
  attemptId: string;
  exam: ParagraphExamSummaryDto;
  status: ParagraphExamAttemptStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  questions: SafeParagraphExamQuestion[];
  passages: SafeParagraphExamPassage[];
};

export type ParagraphExamResultQuestionDto = {
  id: string;
  passageId: string | null;
  questionText: string;
  options: ParagraphExamQuestionOptions;
  selectedOption: number | null;
  correctOption: number;
  explanation: string;
  category: ParagraphCategory;
  position: number;
  points: number;
};

export type ParagraphExamResultDto = {
  attemptId: string;
  exam: ParagraphExamSummaryDto;
  status: Extract<ParagraphExamAttemptStatus, "submitted" | "expired">;
  startedAt: string;
  expiresAt: string;
  submittedAt: string;
  durationSeconds: number | null;
  totalQuestions: number;
  averageSecondsPerQuestion: number | null;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  totalPoints: number;
  score: number;
  accuracy: number;
  questions: ParagraphExamResultQuestionDto[];
  passages: SafeParagraphExamPassage[];
};

export type ParagraphExamDatabaseError = {
  code?: string;
  constraint?: string;
  message?: string;
  details?: string;
  hint?: string;
};
