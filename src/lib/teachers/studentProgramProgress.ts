import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateStudentProgramProgress } from "@/lib/education-programs/studentProgramPresentation";
import type { ExerciseResult } from "@/lib/results/types";
import type {
  TeacherStudentProgramContext,
  TeacherStudentProgramDayProgress,
  TeacherStudentProgramProgress,
  TeacherStudentProgramTaskProgress,
  TeacherStudentProgramTaskStatus,
  TeacherStudentProgramDayStatus,
} from "./studentTrackingTypes";

const STUDENT_EDUCATION_PROGRAM_DAYS_TABLE = "student_education_program_days";
const STUDENT_EDUCATION_PROGRAM_TASKS_TABLE = "student_education_program_tasks";

const PROGRAM_PROGRESS_ERROR_MESSAGE = "Program ilerlemesi şu anda yüklenemiyor.";

type DatabaseRow = Record<string, unknown>;

export type TeacherXpEventRow = {
  idempotency_key: string;
  xp_amount: number;
  event_type: string;
  source_type: string | null;
  source_id: string | null;
  earned_at: string | null;
};

type ProgramDayRow = {
  id: string;
  program_id: string;
  day_number: number;
  title: string | null;
  description: string | null;
  status: TeacherStudentProgramDayStatus;
  available_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type ProgramTaskRow = {
  id: string;
  program_id: string;
  program_day_id: string;
  student_id: string;
  day_number: number;
  order_number: number;
  exercise_slug: string;
  exercise_title: string;
  result_exercise_type: string | null;
  status: TeacherStudentProgramTaskStatus;
  started_at: string | null;
  completed_at: string | null;
  result_id: string | null;
};

export type TeacherStudentProgramProgressLoadResult = {
  programProgress: TeacherStudentProgramProgress | null;
  programProgressError: string | null;
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

function readDateString(row: DatabaseRow, keys: string[]): string | null {
  return readString(row, keys);
}

function isCompletedStatus(status: TeacherStudentProgramTaskStatus | TeacherStudentProgramDayStatus): boolean {
  return status === "completed";
}

function normalizeTaskSummary(result: ExerciseResult): string {
  const details = (result.details ?? {}) as DatabaseRow;
  const score = Number.isFinite(result.score) ? `${result.score} puan` : "Puan bilinmiyor";

  if (result.exerciseType === "reading-speed-test") {
    const speed = readNumber(details, ["readingSpeedWpm"]);
    const speedLabel = Number.isFinite(speed) ? `${speed} WPM` : "Hız bilinmiyor";
    return `${speedLabel} · ${score}`;
  }

  if (result.exerciseType === "reading-comprehension") {
    const successRate = Number.isFinite(result.successRate) ? `%${Math.round(result.successRate)}` : "Başarı bilinmiyor";
    return `${successRate} anlama · ${score}`;
  }

  const successRate = Number.isFinite(result.successRate) ? `%${Math.round(result.successRate)}` : null;
  const duration = Number.isFinite(result.durationSeconds) ? `${result.durationSeconds} sn` : null;
  const parts = [score, successRate, duration].filter((part): part is string => Boolean(part));
  return parts.join(" · ");
}

function mapProgramDayRow(row: DatabaseRow): ProgramDayRow | null {
  const id = readString(row, ["id"]);
  const programId = readString(row, ["program_id", "programId"]);
  const dayNumber = readNumber(row, ["day_number", "dayNumber"]);

  if (!id || !programId || dayNumber === null) {
    return null;
  }

  return {
    id,
    program_id: programId,
    day_number: dayNumber,
    title: readString(row, ["title"]),
    description: readString(row, ["description"]),
    status: (readString(row, ["status"]) ?? "locked") as TeacherStudentProgramDayStatus,
    available_at: readDateString(row, ["available_at", "availableAt"]),
    started_at: readDateString(row, ["started_at", "startedAt"]),
    completed_at: readDateString(row, ["completed_at", "completedAt"]),
  };
}

function mapProgramTaskRow(row: DatabaseRow): ProgramTaskRow | null {
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
    id,
    program_id: programId,
    program_day_id: programDayId,
    student_id: studentId,
    day_number: dayNumber,
    order_number: orderNumber,
    exercise_slug: exerciseSlug,
    exercise_title: exerciseTitle,
    result_exercise_type: readString(row, ["result_exercise_type", "resultExerciseType"]),
    status: (readString(row, ["status"]) ?? "locked") as TeacherStudentProgramTaskStatus,
    started_at: readDateString(row, ["started_at", "startedAt"]),
    completed_at: readDateString(row, ["completed_at", "completedAt"]),
    result_id: readString(row, ["result_id", "resultId"]),
  };
}

function buildResultByIdMap(results: readonly ExerciseResult[]): Map<string, ExerciseResult> {
  return new Map(results.map((result) => [result.id, result] as const));
}

function buildXpByIdempotencyKey(events: readonly TeacherXpEventRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const event of events) {
    if (!event.idempotency_key || !Number.isFinite(event.xp_amount)) {
      continue;
    }
    map.set(event.idempotency_key, event.xp_amount);
  }
  return map;
}

