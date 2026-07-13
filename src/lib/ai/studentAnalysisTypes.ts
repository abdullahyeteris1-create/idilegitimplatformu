import type { ExerciseType } from "@/lib/results/types";

export type RecommendedExercise = {
  exerciseType: ExerciseType;
  title: string;
  reason: string;
  suggestedSettings: string;
};

export type StudentAnalysis = {
  generalAssessment: string;
  strengths: string[];
  improvementAreas: string[];
  recommendedExercises: RecommendedExercise[];
};

export type StudentAnalysisResponse =
  | { ok: true; analysis: StudentAnalysis }
  | { ok: false; error: string };

