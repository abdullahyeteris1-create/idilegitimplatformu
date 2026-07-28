import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { completeEducationProgramTask } from "@/lib/education-programs/studentProgramRepository";
import { isEducationProgramUuid } from "@/lib/education-programs/studentProgramValidation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Bir Egitim Programi gorevini (student_education_program_tasks) tamamlar.
// Eski odev programi sisteminin analog tamamlama route'uyla AYNI guvenlik/
// yanit deseni kullanilir ama tamamen ayri bir bounded context'te kalir -
// o sisteme hicbir bagimliligi yoktur. Ogrenci kimligi ISTEK GOVDESINDEN
// VEYA URL'DEN ASLA okunmaz - yalniz imzali oturum cookie'sinden
// (verifyStudentAccess) gelir.
const ALLOWED_COMPLETE_BODY_KEYS = new Set(["expectedResultExerciseType"]);
const MAX_RESULT_EXERCISE_TYPE_LENGTH = 100;

const HTTP_STATUS_BY_CODE: Record<string, number> = {
  task_not_found: 404,
  unauthorized_task: 403,
  program_not_active: 409,
  day_not_available: 409,
  task_not_in_progress: 409,
  completion_conflict: 409,
  exercise_mismatch: 409,
  completion_failed: 500,
};

function jsonNoStore(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function errorResponse(code: string, message: string, status: number) {
  return jsonNoStore({ success: false, error: { code, message } }, status);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) {
    const response = jsonNoStore(
      { success: false, error: { code: "unauthorized", message: access.message } },
      access.status,
    );
    if (access.clearSessionCookie) {
      clearStudentSessionCookie(response);
    }
    return response;
  }

  const { taskId } = await context.params;
  if (!isEducationProgramUuid(taskId)) {
    return errorResponse("invalid_task_id", "Geçersiz görev kimliği.", 400);
  }

  const rawBody = await request.text();
  let payload: Record<string, unknown> = {};
  if (rawBody.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return errorResponse("invalid_request", "Geçersiz istek gövdesi.", 400);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return errorResponse("invalid_request", "Geçersiz istek gövdesi.", 400);
    }
    payload = parsed as Record<string, unknown>;
  }

  const bodyKeys = Object.keys(payload);
  if (bodyKeys.some((key) => !ALLOWED_COMPLETE_BODY_KEYS.has(key))) {
    return errorResponse("invalid_request", "Geçersiz istek gövdesi.", 400);
  }

  let expectedResultExerciseType: string | undefined;
  if (payload.expectedResultExerciseType !== undefined) {
    const value = payload.expectedResultExerciseType;
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > MAX_RESULT_EXERCISE_TYPE_LENGTH
    ) {
      return errorResponse("invalid_request", "Geçersiz egzersiz türü.", 400);
    }
    expectedResultExerciseType = value.trim();
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return errorResponse("completion_failed", "Görev tamamlanamadı.", 500);
  }

  const result = await completeEducationProgramTask(
    supabase,
    access.studentId,
    taskId,
    expectedResultExerciseType,
  );

  if (!result.ok) {
    const status = HTTP_STATUS_BY_CODE[result.code] ?? 500;
    return errorResponse(result.code, result.message, status);
  }


  return jsonNoStore({ success: true, ...result.value }, 200);
}
