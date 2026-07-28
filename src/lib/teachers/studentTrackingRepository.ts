import "server-only";

import { calculateStudentProgramProgress } from "@/lib/education-programs/studentProgramPresentation";
import {
  getActiveEducationProgramForStudent,
  STUDENT_EDUCATION_PROGRAMS_TABLE,
} from "@/lib/education-programs/studentProgramRepository";
import { createReadingTestStatistics } from "@/lib/results/readingTestStatistics";
import type { ExerciseResult } from "@/lib/results/types";
import { countEarnedBadges } from "@/lib/xp/xpBadges";
import { getStudentXpSnapshot } from "@/lib/xp/xpLevels";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { buildTeacherStudentActivityFeed } from "./studentTrackingActivity";
import {
  loadTeacherStudentProgramProgress,
  mapTeacherStudentProgramContext,
} from "./studentProgramProgress";
import type {
  TeacherStudentAccountStatus,
  TeacherStudentDetail,
  TeacherStudentProgramContext,
  TeacherStudentListItem,
  TeacherStudentPerformanceSummary,
  TeacherStudentProfile,
  TeacherStudentProgramProgress,
  TeacherStudentProgramSummary,
  TeacherStudentProgramTaskProgress,
} from "./studentTrackingTypes";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const STUDENT_XP_SUMMARY_TABLE = process.env.NEXT_PUBLIC_SUPABASE_XP_SUMMARY_TABLE ?? "student_xp_summary";
const EXERCISE_RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";
const STUDENT_XP_EVENTS_TABLE = "student_xp_events";
const STUDENT_EDUCATION_PROGRAM_TASKS_TABLE = "student_education_program_tasks";

const VALID_STUDENT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DatabaseRow = Record<string, unknown>;

type StudentRow = {
  id: string;
  name: string;
  username: string;
  class_name: string | null;
  phone: string | null;
  status: TeacherStudentAccountStatus;
  is_active: boolean;
  access_end_date: string | null;
  last_login_at: string | null;
  parent_name: string | null;
  education_level: string | null;
  education_status: string | null;
  notes: string | null;
  created_at: string | null;
};

type XpSummaryRow = {
  student_id: string;
  total_xp: number;
};

type ActiveProgramRow = {
  student_id: string;
  visible_name: string;
  current_day_number: number;
  completed_days: number;
  total_days: number;
  assigned_at: string | null;
  started_at: string | null;
};

function readString(row: DatabaseRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return null;
}

function readNumber(row: DatabaseRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function readBoolean(row: DatabaseRow, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "evet", "active", "aktif"].includes(normalized)) {
        return true;
      }
      if (["false", "0", "no", "hayir", "hayır", "passive", "pasif", "inactive"].includes(normalized)) {
        return false;
      }
    }
  }

  return null;
}

function readDateString(row: DatabaseRow, keys: string[]): string | null {
  return readString(row, keys);
}

function isValidStudentId(value: string): boolean {
  return VALID_STUDENT_ID.test(value);
}

function normalizeAccountStatus(row: DatabaseRow): TeacherStudentAccountStatus {
  const status = readString(row, ["status", "state"]);
  if (status === "passive" || status === "inactive" || status === "pasif") {
    return "passive";
  }

  const activeFlag = readBoolean(row, ["is_active", "isActive", "active", "enabled"]);
  if (activeFlag === false) {
    return "passive";
  }

  return "active";
}

function mapStudentRow(row: DatabaseRow): StudentRow | null {
  const id = readString(row, ["id"]);
  const name = readString(row, ["name"]);
  const username = readString(row, ["username"]);
  if (!id || !name || !username) {
    return null;
  }

  return {
    id,
    name,
    username,
    class_name: readString(row, ["class_name", "className"]),
    phone: readString(row, ["phone"]),
    status: normalizeAccountStatus(row),
    is_active: readBoolean(row, ["is_active", "isActive"]) ?? true,
    access_end_date: readDateString(row, ["access_end_date", "accessEndDate"]),
    last_login_at: readDateString(row, ["last_login_at", "lastLoginAt"]),
    parent_name: readString(row, ["parent_name", "parentName"]),
    education_level: readString(row, ["education_level", "educationLevel"]),
    education_status: readString(row, ["education_status", "educationStatus"]),
    notes: readString(row, ["notes"]),
    created_at: readDateString(row, ["created_at", "createdAt"]),
  };
}

