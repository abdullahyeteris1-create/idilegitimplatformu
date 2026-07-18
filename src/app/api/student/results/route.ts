import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readStudentSessionFromRequest } from "@/lib/auth/studentSession";
import { ASSIGNMENT_EXERCISE_BY_SLUG } from "@/lib/assignments/exerciseCatalog";
import { getAssignmentItemById, getDailyAssignmentById } from "@/lib/assignments/assignmentRepository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";
const IDENTITY_QUERY_KEYS = new Set(["studentid", "student_id", "username", "studentname", "student_name"]);
const FORBIDDEN_BODY_KEYS = new Set(["studentid", "student_id", "studentname", "student_name", "username", "userid", "user_id"]);
const ALLOWED_BODY_KEYS = new Set([
  "exerciseType",
  "exerciseTitle",
  "score",
  "successRate",
  "correct",
  "wrong",
  "correctCount",
  "wrongCount",
  "durationSeconds",
  "date",
  "completedAt",
  "assignmentItemId",
  "details",
]);
const MAX_SCORE = 1_000_000;
const MAX_ANSWER_COUNT = 100_000;
const MAX_DURATION_SECONDS = 21_600;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_DETAILS_BYTES = 8 * 1024;
const FORBIDDEN_DETAIL_KEYS = new Set([
  "__proto__", "constructor", "prototype",
  "durationseconds", "duration_seconds",
  "assignmentitemid", "assignment_item_id",
  "studentid", "student_id", "resultid", "id",
]);

type DetailRule = {
  type: "boolean" | "integer" | "number" | "string";
  min?: number;
  max?: number;
  maxLength?: number;
  values?: readonly string[];
};

const DETAIL_SCHEMAS: Record<string, Record<string, DetailRule>> = {
  tachistoscope: {
    speedMs: { type: "integer", min: 50, max: 5_000 },
    level: { type: "integer", min: 1, max: 15 },
    contentType: { type: "string", values: ["letter", "number", "mixed"] },
    mode: { type: "string", values: ["automatic", "manual"] },
    net: { type: "integer", min: -100_000, max: 100_000 },
    reachedLevel: { type: "integer", min: 1, max: 15 },
    autoLevelUpCount: { type: "integer", min: 0, max: 15 },
  },
  "similar-words": {
    boxCount: { type: "integer", min: 1, max: 100 },
    targetDifferentCount: { type: "integer", min: 0, max: 100 },
    completedRounds: { type: "integer", min: 0, max: 100_000 },
    net: { type: "integer", min: -100_000, max: 100_000 },
    totalClicks: { type: "integer", min: 0, max: 100_000 },
    scoreRule: { type: "string", maxLength: 120 },
  },
  "word-finding": {
    targetWordsPerText: { type: "integer", min: 1, max: 100 },
    completedRounds: { type: "integer", min: 0, max: 100_000 },
    totalClicks: { type: "integer", min: 0, max: 100_000 },
    net: { type: "integer", min: -100_000, max: 100_000 },
    scoreRule: { type: "string", maxLength: 120 },
  },
  "catch-same": {
    category: { type: "string", maxLength: 80 },
    reason: { type: "string", values: ["finished", "manual"] },
    mode: { type: "string", values: ["word", "letter", "symbol", "number"] },
    speed: { type: "integer", min: 50, max: 10_000 },
    selectedDuration: { type: "integer", min: 1, max: 21_600 },
    wrong: { type: "integer", min: 0, max: 100_000 },
    missed: { type: "integer", min: 0, max: 100_000 },
    roundCount: { type: "integer", min: 0, max: 100_000 },
  },
  "letter-number-counting-focus": {
    mode: { type: "string", values: ["letters", "numbers", "mixed"] },
    startLevel: { type: "integer", min: 1, max: 4 },
    reachedLevel: { type: "integer", min: 1, max: 4 },
    difficulty: { type: "string", values: ["normal", "hard"] },
    speedSeconds: { type: "number", min: 0.1, max: 60 },
    totalRounds: { type: "integer", min: 0, max: 100_000 },
    correctCount: { type: "integer", min: 0, max: 100_000 },
    wrongCount: { type: "integer", min: 0, max: 100_000 },
    net: { type: "integer", min: -100_000, max: 100_000 },
    unansweredCount: { type: "integer", min: 0, max: 100_000 },
    levelUpCount: { type: "integer", min: 0, max: 4 },
    scoreRule: { type: "string", maxLength: 120 },
    maxLevel: { type: "integer", min: 1, max: 4 },
  },
  "square-vision": {
    durationMinutes: { type: "integer", min: 1, max: 360 },
    gridSize: { type: "integer", min: 2, max: 20 },
    level: { type: "integer", min: 1, max: 20 },
    soundEnabled: { type: "boolean" },
    answeredCount: { type: "integer", min: 0, max: 100_000 },
  },
  "color-match": {},
  "memory-game": {},
};

