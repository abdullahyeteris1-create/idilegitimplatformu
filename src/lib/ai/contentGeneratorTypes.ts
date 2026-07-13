export const GRADE_LEVELS = [
  "1. sınıf",
  "2. sınıf",
  "3. sınıf",
  "4. sınıf",
  "5. sınıf",
  "6. sınıf",
  "7. sınıf",
  "8. sınıf",
  "Lise",
  "Yetişkin",
] as const;

export const CONTENT_LENGTHS = ["short", "medium", "long"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const CONTENT_TYPES = ["informative", "story", "general-culture", "scientific", "daily-life"] as const;

export type GradeLevel = (typeof GRADE_LEVELS)[number];
export type ContentLength = (typeof CONTENT_LENGTHS)[number];
export type ContentDifficulty = (typeof DIFFICULTIES)[number];
export type ContentType = (typeof CONTENT_TYPES)[number];

export type ContentGeneratorRequest = {
  gradeLevel: GradeLevel;
  topic: string;
  length: ContentLength;
  difficulty: ContentDifficulty;
  questionCount: number;
  contentType: ContentType;
};

export type GeneratedTargetWord = {
  word: string;
  meaning: string;
};

export type GeneratedQuestion = {
  question: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  explanation: string;
};

export type GeneratedContent = {
  title: string;
  content: string;
  summary: string;
  targetWords: GeneratedTargetWord[];
  questions: GeneratedQuestion[];
};

