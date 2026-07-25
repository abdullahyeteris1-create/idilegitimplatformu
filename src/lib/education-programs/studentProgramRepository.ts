import type { SupabaseClient } from "@supabase/supabase-js";
import { isEducationProgramCategory } from "@/lib/education-programs/categories";
import {
  getStudentEducationProgramDatabaseMessage,
  studentEducationProgramFailure,
} from "@/lib/education-programs/studentProgramErrors";
import type {
  StudentEducationProgramAssignmentInput,
  StudentEducationProgramAssignmentOptions,
  StudentEducationProgramAssignmentStudent,
  StudentEducationProgramAssignmentTemplate,
  StudentEducationProgramDay,
  StudentEducationProgramDayStatus,
  StudentEducationProgramDetail,
  StudentEducationProgramRepositoryResult,
  StudentEducationProgramStatus,
  StudentEducationProgramSummary,
  StudentEducationProgramTask,
  StudentEducationProgramTaskStatus,
} from "@/lib/education-programs/studentProgramTypes";
import {
  isEducationProgramUuid,
  validateStudentEducationProgramAssignment,
} from "@/lib/education-programs/studentProgramValidation";
import type { EducationProgramTaskSettings } from "@/lib/education-programs/types";

export const STUDENT_EDUCATION_PROGRAMS_TABLE = "student_education_programs";
export const STUDENT_EDUCATION_PROGRAM_DAYS_TABLE = "student_education_program_days";
export const STUDENT_EDUCATION_PROGRAM_TASKS_TABLE = "student_education_program_tasks";
export const ASSIGN_EDUCATION_PROGRAM_RPC = "assign_education_program_template_v1";

const STUDENTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_STUDENTS_TABLE ?? "students";
const PROGRAM_SUMMARY_SELECT =
  "id,student_id,source_template_id,source_template_version,source_template_name,visible_name,status,current_day_number,completed_days,total_days,assigned_at";
const PROGRAM_DETAIL_SELECT =
  `${PROGRAM_SUMMARY_SELECT},student_message,admin_note,assigned_by,started_at,completed_at,cancelled_at,cancel_reason`;

type DatabaseRow = Record<string, unknown>;

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function finiteInteger(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function settingsFromRow(value: unknown): EducationProgramTaskSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const settings: EducationProgramTaskSettings = {};
  for (const [key, item] of Object.entries(value)) {
    if (
      key.trim() &&
      (typeof item === "string" || typeof item === "number" || typeof item === "boolean")
    ) {
      settings[key] = item;
    }
  }
  return settings;
}

function readProgramStatus(value: unknown): StudentEducationProgramStatus {
  if (value === "completed" || value === "cancelled") return value;
  return "active";
}

function readProgressStatus(value: unknown): StudentEducationProgramDayStatus {
  if (
    value === "available" ||
    value === "in_progress" ||
    value === "completed"
  ) {
    return value;
  }
  return "locked";
}

export function mergeEducationProgramAssignmentStudents(
  studentRows: readonly DatabaseRow[],
  activeProgramRows: readonly DatabaseRow[],
): StudentEducationProgramAssignmentStudent[] {
  const activeProgramByStudent = new Map<string, DatabaseRow>();
  for (const program of activeProgramRows) {
    if (typeof program.student_id === "string") {
      activeProgramByStudent.set(program.student_id, program);
    }
  }

  return studentRows
    .filter(
      (student) =>
        typeof student.id === "string" &&
        typeof student.name === "string" &&
        student.name.trim() &&
        student.is_active !== false &&
        student.status !== "passive",
    )
    .map((student) => {
      const id = String(student.id);
      const activeProgram = activeProgramByStudent.get(id);

      return {
        id,
        name: String(student.name).trim(),
        className: nullableString(student.class_name),
        activeProgramId:
          activeProgram && typeof activeProgram.id === "string"
            ? activeProgram.id
            : null,
        activeProgramName: activeProgram
          ? nullableString(activeProgram.visible_name)
          : null,
      };
    })
    .sort((first, second) => first.name.localeCompare(second.name, "tr"));
}

