import type { ExerciseResult } from "@/lib/results/types";
import { normalizeStudentStatus, type StudentStatus } from "@/lib/students/studentStatus";
import { getStudentXpSnapshot } from "@/lib/xp/xpLevels";
import type {
  TeacherDashboardAttentionReasonCode,
  TeacherDashboardAttentionStudent,
  TeacherDashboardRecentActivity,
  TeacherDashboardRecentStudent,
  TeacherDashboardSectionWarning,
  TeacherDashboardStats,
  TeacherDashboardSummary,
  TeacherDashboardSummaryResult,
} from "./teacherDashboardTypes";
import type { TeacherStudentActivityType, TeacherStudentProgramStatus } from "./studentTrackingTypes";

type DatabaseRow = Record<string, unknown>;

type StudentRow = {
  id: string;
  name: string;
  class_name: string | null;
  status: StudentStatus;
  is_active: boolean;
  access_end_date: string | null;
  last_login_at: string | null;
  created_at: string | null;
};

type ProgramRow = {
  id: string;
  student_id: string;
  visible_name: string;
  status: TeacherStudentProgramStatus;
  current_day_number: number;
  completed_days: number;
  total_days: number;
  completed_at: string | null;
};

type ResultEntry = ExerciseResult & {
  programTaskId?: string | null;
};

type NormalizedResult = ResultEntry & {
  occurredAt: string;
  timestamp: number;
};

type TaskRow = {
  id: string;
  program_id: string;
  student_id: string;
  day_number: number;
  order_number: number;
  exercise_slug: string;
  exercise_title: string;
  result_exercise_type: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  result_id: string | null;
};

type NormalizedTask = TaskRow & {
  occurredAt: string;
  timestamp: number;
};

type XpSummaryRow = {
  student_id: string;
  total_xp: number;
};

type XpEventRow = {
  idempotency_key: string;
  xp_amount: number;
  event_type: string;
  source_type: string | null;
  source_id: string | null;
  earned_at: string;
};

type DashboardActivityKind = "login" | "exercise" | "program_task";

type DashboardActivityEntry = TeacherDashboardRecentActivity & {
  dedupeKey: string;
  kind: DashboardActivityKind;
  countAsActiveStudent: boolean;
  countAsCompletedWork: boolean;
};

type NormalizedStudent = StudentRow & {
  active: boolean;
  completed: boolean;
  accessExpired: boolean;
};

type NormalizedProgram = ProgramRow & {
  active: boolean;
};

const DASHBOARD_ERROR_MESSAGE = "Panel verileri şu anda yüklenemiyor.";
const ISTANBUL_TIME_ZONE = "Europe/Istanbul";
const RECENT_WINDOW_DAYS = 30;
const ACTIVITY_LIMIT = 10;
const RECENT_STUDENT_LIMIT = 5;
const ATTENTION_LIMIT = 5;
const PERFORMANCE_DECLINE_PERCENT = 15;
const PERFORMANCE_DECLINE_POINTS = 15;


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

function normalizeTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getTodayDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  if (!year || !month || !day) {
    throw new Error("Tarih oluşturulamadı.");
  }

  return `${year}-${month}-${day}`;
}

function shiftDateKey(dateKey: string, offsetDays: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new Error("Tarih aralığı oluşturulamadı.");
  }

  const shifted = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + offsetDays));
  return formatDateOnly(shifted);
}

