import type { Student } from "@/lib/students/types";

const CURRENT_STUDENT_KEY = "idil-current-student";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function getCurrentStudent(): Student | null {
  if (!hasWindow()) {
    return null;
  }

  const raw = localStorage.getItem(CURRENT_STUDENT_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Student;
  } catch {
    return null;
  }
}

export function setCurrentStudent(student: Student): void {
  if (!hasWindow()) {
    return;
  }

  localStorage.setItem(CURRENT_STUDENT_KEY, JSON.stringify(student));
}

export function clearCurrentStudent(): void {
  if (!hasWindow()) {
    return;
  }

  localStorage.removeItem(CURRENT_STUDENT_KEY);
}

export function getCurrentStudentId(): string | null {
  return getCurrentStudent()?.id ?? null;
}

export function getCurrentStudentName(): string | null {
  return getCurrentStudent()?.name ?? null;
}
