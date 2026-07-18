import { getCurrentStudent } from "@/lib/auth/auth";
import type { ExerciseResult, ExerciseType } from "@/lib/results/types";

const STORAGE_KEY = "idil-exercise-results";

export type SecureExerciseResultInput = {
  exerciseType: ExerciseType | string;
  exerciseTitle: string;
  score: number;
  successRate: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  date?: string;
  completedAt?: string;
  assignmentItemId?: string | null;
};

type SecureResultResponse = {
  result?: {
    id: string;
    studentId: string;
    exerciseType: string;
    exerciseTitle: string;
    score: number;
    successRate: number;
    correctCount: number;
    wrongCount: number;
    durationSeconds: number;
    date: string;
    assignmentItemId?: string | null;
  };
};

function getAssignmentItemIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("assignmentItemId")?.trim() || null;
}

function cacheResult(result: ExerciseResult): void {
  if (typeof window === "undefined") return;

  let current: ExerciseResult[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (Array.isArray(parsed)) {
      current = parsed.filter((item): item is ExerciseResult => Boolean(item) && typeof item === "object" && typeof (item as ExerciseResult).id === "string");
    }
  } catch {
    current = [];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify([result, ...current.filter((item) => item.id !== result.id)]));
}

async function completeAssignmentItem(assignmentItemId: string, resultId: string): Promise<void> {
  try {
    await fetch(`/api/student/assignment-items/${encodeURIComponent(assignmentItemId)}/complete`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultId }),
    });
  } catch {
    // Sonuç sunucuda başarıyla kaydedildi; completion daha sonra mevcut akıştan tekrar denenebilir.
  }
}

export async function saveExerciseResultSecure(input: SecureExerciseResultInput): Promise<ExerciseResult> {
  const assignmentItemId = input.assignmentItemId ?? getAssignmentItemIdFromUrl();
  const completedAt = input.completedAt ?? input.date ?? new Date().toISOString();
  const response = await fetch("/api/student/results", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      exerciseType: input.exerciseType,
      exerciseTitle: input.exerciseTitle,
      score: input.score,
      successRate: input.successRate,
      correctCount: input.correctCount,
      wrongCount: input.wrongCount,
      durationSeconds: input.durationSeconds,
      completedAt,
      assignmentItemId,
    }),
  });
  const payload = (await response.json()) as SecureResultResponse;
  if (!response.ok || !payload.result?.id || !payload.result.studentId) {
    throw new Error("Sonuç kaydedilemedi.");
  }

  const currentStudent = getCurrentStudent();
  const result: ExerciseResult = {
    id: payload.result.id,
    studentId: payload.result.studentId,
    studentName: currentStudent?.name?.trim() || "Öğrenci",
    username: currentStudent?.username?.trim() || undefined,
    exerciseType: payload.result.exerciseType as ExerciseType,
    exerciseTitle: payload.result.exerciseTitle,
    score: payload.result.score,
    successRate: payload.result.successRate,
    correctCount: payload.result.correctCount,
    wrongCount: payload.result.wrongCount,
    durationSeconds: payload.result.durationSeconds,
    date: payload.result.date,
  };

  cacheResult(result);
  if (assignmentItemId) {
    await completeAssignmentItem(assignmentItemId, result.id);
  }

  return result;
}
