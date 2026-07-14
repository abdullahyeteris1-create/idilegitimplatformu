import type { ExerciseResult, ExerciseResultInput, ExerciseType } from "@/lib/results/types";
import { getCurrentUser } from "@/lib/auth/auth";
import { supabase } from "@/lib/supabase/client";

const STORAGE_KEY = "idil-exercise-results";
const RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";

type ResultIdentity = {
  studentId?: string;
  studentName?: string;
  username?: string;
};

type ResultCacheEntry = {
  results: ExerciseResult[];
  cachedAt: number;
};

const STUDENT_RESULTS_CACHE_TTL_MS = 60_000;
const studentResultsRemoteCache = new Map<string, ResultCacheEntry>();

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

function buildIdentityCacheKey(identity: ResultIdentity): string {
  const idPart = normalizeLookup(identity.studentId);
  if (idPart) {
    return `id:${idPart}`;
  }

  const usernamePart = normalizeLookup(identity.username);
  if (usernamePart) {
    return `username:${usernamePart}`;
  }

  return `name:${normalizeLookup(identity.studentName)}`;
}

function isUuid(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function filterResultsByIdentity(results: ExerciseResult[], identity: ResultIdentity): ExerciseResult[] {
  if (isUuid(identity.studentId)) {
    return results.filter((result) => result.studentId === identity.studentId);
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

function getResultIdentityDefaults(): { studentId?: string; studentName?: string; username?: string } {
  const currentUser = getCurrentUser();

  if (currentUser?.role !== "student") {
    return {};
  }

  return {
    studentId: currentUser.studentId,
    studentName: currentUser.studentName,
    username: currentUser.username,
  };
}

function mapResultToSupabaseRow(result: ExerciseResult): Record<string, unknown> {
  const completedAt = result.date;
  const safeStudentId = isUuid(result.studentId) ? result.studentId : null;

  return {
    student_id: safeStudentId,
    student_name: result.studentName,
    username: result.username ?? null,
    exercise_type: result.exerciseType,
    exercise_title: result.exerciseTitle,
    correct_count: result.correctCount,
    wrong_count: result.wrongCount,
    score: result.score,
    success_rate: result.successRate,
    details: result.details ?? null,
    completed_at: completedAt,
  };
}

function mapSupabaseRowToResult(row: Record<string, unknown>): ExerciseResult {
  return {
    id: String(row.id ?? generateId()),
    studentId: String(row.student_id ?? row.studentId ?? "no-student"),
    studentName: String(row.student_name ?? row.studentName ?? "Bilinmeyen Ogrenci"),
    username: typeof row.username === "string" ? row.username : undefined,
    exerciseType: String(row.exercise_type ?? row.exerciseType ?? "tachistoscope") as ExerciseType,
    exerciseTitle: String(row.exercise_title ?? row.exerciseTitle ?? "Egzersiz"),
    date: String(row.completed_at ?? row.date ?? new Date().toISOString()),
    durationSeconds: Number(row.duration_seconds ?? row.durationSeconds ?? 0),
    correctCount: Number(row.correct_count ?? row.correctCount ?? 0),
    wrongCount: Number(row.wrong_count ?? row.wrongCount ?? 0),
    score: Number(row.score ?? 0),
    successRate: Number(row.success_rate ?? row.successRate ?? 0),
    details: typeof row.details === "object" && row.details !== null ? (row.details as Record<string, unknown>) : undefined,
  };
}

async function insertResultToSupabase(result: ExerciseResult): Promise<void> {
  const payload = mapResultToSupabaseRow(result);

  console.log("Supabase client exists", Boolean(supabase));
  console.log("Supabase insert payload", payload);

  if (!supabase) {
    return;
  }

  const { data, error } = await supabase.from(RESULTS_TABLE).insert(payload);

  if (!error) {
    console.log("Exercise result saved to Supabase", data);
    return;
  }

  console.error("Supabase exercise_results insert failed", {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
  console.warn("Exercise result Supabase save failed");
}

async function fetchResultsFromSupabase(identity?: ResultIdentity): Promise<ExerciseResult[] | null> {
  if (!supabase) {
    return null;
  }

  let query = supabase.from(RESULTS_TABLE).select("*");

  if (identity) {
    if (isUuid(identity.studentId)) {
      query = query.eq("student_id", identity.studentId);
    } else {
      const username = identity.username?.trim();
      if (username) {
        query = query.eq("username", username);
      } else if (identity.studentName?.trim()) {
        query = query.eq("student_name", identity.studentName.trim());
      }
    }
  }

  const { data, error } = await query.order("completed_at", { ascending: false });

  if (error || !Array.isArray(data)) {
    return null;
  }

  return data.map((row) => mapSupabaseRowToResult(row as Record<string, unknown>));
}

export function saveExerciseResult(result: ExerciseResultInput): ExerciseResult {
  console.log("saveExerciseResult called", result);

  const identityDefaults = getResultIdentityDefaults();
  const nextResult: ExerciseResult = {
    ...result,
    studentId: identityDefaults.studentId ?? result.studentId,
    studentName: identityDefaults.studentName ?? result.studentName,
    username: identityDefaults.username ?? result.username,
    id: result.id ?? generateId(),
    date: result.date ?? new Date().toISOString(),
  };

  console.log("[Exercise Complete] saving result", {
    exerciseType: nextResult.exerciseType,
    exerciseTitle: nextResult.exerciseTitle,
    score: nextResult.score,
    successRate: nextResult.successRate,
  });

  const current = readResults();
  writeResults([nextResult, ...current]);
  console.log("Exercise result saved locally");
  void insertResultToSupabase(nextResult);

  return nextResult;
}

export function getExerciseResults(): ExerciseResult[] {
  return readResults();
}

export function getExerciseResultsByStudent(studentId: string): ExerciseResult[] {
  return readResults().filter((result) => result.studentId === studentId);
}

export function getExerciseResultsByUsername(username: string): ExerciseResult[] {
  const normalizedUsername = normalizeLookup(username);
  if (!normalizedUsername) {
    return [];
  }

  return readResults().filter((result) => normalizeLookup(result.username) === normalizedUsername);
}

export async function getExerciseResultsWithRemote(): Promise<ExerciseResult[]> {
  const remoteResults = await fetchResultsFromSupabase();

  if (remoteResults && remoteResults.length > 0) {
    writeResults(remoteResults);
    return remoteResults;
  }

  return getExerciseResults();
}

export function getExerciseResultsForCurrentUser(): ExerciseResult[] {
  const currentUser = getCurrentUser();

  if (currentUser?.role !== "student") {
    return getExerciseResults();
  }

  return filterResultsByIdentity(readResults(), {
    studentId: currentUser.studentId,
    studentName: currentUser.studentName,
    username: currentUser.username,
  });
}

export async function getExerciseResultsForCurrentUserWithRemote(): Promise<ExerciseResult[]> {
  const currentUser = getCurrentUser();

  if (currentUser?.role !== "student") {
    return getExerciseResultsWithRemote();
  }

  const identity: ResultIdentity = {
    studentId: currentUser.studentId,
    studentName: currentUser.studentName,
    username: currentUser.username,
  };

  const remoteResults = await fetchResultsFromSupabase(identity);

  if (remoteResults && remoteResults.length > 0) {
    const filteredRemoteResults = filterResultsByIdentity(remoteResults, identity);
    writeResults(filteredRemoteResults);
    return filteredRemoteResults;
  }

  return filterResultsByIdentity(readResults(), identity);
}

export function getResultsByStudent(studentId: string, studentName?: string, username?: string): ExerciseResult[] {
  return filterResultsByIdentity(readResults(), { studentId, studentName, username });
}

export async function getResultsByStudentWithRemote(
  studentId: string,
  studentName?: string,
  username?: string,
): Promise<ExerciseResult[]> {
  const identity: ResultIdentity = { studentId, studentName, username };
  const cacheKey = buildIdentityCacheKey(identity);

  if (cacheKey) {
    const cached = studentResultsRemoteCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < STUDENT_RESULTS_CACHE_TTL_MS) {
      return cached.results;
    }
  }

  const remoteResults = await fetchResultsFromSupabase(identity);
  const nextResults = remoteResults
    ? filterResultsByIdentity(remoteResults, identity)
    : getResultsByStudent(studentId, studentName, username);

  if (cacheKey) {
    studentResultsRemoteCache.set(cacheKey, {
      results: nextResults,
      cachedAt: Date.now(),
    });
  }

  return nextResults;
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
  studentName?: string,
  username?: string,
): ExerciseResult | null {
  const results = getResultsByStudent(studentId, studentName, username).filter((result) => result.exerciseType === exerciseType);
  return results[0] ?? null;
}

export function clearExerciseResults(): void {
  if (!hasWindow()) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}
