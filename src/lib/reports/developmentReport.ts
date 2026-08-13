import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { calculateDevelopmentMetric } from "./developmentReportCalculations";
import type { DevelopmentReport, DevelopmentReportLesson } from "./developmentReportTypes";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const LESSONS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_LESSONS_TABLE ?? "lessons";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

function readString(row: Row, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function readNumber(row: Row, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined || String(value).trim() === "") continue;
    const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function mapLesson(row: Row): DevelopmentReportLesson | null {
  const id = readString(row, ["id"]);
  const lessonNo = readNumber(row, ["lesson_no", "lessonNo"]);
  const lessonDate = readString(row, ["lesson_date", "lessonDate"]);
  if (!id || lessonNo === null || !lessonDate) return null;

  return {
    id,
    lessonNo,
    lessonDate,
    wordsPerMinute: readNumber(row, ["words_per_minute", "wordsPerMinute"]),
    comprehensionScore: readNumber(row, ["comprehension_score", "comprehensionScore"]),
    focusScore: readNumber(row, ["focus_score", "focusScore"]),
    teacherNote: readString(row, ["teacher_note", "teacherNote"]) ?? "",
  };
}

export async function getDevelopmentReport(studentId: string): Promise<DevelopmentReport | null> {
  await requireTeacherSession();
  const safeStudentId = studentId.trim();
  if (!UUID_PATTERN.test(safeStudentId)) return null;

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) throw new Error("Sunucu veri bağlantısı yapılandırılmamış.");

  const [{ data: studentRow, error: studentError }, { data: lessonRows, error: lessonError }] = await Promise.all([
    supabase
      .from(STUDENTS_TABLE)
      .select("id,name,education_start_date,access_end_date")
      .eq("id", safeStudentId)
      .maybeSingle(),
    supabase
      .from(LESSONS_TABLE)
      .select("id,student_id,lesson_no,lesson_date,words_per_minute,comprehension_score,focus_score,teacher_note")
      .eq("student_id", safeStudentId)
      .order("lesson_no", { ascending: true })
      .order("lesson_date", { ascending: true }),
  ]);

  if (studentError || lessonError || !studentRow) {
    throw new Error("Öğrenci gelişim verileri alınamadı.");
  }

  const lessons = (lessonRows ?? [])
    .map((row) => mapLesson(row as Row))
    .filter((lesson): lesson is DevelopmentReportLesson => lesson !== null)
    .sort((a, b) => a.lessonNo - b.lessonNo || a.lessonDate.localeCompare(b.lessonDate));

  return {
    student: {
      id: safeStudentId,
      name: readString(studentRow as Row, ["name"]) ?? "İsimsiz öğrenci",
      educationStartDate: readString(studentRow as Row, ["education_start_date"]),
      accessEndDate: readString(studentRow as Row, ["access_end_date"]),
    },
    reportDate: new Date().toISOString(),
    lessons,
    metrics: {
      speed: calculateDevelopmentMetric(lessons.map((lesson) => lesson.wordsPerMinute)),
      comprehension: calculateDevelopmentMetric(lessons.map((lesson) => lesson.comprehensionScore)),
      focus: calculateDevelopmentMetric(lessons.map((lesson) => lesson.focusScore)),
    },
  };
}
