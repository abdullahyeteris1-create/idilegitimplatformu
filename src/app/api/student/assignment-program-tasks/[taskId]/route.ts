import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { getAssignmentExerciseDefinition } from "@/lib/assignments/assignmentExerciseCatalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STUDENT_ASSIGNMENT_PROGRAM_TASKS_TABLE = "student_assignment_program_tasks";

/**
 * Giris yapmis ogrencinin TEK bir odev gorevinin calisma ayarlarini dondurur:
 * ogretmenin sablonda belirledigi sure, seviye ve egzersize ozel ayarlar.
 *
 * NEDEN AYRI BIR ENDPOINT: bu degerler URL query parametresiyle TASINAMAZ -
 * tasinsaydi ogrenci adres cubugundan sureyi/seviyeyi degistirebilirdi. URL
 * yalniz gorev KIMLIGINI (programTaskId) tasir; gercek ayarlar her zaman
 * sunucudan, oturum cookie'siyle dogrulanarak okunur.
 *
 * Salt-okunurdur: hicbir tabloya yazmaz, hicbir RPC cagirmaz, gorev durumunu
 * ILERLETMEZ.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) {
    const response = NextResponse.json({ ok: false, message: access.message }, { status: access.status });
    if (access.clearSessionCookie) {
      clearStudentSessionCookie(response);
    }
    return response;
  }

  const { taskId } = await context.params;
  if (!taskId) {
    return NextResponse.json({ ok: false, message: "taskId gecersiz." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const { data: row, error } = await supabase
    .from(STUDENT_ASSIGNMENT_PROGRAM_TASKS_TABLE)
    .select("id, student_id, status, exercise_slug, day_number, task_order, current_level, duration_seconds, settings")
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    console.error("Program task config query failed", { code: error.code, message: error.message });
    return NextResponse.json({ ok: false, message: "Gorev bilgisi alinamadi." }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ ok: false, message: "Gorev bulunamadi." }, { status: 404 });
  }

  if (String(row.student_id ?? "") !== access.studentId) {
    return NextResponse.json({ ok: false, message: "Bu gorev ogrenciye ait degil." }, { status: 403 });
  }

  const exerciseSlug = typeof row.exercise_slug === "string" ? row.exercise_slug : "";
  const definition = getAssignmentExerciseDefinition(exerciseSlug);

  return NextResponse.json({
    ok: true,
    task: {
      id: String(row.id ?? ""),
      status: typeof row.status === "string" ? row.status : "",
      exerciseSlug,
      // Baslik katalogdan cozulur - DB'deki exercise_title her zaman null yazilir.
      title: definition?.title ?? exerciseSlug,
      dayNumber: typeof row.day_number === "number" ? row.day_number : 0,
      taskOrder: typeof row.task_order === "number" ? row.task_order : 0,
      currentLevel: typeof row.current_level === "number" ? row.current_level : 1,
      durationSeconds: typeof row.duration_seconds === "number" ? row.duration_seconds : 0,
      settings:
        row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
          ? (row.settings as Record<string, string | number | boolean>)
          : {},
    },
  });
}
