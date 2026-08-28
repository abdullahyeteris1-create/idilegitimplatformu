import { supabase } from "@/lib/supabase/client";
import { isValidLessonNo, MAX_LESSON_NO } from "@/lib/idil-panel/lessonRecordValidation";

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

export type LessonRecordStatus = "Tamamlandi" | "Eksik" | "Iptal";

export type LessonRecordStudent = {
  id: string;
  name: string;
};

export type LessonRecord = {
  id: string;
  scheduleId: string | null;
  courseId: string | null;
  studentId: string;
  lessonNo: number;
  lessonDate: string;
  textTitle: string;
  wordCount: number;
  durationSeconds: number;
  wordsPerMinute: number;
  comprehensionScore: number;
  focusScore: number | null;
  completedLessonCount: number;
  status: LessonRecordStatus;
  teacherNote: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateLessonPayload = {
  scheduleId?: string | null;
  courseId?: string | null;
  studentId: string;
  lessonNo: number;
  lessonDate: string;
  textTitle: string;
  wordCount: number;
  durationSeconds: number;
  wordsPerMinute: number;
  comprehensionScore: number;
  focusScore?: number | null;
  completedLessonCount: number;
  status?: LessonRecordStatus;
  teacherNote?: string;
};

export type UpdateLessonPayload = Partial<CreateLessonPayload>;

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

function normalizeLessonStatus(value: unknown): LessonRecordStatus {
  const normalized = normalizeText(value);

  if (["eksik", "incomplete", "missing", "yarim kaldi", "planlandi", "gelmedi", "telafi bekliyor"].includes(normalized)) {
    return "Eksik";
  }

  if (["iptal", "cancelled", "canceled", "void"].includes(normalized)) {
    return "Iptal";
  }

  return "Tamamlandi";
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
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

/**
 * Yalnızca satır SAYISI gereken yerler için. `listTable` ile sayım yapmak iki
 * soruna yol açıyordu:
 *   1) Supabase varsayılan olarak en fazla 1000 satır döndürdüğü için, 1000'den
 *      fazla kaydı olan tablolarda `.length` gerçek sayıyı değil tavanı
 *      gösteriyordu (panelde "Egzersiz Sonucu: 1000" bunun sonucuydu).
 *   2) Sadece saymak için tablonun tamamı tarayıcıya indiriliyordu.
 * `head: true` ile tek satır bile taşınmaz, sunucu yalnızca sayıyı döner.
 *
 * Okuma başarısızsa (ör. RLS reddi) `null` döner — bu, "gerçekten 0 kayıt var"
 * durumundan ayrıdır ve çağıranın ikisini ayırt etmesine imkân verir.
 */
async function countTable(tableName: string): Promise<number | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { count, error } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error(`Supabase ${tableName} count failed`, {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return null;
    }

    return typeof count === "number" ? count : null;
  } catch (error) {
    console.error(`Supabase ${tableName} count threw`, error);
    return null;
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

function toLessonRecord(row: SupabaseRow): LessonRecord {
  return {
    id: String(row.id ?? ""),
    scheduleId: row.schedule_id ? String(row.schedule_id) : null,
    courseId: row.course_id ? String(row.course_id) : null,
    studentId: String(row.student_id ?? ""),
    lessonNo: Math.max(1, Math.round(toNumber(row.lesson_no, 1))),
    lessonDate: String(row.lesson_date ?? ""),
    textTitle: String(row.text_title ?? ""),
    wordCount: Math.max(0, Math.round(toNumber(row.word_count, 0))),
    durationSeconds: Math.max(0, Math.round(toNumber(row.duration_seconds, 0))),
    wordsPerMinute: Math.max(0, Math.round(toNumber(row.words_per_minute, 0))),
    comprehensionScore: Math.max(0, Math.round(toNumber(row.comprehension_score, 0))),
    focusScore: toNullableNumber(row.focus_score),
    completedLessonCount: Math.max(0, Math.round(toNumber(row.completed_lesson_count, 0))),
    status: normalizeLessonStatus(row.status),
    teacherNote: String(row.teacher_note ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function assertSupabaseForWrite(): void {
  if (!supabase) {
    throw new Error("Supabase baglantisi hazir degil.");
  }
}

function assertValidLessonNo(lessonNo: number): void {
  if (!isValidLessonNo(lessonNo)) {
    throw new Error(`Ders gunu 1 ile ${MAX_LESSON_NO} arasinda olmalidir.`);
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

export async function listLessons(): Promise<LessonRecord[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(LESSONS_TABLE)
      .select("*")
      .order("lesson_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !Array.isArray(data)) {
      if (error) {
        console.error("Supabase lessons list failed", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      }

      return [];
    }

    return data.map((row) => toLessonRecord(row as SupabaseRow));
  } catch (error) {
    console.error("Supabase lessons list threw", error);
    return [];
  }
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

export async function listStudentsForLessonRecords(): Promise<LessonRecordStudent[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(STUDENTS_TABLE)
      .select("*");

    if (error || !Array.isArray(data)) {
      if (error) {
        console.error("Supabase students for lessons select failed", {
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
        const name = String(record.name ?? record.ad_soyad ?? "").trim();

        if (!id || !name) {
          return null;
        }

        return { id, name };
      })
      .filter((item): item is LessonRecordStudent => item !== null)
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  } catch (error) {
    console.error("Supabase students for lessons select threw", error);
    return [];
  }
}

export async function createLesson(payload: CreateLessonPayload): Promise<LessonRecord> {
  assertValidLessonNo(payload.lessonNo);
  assertSupabaseForWrite();
  const client = supabase;

  if (!client) {
    throw new Error("Supabase baglantisi hazir degil.");
  }

  const insertPayload = {
    schedule_id: payload.scheduleId ?? null,
    course_id: payload.courseId ?? null,
    student_id: payload.studentId,
    lesson_no: payload.lessonNo,
    lesson_date: payload.lessonDate,
    text_title: payload.textTitle,
    word_count: payload.wordCount,
    duration_seconds: payload.durationSeconds,
    words_per_minute: payload.wordsPerMinute,
    comprehension_score: payload.comprehensionScore,
    focus_score: payload.focusScore ?? null,
    completed_lesson_count: payload.completedLessonCount,
    status: payload.status ?? "Tamamlandi",
    teacher_note: payload.teacherNote?.trim() ? payload.teacherNote.trim() : null,
  };

  const { data, error } = await client
    .from(LESSONS_TABLE)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Ders kaydi olusturulamadi.");
  }

  return toLessonRecord(data as SupabaseRow);
}

export async function updateLesson(id: string, payload: UpdateLessonPayload): Promise<LessonRecord> {
  if (payload.lessonNo !== undefined) {
    assertValidLessonNo(payload.lessonNo);
  }
  assertSupabaseForWrite();
  const client = supabase;

  if (!client) {
    throw new Error("Supabase baglantisi hazir degil.");
  }

  const updatePayload: SupabaseRow = {
    updated_at: new Date().toISOString(),
  };

  if (payload.scheduleId !== undefined) updatePayload.schedule_id = payload.scheduleId;
  if (payload.courseId !== undefined) updatePayload.course_id = payload.courseId;
  if (payload.studentId !== undefined) updatePayload.student_id = payload.studentId;
  if (payload.lessonNo !== undefined) updatePayload.lesson_no = payload.lessonNo;
  if (payload.lessonDate !== undefined) updatePayload.lesson_date = payload.lessonDate;
  if (payload.textTitle !== undefined) updatePayload.text_title = payload.textTitle;
  if (payload.wordCount !== undefined) updatePayload.word_count = payload.wordCount;
  if (payload.durationSeconds !== undefined) updatePayload.duration_seconds = payload.durationSeconds;
  if (payload.wordsPerMinute !== undefined) updatePayload.words_per_minute = payload.wordsPerMinute;
  if (payload.comprehensionScore !== undefined) updatePayload.comprehension_score = payload.comprehensionScore;
  if (payload.focusScore !== undefined) updatePayload.focus_score = payload.focusScore;
  if (payload.completedLessonCount !== undefined) updatePayload.completed_lesson_count = payload.completedLessonCount;
  if (payload.status !== undefined) updatePayload.status = payload.status;
  if (payload.teacherNote !== undefined) {
    updatePayload.teacher_note = payload.teacherNote.trim() ? payload.teacherNote.trim() : null;
  }

  const { data, error } = await client
    .from(LESSONS_TABLE)
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Ders kaydi guncellenemedi.");
  }

  return toLessonRecord(data as SupabaseRow);
}

export async function deleteLesson(id: string): Promise<void> {
  assertSupabaseForWrite();
  const client = supabase;

  if (!client) {
    throw new Error("Supabase baglantisi hazir degil.");
  }

  const { error } = await client.from(LESSONS_TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(error.message || "Ders kaydi silinemedi.");
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

  // Not: ilk dört sorgu satırların kendisini kullanıyor (aktiflik / tarih
  // filtreleri), bu yüzden tam kayıt çekmeleri gerekiyor. Son dördü yalnızca
  // sayıya ihtiyaç duyduğu için `countTable` ile sunucu tarafında sayılıyor —
  // aksi halde 1000 satır tavanına takılıyor ve boşuna veri indiriliyordu.
  const [students, courses, schedules, lessons, reportCount, textCount, exerciseResultCount, readingTestCount] =
    await Promise.all([
      listTable(STUDENTS_TABLE),
      listCourses(),
      listSchedules(),
      listLessons(),
      countTable(REPORTS_TABLE),
      countTable(TEXT_LIBRARY_TABLE),
      countTable(EXERCISE_RESULTS_TABLE),
      countTable(READING_TESTS_TABLE),
    ]);

  const plannedLessonsFromLessons = lessons.filter((lesson) => isPlannedThisWeek(lesson, now)).length;
  const plannedLessonsFromSchedules = schedules.filter((schedule) => isPlannedThisWeek(schedule, now)).length;

  return {
    totalStudents: students.length,
    activeStudents: students.filter((student) => isRowActive(student)).length,
    activeCourses: courses.filter((course) => isRowActive(course)).length,
    plannedLessonsThisWeek: plannedLessonsFromLessons > 0 ? plannedLessonsFromLessons : plannedLessonsFromSchedules,
    completedLessons: lessons.filter((lesson) => isLessonCompleted(lesson)).length,
    // `countTable` okuma başarısızsa null döner. Şimdilik 0'a düşürülüyor;
    // "okunamadı" durumunu panelde "—" olarak ayrı göstermek sıradaki adım.
    reportCount: reportCount ?? 0,
    textCount: textCount ?? 0,
    exerciseResultCount: exerciseResultCount ?? 0,
    readingTestCount: readingTestCount ?? 0,
  };
}