type ValidatedResultBody = {
  exerciseType: string;
  exerciseTitle: string;
  score: number;
  successRate: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  completedAt: string;
  assignmentItemId: string | null;
  details: Record<string, string | number | boolean>;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

function hasClientIdentityParameter(request: NextRequest): boolean {
  return [...request.nextUrl.searchParams.keys()]
    .some((key) => IDENTITY_QUERY_KEYS.has(key.trim().toLowerCase()));
}

function toFiniteNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateDetails(exerciseType: string, value: unknown): Record<string, string | number | boolean> | null {
  if (value === undefined) return {};
  if (!isPlainObject(value)) return null;

  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return null;
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_DETAILS_BYTES) return null;

  const schema = DETAIL_SCHEMAS[exerciseType];
  if (!schema) return null;

  const cleaned: Record<string, string | number | boolean> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (FORBIDDEN_DETAIL_KEYS.has(key.toLowerCase())) return null;
    const rule = schema[key];
    if (!rule) return null;

    if (rule.type === "boolean") {
      if (typeof raw !== "boolean") return null;
      cleaned[key] = raw;
      continue;
    }
    if (rule.type === "string") {
      if (typeof raw !== "string" || raw.length > (rule.maxLength ?? 120)) return null;
      if (rule.values && !rule.values.includes(raw)) return null;
      cleaned[key] = raw;
      continue;
    }
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
    if (rule.type === "integer" && !Number.isInteger(raw)) return null;
    if (rule.min !== undefined && raw < rule.min) return null;
    if (rule.max !== undefined && raw > rule.max) return null;
    cleaned[key] = raw;
  }

  return cleaned;
}

function parseBoundedNumber(value: unknown, maximum: number, integer: boolean): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > maximum) {
    return null;
  }

  if (integer && !Number.isInteger(value)) {
    return null;
  }

  return value;
}

function parseScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < -MAX_SCORE || value > MAX_SCORE) {
    return null;
  }
  return value;
}

function parseAnswerCount(body: Record<string, unknown>, primaryKey: "correctCount" | "wrongCount", aliasKey: "correct" | "wrong"): number | null {
  const primary = body[primaryKey];
  const alias = body[aliasKey];
  if (primary !== undefined && alias !== undefined && primary !== alias) {
    return null;
  }

  return parseBoundedNumber(primary ?? alias, MAX_ANSWER_COUNT, true);
}

function parseCompletedAt(body: Record<string, unknown>): string | null {
  const candidates = [body.completedAt, body.date].filter((value) => value !== undefined && value !== null);
  if (candidates.length === 0 || candidates.some((value) => typeof value !== "string" || !value.trim())) {
    return null;
  }

  const timestamps = candidates.map((value) => new Date(value as string).getTime());
  if (timestamps.some((timestamp) => !Number.isFinite(timestamp) || timestamp > Date.now() + MAX_FUTURE_CLOCK_SKEW_MS)) {
    return null;
  }

  return new Date(timestamps[0]).toISOString();
}

