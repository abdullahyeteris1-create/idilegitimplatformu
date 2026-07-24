import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/auth/studentSession";
import { verifyStudentAccess } from "@/lib/auth/verifyStudentAccess";
import { getAssignmentExerciseDefinition } from "@/lib/assignments/assignmentExerciseCatalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STUDENT_ASSIGNMENT_PROGRAMS_TABLE = "student_assignment_programs";
const STUDENT_ASSIGNMENT_PROGRAM_DAYS_TABLE = "student_assignment_program_days";
const STUDENT_ASSIGNMENT_PROGRAM_TASKS_TABLE = "student_assignment_program_tasks";

type TodayProgramTask = {
  id: string;
  taskOrder: number;
  exerciseSlug: string;
  title: string;
  category: string | null;
  currentLevel: number;
  durationSeconds: number;
  status: string;
  isReady: boolean;
  route: string | null;
};

/**
 * Giris yapmis ogrencinin AKTIF 20 gunluk programindaki "bugunku" gunu ve
 * gorevlerini dondurur. Salt-okunur - hicbir tabloya yazmaz, hicbir RPC
 * cagirmaz, gorev/gun/program durumunu ILERLETMEZ.
 *
 * "Bugunku gun" ILERLEME BAZLI belirlenir (takvim tarihi DEGIL): programin
 * status IN ('available','in_progress') olan en kucuk day_number'li gunudur
 * - sema zaten "sonraki gun, onceki gun tamamlanmadan acilmaz" kuralini bu
 * sekilde uyguluyor (bkz. create_student_assignment_program RPC'si, 1. gun
 * disindaki tum gunler 'locked' olusturulur).
 *
 * GUVENLIK: service-role Supabase client'i yalniz burada, sunucu tarafinda
 * olusturulur. Ogrenci kimligi yalniz imzali oturum cookie'sinden
 * (verifyStudentAccess) gelir - client'tan hicbir studentId asla okunmaz.
 * Her sorguda student_id ayrica filtrelenir (program_id join'ine ek olarak,
 * katmanli savunma).
 */
export async function GET(request: NextRequest) {
  const access = await verifyStudentAccess(request);
  if (!access.ok) {
    const response = NextResponse.json({ ok: false, message: access.message }, { status: access.status });
    if (access.clearSessionCookie) {
      clearStudentSessionCookie(response);
    }
    return response;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase baglantisi bulunamadi." }, { status: 500 });
  }

  const { data: programRow, error: programError } = await supabase
    .from(STUDENT_ASSIGNMENT_PROGRAMS_TABLE)
    .select("id, status, total_days, completed_days")
    .eq("student_id", access.studentId)
    .eq("status", "active")
    .maybeSingle();

  if (programError) {
    console.error("Active program query failed", { code: programError.code, message: programError.message });
    return NextResponse.json({ ok: false, message: "Program bilgisi alinamadi. Lutfen tekrar deneyin." }, { status: 500 });
  }

  if (!programRow) {
    return NextResponse.json({
      ok: true,
      program: null,
      todayDay: null,
      tasks: [],
      dayCompleted: false,
      programCompleted: false,
    });
  }

  const program = {
    id: String(programRow.id ?? ""),
    status: typeof programRow.status === "string" ? programRow.status : "",
    totalDays: typeof programRow.total_days === "number" ? programRow.total_days : 20,
    completedDays: typeof programRow.completed_days === "number" ? programRow.completed_days : 0,
  };

  const { data: dayRow, error: dayError } = await supabase
    .from(STUDENT_ASSIGNMENT_PROGRAM_DAYS_TABLE)
    .select("id, day_number, status")
    .eq("program_id", program.id)
    .in("status", ["available", "in_progress"])
    .order("day_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (dayError) {
    console.error("Active program day query failed", { code: dayError.code, message: dayError.message });
    return NextResponse.json({ ok: false, message: "Program bilgisi alinamadi. Lutfen tekrar deneyin." }, { status: 500 });
  }

  if (!dayRow) {
    return NextResponse.json({
      ok: true,
      program,
      todayDay: null,
      tasks: [],
      dayCompleted: false,
      programCompleted: true,
    });
  }

  const todayDay = {
    id: String(dayRow.id ?? ""),
    dayNumber: typeof dayRow.day_number === "number" ? dayRow.day_number : 0,
    status: typeof dayRow.status === "string" ? dayRow.status : "",
  };

  const { data: taskRows, error: taskError } = await supabase
    .from(STUDENT_ASSIGNMENT_PROGRAM_TASKS_TABLE)
    .select("id, task_order, exercise_slug, category, status, current_level, duration_seconds")
    .eq("program_day_id", todayDay.id)
    .eq("student_id", access.studentId)
    .order("task_order", { ascending: true });

  if (taskError) {
    console.error("Today's program tasks query failed", { code: taskError.code, message: taskError.message });
    return NextResponse.json({ ok: false, message: "Gorev bilgisi alinamadi. Lutfen tekrar deneyin." }, { status: 500 });
  }

  const rows = Array.isArray(taskRows) ? (taskRows as Record<string, unknown>[]) : [];

  // exercise_title DB'de her zaman null yazilir (RPC bu alani doldurmaz) -
  // gorev adi/route/hazir-mi bilgisi guvenli sunucu katalogundan (slug ile)
  // cozulur, DB'den asla okunmaz. route de AYNI katalogdan gelir - client
  // hicbir zaman exerciseSlug'dan kendi basina bir URL kurmamalidir (Faz 2:
  // yalniz yonlendirme, katalogda karsiligi olmayan/hazir olmayan bir slug
  // icin route null doner, boylece client'ta buton hic render edilmez).
  const tasks: TodayProgramTask[] = rows.map((row) => {
    const exerciseSlug = typeof row.exercise_slug === "string" ? row.exercise_slug : "";
    const definition = getAssignmentExerciseDefinition(exerciseSlug);
    const isReady = definition?.integrationStatus === "ready";

    return {
      id: String(row.id ?? ""),
      taskOrder: typeof row.task_order === "number" ? row.task_order : 0,
      exerciseSlug,
      title: definition?.title ?? exerciseSlug,
      category: typeof row.category === "string" ? row.category : (definition?.category ?? null),
      currentLevel: typeof row.current_level === "number" ? row.current_level : 1,
      durationSeconds: typeof row.duration_seconds === "number" ? row.duration_seconds : 0,
      status: typeof row.status === "string" ? row.status : "",
      isReady,
      route: isReady && definition?.route ? definition.route : null,
    };
  });

  const dayCompleted = todayDay.status === "completed" || (tasks.length > 0 && tasks.every((task) => task.status === "completed"));

  return NextResponse.json({
    ok: true,
    program,
    todayDay,
    tasks,
    dayCompleted,
    programCompleted: false,
  });
}
