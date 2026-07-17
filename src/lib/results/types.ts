export type ExerciseType =
  | "tachistoscope"
  | "similar-words"
  | "block-reading"
  | "shadow-reading"
  | "focused-reading"
  | "two-side-focus"
  | "attention-maze"
  | "memory-game"
  | "word-finding"
  | "eye-muscle"
  | "reading-comprehension"
  | "letter-number-counting-focus"
  | "card-matching"
  | "visual-puzzle"
  | "eye-brain"
  | "word-guess"
  | "catch-same"
  | "hangman"
  | "grouping-reading"
  | "eye-columns"
  | "square-vision";

export type ExerciseResult = {
  id: string;
  studentId: string;
  studentName: string;
  username?: string;
  exerciseType: ExerciseType;
  exerciseTitle: string;
  date: string;
  durationSeconds: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  successRate: number;
  details?: Record<string, unknown>;
};

export type ExerciseResultInput = Omit<ExerciseResult, "id" | "date"> & {
  id?: string;
  date?: string;
};


