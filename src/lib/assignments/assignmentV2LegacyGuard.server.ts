import "server-only";

import { isAssignmentUuid, type AssignmentV2ErrorCode } from "@/lib/assignments/assignmentV2";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const TASKS_TABLE = "student_assignment_program_tasks";
const PROGRAMS_TABLE = "student_assignment_programs";

export type AssignmentV2LegacyGuardResult =
  | { ok: true; activeAssignmentTask: boolean }
  | { ok: false; code: AssignmentV2ErrorCode };

/**
 * İstekten yalnız task kimliği adayı alınır. Sahiplik ve aktif-program kararı
 * service-role sorgularındaki gerçek task/program satırları ile, imzalı
 * oturumdan gelen studentId karşılaştırılarak verilir.
 */
export async function inspectAssignmentV2LegacyTask(
  taskId: string,
  signedStudentId: string,
): Promise<AssignmentV2LegacyGuardResult> {
  if (!isAssignmentUuid(taskId)) {
    return { ok: false, code: "TASK_NOT_FOUND" };
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return { ok: false, code: "ASSIGNMENT_V2_GUARD_UNAVAILABLE" };
  }

  const { data: task, error: taskError } = await supabase
    .from(TASKS_TABLE)
    .select("id,student_id,program_id")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    console.error("Assignment V2 legacy task guard query failed", {
      code: taskError.code,
      message: taskError.message,
    });
    return { ok: false, code: "ASSIGNMENT_V2_GUARD_UNAVAILABLE" };
  }
  if (!task) return { ok: false, code: "TASK_NOT_FOUND" };
  if (String(task.student_id ?? "") !== signedStudentId) {
    return { ok: false, code: "TASK_NOT_OWNED" };
  }

  const { data: program, error: programError } = await supabase
    .from(PROGRAMS_TABLE)
    .select("id,student_id,status")
    .eq("id", String(task.program_id ?? ""))
    .maybeSingle();

  if (programError) {
    console.error("Assignment V2 legacy program guard query failed", {
      code: programError.code,
      message: programError.message,
    });
    return { ok: false, code: "ASSIGNMENT_V2_GUARD_UNAVAILABLE" };
  }
  if (!program) {
    return { ok: false, code: "ASSIGNMENT_V2_GUARD_UNAVAILABLE" };
  }
  if (String(program.student_id ?? "") !== signedStudentId) {
    return { ok: false, code: "TASK_NOT_OWNED" };
  }

  return {
    ok: true,
    activeAssignmentTask: program.status === "active",
  };
}
