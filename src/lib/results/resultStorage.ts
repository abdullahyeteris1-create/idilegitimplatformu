import type { ExerciseResult, ExerciseResultInput, ExerciseType } from "@/lib/results/types";

const STORAGE_KEY = "idil-exercise-results";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function generateId(): string {
  return `res-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function readResults(): ExerciseResult[] {
  if (!hasWindow()) {
    return [];
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ExerciseResult[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => item && typeof item.id === "string");
  } catch {
    return [];
  }
}

function writeResults(results: ExerciseResult[]): void {
  if (!hasWindow()) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

export function saveExerciseResult(result: ExerciseResultInput): ExerciseResult {
  const nextResult: ExerciseResult = {
    ...result,
    id: result.id ?? generateId(),
    date: result.date ?? new Date().toISOString(),
  };

  const current = readResults();
  writeResults([nextResult, ...current]);

  return nextResult;
}

export function getExerciseResults(): ExerciseResult[] {
  return readResults();
}

export function getResultsByStudent(studentId: string): ExerciseResult[] {
  return readResults().filter((result) => result.studentId === studentId);
}

export function getResultsByExercise(exerciseType: ExerciseType): ExerciseResult[] {
  return readResults().filter((result) => result.exerciseType === exerciseType);
}

export function getLatestResultByExercise(exerciseType: ExerciseType): ExerciseResult | null {
  const results = getResultsByExercise(exerciseType);
  return results[0] ?? null;
}

export function getLatestResultByStudentAndExercise(
  studentId: string,
  exerciseType: ExerciseType,
): ExerciseResult | null {
  const results = getResultsByStudent(studentId).filter((result) => result.exerciseType === exerciseType);
  return results[0] ?? null;
}

export function clearExerciseResults(): void {
  if (!hasWindow()) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}
