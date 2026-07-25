import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth/studentSession";
import { verifyStudentAccessToken } from "@/lib/auth/verifyStudentAccess";
import { readEducationProgramLaunchToken } from "@/lib/education-programs/launchToken";
import { getEducationProgramTaskLaunchContext } from "@/lib/education-programs/studentProgramRepository";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { EducationProgramExerciseLaunchProps } from "@/lib/education-programs/exerciseLaunchProps";

// Bes egzersiz route'unun da paylastigi, server-only baglam dogrulama
// zinciri (Kare Gorme Alani'nda FAZ 3A-2'de kanitlanmis akisin aynisi):
// imzali token -> ogrenci oturumu -> studentId eslesmesi -> exerciseSlug
// eslesmesi (token) -> DB'den sahiplik/status/program/gun dogrulamasi ->
// exerciseSlug eslesmesi (DB, ikinci kontrol). Bu dosya client directive
// icermez ve hicbir client bundle'a girmez - yalniz Server Component'lerden
// (page.tsx) cagrilir. Assignment System V2'ye hicbir bagimliligi yoktur.
const EDUCATION_PROGRAM_ROUTE = "/ogrenci/egitim-programim";

function redirectWithError(code: string): never {
  redirect(`${EDUCATION_PROGRAM_ROUTE}?error=${code}`);
}

// launchToken yoksa (normal serbest egzersiz girisi) null doner ve cagiran
// page.tsx hicbir cookie/DB erisimi yapmadan serbest akisi calistirir.
// launchToken varsa: gecersizse bu fonksiyon guvenli bir redirect fırlatır
// (never doner), gecerliyse tipli ve minimal snapshot prop'unu dondurur.
export async function resolveEducationProgramExerciseLaunch(
  launchToken: string | undefined,
  expectedExerciseSlug: string,
): Promise<EducationProgramExerciseLaunchProps | null> {
  if (!launchToken) {
    return null;
  }

  const cookieStore = await cookies();
  const access = await verifyStudentAccessToken(
    cookieStore.get(STUDENT_SESSION_COOKIE_NAME)?.value ?? "",
  );

  if (!access.ok) {
    redirect("/giris");
  }

  const launchContext = readEducationProgramLaunchToken(launchToken);
  if (!launchContext) {
    redirectWithError("invalid_launch");
  }

  if (launchContext.studentId !== access.studentId) {
    redirectWithError("unauthorized_task");
  }

  if (launchContext.exerciseSlug !== expectedExerciseSlug) {
    redirectWithError("exercise_mismatch");
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    redirectWithError("invalid_launch");
  }

  const result = await getEducationProgramTaskLaunchContext(
    supabase,
    access.studentId,
    launchContext.taskId,
  );

  if (!result.ok) {
    if (result.code === "not_found") {
      redirectWithError("unauthorized_task");
    }
    if (result.message.includes("aktif değil")) {
      redirectWithError("program_not_active");
    }
    redirectWithError("task_not_in_progress");
  }

  // DB'deki gercek exercise_slug, token'in tasidigi slug ile TEKRAR
  // karsilastirilir - token'in kendisi hicbir zaman tek basina yeterli kanit
  // sayilmaz, sunucu her istekte snapshot satirindan dogrular.
  if (result.value.exerciseSlug !== expectedExerciseSlug) {
    redirectWithError("exercise_mismatch");
  }

  return {
    taskId: result.value.taskId,
    programId: result.value.programId,
    dayId: result.value.dayId,
    durationSeconds: result.value.durationSeconds,
    initialLevel: result.value.initialLevel,
    resultExerciseType: result.value.resultExerciseType,
    settings: result.value.settings,
    settingsSchemaVersion: result.value.settingsSchemaVersion,
  };
}
