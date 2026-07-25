import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { ASSIGNMENT_EXERCISE_BY_SLUG } from "@/lib/assignments/exerciseCatalog";
import { inspectAssignmentV2LegacyTask } from "@/lib/assignments/assignmentV2LegacyGuard.server";
import {
  assignmentV2Error,
  type AssignmentV2ErrorCode,
} from "@/lib/assignments/assignmentV2";
import { isAssignmentV2Enabled } from "@/lib/assignments/assignmentV2Server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STUDENT_ASSIGNMENT_PROGRAM_TASKS_TABLE = "student_assignment_program_tasks";
const EXERCISE_RESULTS_TABLE = "exercise_results";
const COMPLETE_TASK_RPC = "complete_student_assignment_program_task";

type CompletePayload = {
  resultId?: unknown;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

function v2GuardErrorResponse(code: AssignmentV2ErrorCode) {
  const error = assignmentV2Error(code);
  return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status: error.status });
}

/**
 * Bir "20 gunluk kilitli odev programi" gorevini, daha once /api/student/
 * results ile kaydedilmis bir sonuca baglayarak tamamlar. Gunun 5 gorevi de
 * tamamlandiysa gunu, gerekirse programi da tamamlar ve sonraki gunu acar -
 * tum bu is complete_student_assignment_program_task RPC'sinde ATOMIK olarak
 * yapilir (bkz. supabase/migrations/20260725120000_...sql).
 *
 * /api/student/assignment-items/[itemId]/complete/route.ts (eski daily_
 * assignment sistemi) ile AYNI dogrulama sirasini izler: sahiplik + egzersiz
 * turu eslesmesi once burada (uygulama katmaninda, katalog bilgisiyle)
 * yapilir, gercek yazma islemi RPC'ye devredilir.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  let guardedStudentId: string | null = null;

  if (isAssignmentV2Enabled()) {
    const access = await verifyStudentAccess(request);
    if (!access.ok) {
      const code: AssignmentV2ErrorCode =
        access.status === 401
          ? "SESSION_REQUIRED"
          : access.status === 403
            ? "ACCESS_DENIED"
            : "ASSIGNMENT_V2_GUARD_UNAVAILABLE";
      const response = v2GuardErrorResponse(code);
      if (access.clearSessionCookie) clearStudentSessionCookie(response);
      return response;
    }

    const { taskId } = await context.params;
    const guard = await inspectAssignmentV2LegacyTask(taskId, access.studentId);
    if (!guard.ok) return v2GuardErrorResponse(guard.code);
    if (guard.activeAssignmentTask) {
      return v2GuardErrorResponse("ASSIGNMENT_V2_COMPLETION_REQUIRED");
    }
    guardedStudentId = access.studentId;
  }

  let payload: CompletePayload;
  try {
    payload = (await request.json()) as CompletePayload;
  } catch {
    return badRequest("Gecersiz istek govdesi.");
  }

  if (!guardedStudentId) {
    const access = await verifyStudentAccess(request);
    if (!access.ok) {
      const response = NextResponse.json({ ok: false, message: access.message }, { status: access.status });
      if (access.clearSessionCookie) {
        clearStudentSessionCookie(response);
      }
      return response;
    }
    guardedStudentId = access.studentId;
  }

  const studentId = guardedStudentId;

  /**
   * resultId OPSIYONELDIR:
   *   - dolu  -> ogrenci egzersizi bitirdi, sonuc goreve baglanir
   *              (completion_reason='result_submitted')
   *   - bos   -> gorev SURESI DOLDU; sonuc olmadan guvenli bicimde tamamlanir
   *              (completion_reason='time_expired'). Oturum sayaci
   *              (AssignmentTaskTimer) bu yolu kullanir ve govdesi bostur.
   * RPC bu ayrimi p_result_id'nin NULL olup olmamasindan turetir.
   */
  const resultId = typeof payload.resultId === "string" ? payload.resultId.trim() : "";
  const isTimeExpiry = resultId.length === 0;

  const { taskId } = await context.params;
  if (!taskId) {
    return badRequest("taskId gecersiz.");
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const { data: taskRow, error: taskError } = await supabase
    .from(STUDENT_ASSIGNMENT_PROGRAM_TASKS_TABLE)
    .select("id, student_id, status, exercise_slug")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    console.error("Program task lookup failed", { code: taskError.code, message: taskError.message });
    return NextResponse.json({ ok: false, message: "Gorev bilgisi alinamadi. Lutfen tekrar deneyin." }, { status: 500 });
  }

  if (!taskRow) {
    return NextResponse.json({ ok: false, message: "Gorev bulunamadi." }, { status: 404 });
  }

  if (String(taskRow.student_id ?? "") !== studentId) {
    return NextResponse.json({ ok: false, message: "Bu gorev ogrenciye ait degil." }, { status: 403 });
  }

  if (taskRow.status === "completed") {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  // Sonuc dogrulamalari YALNIZ gercek bir sonucla tamamlaniyorsa yapilir.
  // Sure dolumunda dogrulanacak bir sonuc yoktur.
  if (!isTimeExpiry) {
    const { data: resultRow, error: resultError } = await supabase
      .from(EXERCISE_RESULTS_TABLE)
      .select("id, student_id, exercise_type")
      .eq("id", resultId)
      .maybeSingle();

    if (resultError) {
      console.error("Exercise result lookup failed", { code: resultError.code, message: resultError.message });
      return NextResponse.json({ ok: false, message: "Sonuc bilgisi alinamadi. Lutfen tekrar deneyin." }, { status: 500 });
    }

    if (!resultRow) {
      return NextResponse.json({ ok: false, message: "Sonuc bulunamadi." }, { status: 404 });
    }

    if (String(resultRow.student_id ?? "") !== studentId) {
      return NextResponse.json({ ok: false, message: "Sonuc ogrenciye ait degil." }, { status: 403 });
    }

    const exerciseSlug = typeof taskRow.exercise_slug === "string" ? taskRow.exercise_slug : "";
    const mapped = ASSIGNMENT_EXERCISE_BY_SLUG.get(exerciseSlug);
    if (!mapped || mapped.resultExerciseType !== String(resultRow.exercise_type ?? "")) {
      return NextResponse.json({ ok: false, message: "Sonuc egzersiz turu ile gorev uyusmuyor." }, { status: 409 });
    }
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc(COMPLETE_TASK_RPC, {
    p_task_id: taskId,
    p_student_id: studentId,
    p_result_id: isTimeExpiry ? null : resultId,
  });

  if (rpcError) {
    console.error("complete_student_assignment_program_task failed", { code: rpcError.code, message: rpcError.message });
    return NextResponse.json({ ok: false, message: "Gorev tamamlanamadi. Lutfen tekrar deneyin." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, ...(typeof rpcResult === "object" && rpcResult ? rpcResult : {}) });
}