function getIstanbulDateKey(value: string | null): string | null {
  const timestamp = normalizeTimestamp(value);
  if (timestamp === null) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function createDateRange(now: Date, days = RECENT_WINDOW_DAYS): {
  startDateKey: string;
  endDateKey: string;
  startInclusiveIso: string;
  endExclusiveIso: string;
} {
  const safeDays = Math.max(1, Math.trunc(days));
  const todayKey = getTodayDateKey(now);
  const startDateKey = shiftDateKey(todayKey, -(safeDays - 1));
  const endDateKey = shiftDateKey(todayKey, 1);

  return {
    startDateKey,
    endDateKey,
    startInclusiveIso: `${startDateKey}T00:00:00+03:00`,
    endExclusiveIso: `${endDateKey}T00:00:00+03:00`,
  };
}

function parseAccessExpiry(accessEndDate: string | null, now = new Date()): boolean {
  if (!accessEndDate) {
    return false;
  }

  const normalized = accessEndDate.trim();
  if (!normalized) {
    return false;
  }

  const currentDateKey = getTodayDateKey(now);
  const dateKey = getIstanbulDateKey(normalized);
  if (dateKey) {
    return dateKey < currentDateKey;
  }

  const timestamp = new Date(normalized).getTime();
  return Number.isFinite(timestamp) ? timestamp < now.getTime() : false;
}

function normalizeDashboardStudentStatus(row: DatabaseRow): StudentStatus {
  const isActive = readBoolean(row, ["is_active", "isActive", "active", "enabled"]);
  return normalizeStudentStatus(
    readString(row, ["status", "state"]),
    isActive === false ? "passive" : "active",
  );
}

function normalizeStudentRow(row: DatabaseRow, now = new Date()): NormalizedStudent | null {
  const id = readString(row, ["id"]);
  const name = readString(row, ["name"]);
  if (!id || !name) {
    return null;
  }

  const status = normalizeDashboardStudentStatus(row);
  const isActive = readBoolean(row, ["is_active", "isActive"]) ?? status === "active";

  return {
    id,
    name,
    class_name: readString(row, ["class_name", "className"]),
    status,
    is_active: isActive,
    access_end_date: readDateString(row, ["access_end_date", "accessEndDate"]),
    last_login_at: readDateString(row, ["last_login_at", "lastLoginAt"]),
    created_at: readDateString(row, ["created_at", "createdAt"]),
    active: status === "active",
    completed: status === "completed",
    accessExpired: parseAccessExpiry(readDateString(row, ["access_end_date", "accessEndDate"]), now),
  };
}

function normalizeProgramStatus(value: unknown): TeacherStudentProgramStatus {
  if (value === "completed" || value === "cancelled") {
    return value;
  }
  return "active";
}

function normalizeProgramRow(row: DatabaseRow): NormalizedProgram | null {
  const id = readString(row, ["id"]);
  const studentId = readString(row, ["student_id", "studentId"]);
  const visibleName = readString(row, ["visible_name", "visibleName"]);
  const currentDayNumber = readNumber(row, ["current_day_number", "currentDayNumber"]);
  const completedDays = readNumber(row, ["completed_days", "completedDays"]);
  const totalDays = readNumber(row, ["total_days", "totalDays"]);

  if (!id || !studentId || !visibleName || currentDayNumber === null || completedDays === null || totalDays === null) {
    return null;
  }

  const status = normalizeProgramStatus(readString(row, ["status"]));

  return {
    id,
    student_id: studentId,
    visible_name: visibleName,
    status,
    current_day_number: currentDayNumber,
    completed_days: completedDays,
    total_days: totalDays,
    completed_at: readDateString(row, ["completed_at", "completedAt"]),
    active: status === "active",
  };
}

function normalizeResultRow(row: DatabaseRow): NormalizedResult | null {
  const id = readString(row, ["id"]);
  const studentId = readString(row, ["student_id", "studentId"]);
  const exerciseType = readString(row, ["exercise_type", "exerciseType"]);
  const exerciseTitle = readString(row, ["exercise_title", "exerciseTitle"]);
  const occurredAt = readDateString(row, ["completed_at", "completedAt", "date"]) ?? readDateString(row, ["created_at", "createdAt"]);

  if (!id || !studentId || !exerciseType || !exerciseTitle || !occurredAt) {
    return null;
  }

  const details =
    typeof row.details === "object" && row.details !== null && !Array.isArray(row.details)
      ? (row.details as Record<string, unknown>)
      : undefined;

  return {
    id,
    studentId,
    studentName: readString(row, ["student_name", "studentName"]) ?? "",
    username: readString(row, ["username"]) ?? "",
    exerciseType: exerciseType as ExerciseResult["exerciseType"],
    exerciseTitle,
    date: occurredAt,
    createdAt: readDateString(row, ["created_at", "createdAt"]) ?? occurredAt,
    durationSeconds: readNumber(details ?? {}, ["durationSeconds", "readingDurationSeconds", "activeReadingSeconds"]) ?? 0,
    correctCount: readNumber(row, ["correct_count", "correctCount"]) ?? 0,
    wrongCount: readNumber(row, ["wrong_count", "wrongCount"]) ?? 0,
    score: readNumber(row, ["score"]) ?? 0,
    successRate: readNumber(row, ["success_rate", "successRate"]) ?? 0,
    programTaskId: readString(row, ["program_task_id", "programTaskId"]),
    submissionKey: readString(row, ["submission_key", "submissionKey"]) ?? undefined,
    details,
    occurredAt,
    timestamp: normalizeTimestamp(occurredAt) ?? 0,
  };
}

function normalizeTaskRow(row: DatabaseRow): NormalizedTask | null {
  const id = readString(row, ["id"]);
  const programId = readString(row, ["program_id", "programId"]);
  const studentId = readString(row, ["student_id", "studentId"]);
  const exerciseSlug = readString(row, ["exercise_slug", "exerciseSlug"]);
  const exerciseTitle = readString(row, ["exercise_title", "exerciseTitle"]);
  const dayNumber = readNumber(row, ["day_number", "dayNumber"]);
  const orderNumber = readNumber(row, ["order_number", "orderNumber"]);
  const occurredAt = readDateString(row, ["completed_at", "completedAt"]);

  if (!id || !programId || !studentId || !exerciseSlug || !exerciseTitle || dayNumber === null || orderNumber === null || !occurredAt) {
    return null;
  }

  return {
    id,
    program_id: programId,
    student_id: studentId,
    day_number: dayNumber,
    order_number: orderNumber,
    exercise_slug: exerciseSlug,
    exercise_title: exerciseTitle,
    result_exercise_type: readString(row, ["result_exercise_type", "resultExerciseType"]),
    status: readString(row, ["status"]) ?? "locked",
    started_at: readDateString(row, ["started_at", "startedAt"]),
    completed_at: occurredAt,
    result_id: readString(row, ["result_id", "resultId"]),
    occurredAt,
    timestamp: normalizeTimestamp(occurredAt) ?? 0,
  };
}

function normalizeXpSummaryRow(row: DatabaseRow): XpSummaryRow | null {
  const studentId = readString(row, ["student_id", "studentId"]);
  const totalXp = readNumber(row, ["total_xp", "totalXp"]);
  if (!studentId || totalXp === null) {
    return null;
  }
  return { student_id: studentId, total_xp: totalXp };
}

function normalizeXpEventRow(row: DatabaseRow): XpEventRow | null {
  const idempotencyKey = readString(row, ["idempotency_key", "idempotencyKey"]);
  const xpAmount = readNumber(row, ["xp_amount", "xpAmount"]);
  const earnedAt = readDateString(row, ["earned_at", "earnedAt"]);
  if (!idempotencyKey || xpAmount === null || !earnedAt) {
    return null;
  }

  return {
    idempotency_key: idempotencyKey,
    xp_amount: xpAmount,
    event_type: readString(row, ["event_type", "eventType"]) ?? "",
    source_type: readString(row, ["source_type", "sourceType"]),
    source_id: readString(row, ["source_id", "sourceId"]),
    earned_at: earnedAt,
  };
}

function toStudentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "Ö";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toLocaleUpperCase("tr-TR");
  }
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toLocaleUpperCase("tr-TR");
}