function mapXpSummaryRow(row: DatabaseRow): XpSummaryRow | null {
  const studentId = readString(row, ["student_id", "studentId"]);
  const totalXp = readNumber(row, ["total_xp", "totalXp"]);
  if (!studentId || totalXp === null) {
    return null;
  }

  return { student_id: studentId, total_xp: totalXp };
}

function mapActiveProgramRow(row: DatabaseRow): ActiveProgramRow | null {
  const studentId = readString(row, ["student_id", "studentId"]);
  const visibleName = readString(row, ["visible_name", "visibleName"]);
  const currentDayNumber = readNumber(row, ["current_day_number", "currentDayNumber"]);
  const completedDays = readNumber(row, ["completed_days", "completedDays"]);
  const totalDays = readNumber(row, ["total_days", "totalDays"]);

  if (
    !studentId ||
    !visibleName ||
    currentDayNumber === null ||
    completedDays === null ||
    totalDays === null
  ) {
    return null;
  }

  return {
    student_id: studentId,
    visible_name: visibleName,
    current_day_number: currentDayNumber,
    completed_days: completedDays,
    total_days: totalDays,
    assigned_at: readDateString(row, ["assigned_at", "assignedAt"]),
    started_at: readDateString(row, ["started_at", "startedAt"]),
  };
}

function mapProgramTaskProgressRow(row: DatabaseRow): TeacherStudentProgramTaskProgress | null {
  const id = readString(row, ["id"]);
  const programId = readString(row, ["program_id", "programId"]);
  const programDayId = readString(row, ["program_day_id", "programDayId"]);
  const studentId = readString(row, ["student_id", "studentId"]);
  const dayNumber = readNumber(row, ["day_number", "dayNumber"]);
  const orderNumber = readNumber(row, ["order_number", "orderNumber"]);
  const exerciseSlug = readString(row, ["exercise_slug", "exerciseSlug"]);
  const exerciseTitle = readString(row, ["exercise_title", "exerciseTitle"]);

  if (
    !id ||
    !programId ||
    !programDayId ||
    !studentId ||
    dayNumber === null ||
    orderNumber === null ||
    !exerciseSlug ||
    !exerciseTitle
  ) {
    return null;
  }

  return {
    taskId: id,
    programId,
    dayId: programDayId,
    studentId,
    dayNumber,
    orderNumber,
    exerciseSlug,
    exerciseTitle,
    taskType: readString(row, ["result_exercise_type", "resultExerciseType"]) ?? exerciseSlug,
    status: (readString(row, ["status"]) ?? "locked") as TeacherStudentProgramTaskProgress["status"],
    startedAt: readDateString(row, ["started_at", "startedAt"]),
    completedAt: readDateString(row, ["completed_at", "completedAt"]),
    resultId: readString(row, ["result_id", "resultId"]),
    resultSummary: null,
    awardedXp: null,
  };
}

function logSupplementaryTeacherQueryError(queryName: string, error: { code?: string | null; message?: string | null } | null): void {
  if (!error) {
    return;
  }

  console.error(`Teacher panel supplementary query failed: ${queryName}`, {
    code: error.code ?? "unknown",
    message: error.message ?? "unknown",
  });
}

function toDatabaseRows(data: unknown): DatabaseRow[] {
  return Array.isArray(data) ? (data as DatabaseRow[]) : [];
}

function mapResultRow(row: DatabaseRow, fallbackStudent: StudentRow): ExerciseResult | null {
  const id = readString(row, ["id"]);
  const studentId = readString(row, ["student_id", "studentId"]) ?? fallbackStudent.id;
  const exerciseType = readString(row, ["exercise_type", "exerciseType"]);
  const exerciseTitle = readString(row, ["exercise_title", "exerciseTitle"]);
  const completedAt = readDateString(row, ["completed_at", "completedAt", "date"]);

  if (!id || !studentId || !exerciseType || !exerciseTitle || !completedAt) {
    return null;
  }

  const details =
    typeof row.details === "object" && row.details !== null && !Array.isArray(row.details)
      ? (row.details as Record<string, unknown>)
      : undefined;

  return {
    id,
    studentId,
    studentName: readString(row, ["student_name", "studentName"]) ?? fallbackStudent.name,
    username: readString(row, ["username"]) ?? fallbackStudent.username,
    exerciseType: exerciseType as ExerciseResult["exerciseType"],
    exerciseTitle,
    date: completedAt,
    durationSeconds: readNumber(row, ["duration_seconds", "durationSeconds"]) ?? 0,
    correctCount: readNumber(row, ["correct_count", "correctCount"]) ?? 0,
    wrongCount: readNumber(row, ["wrong_count", "wrongCount"]) ?? 0,
    score: readNumber(row, ["score"]) ?? 0,
    successRate: readNumber(row, ["success_rate", "successRate"]) ?? 0,
    submissionKey: readString(row, ["submission_key", "submissionKey"]) ?? undefined,
    details,
  };
}