function validateResultBody(value: unknown): ValidatedResultBody | null {
  if (!isPlainObject(value)) return null;

  const keys = Object.keys(value);
  if (keys.some((key) => FORBIDDEN_BODY_KEYS.has(key.trim().toLowerCase()))) return null;
  if (keys.some((key) => !ALLOWED_BODY_KEYS.has(key))) return null;

  const exerciseType = typeof value.exerciseType === "string" ? value.exerciseType.trim() : "";
  if (!exerciseType || exerciseType.length > 64 || !/^[a-z0-9-]+$/.test(exerciseType)) return null;

  const exerciseTitle = typeof value.exerciseTitle === "string" ? value.exerciseTitle.trim() : "";
  if (exerciseTitle.length > 160) return null;

  const score = parseScore(value.score);
  const successRate = parseBoundedNumber(value.successRate, 100, false);
  const correctCount = parseAnswerCount(value, "correctCount", "correct");
  const wrongCount = parseAnswerCount(value, "wrongCount", "wrong");
  const rawDuration = parseBoundedNumber(value.durationSeconds, MAX_DURATION_SECONDS, false);
  const completedAt = parseCompletedAt(value);
  const details = validateDetails(exerciseType, value.details);
  if (score === null || successRate === null || correctCount === null || wrongCount === null || rawDuration === null || completedAt === null || details === null) {
    return null;
  }

  let assignmentItemId: string | null = null;
  if (value.assignmentItemId !== undefined && value.assignmentItemId !== null && value.assignmentItemId !== "") {
    if (typeof value.assignmentItemId !== "string" || !value.assignmentItemId.trim() || value.assignmentItemId.trim().length > 128) {
      return null;
    }
    assignmentItemId = value.assignmentItemId.trim();
  }

  return {
    exerciseType,
    exerciseTitle: exerciseTitle || "Egzersiz",
    score,
    successRate,
    correctCount,
    wrongCount,
    durationSeconds: Math.round(rawDuration),
    completedAt,
    assignmentItemId,
    details,
  };
}

function hasServiceRoleConfiguration(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE?.trim());
}

function mapResult(row: Record<string, unknown>, studentId: string) {
  const completedAt = toOptionalString(row.completed_at) ?? toOptionalString(row.created_at) ?? "";
  const createdAt = toOptionalString(row.created_at) ?? completedAt;
  const correctCount = toFiniteNumber(row.correct_count);
  const wrongCount = toFiniteNumber(row.wrong_count);
  const details = typeof row.details === "object" && row.details !== null
    ? row.details as Record<string, unknown>
    : null;
  const assignmentItemId = toOptionalString(row.assignment_item_id)
    ?? toOptionalString(details?.assignmentItemId)
    ?? toOptionalString(details?.assignment_item_id);

  return {
    id: String(row.id ?? ""),
    studentId,
    exerciseType: String(row.exercise_type ?? ""),
    exerciseTitle: String(row.exercise_title ?? "Egzersiz"),
    score: toFiniteNumber(row.score),
    correct: correctCount,
    wrong: wrongCount,
    correctCount,
    wrongCount,
    successRate: toFiniteNumber(row.success_rate),
    durationSeconds: toFiniteNumber(row.duration_seconds ?? details?.durationSeconds),
    date: completedAt,
    createdAt,
    completedAt,
    assignmentItemId,
    details,
  };
}

export async function GET(request: NextRequest) {
  const session = readStudentSessionFromRequest(request);
  if (!session?.studentId) {
    return jsonResponse({ message: "Yetkisiz erişim." }, 401);
  }

  if (hasClientIdentityParameter(request)) {
    return jsonResponse({ message: "Öğrenci kimliği istek parametresi olarak kabul edilmez." }, 400);
  }

  if (!hasServiceRoleConfiguration()) {
    return jsonResponse({ message: "Sonuç servisi şu anda kullanılamıyor." }, 500);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return jsonResponse({ message: "Sonuç servisi şu anda kullanılamıyor." }, 500);
  }

  try {
    const { data: student, error: studentError } = await supabase
      .from(STUDENTS_TABLE)
      .select("id,is_active")
      .eq("id", session.studentId)
      .maybeSingle();

    if (studentError) {
      return jsonResponse({ message: "Sonuçlar şu anda yüklenemiyor." }, 500);
    }

    if (!student || student.is_active === false || String(student.id) !== session.studentId) {
      return jsonResponse({ message: "Yetkisiz erişim." }, 401);
    }

    const { data, error } = await supabase
      .from(RESULTS_TABLE)
      .select("id,student_id,exercise_type,exercise_title,correct_count,wrong_count,score,success_rate,details,completed_at,created_at")
      .eq("student_id", session.studentId)
      .order("completed_at", { ascending: false });

    if (error || !Array.isArray(data)) {
      return jsonResponse({ message: "Sonuçlar şu anda yüklenemiyor." }, 500);
    }

    const results = data
      .filter((row) => String(row.student_id ?? "") === session.studentId)
      .map((row) => mapResult(row as Record<string, unknown>, session.studentId));

    return jsonResponse({ results });
  } catch {
    return jsonResponse({ message: "Sonuçlar şu anda yüklenemiyor." }, 500);
  }
}