function compareTimestampDesc(left: string | null, right: string | null): number {
  const leftTime = normalizeTimestamp(left);
  const rightTime = normalizeTimestamp(right);

  if (leftTime === null && rightTime === null) {
    return 0;
  }
  if (leftTime === null) {
    return 1;
  }
  if (rightTime === null) {
    return -1;
  }
  return rightTime - leftTime;
}

function buildProgramLookup(programs: readonly NormalizedProgram[]): Map<string, NormalizedProgram> {
  const lookup = new Map<string, NormalizedProgram>();
  for (const program of programs) {
    lookup.set(program.student_id, program);
  }
  return lookup;
}

function buildTaskLookups(tasks: readonly NormalizedTask[]): {
  byTaskId: Map<string, NormalizedTask>;
  byResultId: Map<string, NormalizedTask>;
} {
  const byTaskId = new Map<string, NormalizedTask>();
  const byResultId = new Map<string, NormalizedTask>();

  for (const task of tasks) {
    byTaskId.set(task.id, task);
    if (task.result_id) {
      byResultId.set(task.result_id, task);
    }
  }

  return { byTaskId, byResultId };
}

function buildXpLookup(xpEvents: readonly XpEventRow[]): Map<string, number> {
  const lookup = new Map<string, number>();
  for (const event of xpEvents) {
    if (Number.isFinite(event.xp_amount)) {
      lookup.set(event.idempotency_key, event.xp_amount);
    }
  }
  return lookup;
}

function buildActivityKeyFromResult(result: NormalizedResult, taskLookups: ReturnType<typeof buildTaskLookups>): string {
  const taskId = typeof result.programTaskId === "string" ? result.programTaskId.trim() : "";
  if (taskId && taskLookups.byTaskId.has(taskId)) {
    return `program-task:${taskId}`;
  }

  const matchedTask = taskLookups.byResultId.get(result.id);
  if (matchedTask) {
    return `program-task:${matchedTask.id}`;
  }

  const submissionKey = typeof result.submissionKey === "string" ? result.submissionKey.trim() : "";
  return submissionKey ? `result:${submissionKey}` : `result:${result.id}`;
}