function buildLastActivityAt(student: StudentRow, latestResultAt: string | null, latestTaskAt: string | null): string | null {
  const candidates = [student.last_login_at, latestResultAt, latestTaskAt];
  let latest: string | null = null;
  let latestTime = -Infinity;

  for (const value of candidates) {
    if (!value) {
      continue;
    }

    const timestamp = new Date(value).getTime();
    if (Number.isFinite(timestamp) && timestamp > latestTime) {
      latest = value;
      latestTime = timestamp;
    }
  }

  return latest;
}

function buildProgramSummary(
  program: TeacherStudentProgramContext | null,
  programProgress: TeacherStudentProgramProgress | null,
): TeacherStudentProgramSummary {
  if (!program) {
    return {
      activeProgramId: null,
      activeProgramName: null,
      currentDayNumber: null,
      completedDays: null,
      totalDays: null,
      progressPercent: null,
      assignedAt: null,
      startedAt: null,
      lastCompletedTaskAt: null,
    };
  }

  const lastCompletedTaskAt = programProgress?.lastCompletedTask?.completedAt ?? programProgress?.completedAt ?? null;

  return {
    activeProgramId: program.id,
    activeProgramName: program.visibleName,
    currentDayNumber: programProgress?.currentDayNumber ?? program.currentDayNumber,
    completedDays: programProgress?.completedDays ?? program.completedDays,
    totalDays: programProgress?.totalDays ?? program.totalDays,
    progressPercent: programProgress
      ? programProgress.totalTasks > 0
        ? programProgress.overallProgressPercent
        : calculateStudentProgramProgress(programProgress.completedDays, programProgress.totalDays)
      : calculateStudentProgramProgress(program.completedDays, program.totalDays),
    assignedAt: program.assignedAt,
    startedAt: program.startedAt,
    lastCompletedTaskAt,
  };
}

function buildPerformanceSummary(results: ExerciseResult[]): TeacherStudentPerformanceSummary {
  const readingStats = createReadingTestStatistics(results);
  const comprehensionRates = readingStats.comprehensionPoints
    .map((item) => item.successRate)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return {
    totalExercises: results.length,
    lastStudyAt: results[0]?.date ?? null,
    latestReadingSpeedWpm: readingStats.summary.latestSpeedWpm,
    highestReadingSpeedWpm: readingStats.summary.highestSpeedWpm,
    latestComprehensionRate: readingStats.summary.latestComprehensionRate,
    averageComprehensionRate:
      comprehensionRates.length > 0
        ? Math.round(comprehensionRates.reduce((sum, value) => sum + value, 0) / comprehensionRates.length)
        : null,
    readingTestCount: readingStats.summary.totalTests,
  };
}

function mapProfile(student: StudentRow): TeacherStudentProfile {
  return {
    studentId: student.id,
    fullName: student.name,
    username: student.username,
    classLabel: student.class_name,
    accountStatus: student.status,
    accessEndsAt: student.access_end_date,
    lastLoginAt: student.last_login_at,
    parentName: student.parent_name,
    parentPhone: student.phone,
    educationLevel: student.education_level,
    educationStatus: student.education_status,
    notes: student.notes,
    createdAt: student.created_at,
  };
}

function mapGamificationSummary(totalXp: number) {
  const snapshot = getStudentXpSnapshot(totalXp);

  return {
    totalXp: snapshot.totalXp,
    level: snapshot.level,
    levelTitle: snapshot.title,
    remainingXp: snapshot.remainingXp,
    progressPercent: snapshot.progressPercent,
    badgeCount: countEarnedBadges(snapshot),
    snapshot,
  };
}

export function isTeacherStudentId(studentId: string): boolean {
  return isValidStudentId(studentId.trim());
}

function getLatestTimestampByStudent(rows: readonly DatabaseRow[]): Map<string, string> {
  const latest = new Map<string, string>();

  for (const row of rows) {
    const studentId = readString(row, ["student_id", "studentId"]);
    const completedAt = readDateString(row, ["completed_at", "completedAt"]);
    if (!studentId || !completedAt) {
      continue;
    }

    const current = latest.get(studentId);
    if (!current || completedAt.localeCompare(current) > 0) {
      latest.set(studentId, completedAt);
    }
  }

  return latest;
}

