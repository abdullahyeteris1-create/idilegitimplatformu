import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readStudentSessionFromRequest } from "@/lib/auth/studentSession";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";
const IDENTITY_QUERY_KEYS = new Set(["studentid", "student_id", "username", "studentname", "student_name"]);

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
    durationSeconds: toFiniteNumber(row.duration_seconds),
    date: completedAt,
    createdAt,
    completedAt,
    assignmentItemId,
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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE?.trim();
  if (!serviceRoleKey) {
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