function buildActivityKeyFromTask(task: NormalizedTask): string {
  return `program-task:${task.id}`;
}

function getActivityTitleFromResult(result: NormalizedResult): string {
  return result.exerciseTitle || "Çalışma";
}

function getActivityDescriptionFromResult(result: NormalizedResult): string {
  const details = (result.details ?? {}) as DatabaseRow;
  const duration = readNumber(details, ["durationSeconds", "readingDurationSeconds", "activeReadingSeconds"]);

  if (result.exerciseType === "reading-speed-test") {
    const speed = readNumber(details, ["readingSpeedWpm"]);
    const speedText = isFiniteNumber(speed) ? `${Math.round(speed)} kelime/dk` : "Hız bilinmiyor";
    const durationText = isFiniteNumber(duration) ? `${Math.round(duration)} sn` : "Süre bilinmiyor";
    return `${speedText} · ${durationText}`;
  }

  if (result.exerciseType === "reading-comprehension") {
    const success = isFiniteNumber(result.successRate) ? `%${Math.round(result.successRate)}` : "Başarı bilinmiyor";
    const durationText = isFiniteNumber(duration) ? `${Math.round(duration)} sn` : "Süre bilinmiyor";
    return `${success} · ${durationText}`;
  }

  const success = isFiniteNumber(result.successRate) ? `%${Math.round(result.successRate)}` : "Başarı bilinmiyor";
  const durationText = isFiniteNumber(duration) ? `${Math.round(duration)} sn` : "Süre bilinmiyor";
  return `${success} · ${durationText}`;
}

function getTaskDescription(task: NormalizedTask): string {
  return `Gün ${task.day_number} · Görev ${task.order_number}`;
}

function getActivityTypeFromResultType(exerciseType: ExerciseResult["exerciseType"]): TeacherStudentActivityType {
  if (exerciseType === "reading-comprehension") {
    return "reading_comprehension_completed";
  }
  if (exerciseType === "reading-speed-test") {
    return "reading_speed_test_completed";
  }
  return "exercise_completed";
}

