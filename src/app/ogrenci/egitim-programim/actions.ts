"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth/studentSession";
import { verifyStudentAccessToken } from "@/lib/auth/verifyStudentAccess";
import { resolveEducationProgramExerciseRoute } from "@/lib/education-programs/exerciseRouteCatalog";
import {
  createEducationProgramLaunchToken,
  EDUCATION_PROGRAM_LAUNCH_QUERY_PARAM,
} from "@/lib/education-programs/launchToken";
import { startEducationProgramTask } from "@/lib/education-programs/studentProgramRepository";
import type { StudentEducationProgramActionState } from "@/lib/education-programs/studentProgramTypes";
import { isEducationProgramUuid } from "@/lib/education-programs/studentProgramValidation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

function taskErrorState(message: string): StudentEducationProgramActionState {
  return { status: "error", message };
}

export async function startEducationProgramTaskAction(
  _previousState: StudentEducationProgramActionState,
  formData: FormData,
): Promise<StudentEducationProgramActionState> {
  const cookieStore = await cookies();
  const access = await verifyStudentAccessToken(
    cookieStore.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "",
  );

  if (!access.ok) {
    redirect("/giris");
  }

  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!isEducationProgramUuid(taskId)) {
    return taskErrorState("Geçersiz görev.");
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return taskErrorState("Eğitim programı servisi yapılandırılmamış.");
  }

  const result = await startEducationProgramTask(supabase, access.studentId, taskId);
  if (!result.ok) {
    return taskErrorState(result.message);
  }

  const route = resolveEducationProgramExerciseRoute(result.value.exerciseSlug);
  if (!route) {
    return taskErrorState("Bu görev için egzersiz bulunamadı.");
  }

  const launchToken = createEducationProgramLaunchToken({
    taskId: result.value.taskId,
    studentId: access.studentId,
    exerciseSlug: result.value.exerciseSlug,
  });
  if (!launchToken) {
    return taskErrorState("Görev başlatma bağlamı oluşturulamadı.");
  }

  redirect(`${route}?${EDUCATION_PROGRAM_LAUNCH_QUERY_PARAM}=${encodeURIComponent(launchToken)}`);
}
