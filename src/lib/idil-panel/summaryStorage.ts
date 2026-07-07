import { supabase } from "@/lib/supabase/client";

type SupabaseRow = Record<string, unknown>;

export type ScheduleStatus = "Planlandi" | "Tamamlandi" | "Iptal" | "Gelmedi";

export type ScheduleStudent = {
  id: string;
  name: string;
};

export type ScheduleItem = {
  id: string;
  studentId: string;
  courseId: string | null;
  lessonDate: string;
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateSchedulePayload = {
  studentId: string;
  courseId?: string | null;
  lessonDate: string;
  startTime: string;
  endTime: string;
  status?: ScheduleStatus;
  notes?: string;
};

export type IdilPanelSummary = {
  totalStudents: number;
  activeStudents: number;
  activeCourses: number;
  plannedLessonsThisWeek: number;
  completedLessons: number;
  reportCount: number;
  textCount: number;
  exerciseResultCount: number;
  readingTestCount: number;
};

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const TEXT_LIBRARY_TABLE = process.env.NEXT_PUBLIC_SUPABASE_TEXT_LIBRARY_TABLE ?? "text_library";
const EXERCISE_RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";
const READING_TESTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_READING_TESTS_TABLE ?? "reading_tests";
const COURSES_TABLE = process.env.NEXT_PUBLIC_SUPABASE_COURSES_TABLE ?? "courses";
const SCHEDULES_TABLE = process.env.NEXT_PUBLIC_SUPABASE_SCHEDULES_TABLE ?? "schedules";
const LESSONS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_LESSONS_TABLE ?? "lessons";
const MEASUREMENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_MEASUREMENTS_TABLE ?? "measurements";
const REPORTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_REPORTS_TABLE ?? "reports";

const ACTIVE_STATUS_SET = new Set(["active", "aktif", "ongoing", "published", "open"]);
const INACTIVE_STATUS_SET = new Set(["inactive", "passive", "pasif", "archived", "deleted", "closed"]);
const COMPLETED_STATUS_SET = new Set(["completed", "complete", "done", "tamamlandi", "finished"]);
const CANCELLED_STATUS_SET = new Set(["cancelled", "canceled", "iptal", "void"]);

function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLocaleLowerCase("tr-TR");
}

function normalizeScheduleStatus(value: unknown): ScheduleStatus {
  const normalized = normalizeText(value);

  if (["tamamlandi", "completed", "complete", "done", "finished"].includes(normalized)) {
    return "Tamamlandi";
  }

  if (["iptal", "cancelled", "canceled", "void"].includes(normalized)) {
    return "Iptal";
  }

  if (["gelmedi", "no-show", "noshow", "absent"].includes(normalized)) {
    return "Gelmedi";
  }

  return "Planlandi";
}

function readString(row: SupabaseRow, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function readBoolean(row: SupabaseRow, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value !== 0;
    }

    if (typeof value === "string") {
      const normalized = normalizeText(value);

      if (["true", "1", "yes", "evet", "aktif", "active"].includes(normalized)) {
        return true;
      }

      if (["false", "0", "no", "hayir", "pasif", "inactive"].includes(normalized)) {
        return false;
      }
    }
  }

  return undefined;
}

