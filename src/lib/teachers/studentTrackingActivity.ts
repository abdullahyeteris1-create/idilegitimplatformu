import type { ExerciseResult } from "@/lib/results/types";
import type {
  TeacherStudentActivity,
  TeacherStudentActivityType,
  TeacherStudentProgramContext,
  TeacherStudentProgramTaskProgress,
} from "./studentTrackingTypes";

type DatabaseRow = Record<string, unknown>;

type TeacherXpEventRow = {
  idempotency_key: string;
  xp_amount: number;
  event_type: string;
  source_type: string | null;
  source_id: string | null;
  earned_at: string | null;
};

export type TeacherStudentActivityFeedInput = {
  studentId: string;
  lastLoginAt: string | null;
  results: ExerciseResult[];
  activeProgram: TeacherStudentProgramContext | null;
  programTasks: readonly TeacherStudentProgramTaskProgress[];
  xpEvents: TeacherXpEventRow[];
  limit?: number;
};

export type TeacherStudentActivityFeedResult = {
  activities: TeacherStudentActivity[];
  error: string | null;
};

const MAX_ACTIVITIES = 10;
const ACTIVITY_ERROR_MESSAGE = "Son aktiviteler şu anda yüklenemiyor.";

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

function getIstanbulDateKey(value: string | null): string | null {
  const timestamp = normalizeTimestamp(value);
  if (timestamp === null) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
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

function toActivityType(value: string): TeacherStudentActivityType {
  if (value === "reading-comprehension") {
    return "reading_comprehension_completed";
  }

  if (value === "reading-speed-test") {
    return "reading_speed_test_completed";
  }

  return "exercise_completed";
}

function getResultDescription(result: ExerciseResult): string {
  const duration = Number.isFinite(result.durationSeconds) ? `${result.durationSeconds} sn` : "Süre bilinmiyor";
  const score = Number.isFinite(result.score) ? `${result.score} puan` : "Puan bilinmiyor";

  if (result.exerciseType === "reading-comprehension") {
    return `${score} · ${duration}`;
  }

  if (result.exerciseType === "reading-speed-test") {
    return `${score} · ${duration}`;
  }

  const successRate = Number.isFinite(result.successRate) ? `%${Math.round(result.successRate)}` : "Başarı bilinmiyor";
  return `${successRate} · ${duration}`;
}

function getTaskDescription(dayNumber: number | null, orderNumber: number | null): string {
  const segments: string[] = [];
  if (dayNumber !== null) {
    segments.push(`Gün ${dayNumber}`);
  }
  if (orderNumber !== null) {
    segments.push(`Görev ${orderNumber}`);
  }
  return segments.length > 0 ? `${segments.join(" · ")} tamamlandı` : "Görev tamamlandı";
}

function getLoginDescription(): string {
  return "Panele giriş yaptı";
}

function getXpAward(eventType: string, xpEvents: readonly TeacherXpEventRow[], idempotencyKey: string): number | null {
  const match = xpEvents.find((event) => event.idempotency_key === idempotencyKey);
  if (match) {
    return Number.isFinite(match.xp_amount) ? match.xp_amount : null;
  }

  if (eventType === "login_first_of_day") {
    return null;
  }

  return null;
}

function mapXpEventRows(rows: readonly TeacherXpEventRow[]): TeacherXpEventRow[] {
  return rows
    .map((row) => ({
      idempotency_key: readString(row as DatabaseRow, ["idempotency_key", "idempotencyKey"]) ?? "",
      xp_amount: readNumber(row as DatabaseRow, ["xp_amount", "xpAmount"]) ?? 0,
      event_type: readString(row as DatabaseRow, ["event_type", "eventType"]) ?? "",
      source_type: readString(row as DatabaseRow, ["source_type", "sourceType"]),
      source_id: readString(row as DatabaseRow, ["source_id", "sourceId"]),
      earned_at: readDateString(row as DatabaseRow, ["earned_at", "earnedAt"]),
    }))
    .filter((row) => row.idempotency_key.length > 0 && row.event_type.length > 0 && row.xp_amount > 0);
}

function createResultActivity(result: ExerciseResult, xpEvents: readonly TeacherXpEventRow[]): TeacherStudentActivity | null {
  const occurredAt = readDateString(result as DatabaseRow, ["date", "completedAt"]);
  if (!occurredAt) {
    return null;
  }

  const submissionKey = typeof result.submissionKey === "string" ? result.submissionKey.trim() : "";
  const dedupeKey = submissionKey ? `result:${submissionKey}` : `result:${result.id}`;
  const activityType = toActivityType(result.exerciseType);
  const activityId = `activity:${dedupeKey}`;
  const awardedXp = getXpAward(activityType, xpEvents, dedupeKey);

  const readingSpeedWpm =
    result.exerciseType === "reading-speed-test"
      ? readNumber((result.details ?? {}) as DatabaseRow, ["readingSpeedWpm"])
      : null;
  const comprehensionRate =
    result.exerciseType === "reading-comprehension"
      ? readNumber((result.details ?? {}) as DatabaseRow, ["comprehensionScore", "successRate"]) ?? (Number.isFinite(result.successRate) ? result.successRate : null)
      : null;

  return {
    id: activityId,
    studentId: result.studentId,
    activityType,
    title: result.exerciseTitle,
    description: getResultDescription(result),
    occurredAt,
    sourceType: "exercise_results",
    sourceId: result.id,
    awardedXp,
    programName: null,
    programTaskName: null,
    readingSpeedWpm,
    comprehensionRate,
    dedupeKey,
  };
}

function createProgramTaskActivity(
  studentId: string,
  activeProgramId: string | null,
  activeProgramName: string | null,
  task: TeacherStudentProgramTaskProgress,
  xpEvents: readonly TeacherXpEventRow[],
): TeacherStudentActivity | null {
  if (!task.completedAt) {
    return null;
  }

  const dedupeKey = `program-task:${task.taskId}`;
  const awardedXp = getXpAward("education_program_task_completed", xpEvents, dedupeKey);

  return {
    id: `activity:${dedupeKey}`,
    studentId,
    activityType: "education_program_task_completed",
    title: task.exerciseTitle ?? "Program görevi",
    description: getTaskDescription(task.dayNumber, task.orderNumber),
    occurredAt: task.completedAt,
    sourceType: "student_education_program_tasks",
    sourceId: task.taskId,
    awardedXp,
    programName: task.programId && activeProgramId && task.programId === activeProgramId ? activeProgramName : null,
    programTaskName: task.exerciseTitle ?? null,
    readingSpeedWpm: null,
    comprehensionRate: null,
    dedupeKey,
  };
}

function createLoginActivity(
  studentId: string,
  lastLoginAt: string | null,
  xpEvents: readonly TeacherXpEventRow[],
): TeacherStudentActivity | null {
  if (!lastLoginAt) {
    return null;
  }

  const dateKey = getIstanbulDateKey(lastLoginAt);
  if (!dateKey) {
    return null;
  }

  const dedupeKey = `login:${studentId}:${dateKey}`;
  const awardedXp = getXpAward("login_first_of_day", xpEvents, dedupeKey);

  return {
    id: `activity:${dedupeKey}`,
    studentId,
    activityType: "login_first_of_day",
    title: "Son giriş",
    description: getLoginDescription(),
    occurredAt: lastLoginAt,
    sourceType: "students",
    sourceId: studentId,
    awardedXp,
    programName: null,
    programTaskName: null,
    readingSpeedWpm: null,
    comprehensionRate: null,
    dedupeKey,
  };
}

function compareActivities(left: TeacherStudentActivity, right: TeacherStudentActivity): number {
  const leftTime = normalizeTimestamp(left.occurredAt);
  const rightTime = normalizeTimestamp(right.occurredAt);

  if (leftTime === null && rightTime === null) {
    return left.dedupeKey.localeCompare(right.dedupeKey);
  }
  if (leftTime === null) return 1;
  if (rightTime === null) return -1;
  if (leftTime !== rightTime) return rightTime - leftTime;

  const priority = new Map<TeacherStudentActivityType, number>([
    ["exercise_completed", 0],
    ["reading_comprehension_completed", 0],
    ["reading_speed_test_completed", 0],
    ["education_program_task_completed", 1],
    ["login_first_of_day", 2],
  ]);

  const leftPriority = priority.get(left.activityType) ?? 9;
  const rightPriority = priority.get(right.activityType) ?? 9;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return left.dedupeKey.localeCompare(right.dedupeKey);
}

function dedupeActivities(activities: readonly TeacherStudentActivity[]): TeacherStudentActivity[] {
  const bestByKey = new Map<string, TeacherStudentActivity>();

  for (const activity of activities) {
    const existing = bestByKey.get(activity.dedupeKey);
    if (!existing) {
      bestByKey.set(activity.dedupeKey, activity);
      continue;
    }

    const existingTime = normalizeTimestamp(existing.occurredAt);
    const nextTime = normalizeTimestamp(activity.occurredAt);
    const keepNext =
      (existingTime === null && nextTime !== null) ||
      (existingTime !== null && nextTime !== null && nextTime > existingTime) ||
      (existingTime === nextTime && (activity.awardedXp ?? 0) > (existing.awardedXp ?? 0));

    if (keepNext) {
      bestByKey.set(activity.dedupeKey, activity);
    }
  }

  return Array.from(bestByKey.values()).sort(compareActivities);
}

export function buildTeacherStudentActivityFeed(
  input: TeacherStudentActivityFeedInput,
): TeacherStudentActivityFeedResult {
  try {
    const limit = Math.max(1, Math.min(MAX_ACTIVITIES, Math.trunc(input.limit ?? MAX_ACTIVITIES)));
    const xpEvents = mapXpEventRows(input.xpEvents);

    const activities: TeacherStudentActivity[] = [];

    for (const result of input.results) {
      const activity = createResultActivity(result, xpEvents);
      if (activity) {
        activities.push(activity);
      }
    }

    const activeProgramId = input.activeProgram?.id ?? null;
    const activeProgramName = input.activeProgram?.visibleName ?? null;
    for (const task of input.programTasks) {
      const activity = createProgramTaskActivity(input.studentId, activeProgramId, activeProgramName, task, xpEvents);
      if (activity) {
        activities.push(activity);
      }
    }

    const loginActivity = createLoginActivity(input.studentId, input.lastLoginAt, xpEvents);
    if (loginActivity) {
      activities.push(loginActivity);
    }

    const deduped = dedupeActivities(activities);
    return {
      activities: deduped.slice(0, limit),
      error: null,
    };
  } catch {
    return {
      activities: [],
      error: ACTIVITY_ERROR_MESSAGE,
    };
  }
}