export async function getTeacherStudentTrackingList(): Promise<TeacherStudentListItem[]> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return [];
  }

  try {
    const { data: studentsData, error: studentsError } = await supabase
      .from(STUDENTS_TABLE)
      .select("id,name,username,class_name,phone,status,is_active,access_end_date,last_login_at")
      .order("name", { ascending: true });

    if (studentsError) {
      console.error("Teacher panel base students query failed", {
        code: studentsError.code ?? "unknown",
        message: studentsError.message ?? "unknown",
      });
      throw new Error("teacher-students-query-failed");
    }

    const [xpResult, programsResult, resultsResult, tasksResult] = await Promise.all([
      supabase
        .from(STUDENT_XP_SUMMARY_TABLE)
        .select("student_id,total_xp")
        .order("total_xp", { ascending: false }),
      supabase
        .from(STUDENT_EDUCATION_PROGRAMS_TABLE)
        .select("student_id,visible_name,current_day_number,completed_days,total_days,assigned_at,started_at")
        .eq("status", "active"),
      supabase
        .from(EXERCISE_RESULTS_TABLE)
        .select("student_id,completed_at")
        .order("completed_at", { ascending: false }),
      supabase
        .from(STUDENT_EDUCATION_PROGRAM_TASKS_TABLE)
        .select("student_id,completed_at")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false }),
    ]);

    logSupplementaryTeacherQueryError("student_xp_summary", xpResult.error);
    logSupplementaryTeacherQueryError("student_education_programs", programsResult.error);
    logSupplementaryTeacherQueryError("exercise_results", resultsResult.error);
    logSupplementaryTeacherQueryError("student_education_program_tasks", tasksResult.error);

    const students = toDatabaseRows(studentsData)
      .map(mapStudentRow)
      .filter((row): row is StudentRow => row !== null);
    const xpByStudent = new Map(
      toDatabaseRows(xpResult.data)
        .map(mapXpSummaryRow)
        .filter((row): row is XpSummaryRow => row !== null)
        .map((row) => [row.student_id, row.total_xp] as const),
    );
    const activeProgramByStudent = new Map(
      toDatabaseRows(programsResult.data)
        .map(mapActiveProgramRow)
        .filter((row): row is ActiveProgramRow => row !== null)
        .map((row) => [row.student_id, row] as const),
    );
    const latestResultByStudent = getLatestTimestampByStudent(toDatabaseRows(resultsResult.data));
    const latestTaskByStudent = getLatestTimestampByStudent(toDatabaseRows(tasksResult.data));

    return students.map((student) => {
      const totalXp = xpByStudent.get(student.id) ?? 0;
      const snapshot = getStudentXpSnapshot(totalXp);
      const activeProgram = activeProgramByStudent.get(student.id) ?? null;

      return {
        studentId: student.id,
        fullName: student.name,
        classLabel: student.class_name,
        accountStatus: student.status,
        accessEndsAt: student.access_end_date,
        totalXp: snapshot.totalXp,
        level: snapshot.level,
        levelTitle: snapshot.title,
        lastActivityAt: buildLastActivityAt(
          student,
          latestResultByStudent.get(student.id) ?? null,
          latestTaskByStudent.get(student.id) ?? null,
        ),
        activeProgramName: activeProgram?.visible_name ?? null,
        programProgressPercent: activeProgram
          ? calculateStudentProgramProgress(activeProgram.completed_days, activeProgram.total_days)
          : null,
      };
    });
  } catch {
    return [];
  }
}

