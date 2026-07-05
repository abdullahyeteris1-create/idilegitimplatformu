import type { Student } from "@/lib/students/types";

const CURRENT_STUDENT_KEY = "idil-current-student";
const CURRENT_USER_KEY = "idil_current_user";

export type CurrentUser = {
  role: "teacher" | "student";
  username: string;
  studentId?: string;
  studentName?: string;
};

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
  const currentUser = getCurrentUser();
  if (currentUser?.role === "student") {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function getCurrentStudentId(): string | null {
  return getCurrentStudent()?.id ?? null;
}

export function getCurrentStudentName(): string | null {
  return getCurrentStudent()?.name ?? null;
}

export function getCurrentUser(): CurrentUser | null {
  if (!hasWindow()) {
    return null;
  }

  const raw = localStorage.getItem(CURRENT_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function getResolvedCurrentUser(): CurrentUser | null {
  const currentUser = getCurrentUser();
  if (currentUser) {
    return currentUser;
  }

  const currentStudent = getCurrentStudent();
  if (!currentStudent) {
    return null;
  }

  return {
    role: "student",
    username: currentStudent.username,
    studentId: currentStudent.id,
    studentName: currentStudent.name,
  };
}

export function setCurrentUser(user: CurrentUser): void {
  if (!hasWindow()) {
    return;
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export function clearCurrentUser(): void {
  if (!hasWindow()) {
    return;
  }

  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(CURRENT_STUDENT_KEY);
}
