import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  STUDENT_EDUCATION_PROGRAMS_TABLE,
} from "@/lib/education-programs/studentProgramRepository";
import { getTeacherDashboardDateRange } from "./teacherDashboardDates";
import { buildTeacherDashboardSummary } from "./teacherDashboardSummary";
import type { TeacherDashboardSectionWarning, TeacherDashboardSummaryResult } from "./teacherDashboardTypes";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const STUDENT_XP_SUMMARY_TABLE = process.env.NEXT_PUBLIC_SUPABASE_XP_SUMMARY_TABLE ?? "student_xp_summary";
const EXERCISE_RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";
const STUDENT_XP_EVENTS_TABLE = "student_xp_events";
const STUDENT_EDUCATION_PROGRAM_TASKS_TABLE = "student_education_program_tasks";

type DatabaseRow = Record<string, unknown>;

function logSupplementaryQueryError(queryName: string, error: { code?: string | null; message?: string | null } | null): void {
  if (!error) {
    return;
  }

  console.error(`Teacher dashboard query failed: ${queryName}`, {
    code: error.code ?? "unknown",
    message: error.message ?? "unknown",
  });
}

function toRows(data: unknown): DatabaseRow[] {
  return Array.isArray(data) ? (data as DatabaseRow[]) : [];
}

function getSectionWarnings(args: {
  studentsError: { message?: string | null } | null;
  programsError: { message?: string | null } | null;
  xpSummaryError: { message?: string | null } | null;
  resultsError: { message?: string | null } | null;
  tasksError: { message?: string | null } | null;
  xpEventsError: { message?: string | null } | null;
}): TeacherDashboardSectionWarning[] {
  const warnings: TeacherDashboardSectionWarning[] = [];

  if (args.programsError) {
    warnings.push({ section: "programs", message: "Aktif program verileri yüklenemedi." });
  }
  if (args.xpSummaryError) {
    warnings.push({ section: "xp", message: "Toplam XP verisi yüklenemedi." });
  }
  if (args.resultsError) {
    warnings.push({ section: "results", message: "Egzersiz verileri yüklenemedi." });
  }
  if (args.tasksError) {
    warnings.push({ section: "tasks", message: "Program görevleri yüklenemedi." });
  }
  if (args.xpEventsError) {
    warnings.push({ section: "activities", message: "XP etkinlikleri yüklenemedi." });
  }

  return warnings;
}

function applySectionNulls(summary: NonNullable<TeacherDashboardSummaryResult["summary"]>, args: {
  programsError: { message?: string | null } | null;
  xpSummaryError: { message?: string | null } | null;
  resultsError: { message?: string | null } | null;
  tasksError: { message?: string | null } | null;
  xpEventsError: { message?: string | null } | null;
}): NonNullable<TeacherDashboardSummaryResult["summary"]> {
  const stats = {
    ...summary.stats,
    activePrograms: args.programsError ? null : summary.stats.activePrograms,
    totalXp: args.xpSummaryError ? null : summary.stats.totalXp,
    activeStudentsLast7Days: args.resultsError || args.tasksError ? null : summary.stats.activeStudentsLast7Days,
    completedActivitiesLast7Days: args.resultsError || args.tasksError ? null : summary.stats.completedActivitiesLast7Days,
    earnedXpLast7Days: args.xpEventsError ? null : summary.stats.earnedXpLast7Days,
  };

  return {
    ...summary,
    stats,
  };
}

export async function getTeacherDashboardSummary(): Promise<TeacherDashboardSummaryResult> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      summary: null,
      error: "Panel verileri şu anda yüklenemiyor.",
    };
  }

  const dashboardRange = getTeacherDashboardDateRange(30);

  try {
    const [
      studentsResult,
      activeProgramsResult,
      xpSummaryResult,
      resultsResult,
      tasksResult,
      xpEventsResult,
    ] = await Promise.all([
      supabase
        .from(STUDENTS_TABLE)
        .select("id,name,class_name,status,is_active,access_end_date,last_login_at,education_level,created_at")
        .order("name", { ascending: true }),
      supabase
        .from(STUDENT_EDUCATION_PROGRAMS_TABLE)
        .select("id,student_id,visible_name,status,current_day_number,completed_days,total_days,assigned_at,started_at,completed_at")
        .order("assigned_at", { ascending: false }),
      supabase
        .from(STUDENT_XP_SUMMARY_TABLE)
        .select("student_id,total_xp"),
      supabase
        .from(EXERCISE_RESULTS_TABLE)
        .select(
          "id,student_id,student_name,username,exercise_type,exercise_title,completed_at,created_at,correct_count,wrong_count,score,success_rate,submission_key,program_task_id,details",
        )
        .gte("completed_at", dashboardRange.startInclusiveIso)
        .lt("completed_at", dashboardRange.endExclusiveIso)
        .order("completed_at", { ascending: false }),
      supabase
        .from(STUDENT_EDUCATION_PROGRAM_TASKS_TABLE)
        .select(
          "id,program_id,student_id,day_number,order_number,exercise_slug,exercise_title,result_exercise_type,status,started_at,completed_at,result_id",
        )
        .not("completed_at", "is", null)
        .gte("completed_at", dashboardRange.startInclusiveIso)
        .lt("completed_at", dashboardRange.endExclusiveIso)
        .order("completed_at", { ascending: false }),
      supabase
        .from(STUDENT_XP_EVENTS_TABLE)
        .select("idempotency_key,xp_amount,event_type,source_type,source_id,earned_at")
        .gte("earned_at", dashboardRange.startInclusiveIso)
        .lt("earned_at", dashboardRange.endExclusiveIso)
        .order("earned_at", { ascending: false }),
    ]);

    logSupplementaryQueryError("students", studentsResult.error);
    logSupplementaryQueryError("student_education_programs", activeProgramsResult.error);
    logSupplementaryQueryError("student_xp_summary", xpSummaryResult.error);
    logSupplementaryQueryError("exercise_results", resultsResult.error);
    logSupplementaryQueryError("student_education_program_tasks", tasksResult.error);
    logSupplementaryQueryError("student_xp_events", xpEventsResult.error);

    if (studentsResult.error) {
      return {
        summary: null,
        error: "Öğrenci verileri şu anda yüklenemiyor. Lütfen daha sonra tekrar deneyin.",
      };
    }

    const warnings = getSectionWarnings({
      studentsError: studentsResult.error,
      programsError: activeProgramsResult.error,
      xpSummaryError: xpSummaryResult.error,
      resultsError: resultsResult.error,
      tasksError: tasksResult.error,
      xpEventsError: xpEventsResult.error,
    });

    const summaryResult = buildTeacherDashboardSummary({
      students: toRows(studentsResult.data),
      activePrograms: toRows(activeProgramsResult.data),
      xpSummaries: toRows(xpSummaryResult.data),
      results: toRows(resultsResult.data),
      tasks: toRows(tasksResult.data),
      xpEvents: toRows(xpEventsResult.data),
      now: new Date(),
    });

    if (!summaryResult.summary) {
      return {
        summary: null,
        error: summaryResult.error,
      };
    }

    return {
      summary: {
        ...applySectionNulls(summaryResult.summary, {
          programsError: activeProgramsResult.error,
          xpSummaryError: xpSummaryResult.error,
          resultsError: resultsResult.error,
          tasksError: tasksResult.error,
          xpEventsError: xpEventsResult.error,
        }),
        warnings,
      },
      error: null,
    };
  } catch (error) {
    console.error("Teacher dashboard repository threw", error);
    return {
      summary: null,
      error: "Panel verileri şu anda yüklenemiyor.",
    };
  }
}
