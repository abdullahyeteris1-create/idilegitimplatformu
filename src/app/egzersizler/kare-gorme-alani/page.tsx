import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { STUDENT_SESSION_COOKIE_NAME } from "@/lib/auth/studentSession";
import { verifyStudentAccessToken } from "@/lib/auth/verifyStudentAccess";
import { readEducationProgramLaunchToken } from "@/lib/education-programs/launchToken";
import { getEducationProgramTaskLaunchContext } from "@/lib/education-programs/studentProgramRepository";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { SquareVisionExerciseClient } from "./SquareVisionExerciseClient";

const EXERCISE_SLUG = "kare-gorme-alani";
const EDUCATION_PROGRAM_ROUTE = "/ogrenci/egitim-programim";
const LAUNCH_QUERY_PARAM = "educationLaunch";

type SquareVisionExercisePageProps = {
  searchParams: Promise<{
    [LAUNCH_QUERY_PARAM]?: string;
  }>;
};

function redirectWithError(code: string): never {
  redirect(`${EDUCATION_PROGRAM_ROUTE}?error=${code}`);
}

export default async function SquareVisionExercisePage({
  searchParams,
}: SquareVisionExercisePageProps) {
  const params = await searchParams;
  const launchToken = params[LAUNCH_QUERY_PARAM];

  // educationLaunch parametresi yoksa: normal serbest egzersiz akisi, Egitim
  // Programi baglami hic devreye girmez - mevcut davranis birebir korunur.
  if (!launchToken) {
    return <SquareVisionExerciseClient />;
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
    // Bozuk imza, degistirilmis payload veya suresi dolmus token (5 dk TTL)
    // ayni sekilde reddedilir - hangisi oldugu ogrenciye asla soylenmez.
    redirectWithError("invalid_launch");
  }

  if (launchContext.studentId !== access.studentId) {
    redirectWithError("unauthorized_task");
  }

  if (launchContext.exerciseSlug !== EXERCISE_SLUG) {
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
  if (result.value.exerciseSlug !== EXERCISE_SLUG) {
    redirectWithError("exercise_mismatch");
  }

  return (
    <SquareVisionExerciseClient
      educationProgramLaunch={{
        taskId: result.value.taskId,
        programId: result.value.programId,
        dayId: result.value.dayId,
        durationSeconds: result.value.durationSeconds,
        initialLevel: result.value.initialLevel,
        resultExerciseType: result.value.resultExerciseType,
        settings: result.value.settings,
        settingsSchemaVersion: result.value.settingsSchemaVersion,
      }}
    />
  );
}