export async function POST(request: NextRequest) {
  const session = readStudentSessionFromRequest(request);
  if (!session?.studentId) {
    return jsonResponse({ message: "Yetkisiz erişim." }, 401);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse({ message: "Geçersiz sonuç verisi." }, 400);
  }

  const body = validateResultBody(rawBody);
  if (!body) {
    return jsonResponse({ message: "Geçersiz sonuç verisi." }, 400);
  }

  if (!hasServiceRoleConfiguration()) {
    return jsonResponse({ message: "Sonuç servisi şu anda kullanılamıyor." }, 500);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return jsonResponse({ message: "Sonuç servisi şu anda kullanılamıyor." }, 500);
  }

  try {
    const { data: student, error: studentError } = await supabase
      .from(STUDENTS_TABLE)
      .select("id,name,username,is_active")
      .eq("id", session.studentId)
      .maybeSingle();

    if (studentError) {
      return jsonResponse({ message: "Sonuç kaydedilemedi." }, 500);
    }

    const studentName = typeof student?.name === "string" ? student.name.trim() : "";
    const username = typeof student?.username === "string" ? student.username.trim() : "";
    if (!student || student.is_active === false || String(student.id) !== session.studentId || !studentName) {
      return jsonResponse({ message: "Öğrenci bulunamadı." }, 404);
    }

    if (body.assignmentItemId) {
      const item = await getAssignmentItemById(supabase, body.assignmentItemId);
      if (!item) {
        return jsonResponse({ message: "Ödev adımı bulunamadı." }, 404);
      }

      const assignment = await getDailyAssignmentById(supabase, item.assignmentId);
      if (!assignment) {
        return jsonResponse({ message: "Ödev bulunamadı." }, 404);
      }

      if (item.studentId !== session.studentId || assignment.studentId !== session.studentId) {
        return jsonResponse({ message: "Bu ödev adımı öğrenciye ait değil." }, 403);
      }

      const exerciseDefinition = ASSIGNMENT_EXERCISE_BY_SLUG.get(item.exerciseSlug);
      if (!exerciseDefinition || exerciseDefinition.resultExerciseType !== body.exerciseType) {
        return jsonResponse({ message: "Egzersiz türü ödev adımıyla uyuşmuyor." }, 409);
      }
      // Mevcut ürün davranışı korunur: tamamlanmış bir item için tekrar çalışma sonucu kaydedilebilir.
    }

    const details = {
      ...body.details,
      durationSeconds: body.durationSeconds,
      ...(body.assignmentItemId ? { assignmentItemId: body.assignmentItemId } : {}),
    };
    const insertPayload = {
      student_id: session.studentId,
      student_name: studentName,
      username: username || session.username,
      exercise_type: body.exerciseType,
      exercise_title: body.exerciseTitle,
      correct_count: body.correctCount,
      wrong_count: body.wrongCount,
      score: body.score,
      success_rate: body.successRate,
      details,
      completed_at: body.completedAt,
    };
    const { data: inserted, error: insertError } = await supabase
      .from(RESULTS_TABLE)
      .insert(insertPayload)
      .select("id,student_id,exercise_type,exercise_title,correct_count,wrong_count,score,success_rate,details,completed_at,created_at")
      .single();

    if (insertError || !inserted || String(inserted.student_id ?? "") !== session.studentId) {
      return jsonResponse({ message: "Sonuç kaydedilemedi." }, 500);
    }

    return jsonResponse({ result: mapResult(inserted as Record<string, unknown>, session.studentId) }, 201);
  } catch {
    return jsonResponse({ message: "Sonuç kaydedilemedi." }, 500);
  }
}