export function mapEducationProgramAssignmentTemplate(
  row: DatabaseRow,
): StudentEducationProgramAssignmentTemplate | null {
  const dayCount = finiteInteger(row.day_count);
  const version = finiteInteger(row.version);

  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    !row.name.trim() ||
    !isEducationProgramCategory(row.category) ||
    row.status !== "published" ||
    row.is_active !== true ||
    dayCount === null ||
    dayCount < 1 ||
    dayCount > 60 ||
    version === null ||
    version < 1
  ) {
    return null;
  }

  return {
    id: row.id,
    name: row.name.trim(),
    category: row.category,
    dayCount,
    version,
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function mapStudentEducationProgramSummary(
  row: DatabaseRow,
  student?: DatabaseRow,
): StudentEducationProgramSummary | null {
  const totalDays = finiteInteger(row.total_days);
  const currentDayNumber = finiteInteger(row.current_day_number);
  const completedDays = finiteInteger(row.completed_days);
  const sourceTemplateVersion = finiteInteger(row.source_template_version);

  if (
    typeof row.id !== "string" ||
    typeof row.student_id !== "string" ||
    typeof row.visible_name !== "string" ||
    typeof row.source_template_name !== "string" ||
    totalDays === null ||
    currentDayNumber === null ||
    completedDays === null ||
    sourceTemplateVersion === null
  ) {
    return null;
  }

  return {
    id: row.id,
    studentId: row.student_id,
    studentName:
      student && typeof student.name === "string" && student.name.trim()
        ? student.name.trim()
        : "Bilinmeyen öğrenci",
    studentClassName: student ? nullableString(student.class_name) : null,
    visibleName: row.visible_name,
    sourceTemplateId: nullableString(row.source_template_id),
    sourceTemplateName: row.source_template_name,
    sourceTemplateVersion,
    status: readProgramStatus(row.status),
    totalDays,
    currentDayNumber,
    completedDays,
    assignedAt: String(row.assigned_at ?? ""),
  };
}

function mapStudentEducationProgramTask(row: DatabaseRow): StudentEducationProgramTask | null {
  const dayNumber = finiteInteger(row.day_number);
  const orderNumber = finiteInteger(row.order_number);
  const durationSeconds = finiteInteger(row.duration_seconds);
  const settingsSchemaVersion = finiteInteger(row.settings_schema_version);

  if (
    typeof row.id !== "string" ||
    typeof row.program_id !== "string" ||
    typeof row.program_day_id !== "string" ||
    typeof row.student_id !== "string" ||
    typeof row.exercise_slug !== "string" ||
    typeof row.exercise_title !== "string" ||
    dayNumber === null ||
    orderNumber === null ||
    durationSeconds === null ||
    settingsSchemaVersion === null
  ) {
    return null;
  }

  const startingLevel =
    row.starting_level === null || row.starting_level === undefined
      ? null
      : finiteInteger(row.starting_level);

  return {
    id: row.id,
    programId: row.program_id,
    programDayId: row.program_day_id,
    studentId: row.student_id,
    dayNumber,
    orderNumber,
    exerciseSlug: row.exercise_slug,
    exerciseTitle: row.exercise_title,
    resultExerciseType: nullableString(row.result_exercise_type),
    startingLevel,
    durationSeconds,
    settingsSchemaVersion,
    settings: settingsFromRow(row.settings),
    status: readProgressStatus(row.status) as StudentEducationProgramTaskStatus,
    startedAt: nullableString(row.started_at),
    completedAt: nullableString(row.completed_at),
  };
}

function mapStudentEducationProgramDay(
  row: DatabaseRow,
  tasks: readonly StudentEducationProgramTask[],
): StudentEducationProgramDay | null {
  const dayNumber = finiteInteger(row.day_number);
  if (
    typeof row.id !== "string" ||
    typeof row.program_id !== "string" ||
    dayNumber === null
  ) {
    return null;
  }

  return {
    id: row.id,
    programId: row.program_id,
    dayNumber,
    title: nullableString(row.title),
    description: nullableString(row.description),
    status: readProgressStatus(row.status),
    availableAt: nullableString(row.available_at),
    startedAt: nullableString(row.started_at),
    completedAt: nullableString(row.completed_at),
    tasks: tasks
      .filter((task) => task.programDayId === row.id)
      .sort((first, second) => first.orderNumber - second.orderNumber),
  };
}

export async function listEducationProgramAssignmentOptions(
  supabase: SupabaseClient,
): Promise<StudentEducationProgramRepositoryResult<StudentEducationProgramAssignmentOptions>> {
  try {
    const [studentsResult, activeProgramsResult, templatesResult] = await Promise.all([
      supabase
        .from(STUDENTS_TABLE)
        .select("id,name,class_name,is_active,status")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from(STUDENT_EDUCATION_PROGRAMS_TABLE)
        .select("id,student_id,visible_name")
        .eq("status", "active"),
      supabase
        .from("education_program_templates")
        .select("id,name,category,day_count,status,is_active,version,updated_at")
        .eq("status", "published")
        .eq("is_active", true)
        .order("updated_at", { ascending: false }),
    ]);

    if (studentsResult.error || activeProgramsResult.error || templatesResult.error) {
      return studentEducationProgramFailure(
        "database",
        getStudentEducationProgramDatabaseMessage(
          studentsResult.error ?? activeProgramsResult.error ?? templatesResult.error,
        ),
      );
    }

    const students = mergeEducationProgramAssignmentStudents(
      (studentsResult.data ?? []) as DatabaseRow[],
      (activeProgramsResult.data ?? []) as DatabaseRow[],
    );
    const templates = ((templatesResult.data ?? []) as DatabaseRow[])
      .map(mapEducationProgramAssignmentTemplate)
      .filter(
        (
          template,
        ): template is StudentEducationProgramAssignmentTemplate => template !== null,
      );

    return { ok: true, value: { students, templates } };
  } catch (error) {
    return studentEducationProgramFailure(
      "database",
      getStudentEducationProgramDatabaseMessage(error),
    );
  }
}

export async function assignStudentEducationProgram(
  supabase: SupabaseClient,
  rawInput: unknown,
  assignedBy: string,
): Promise<StudentEducationProgramRepositoryResult<{ programId: string }>> {
  const validation = validateStudentEducationProgramAssignment(rawInput);
  if (!validation.ok) {
    return studentEducationProgramFailure("validation", validation.message);
  }

  const input: StudentEducationProgramAssignmentInput = validation.value;
  const safeAssignedBy = assignedBy.trim().slice(0, 120) || "teacher";

  try {
    const { data, error } = await supabase.rpc(ASSIGN_EDUCATION_PROGRAM_RPC, {
      p_student_id: input.studentId,
      p_template_id: input.templateId,
      p_visible_name: input.visibleName,
      p_student_message: input.studentMessage,
      p_admin_note: input.adminNote,
      p_assigned_by: safeAssignedBy,
    });

    if (error) {
      const message = getStudentEducationProgramDatabaseMessage(error);
      const code =
        message === "Öğrencinin zaten aktif programı var."
          ? "conflict"
          : message.includes("bulunamadı")
            ? "not_found"
            : message.includes("geçerli") ||
                message.includes("yayınlanmamış") ||
                message.includes("aktif değil")
              ? "validation"
              : "database";
      return studentEducationProgramFailure(code, message);
    }

    if (typeof data !== "string" || !isEducationProgramUuid(data)) {
      return studentEducationProgramFailure("database", "Program atanamadı.");
    }

    return { ok: true, value: { programId: data } };
  } catch (error) {
    return studentEducationProgramFailure(
      "database",
      getStudentEducationProgramDatabaseMessage(error),
    );
  }
}

export async function listStudentEducationPrograms(
  supabase: SupabaseClient,
): Promise<StudentEducationProgramRepositoryResult<StudentEducationProgramSummary[]>> {
  try {
    const { data: programRows, error: programError } = await supabase
      .from(STUDENT_EDUCATION_PROGRAMS_TABLE)
      .select(PROGRAM_SUMMARY_SELECT)
      .order("assigned_at", { ascending: false });

    if (programError || !Array.isArray(programRows)) {
      return studentEducationProgramFailure(
        "database",
        getStudentEducationProgramDatabaseMessage(programError),
      );
    }

    if (programRows.length === 0) return { ok: true, value: [] };

    const studentIds = [
      ...new Set(
        programRows
          .map((row) => (typeof row.student_id === "string" ? row.student_id : ""))
          .filter(Boolean),
      ),
    ];
    const { data: studentRows, error: studentError } = await supabase
      .from(STUDENTS_TABLE)
      .select("id,name,class_name")
      .in("id", studentIds);

    if (studentError || !Array.isArray(studentRows)) {
      return studentEducationProgramFailure(
        "database",
        getStudentEducationProgramDatabaseMessage(studentError),
      );
    }

    const studentById = new Map<string, DatabaseRow>();
    for (const student of studentRows as DatabaseRow[]) {
      if (typeof student.id === "string") studentById.set(student.id, student);
    }

    return {
      ok: true,
      value: (programRows as DatabaseRow[])
        .map((row) =>
          mapStudentEducationProgramSummary(
            row,
            typeof row.student_id === "string"
              ? studentById.get(row.student_id)
              : undefined,
          ),
        )
        .filter((program): program is StudentEducationProgramSummary => program !== null),
    };
  } catch (error) {
    return studentEducationProgramFailure(
      "database",
      getStudentEducationProgramDatabaseMessage(error),
    );
  }
}

export async function getStudentEducationProgramDetail(
  supabase: SupabaseClient,
  programId: string,
): Promise<StudentEducationProgramRepositoryResult<StudentEducationProgramDetail>> {
  if (!isEducationProgramUuid(programId)) {
    return studentEducationProgramFailure("not_found", "Öğrenci programı bulunamadı.");
  }

  try {
    const { data: programRow, error: programError } = await supabase
      .from(STUDENT_EDUCATION_PROGRAMS_TABLE)
      .select(PROGRAM_DETAIL_SELECT)
      .eq("id", programId)
      .maybeSingle();

    if (programError) {
      return studentEducationProgramFailure(
        "database",
        getStudentEducationProgramDatabaseMessage(programError),
      );
    }
    if (!programRow || typeof programRow.student_id !== "string") {
      return studentEducationProgramFailure("not_found", "Öğrenci programı bulunamadı.");
    }

    const [studentResult, daysResult, tasksResult] = await Promise.all([
      supabase
        .from(STUDENTS_TABLE)
        .select("id,name,class_name")
        .eq("id", programRow.student_id)
        .maybeSingle(),
      supabase
        .from(STUDENT_EDUCATION_PROGRAM_DAYS_TABLE)
        .select(
          "id,program_id,day_number,title,description,status,available_at,started_at,completed_at",
        )
        .eq("program_id", programId)
        .order("day_number", { ascending: true }),
      supabase
        .from(STUDENT_EDUCATION_PROGRAM_TASKS_TABLE)
        .select(
          "id,program_id,program_day_id,student_id,day_number,order_number,exercise_slug,exercise_title,result_exercise_type,starting_level,duration_seconds,settings_schema_version,settings,status,started_at,completed_at",
        )
        .eq("program_id", programId)
        .order("day_number", { ascending: true })
        .order("order_number", { ascending: true }),
    ]);

    if (studentResult.error || daysResult.error || tasksResult.error) {
      return studentEducationProgramFailure(
        "database",
        getStudentEducationProgramDatabaseMessage(
          studentResult.error ?? daysResult.error ?? tasksResult.error,
        ),
      );
    }

    const summary = mapStudentEducationProgramSummary(
      programRow as DatabaseRow,
      (studentResult.data ?? undefined) as DatabaseRow | undefined,
    );
    if (!summary) {
      return studentEducationProgramFailure(
        "database",
        "Öğrenci programı verileri okunamadı.",
      );
    }

    const tasks = ((tasksResult.data ?? []) as DatabaseRow[])
      .map(mapStudentEducationProgramTask)
      .filter((task): task is StudentEducationProgramTask => task !== null);
    const days = ((daysResult.data ?? []) as DatabaseRow[])
      .map((day) => mapStudentEducationProgramDay(day, tasks))
      .filter((day): day is StudentEducationProgramDay => day !== null)
      .sort((first, second) => first.dayNumber - second.dayNumber);

    return {
      ok: true,
      value: {
        ...summary,
        studentMessage: nullableString(programRow.student_message),
        adminNote: nullableString(programRow.admin_note),
        assignedBy: nullableString(programRow.assigned_by),
        startedAt: nullableString(programRow.started_at),
        completedAt: nullableString(programRow.completed_at),
        cancelledAt: nullableString(programRow.cancelled_at),
        cancelReason: nullableString(programRow.cancel_reason),
        days,
      },
    };
  } catch (error) {
    return studentEducationProgramFailure(
      "database",
      getStudentEducationProgramDatabaseMessage(error),
    );
  }
}
