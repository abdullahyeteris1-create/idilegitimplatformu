import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { getAssignmentExerciseDefinition } from "@/lib/assignments/assignmentExerciseCatalog";
import {
  assignmentV2Error,
  isAssignmentUuid,
  type AssignmentTaskConfig,
  type AssignmentV2ErrorCode,
} from "@/lib/assignments/assignmentV2";
import { isAssignmentV2Enabled } from "@/lib/assignments/assignmentV2Server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TASKS_TABLE = "student_assignment_program_tasks";
const DAYS_TABLE = "student_assignment_program_days";
const PROGRAMS_TABLE = "student_assignment_programs";

function errorResponse(code: AssignmentV2ErrorCode, status?: number) {
  const error = assignmentV2Error(code);
  return NextResponse.json(
    { ok: false, error: { code: error.code, message: error.message } },
    { status: status ?? error.status },
  );
}

function sanitizeSettings(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string | number | boolean] => {
      const setting = entry[1];
      return typeof setting === "string" || typeof setting === "number" || typeof setting === "boolean";
    }),
  );
}

/**
 * İmzalı öğrenci oturumuyla tek bir görev snapshot'ını okur. URL yalnız
 * taskId taşır; süre, seviye ve settings hiçbir query parametresinden
 * türetilmez. Bu route salt okunurdur ve attempt zamanlarını döndürmez.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> },
) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) {
    const response = errorResponse(
      access.status === 401 ? "SESSION_REQUIRED" : access.status === 403 ? "ACCESS_DENIED" : "CONFIG_UNAVAILABLE",
      access.status,
    );
    if (access.clearSessionCookie) clearStudentSessionCookie(response);
    return response;
  }

  const { taskId } = await context.params;
  if (!isAssignmentUuid(taskId)) {
    return errorResponse("INVALID_TASK_ID");
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return errorResponse("CONFIG_UNAVAILABLE");
  }

  const { data: task, error: taskError } = await supabase
    .from(TASKS_TABLE)
    .select(
      "id,program_id,program_day_id,student_id,status,exercise_slug,day_number,task_order,starting_level,duration_seconds,settings",
    )
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    console.error("Assignment task config query failed", {
      code: taskError.code,
      message: taskError.message,
    });
    return errorResponse("CONFIG_UNAVAILABLE");
  }
  if (!task) return errorResponse("TASK_NOT_FOUND");
  // TASK_NOT_OWNED eşlemesinin kullanıcı mesajı: "Bu gorev ogrenciye ait degil."
  if (String(task.student_id ?? "") !== access.studentId) return errorResponse("TASK_NOT_OWNED");

  const [{ data: program, error: programError }, { data: day, error: dayError }] = await Promise.all([
    supabase
      .from(PROGRAMS_TABLE)
      .select("id,student_id,status")
      .eq("id", String(task.program_id ?? ""))
      .maybeSingle(),
    supabase
      .from(DAYS_TABLE)
      .select("id,program_id,day_number,status")
      .eq("id", String(task.program_day_id ?? ""))
      .maybeSingle(),
  ]);

  if (programError || dayError) {
    console.error("Assignment task relations query failed", {
      programCode: programError?.code,
      dayCode: dayError?.code,
    });
    return errorResponse("CONFIG_UNAVAILABLE");
  }
  if (!program || !day) return errorResponse("CONFIG_UNAVAILABLE");
  if (
    String(program.student_id ?? "") !== access.studentId ||
    String(program.id ?? "") !== String(task.program_id ?? "")
  ) {
    return errorResponse("TASK_NOT_OWNED");
  }
  if (program.status !== "active") return errorResponse("PROGRAM_NOT_ACTIVE");
  if (
    String(day.program_id ?? "") !== String(task.program_id ?? "") ||
    Number(day.day_number) !== Number(task.day_number)
  ) {
    return errorResponse("CONFIG_UNAVAILABLE");
  }
  if (day.status === "locked") return errorResponse("DAY_LOCKED");
  if (day.status === "completed") return errorResponse("DAY_ALREADY_COMPLETED");
  if (day.status !== "available" && day.status !== "in_progress") {
    return errorResponse("NOT_CURRENT_DAY");
  }

  const { data: earlierOpenDays, error: earlierDaysError } = await supabase
    .from(DAYS_TABLE)
    .select("id")
    .eq("program_id", String(task.program_id ?? ""))
    .lt("day_number", Number(task.day_number))
    .neq("status", "completed")
    .limit(1);

  if (earlierDaysError) {
    console.error("Assignment current-day query failed", {
      code: earlierDaysError.code,
      message: earlierDaysError.message,
    });
    return errorResponse("CONFIG_UNAVAILABLE");
  }
  if ((earlierOpenDays?.length ?? 0) > 0) return errorResponse("NOT_CURRENT_DAY");

  const exerciseSlug = typeof task.exercise_slug === "string" ? task.exercise_slug : "";
  const definition = getAssignmentExerciseDefinition(exerciseSlug);
  if (!definition) return errorResponse("EXERCISE_MISMATCH");

  const taskStatus = typeof task.status === "string" ? task.status : "";
  const config: AssignmentTaskConfig = {
    taskId: String(task.id ?? ""),
    exerciseSlug,
    route: definition.route,
    title: definition.title,
    dayNumber: typeof task.day_number === "number" ? task.day_number : 0,
    taskOrder: typeof task.task_order === "number" ? task.task_order : 0,
    startingLevel: typeof task.starting_level === "number" ? task.starting_level : 1,
    durationSeconds: typeof task.duration_seconds === "number" ? task.duration_seconds : 0,
    settings: sanitizeSettings(task.settings),
    taskStatus,
    dayStatus: String(day.status ?? ""),
    canStart: taskStatus === "available" || taskStatus === "in_progress",
    assignmentV2Enabled: isAssignmentV2Enabled(),
  };

  return NextResponse.json({ ok: true, task: config });
}