function readDate(row: SupabaseRow, keys: string[]): Date | undefined {
  for (const key of keys) {
    const value = row[key];

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  return undefined;
}

function isRowActive(row: SupabaseRow): boolean {
  const activeFlag = readBoolean(row, ["is_active", "isActive", "active", "enabled"]);
  if (activeFlag !== undefined) {
    return activeFlag;
  }

  const status = normalizeText(readString(row, ["status", "state"]));
  if (status) {
    if (ACTIVE_STATUS_SET.has(status)) {
      return true;
    }

    if (INACTIVE_STATUS_SET.has(status)) {
      return false;
    }
  }

  return true;
}

function isLessonCompleted(row: SupabaseRow): boolean {
  const completedFlag = readBoolean(row, ["is_completed", "isCompleted", "completed"]);
  if (completedFlag !== undefined) {
    return completedFlag;
  }

  const status = normalizeText(readString(row, ["status", "state"]));
  if (status) {
    if (COMPLETED_STATUS_SET.has(status)) {
      return true;
    }

    if (CANCELLED_STATUS_SET.has(status)) {
      return false;
    }
  }

  const completedAt = readDate(row, ["completed_at", "completedAt"]);
  return completedAt !== undefined;
}

function getWeekBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  const day = start.getDay();
  const daysFromMonday = (day + 6) % 7;
  start.setDate(start.getDate() - daysFromMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

function isWithinCurrentWeek(date: Date, now: Date): boolean {
  const { start, end } = getWeekBounds(now);
  return date >= start && date < end;
}

function isPlannedThisWeek(row: SupabaseRow, now: Date): boolean {
  const status = normalizeText(readString(row, ["status", "state"]));
  if (status && CANCELLED_STATUS_SET.has(status)) {
    return false;
  }

  const lessonDate = readDate(row, [
    "scheduled_at",
    "scheduledAt",
    "planned_at",
    "plannedAt",
    "lesson_date",
    "lessonDate",
    "start_date",
    "startDate",
    "date",
    "starts_at",
    "startsAt",
  ]);

  if (!lessonDate) {
    return false;
  }

  if (!isWithinCurrentWeek(lessonDate, now)) {
    return false;
  }

  return !isLessonCompleted(row);
}

async function listTable(tableName: string): Promise<SupabaseRow[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase.from(tableName).select("*");

    if (error || !Array.isArray(data)) {
      if (error) {
        console.error(`Supabase ${tableName} select failed`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      }

      return [];
    }

    return data as SupabaseRow[];
  } catch (error) {
    console.error(`Supabase ${tableName} select threw`, error);
    return [];
  }
}

function toScheduleItem(row: SupabaseRow): ScheduleItem {
  return {
    id: String(row.id ?? ""),
    studentId: String(row.student_id ?? row.studentId ?? ""),
    courseId: typeof row.course_id === "string" ? row.course_id : typeof row.courseId === "string" ? row.courseId : null,
    lessonDate: String(row.lesson_date ?? row.lessonDate ?? ""),
    startTime: String(row.start_time ?? row.startTime ?? ""),
    endTime: String(row.end_time ?? row.endTime ?? ""),
    status: normalizeScheduleStatus(row.status),
    notes: typeof row.notes === "string" ? row.notes : "",
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
  };
}

function assertSupabaseForWrite(): void {
  if (!supabase) {
    throw new Error("Supabase baglantisi hazir degil.");
  }
}

function buildDateRangeFilter(startDate: string, endDate: string): { start: string; end: string } {
  const start = startDate.trim();
  const end = endDate.trim();

  if (!start || !end) {
    throw new Error("Tarih araligi gecersiz.");
  }

  return { start, end };
}

export async function listCourses(): Promise<SupabaseRow[]> {
  return listTable(COURSES_TABLE);
}

export async function listSchedules(): Promise<SupabaseRow[]> {
  return listTable(SCHEDULES_TABLE);
}

export async function listSchedulesByDateRange(startDate: string, endDate: string): Promise<ScheduleItem[]> {
  if (!supabase) {
    return [];
  }

  const { start, end } = buildDateRangeFilter(startDate, endDate);

  try {
    const { data, error } = await supabase
      .from(SCHEDULES_TABLE)
      .select("*")
      .gte("lesson_date", start)
      .lte("lesson_date", end)
      .order("lesson_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error || !Array.isArray(data)) {
      if (error) {
        console.error("Supabase schedules date range select failed", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      }

      return [];
    }

    return data.map((row) => toScheduleItem(row as SupabaseRow));
  } catch (error) {
    console.error("Supabase schedules date range select threw", error);
    return [];
  }
}

export async function listLessons(): Promise<SupabaseRow[]> {
  return listTable(LESSONS_TABLE);
}

export async function listMeasurements(): Promise<SupabaseRow[]> {
  return listTable(MEASUREMENTS_TABLE);
}

export async function listReports(): Promise<SupabaseRow[]> {
  return listTable(REPORTS_TABLE);
}

export async function listStudentsForSchedule(): Promise<ScheduleStudent[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select("id, name")
      .order("name", { ascending: true });

    if (error || !Array.isArray(data)) {
      if (error) {
        console.error("Supabase students for schedule select failed", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      }

      return [];
    }

    return data
      .map((row) => {
        const record = row as SupabaseRow;
        const id = String(record.id ?? "").trim();
        const name = String(record.name ?? "").trim();

        if (!id || !name) {
          return null;
        }

        return { id, name };
      })
      .filter((item): item is ScheduleStudent => item !== null);
  } catch (error) {
    console.error("Supabase students for schedule select threw", error);
    return [];
  }
}

export async function createSchedule(payload: CreateSchedulePayload): Promise<ScheduleItem> {
  assertSupabaseForWrite();
  const client = supabase;

  if (!client) {
    throw new Error("Supabase baglantisi hazir degil.");
  }

  const insertPayload = {
    student_id: payload.studentId,
    course_id: payload.courseId ?? null,
    lesson_date: payload.lessonDate,
    start_time: payload.startTime,
    end_time: payload.endTime,
    status: payload.status ?? "Planlandi",
    notes: payload.notes?.trim() ? payload.notes.trim() : null,
  };

  const { data, error } = await client
    .from(SCHEDULES_TABLE)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Program kaydi olusturulamadi.");
  }

  return toScheduleItem(data as SupabaseRow);
}

export async function updateScheduleStatus(id: string, status: ScheduleStatus): Promise<void> {
  assertSupabaseForWrite();
  const client = supabase;

  if (!client) {
    throw new Error("Supabase baglantisi hazir degil.");
  }

  const { error } = await client
    .from(SCHEDULES_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Program durumu guncellenemedi.");
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  assertSupabaseForWrite();
  const client = supabase;

  if (!client) {
    throw new Error("Supabase baglantisi hazir degil.");
  }

  const { error } = await client.from(SCHEDULES_TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(error.message || "Program kaydi silinemedi.");
  }
}

export async function getIdilPanelSummary(): Promise<IdilPanelSummary> {
  const now = new Date();

  const [students, courses, schedules, lessons, reports, textLibrary, exerciseResults, readingTests] = await Promise.all([
    listTable(STUDENTS_TABLE),
    listCourses(),
    listSchedules(),
    listLessons(),
    listReports(),
    listTable(TEXT_LIBRARY_TABLE),
    listTable(EXERCISE_RESULTS_TABLE),
    listTable(READING_TESTS_TABLE),
  ]);

  const plannedLessonsFromLessons = lessons.filter((lesson) => isPlannedThisWeek(lesson, now)).length;
  const plannedLessonsFromSchedules = schedules.filter((schedule) => isPlannedThisWeek(schedule, now)).length;

  return {
    totalStudents: students.length,
    activeStudents: students.filter((student) => isRowActive(student)).length,
    activeCourses: courses.filter((course) => isRowActive(course)).length,
    plannedLessonsThisWeek: plannedLessonsFromLessons > 0 ? plannedLessonsFromLessons : plannedLessonsFromSchedules,
    completedLessons: lessons.filter((lesson) => isLessonCompleted(lesson)).length,
    reportCount: reports.length,
    textCount: textLibrary.length,
    exerciseResultCount: exerciseResults.length,
    readingTestCount: readingTests.length,
  };
}
