import { getCurrentUser } from "@/lib/auth/auth";

const STORAGE_KEY = "idil-reading-test-results";

export type ReadingTestResult = {
  id: string;
  studentId: string;
  studentName: string;
  username?: string;
  date: string;
  category: string;
  textTitle: string;
  totalWords: number;
  readingDurationSeconds: number;
  readingSpeedWpm: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  emptyAnswers: number;
  comprehensionScore: number;
  fontSize?: number;
};

export type ReadingTestResultInput = Omit<ReadingTestResult, "id" | "date"> & {
  id?: string;
  date?: string;
};

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function generateId(): string {
  return `read-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function readResults(): ReadingTestResult[] {
  if (!hasWindow()) {
    return [];
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ReadingTestResult[];

    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string") : [];
  } catch {
    return [];
  }
}

function writeResults(results: ReadingTestResult[]): void {
  if (!hasWindow()) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

function normalizeLookup(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/İ/g, "i")
    .replace(/[^a-z0-9]/g, "");
}

function isUuid(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function filterReadingTestsByIdentity(
  results: ReadingTestResult[],
  identity: { studentId?: string; studentName?: string; username?: string },
): ReadingTestResult[] {
  if (identity.studentId) {
    const byStudentId = results.filter((result) => result.studentId === identity.studentId);
    if (byStudentId.length > 0) {
      return byStudentId;
    }

    if (isUuid(identity.studentId)) {
      return byStudentId;
    }
  }

  const normalizedUsername = normalizeLookup(identity.username);
  if (normalizedUsername) {
    return results.filter((result) => normalizeLookup(result.username) === normalizedUsername);
  }

  const normalizedStudentName = normalizeLookup(identity.studentName);
  if (!normalizedStudentName) {
    return [];
  }

  return results.filter((result) => normalizeLookup(result.studentName) === normalizedStudentName);
}

export function saveReadingTestResult(result: ReadingTestResultInput): ReadingTestResult {
  const nextResult: ReadingTestResult = {
    ...result,
    id: result.id ?? generateId(),
    date: result.date ?? new Date().toISOString(),
  };

  writeResults([nextResult, ...readResults()]);

  return nextResult;
}

export function getReadingTestResults(): ReadingTestResult[] {
  return readResults();
}

export function getReadingTestsByUsername(username: string): ReadingTestResult[] {
  const normalizedUsername = normalizeLookup(username);
  if (!normalizedUsername) {
    return [];
  }

  return readResults().filter((result) => normalizeLookup(result.username) === normalizedUsername);
}

export function getReadingTestsByStudent(studentId: string, studentName?: string, username?: string): ReadingTestResult[] {
  return filterReadingTestsByIdentity(readResults(), { studentId, studentName, username });
}

export function getReadingTestsForCurrentUser(): ReadingTestResult[] {
  const currentUser = getCurrentUser();

  if (currentUser?.role !== "student") {
    return getReadingTestResults();
  }

  return filterReadingTestsByIdentity(readResults(), {
    studentId: currentUser.studentId,
    studentName: currentUser.studentName,
    username: currentUser.username,
  });
}