function toTaskProgress(
  row: ProgramTaskRow,
  resultById: Map<string, ExerciseResult>,
  xpByIdempotencyKey: Map<string, number>,
): TeacherStudentProgramTaskProgress {
  const result = row.result_id ? resultById.get(row.result_id) ?? null : null;
  const awardedXp = xpByIdempotencyKey.get(`program-task:${row.id}`) ?? null;

  return {
    taskId: row.id,
    programId: row.program_id,
    dayId: row.program_day_id,
    studentId: row.student_id,
    dayNumber: row.day_number,
    orderNumber: row.order_number,
    exerciseSlug: row.exercise_slug,
    exerciseTitle: row.exercise_title,
    taskType: row.result_exercise_type ?? row.exercise_slug,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    resultId: row.result_id,
    resultSummary: result ? normalizeTaskSummary(result) : null,
    awardedXp,
  };
}

function compareCompletedTasks(
  left: TeacherStudentProgramTaskProgress,
  right: TeacherStudentProgramTaskProgress,
): number {
  const leftTime = left.completedAt ? new Date(left.completedAt).getTime() : Number.NEGATIVE_INFINITY;
  const rightTime = right.completedAt ? new Date(right.completedAt).getTime() : Number.NEGATIVE_INFINITY;

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  if (left.dayNumber !== right.dayNumber) {
    return right.dayNumber - left.dayNumber;
  }

  return right.orderNumber - left.orderNumber;
}

function comparePendingTasks(
  left: TeacherStudentProgramTaskProgress,
  right: TeacherStudentProgramTaskProgress,
): number {
  if (left.dayNumber !== right.dayNumber) {
    return left.dayNumber - right.dayNumber;
  }

  return left.orderNumber - right.orderNumber;
}

function buildDayProgress(
  dayRows: readonly ProgramDayRow[],
  taskRows: readonly TeacherStudentProgramTaskProgress[],
): TeacherStudentProgramDayProgress[] {
  const tasksByDayId = new Map<string, TeacherStudentProgramTaskProgress[]>();
  for (const task of taskRows) {
    const current = tasksByDayId.get(task.dayId) ?? [];
    current.push(task);
    tasksByDayId.set(task.dayId, current);
  }

  return dayRows
    .map((day) => {
      const tasks = [...(tasksByDayId.get(day.id) ?? [])].sort((left, right) => left.orderNumber - right.orderNumber);
      const completedTasks = tasks.filter((task) => task.status === "completed" || task.completedAt !== null).length;
      const progressPercent =
        tasks.length > 0
          ? calculateStudentProgramProgress(completedTasks, tasks.length)
          : day.status === "completed"
            ? 100
            : 0;

      return {
        dayId: day.id,
        programId: day.program_id,
        dayNumber: day.day_number,
        title: day.title,
        description: day.description,
        status: day.status,
        availableAt: day.available_at,
        startedAt: day.started_at,
        completedAt: day.completed_at,
        totalTasks: tasks.length,
        completedTasks,
        progressPercent,
        tasks,
      };
    })
    .sort((left, right) => left.dayNumber - right.dayNumber);
}