function getAwardedXpForActivity(key: string, xpLookup: Map<string, number>): number | null {
  const value = xpLookup.get(key);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildResultActivity(
  student: NormalizedStudent,
  result: NormalizedResult,
  taskLookups: ReturnType<typeof buildTaskLookups>,
  programLookup: Map<string, NormalizedProgram>,
  xpLookup: Map<string, number>,
): DashboardActivityEntry | null {
  const dedupeKey = buildActivityKeyFromResult(result, taskLookups);
  const activeProgram = programLookup.get(student.id) ?? null;
  const details = (result.details ?? {}) as DatabaseRow;

  return {
    id: `activity:${dedupeKey}`,
    dedupeKey,
    studentId: student.id,
    studentName: student.name,
    studentInitials: toStudentInitials(student.name),
    activityType: getActivityTypeFromResultType(result.exerciseType),
    title: getActivityTitleFromResult(result),
    description: getActivityDescriptionFromResult(result),
    occurredAt: result.occurredAt,
    awardedXp: getAwardedXpForActivity(dedupeKey, xpLookup),
    programName: activeProgram?.visible_name ?? null,
    readingSpeedWpm:
      result.exerciseType === "reading-speed-test" || result.exerciseType === "reading-comprehension"
        ? readNumber(details, ["readingSpeedWpm"])
        : null,
    comprehensionRate:
      result.exerciseType === "reading-comprehension"
        ? readNumber(details, ["comprehensionScore", "successRate"]) ?? (isFiniteNumber(result.successRate) ? result.successRate : null)
        : null,
    detailHref: `/ogretmen/ogrenciler/${student.id}`,
    kind: "exercise",
    countAsActiveStudent: student.active,
    countAsCompletedWork: true,
  };
}

function buildTaskActivity(
  student: NormalizedStudent,
  task: NormalizedTask,
  programLookup: Map<string, NormalizedProgram>,
  xpLookup: Map<string, number>,
): DashboardActivityEntry | null {
  const dedupeKey = buildActivityKeyFromTask(task);
  const activeProgram = programLookup.get(student.id) ?? null;

  return {
    id: `activity:${dedupeKey}`,
    dedupeKey,
    studentId: student.id,
    studentName: student.name,
    studentInitials: toStudentInitials(student.name),
    activityType: "education_program_task_completed",
    title: task.exercise_title,
    description: getTaskDescription(task),
    occurredAt: task.occurredAt,
    awardedXp: getAwardedXpForActivity(dedupeKey, xpLookup),
    programName: activeProgram?.visible_name ?? null,
    readingSpeedWpm: null,
    comprehensionRate: null,
    detailHref: `/ogretmen/ogrenciler/${student.id}`,
    kind: "program_task",
    countAsActiveStudent: student.active,
    countAsCompletedWork: true,
  };
}

function buildLoginActivity(student: NormalizedStudent, now: Date): DashboardActivityEntry | null {
  if (!student.last_login_at) {
    return null;
  }

  const timestamp = normalizeTimestamp(student.last_login_at);
  if (timestamp === null) {
    return null;
  }

  const loginDateKey = getIstanbulDateKey(student.last_login_at);
  const currentDateKey = getTodayDateKey(now);
  if (!loginDateKey || loginDateKey < currentDateKey) {
    return null;
  }

  const dedupeKey = `login:${student.id}:${loginDateKey}`;
  return {
    id: `activity:${dedupeKey}`,
    dedupeKey,
    studentId: student.id,
    studentName: student.name,
    studentInitials: toStudentInitials(student.name),
    activityType: "login_first_of_day",
    title: "Son giriş",
    description: "Panele giriş yaptı",
    occurredAt: student.last_login_at,
    awardedXp: null,
    programName: null,
    readingSpeedWpm: null,
    comprehensionRate: null,
    detailHref: `/ogretmen/ogrenciler/${student.id}`,
    kind: "login",
    countAsActiveStudent: student.active,
    countAsCompletedWork: false,
  };
}

function dedupeActivities(entries: readonly DashboardActivityEntry[]): DashboardActivityEntry[] {
  const deduped = new Map<string, DashboardActivityEntry>();

  for (const entry of entries) {
    const existing = deduped.get(entry.dedupeKey);
    if (!existing) {
      deduped.set(entry.dedupeKey, entry);
      continue;
    }

    const existingTime = normalizeTimestamp(existing.occurredAt);
    const nextTime = normalizeTimestamp(entry.occurredAt);
    const keepNext =
      (existingTime === null && nextTime !== null) ||
      (existingTime !== null && nextTime !== null && nextTime > existingTime) ||
      (existingTime === nextTime && (entry.awardedXp ?? 0) > (existing.awardedXp ?? 0));

    if (keepNext) {
      deduped.set(entry.dedupeKey, entry);
    }
  }

  return Array.from(deduped.values()).sort((left, right) => {
    const leftTime = normalizeTimestamp(left.occurredAt);
    const rightTime = normalizeTimestamp(right.occurredAt);

    if (leftTime === null && rightTime === null) {
      return left.dedupeKey.localeCompare(right.dedupeKey);
    }
    if (leftTime === null) {
      return 1;
    }
    if (rightTime === null) {
      return -1;
    }
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    return left.dedupeKey.localeCompare(right.dedupeKey);
  });
}

function buildSummaryStats(args: {
  students: readonly NormalizedStudent[];
  programs: readonly NormalizedProgram[];
  xpSummaries: readonly XpSummaryRow[];
  activities: readonly DashboardActivityEntry[];
  xpEvents: readonly XpEventRow[];
  dateRangeStart: string;
  dateRangeEnd: string;
}): TeacherDashboardStats {
  const totalStudents = args.students.length;
  const activeStudents = args.students.filter((student) => student.active).length;
  const inactiveStudents = args.students.filter((student) => student.status === "passive").length;
  const completedStudents = args.students.filter((student) => student.completed).length;
  const activePrograms = args.programs.filter((program) => program.active).length;
  const totalXp = args.xpSummaries.reduce((sum, row) => sum + row.total_xp, 0);

  const rangeStart = normalizeTimestamp(args.dateRangeStart);
  const rangeEnd = normalizeTimestamp(args.dateRangeEnd);

  const activitiesInWindow = args.activities.filter((activity) => {
    const timestamp = normalizeTimestamp(activity.occurredAt);
    return (
      timestamp !== null &&
      rangeStart !== null &&
      rangeEnd !== null &&
      timestamp >= rangeStart &&
      timestamp < rangeEnd
    );
  });

  const activeStudentIds = new Set<string>();
  for (const activity of activitiesInWindow) {
    if (!activity.countAsActiveStudent) {
      continue;
    }
    activeStudentIds.add(activity.studentId);
  }

  const completedActivitiesLast7Days = activitiesInWindow.filter((activity) => activity.countAsCompletedWork).length;
  const earnedXpLast7Days = args.xpEvents.reduce((sum, event) => {
    const timestamp = normalizeTimestamp(event.earned_at);
    if (timestamp === null || rangeStart === null || rangeEnd === null || timestamp < rangeStart || timestamp >= rangeEnd) {
      return sum;
    }
    return sum + event.xp_amount;
  }, 0);

  return {
    totalStudents,
    activeStudents,
    inactiveStudents,
    completedStudents,
    activePrograms,
    totalXp,
    activeStudentsLast7Days: activeStudentIds.size,
    completedActivitiesLast7Days,
    earnedXpLast7Days,
  };
}

function buildRecentStudents(
  students: readonly NormalizedStudent[],
  activities: readonly DashboardActivityEntry[],
  programLookup: Map<string, NormalizedProgram>,
  xpSummaries: readonly XpSummaryRow[],
): TeacherDashboardRecentStudent[] {
  const latestActivityByStudent = new Map<string, DashboardActivityEntry>();

  for (const activity of activities) {
    const current = latestActivityByStudent.get(activity.studentId);
    if (!current || compareTimestampDesc(activity.occurredAt, current.occurredAt) < 0) {
      latestActivityByStudent.set(activity.studentId, activity);
    }
  }

  const xpByStudent = new Map(xpSummaries.map((row) => [row.student_id, row.total_xp] as const));

  return students
    .map((student) => {
      if (student.completed) {
        return null;
      }

      const latestActivity = latestActivityByStudent.get(student.id);
      if (!latestActivity) {
        return null;
      }

      const totalXp = xpByStudent.get(student.id) ?? null;
      const snapshot = totalXp !== null ? getStudentXpSnapshot(totalXp) : null;
      const activeProgram = programLookup.get(student.id) ?? null;

      return {
        studentId: student.id,
        studentName: student.name,
        studentInitials: toStudentInitials(student.name),
        classLabel: student.class_name,
        level: snapshot?.level ?? null,
        levelTitle: snapshot?.title ?? null,
        totalXp,
        lastActivityAt: latestActivity.occurredAt,
        lastActivitySummary: latestActivity.title,
        activeProgramName: activeProgram?.visible_name ?? null,
        detailHref: `/ogretmen/ogrenciler/${student.id}`,
      };
    })
    .filter((item): item is TeacherDashboardRecentStudent => item !== null)
    .sort((left, right) => {
      const compare = compareTimestampDesc(left.lastActivityAt, right.lastActivityAt);
      if (compare !== 0) {
        return compare;
      }
      return left.studentId.localeCompare(right.studentId);
    })
    .slice(0, RECENT_STUDENT_LIMIT);
}

function getActiveProgramProgressMessage(program: NormalizedProgram | null): string {
  if (!program) {
    return "Aktif program yok";
  }
  return `${program.completed_days}/${program.total_days} tamamlandı`;
}

function buildAttentionStudents(
  students: readonly NormalizedStudent[],
  activities: readonly DashboardActivityEntry[],
  programs: readonly NormalizedProgram[],
  recentResults: readonly NormalizedResult[],
): TeacherDashboardAttentionStudent[] {
  const latestActivityByStudent = new Map<string, DashboardActivityEntry>();
  for (const activity of activities) {
    const current = latestActivityByStudent.get(activity.studentId);
    if (!current || compareTimestampDesc(activity.occurredAt, current.occurredAt) < 0) {
      latestActivityByStudent.set(activity.studentId, activity);
    }
  }

  const programByStudent = buildProgramLookup(programs);
  const resultsByStudent = new Map<string, NormalizedResult[]>();
  for (const result of recentResults) {
    const current = resultsByStudent.get(result.studentId) ?? [];
    current.push(result);
    resultsByStudent.set(result.studentId, current);
  }

  const candidates: TeacherDashboardAttentionStudent[] = [];
  const window = createDateRange(new Date(), 7);
  const windowStart = normalizeTimestamp(window.startInclusiveIso);

  for (const student of students) {
    if (!student.active || student.completed) {
      continue;
    }

    const latestActivity = latestActivityByStudent.get(student.id) ?? null;
    const program = programByStudent.get(student.id) ?? null;
    const recentResultList = [...(resultsByStudent.get(student.id) ?? [])].sort((left, right) => {
      const leftTime = normalizeTimestamp(left.occurredAt);
      const rightTime = normalizeTimestamp(right.occurredAt);
      if (leftTime === null && rightTime === null) {
        return 0;
      }
      if (leftTime === null) {
        return 1;
      }
      if (rightTime === null) {
        return -1;
      }
      return rightTime - leftTime;
    });

    let reasonCode: TeacherDashboardAttentionReasonCode | null = null;
    let reasonLabel = "";
    let supportingValue = "";

    if (student.access_end_date && parseAccessExpiry(student.access_end_date)) {
      reasonCode = "access_expiring";
      const expiryTime = new Date(student.access_end_date).getTime();
      const daysLeft = Number.isFinite(expiryTime) ? Math.max(0, Math.ceil((expiryTime - Date.now()) / 86_400_000)) : 0;
      reasonLabel = "Erişim süresi yaklaşıyor";
      supportingValue = daysLeft > 0 ? `Erişim süresi ${daysLeft} gün içinde doluyor` : "Erişim süresi dolmuş";
    }

    if (!reasonCode && program && program.completed_days === 0 && program.status === "active") {
      reasonCode = "no_program_progress";
      reasonLabel = "Aktif programda ilerleme yok";
      supportingValue = `${program.visible_name}: ${getActiveProgramProgressMessage(program)}`;
    }

    if (!reasonCode) {
      const latestActivityTime = normalizeTimestamp(latestActivity?.occurredAt ?? null);
      if (latestActivityTime === null || (windowStart !== null && latestActivityTime < windowStart)) {
        reasonCode = "inactive_7_days";
        reasonLabel = "Son 7 gündür aktivite yok";
        supportingValue = latestActivity?.occurredAt
          ? `Son aktivite ${new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" }).format(
              -Math.max(1, Math.round((Date.now() - (latestActivityTime ?? Date.now())) / 86_400_000)),
              "day",
            )}`
          : "Henüz aktivite kaydı yok";
      }
    }

    if (!reasonCode && recentResultList.length >= 2) {
      const latest = recentResultList[0]!;
      const previous = recentResultList[1]!;
      const latestSpeed = readNumber((latest.details ?? {}) as DatabaseRow, ["readingSpeedWpm"]);
      const previousSpeed = readNumber((previous.details ?? {}) as DatabaseRow, ["readingSpeedWpm"]);
      const latestComprehension =
        latest.exerciseType === "reading-comprehension"
          ? readNumber((latest.details ?? {}) as DatabaseRow, ["comprehensionScore", "successRate"]) ?? (isFiniteNumber(latest.successRate) ? latest.successRate : null)
          : null;
      const previousComprehension =
        previous.exerciseType === "reading-comprehension"
          ? readNumber((previous.details ?? {}) as DatabaseRow, ["comprehensionScore", "successRate"]) ?? (isFiniteNumber(previous.successRate) ? previous.successRate : null)
          : null;

      if (isFiniteNumber(latestSpeed) && isFiniteNumber(previousSpeed) && previousSpeed > 0) {
        const declinePercent = ((previousSpeed - latestSpeed) / previousSpeed) * 100;
        if (declinePercent >= PERFORMANCE_DECLINE_PERCENT) {
          reasonCode = "performance_decline";
          reasonLabel = "Okuma hızında belirgin düşüş";
          supportingValue = `${Math.round(previousSpeed)} WPM → ${Math.round(latestSpeed)} WPM`;
        }
      }

      if (!reasonCode && isFiniteNumber(latestComprehension) && isFiniteNumber(previousComprehension)) {
        const declinePoints = previousComprehension - latestComprehension;
        if (declinePoints >= PERFORMANCE_DECLINE_POINTS) {
          reasonCode = "performance_decline";
          reasonLabel = "Anlama puanında belirgin düşüş";
          supportingValue = `%${Math.round(previousComprehension)} → %${Math.round(latestComprehension)}`;
        }
      }
    }

    if (!reasonCode) {
      continue;
    }

    candidates.push({
      studentId: student.id,
      studentName: student.name,
      reasonCode,
      reasonLabel,
      supportingValue,
      lastActivityAt: latestActivity?.occurredAt ?? null,
      detailHref: `/ogretmen/ogrenciler/${student.id}`,
    });
  }

  const priority: Record<TeacherDashboardAttentionReasonCode, number> = {
    access_expiring: 0,
    no_program_progress: 1,
    inactive_7_days: 2,
    performance_decline: 3,
  };

  return candidates
    .sort((left, right) => {
      const priorityDelta = priority[left.reasonCode] - priority[right.reasonCode];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const timeDelta = compareTimestampDesc(left.lastActivityAt, right.lastActivityAt);
      if (timeDelta !== 0) {
        return timeDelta;
      }

      return left.studentId.localeCompare(right.studentId);
    })
    .slice(0, ATTENTION_LIMIT);
}

function buildDashboardSummary(input: {
  students: readonly DatabaseRow[];
  activePrograms: readonly DatabaseRow[];
  xpSummaries: readonly DatabaseRow[];
  results: readonly DatabaseRow[];
  tasks: readonly DatabaseRow[];
  xpEvents: readonly DatabaseRow[];
  now?: Date;
}): TeacherDashboardSummary {
  const now = input.now ?? new Date();
  const window = createDateRange(now, RECENT_WINDOW_DAYS);

  const summaryStudents = input.students
    .map((row) => normalizeStudentRow(row, now))
    .filter((row): row is NormalizedStudent => row !== null);
  const summaryPrograms = input.activePrograms
    .map((row) => normalizeProgramRow(row))
    .filter((row): row is NormalizedProgram => row !== null && row.active);
  const summaryXp = input.xpSummaries
    .map((row) => normalizeXpSummaryRow(row))
    .filter((row): row is XpSummaryRow => row !== null);
  const summaryResults = input.results
    .map((row) => normalizeResultRow(row))
    .filter((row): row is NormalizedResult => row !== null);
  const summaryTasks = input.tasks
    .map((row) => normalizeTaskRow(row))
    .filter((row): row is NormalizedTask => row !== null && row.completed_at !== null);
  const summaryXpEvents = input.xpEvents
    .map((row) => normalizeXpEventRow(row))
    .filter((row): row is XpEventRow => row !== null);

  const studentById = new Map(summaryStudents.map((student) => [student.id, student] as const));
  const programLookup = buildProgramLookup(summaryPrograms);
  const taskLookups = buildTaskLookups(summaryTasks);
  const xpLookup = buildXpLookup(summaryXpEvents);

  const activities: DashboardActivityEntry[] = [];
  for (const student of summaryStudents) {
    const loginActivity = buildLoginActivity(student, now);
    if (loginActivity) {
      const loginTime = normalizeTimestamp(loginActivity.occurredAt);
      const windowStart = normalizeTimestamp(window.startInclusiveIso);
      const windowEnd = normalizeTimestamp(window.endExclusiveIso);
      if (loginTime !== null && windowStart !== null && windowEnd !== null && loginTime >= windowStart && loginTime < windowEnd) {
        activities.push(loginActivity);
      }
    }
  }

  for (const result of summaryResults) {
    const student = studentById.get(result.studentId);
    if (!student) {
      continue;
    }

    const activity = buildResultActivity(student, result, taskLookups, programLookup, xpLookup);
    const time = normalizeTimestamp(activity?.occurredAt ?? null);
    const windowStart = normalizeTimestamp(window.startInclusiveIso);
    const windowEnd = normalizeTimestamp(window.endExclusiveIso);
    if (activity && time !== null && windowStart !== null && windowEnd !== null && time >= windowStart && time < windowEnd) {
      activities.push(activity);
    }
  }

  for (const task of summaryTasks) {
    const student = studentById.get(task.student_id);
    if (!student) {
      continue;
    }

    const activity = buildTaskActivity(student, task, programLookup, xpLookup);
    const time = normalizeTimestamp(activity?.occurredAt ?? null);
    const windowStart = normalizeTimestamp(window.startInclusiveIso);
    const windowEnd = normalizeTimestamp(window.endExclusiveIso);
    if (activity && time !== null && windowStart !== null && windowEnd !== null && time >= windowStart && time < windowEnd) {
      activities.push(activity);
    }
  }

  const dedupedActivities = dedupeActivities(activities);

  return {
    stats: buildSummaryStats({
      students: summaryStudents,
      programs: summaryPrograms,
      xpSummaries: summaryXp,
      activities: dedupedActivities,
      xpEvents: summaryXpEvents,
      dateRangeStart: window.startInclusiveIso,
      dateRangeEnd: window.endExclusiveIso,
    }),
    recentActivities: dedupedActivities.slice(0, ACTIVITY_LIMIT),
    recentStudents: buildRecentStudents(summaryStudents, dedupedActivities, programLookup, summaryXp),
    attentionStudents: buildAttentionStudents(summaryStudents, dedupedActivities, summaryPrograms, summaryResults),
    generatedAt: now.toISOString(),
    warnings: [] as TeacherDashboardSectionWarning[],
  };
}

export function buildTeacherDashboardSummary(input: {
  students: readonly DatabaseRow[];
  activePrograms: readonly DatabaseRow[];
  xpSummaries: readonly DatabaseRow[];
  results: readonly DatabaseRow[];
  tasks: readonly DatabaseRow[];
  xpEvents: readonly DatabaseRow[];
  now?: Date;
}): TeacherDashboardSummaryResult {
  try {
    return {
      summary: buildDashboardSummary(input),
      error: null,
    };
  } catch {
    return {
      summary: null,
      error: DASHBOARD_ERROR_MESSAGE,
    };
  }
}
