import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import {
  assignmentV2Error,
  isAssignmentUuid,
  isPlainRecord,
  mapAssignmentV2RpcError,
  normalizeAssignmentCompletionResponse,
  parseAssignmentCompletionRequest,
  type AssignmentV2ErrorCode,
  type AssignmentV2RpcErrorMapping,
} from "@/lib/assignments/assignmentV2";
import { isAssignmentV2Enabled } from "@/lib/assignments/assignmentV2Server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const COMPLETE_TASK_V2_RPC = "complete_student_assignment_program_task_v2";

function mappedErrorResponse(error: AssignmentV2RpcErrorMapping, status = error.status) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.remainingSeconds === undefined ? {} : { remainingSeconds: error.remainingSeconds }),
      },
    },
    { status },
  );
}

function errorResponse(code: AssignmentV2ErrorCode, status?: number) {
  return mappedErrorResponse(assignmentV2Error(code), status);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) {
    const response = errorResponse(
      access.status === 401 ? "SESSION_REQUIRED" : access.status === 403 ? "ACCESS_DENIED" : "UNKNOWN_ERROR",
      access.status,
    );
    if (access.clearSessionCookie) clearStudentSessionCookie(response);
    return response;
  }

  const { taskId } = await context.params;
  if (!isAssignmentUuid(taskId)) return errorResponse("INVALID_TASK_ID");

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST_BODY");
  }

  if (isPlainRecord(rawPayload)) {
    if (!isAssignmentUuid(rawPayload.attemptId)) return errorResponse("INVALID_ATTEMPT_ID");
    if (typeof rawPayload.exerciseSlug !== "string" || !rawPayload.exerciseSlug.trim()) {
      return errorResponse("INVALID_EXERCISE_SLUG");
    }
  }

  const payload = parseAssignmentCompletionRequest(rawPayload);
  if (!payload) {
    return errorResponse(isPlainRecord(rawPayload) && "result" in rawPayload ? "RESULT_SCHEMA_INVALID" : "INVALID_REQUEST_BODY");
  }
  if (!isAssignmentV2Enabled()) return errorResponse("ASSIGNMENT_V2_DISABLED");

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return errorResponse("UNKNOWN_ERROR");

  const { data, error } = await supabase.rpc(COMPLETE_TASK_V2_RPC, {
    p_student_id: access.studentId,
    p_task_id: taskId,
    p_attempt_id: payload.attemptId,
    p_exercise_slug: payload.exerciseSlug,
    p_result: payload.result,
  });

  if (error) {
    console.error("complete_student_assignment_program_task_v2 failed", {
      code: error.code,
      message: error.message,
    });
    return mappedErrorResponse(mapAssignmentV2RpcError(error.message ?? ""));
  }

  const normalized = normalizeAssignmentCompletionResponse(data);
  if (!normalized || normalized.taskId !== taskId || normalized.attemptId !== payload.attemptId) {
    console.error("complete_student_assignment_program_task_v2 returned an invalid response");
    return errorResponse("UNKNOWN_ERROR");
  }

  return NextResponse.json(normalized);
}