function buildProgressSummary(
  activeProgram: TeacherStudentProgramContext,
  dayRows: readonly ProgramDayRow[],
  taskRows: readonly TeacherStudentProgramTaskProgress[],
): TeacherStudentProgramProgress {
  const totalDays = activeProgram.totalDays > 0 ? activeProgram.totalDays : dayRows.length;
  const completedDays = dayRows.filter((day) => isCompletedStatus(day.status) || day.completed_at !== null).length;
  const totalTasks = taskRows.length;
  const completedTasks = taskRows.filter((task) => task.status === "completed" || task.completedAt !== null).length;
  const dayProgressPercent = calculateStudentProgramProgress(completedDays, totalDays);
  const taskProgressPercent = calculateStudentProgramProgress(completedTasks, totalTasks);
  const overallProgressPercent =
    totalTasks > 0
      ? Math.round((dayProgressPercent + taskProgressPercent) / 2)
      : dayProgressPercent;

  const completedTaskList = [...taskRows]
    .filter((task) => task.status === "completed" || task.completedAt !== null)
    .sort(compareCompletedTasks);
  const pendingTaskList = [...taskRows]
    .filter((task) => task.status !== "completed" && task.completedAt === null)
    .sort(comparePendingTasks);
  const days = buildDayProgress(dayRows, taskRows);

  return {
    ...activeProgram,
    totalTasks,
    completedTasks,
    dayProgressPercent,
    taskProgressPercent,
    overallProgressPercent,
    lastCompletedTask: completedTaskList[0] ?? null,
    nextPendingTask: pendingTaskList[0] ?? null,
    days,
  };
}

export function mapTeacherStudentProgramContext(program: {
  id: string;
  visibleName: string;
  status: TeacherStudentProgramContext["status"];
  currentDayNumber: number;
  completedDays: number;
  totalDays: number;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt?: string | null;
} | null): TeacherStudentProgramContext | null {
  if (!program) {
    return null;
  }

  return {
    id: program.id,
    visibleName: program.visibleName,
    status: program.status,
    currentDayNumber: program.currentDayNumber,
    completedDays: program.completedDays,
    totalDays: program.totalDays,
    assignedAt: program.assignedAt,
    startedAt: program.startedAt,
    completedAt: program.completedAt ?? null,
  };
}

export async function loadTeacherStudentProgramProgress(
  supabase: SupabaseClient,
  activeProgram: TeacherStudentProgramContext | null,
  activeProgramError: string | null,
  studentId: string,
  results: readonly ExerciseResult[],
  xpEvents: readonly TeacherXpEventRow[],
): Promise<TeacherStudentProgramProgressLoadResult> {
  if (activeProgramError) {
    return {
      programProgress: null,
      programProgressError: activeProgramError,
    };
  }

  if (!activeProgram) {
    return {
      programProgress: null,
      programProgressError: null,
    };
  }

  try {
    const [daysResult, tasksResult] = await Promise.all([
      supabase
        .from(STUDENT_EDUCATION_PROGRAM_DAYS_TABLE)
        .select("id,program_id,day_number,title,description,status,available_at,started_at,completed_at")
        .eq("program_id", activeProgram.id)
        .order("day_number", { ascending: true }),
      supabase
        .from(STUDENT_EDUCATION_PROGRAM_TASKS_TABLE)
        .select("id,program_id,program_day_id,student_id,day_number,order_number,exercise_slug,exercise_title,result_exercise_type,status,started_at,completed_at,result_id")
        .eq("program_id", activeProgram.id)
        .eq("student_id", studentId)
        .order("day_number", { ascending: true })
        .order("order_number", { ascending: true }),
    ]);

    if (daysResult.error || tasksResult.error) {
      return {
        programProgress: null,
        programProgressError: PROGRAM_PROGRESS_ERROR_MESSAGE,
      };
    }

    const dayRows = ((daysResult.data ?? []) as DatabaseRow[])
      .map(mapProgramDayRow)
      .filter((day): day is ProgramDayRow => day !== null);
    const taskRows = ((tasksResult.data ?? []) as DatabaseRow[])
      .map(mapProgramTaskRow)
      .filter((task): task is ProgramTaskRow => task !== null && task.student_id === studentId && task.program_id === activeProgram.id);
    const resultById = buildResultByIdMap(results);
    const xpByIdempotencyKey = buildXpByIdempotencyKey(xpEvents);
    const progressTasks = taskRows.map((task) => toTaskProgress(task, resultById, xpByIdempotencyKey));

    return {
      programProgress: buildProgressSummary(activeProgram, dayRows, progressTasks),
      programProgressError: null,
    };
  } catch {
    return {
      programProgress: null,
      programProgressError: PROGRAM_PROGRESS_ERROR_MESSAGE,
    };
  }
}