export async function getTeacherStudentDetail(studentId: string): Promise<TeacherStudentDetail | null> {
  const safeStudentId = studentId.trim();
  if (!isValidStudentId(safeStudentId)) {
    return null;
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return null;
  }

  try {
    const studentResult = await supabase
      .from(STUDENTS_TABLE)
      .select(
        "id,name,username,class_name,phone,status,is_active,access_end_date,last_login_at,parent_name,education_level,education_status,notes,created_at",
      )
      .eq("id", safeStudentId)
      .maybeSingle();

    if (studentResult.error) {
      return null;
    }

    const studentRow = studentResult.data ? (studentResult.data as DatabaseRow) : null;
    const student = studentRow ? mapStudentRow(studentRow) : null;
    if (!student) {
      return null;
    }

    const [xpResult, resultsResult, activeProgramResult, xpEventsResult, programTasksResult] = await Promise.all([
      supabase
        .from(STUDENT_XP_SUMMARY_TABLE)
        .select("student_id,total_xp")
        .eq("student_id", safeStudentId)
        .maybeSingle(),
      supabase
        .from(EXERCISE_RESULTS_TABLE)
        .select(
          "id,student_id,student_name,username,exercise_type,exercise_title,completed_at,duration_seconds,correct_count,wrong_count,score,success_rate,submission_key,details",
        )
        .eq("student_id", safeStudentId)
        .order("completed_at", { ascending: false }),
      getActiveEducationProgramForStudent(supabase, safeStudentId),
      supabase
        .from(STUDENT_XP_EVENTS_TABLE)
        .select("idempotency_key,xp_amount,event_type,source_type,source_id,earned_at")
        .eq("student_id", safeStudentId)
        .order("earned_at", { ascending: false })
        .limit(25),
      supabase
        .from(STUDENT_EDUCATION_PROGRAM_TASKS_TABLE)
        .select("id,program_id,program_day_id,student_id,day_number,order_number,exercise_slug,exercise_title,result_exercise_type,status,started_at,completed_at,result_id")
        .eq("student_id", safeStudentId)
        .order("completed_at", { ascending: false })
        .limit(25),
    ]);

    logSupplementaryTeacherQueryError("student_xp_summary(detail)", xpResult.error);
    logSupplementaryTeacherQueryError("exercise_results(detail)", resultsResult.error);
    logSupplementaryTeacherQueryError("student_xp_events", xpEventsResult.error);
    logSupplementaryTeacherQueryError("student_education_program_tasks(detail)", programTasksResult.error);

    const xpRow = xpResult.data ? (xpResult.data as DatabaseRow) : null;
    const totalXp = xpRow ? (mapXpSummaryRow(xpRow)?.total_xp ?? 0) : 0;
    const results = toDatabaseRows(resultsResult.data)
      .map((row) => mapResultRow(row, student))
      .filter((row): row is ExerciseResult => row !== null);
    const activeProgram = activeProgramResult.ok ? mapTeacherStudentProgramContext(activeProgramResult.value) : null;
    const activeProgramError = activeProgramResult.ok ? null : activeProgramResult.message;
    const programProgressResult = await loadTeacherStudentProgramProgress(
      supabase,
      activeProgram,
      activeProgramError,
      safeStudentId,
      results,
      toDatabaseRows(xpEventsResult.data).map((row) => ({
        idempotency_key: readString(row, ["idempotency_key", "idempotencyKey"]) ?? "",
        xp_amount: readNumber(row, ["xp_amount", "xpAmount"]) ?? 0,
        event_type: readString(row, ["event_type", "eventType"]) ?? "",
        source_type: readString(row, ["source_type", "sourceType"]),
        source_id: readString(row, ["source_id", "sourceId"]),
        earned_at: readDateString(row, ["earned_at", "earnedAt"]),
      })),
    );
    const activityFeedResult = buildTeacherStudentActivityFeed({
      studentId: student.id,
      lastLoginAt: student.last_login_at,
      results,
      activeProgram,
      programTasks: toDatabaseRows(programTasksResult.data)
        .map(mapProgramTaskProgressRow)
        .filter((row): row is TeacherStudentProgramTaskProgress => row !== null && row.completedAt !== null),
      xpEvents: toDatabaseRows(xpEventsResult.data).map((row) => ({
        idempotency_key: readString(row, ["idempotency_key", "idempotencyKey"]) ?? "",
        xp_amount: readNumber(row, ["xp_amount", "xpAmount"]) ?? 0,
        event_type: readString(row, ["event_type", "eventType"]) ?? "",
        source_type: readString(row, ["source_type", "sourceType"]),
        source_id: readString(row, ["source_id", "sourceId"]),
        earned_at: readDateString(row, ["earned_at", "earnedAt"]),
      })),
      limit: 10,
    });

    return {
      profile: mapProfile(student),
      gamificationSummary: mapGamificationSummary(totalXp),
      programSummary: buildProgramSummary(activeProgram, programProgressResult.programProgress),
      programProgress: programProgressResult.programProgress,
      programProgressError: programProgressResult.programProgressError,
      performanceSummary: buildPerformanceSummary(results),
      results,
      activityFeed: activityFeedResult.activities,
      activityFeedError: activityFeedResult.error,
    };
  } catch {
    return null;
  }
}
