const STORAGE_KEY = "idil-reading-test-results";

export type ReadingTestResult = {
  id: string;
  studentId: string;
  studentName: string;
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

export function getReadingTestsByStudent(studentId: string): ReadingTestResult[] {
  return readResults().filter((result) => result.studentId === studentId);
}
