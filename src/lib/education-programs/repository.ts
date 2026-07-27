import type { SupabaseClient } from "@supabase/supabase-js";
import { isEducationProgramCategory } from "@/lib/education-programs/categories";
import {
  educationProgramFailure,
  getEducationProgramDatabaseMessage,
} from "@/lib/education-programs/errors";
import { getEducationProgramExercise } from "@/lib/education-programs/exerciseCatalog";
import type {
  EducationProgramTaskSettings,
  EducationProgramTemplate,
  EducationProgramTemplateDay,
  EducationProgramTemplateMetadataInput,
  EducationProgramTemplateStatus,
  EducationProgramTemplateSummary,
  EducationProgramTemplateTask,
  EducationProgramTemplateTaskInput,
  EducationProgramRepositoryResult,
} from "@/lib/education-programs/types";
import {
  EDUCATION_PROGRAM_TASKS_PER_DAY,
  validateCompleteEducationProgramTemplate,
  validateEducationProgramDayTasks,
  validateEducationProgramTemplateMetadata,
} from "@/lib/education-programs/validation";

export const EDUCATION_PROGRAM_TEMPLATES_TABLE = "education_program_templates";
export const EDUCATION_PROGRAM_TEMPLATE_DAYS_TABLE = "education_program_template_days";
export const EDUCATION_PROGRAM_TEMPLATE_TASKS_TABLE = "education_program_template_tasks";

const TEMPLATE_SELECT =
  "id,name,admin_description,category,day_count,status,is_active,version,created_by,created_at,updated_at";

type DatabaseRow = Record<string, unknown>;

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function settingsFromRow(value: unknown): EducationProgramTaskSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const settings: EducationProgramTaskSettings = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      settings[key] = item;
    }
  }
  return settings;
}

export function mapEducationProgramTemplateSummary(
  row: DatabaseRow,
): EducationProgramTemplateSummary | null {
  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    !isEducationProgramCategory(row.category)
  ) {
    return null;
  }

  const dayCount = Number(row.day_count);
  const status: EducationProgramTemplateStatus =
    row.status === "published" ? "published" : "draft";
  const version = Number(row.version ?? 1);

  if (
    !Number.isInteger(dayCount) ||
    dayCount < 1 ||
    dayCount > 60 ||
    !Number.isInteger(version) ||
    version < 1
  ) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    adminDescription: nullableString(row.admin_description),
    category: row.category,
    dayCount,
    status,
    isActive: row.is_active !== false,
    version,
    createdBy: nullableString(row.created_by),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapTaskRow(row: DatabaseRow): EducationProgramTemplateTask | null {
  if (
    typeof row.id !== "string" ||
    typeof row.template_day_id !== "string" ||
    !Number.isInteger(Number(row.order_number))
  ) {
    return null;
  }

  return {
    id: row.id,
    templateDayId: row.template_day_id,
    orderNumber: Number(row.order_number),
    exerciseSlug: nullableString(row.exercise_slug),
    exerciseTitle: nullableString(row.exercise_title),
    resultExerciseType: nullableString(row.result_exercise_type),
    durationSeconds:
      row.duration_seconds === null || row.duration_seconds === undefined
        ? null
        : Number(row.duration_seconds),
    startingLevel:
      row.starting_level === null || row.starting_level === undefined
        ? null
        : Number(row.starting_level),
    settingsSchemaVersion: Number(row.settings_schema_version ?? 1),
    settings: settingsFromRow(row.settings),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapDayRow(
  row: DatabaseRow,
  taskRows: readonly DatabaseRow[],
): EducationProgramTemplateDay | null {
  if (
    typeof row.id !== "string" ||
    typeof row.template_id !== "string" ||
    !Number.isInteger(Number(row.day_number))
  ) {
    return null;
  }

  const tasks = taskRows
    .filter((task) => task.template_day_id === row.id)
    .map(mapTaskRow)
    .filter((task): task is EducationProgramTemplateTask => task !== null)
    .sort((first, second) => first.orderNumber - second.orderNumber);

  return {
    id: row.id,
    templateId: row.template_id,
    dayNumber: Number(row.day_number),
    title: nullableString(row.title),
    description: nullableString(row.description),
    tasks,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function buildEducationProgramDaySeed(
  templateId: string,
  dayCount: number,
): Array<{ template_id: string; day_number: number }> {
  return Array.from({ length: dayCount }, (_, index) => ({
    template_id: templateId,
    day_number: index + 1,
  }));
}

export function buildEducationProgramEmptyTaskSeed(
  days: readonly { id: string; day_number: number }[],
): Array<{
  template_day_id: string;
  order_number: number;
  exercise_slug: null;
  exercise_title: null;
  duration_seconds: null;
  starting_level: null;
  settings: Record<string, never>;
}> {
  return days.flatMap((day) =>
    Array.from({ length: EDUCATION_PROGRAM_TASKS_PER_DAY }, (_, index) => ({
      template_day_id: day.id,
      order_number: index + 1,
      exercise_slug: null,
      exercise_title: null,
      duration_seconds: null,
      starting_level: null,
      settings: {},
    })),
  );
}

export async function listEducationProgramTemplates(
  supabase: SupabaseClient,
): Promise<EducationProgramRepositoryResult<EducationProgramTemplateSummary[]>> {
  try {
    const { data, error } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATES_TABLE)
      .select(TEMPLATE_SELECT)
      .order("updated_at", { ascending: false });

    if (error || !Array.isArray(data)) {
      return educationProgramFailure(
        "database",
        getEducationProgramDatabaseMessage(error),
      );
    }

    const templates = data
      .map((row) => mapEducationProgramTemplateSummary(row as DatabaseRow))
      .filter((template): template is EducationProgramTemplateSummary => template !== null);

    return { ok: true, value: templates };
  } catch (error) {
    return educationProgramFailure("database", getEducationProgramDatabaseMessage(error));
  }
}

export async function getEducationProgramTemplate(
  supabase: SupabaseClient,
  templateId: string,
): Promise<EducationProgramRepositoryResult<EducationProgramTemplate>> {
  if (!templateId.trim()) {
    return educationProgramFailure("not_found", "Eğitim programı bulunamadı.");
  }

  try {
    const { data: templateRow, error: templateError } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATES_TABLE)
      .select(TEMPLATE_SELECT)
      .eq("id", templateId)
      .maybeSingle();

    if (templateError) {
      return educationProgramFailure(
        "database",
        getEducationProgramDatabaseMessage(templateError),
      );
    }

    if (!templateRow) {
      return educationProgramFailure("not_found", "Eğitim programı bulunamadı.");
    }

    const summary = mapEducationProgramTemplateSummary(templateRow as DatabaseRow);
    if (!summary) {
      return educationProgramFailure("database", "Eğitim programı verileri okunamadı.");
    }

    const { data: dayRows, error: dayError } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATE_DAYS_TABLE)
      .select("id,template_id,day_number,title,description,created_at,updated_at")
      .eq("template_id", templateId)
      .order("day_number", { ascending: true });

    if (dayError || !Array.isArray(dayRows)) {
      return educationProgramFailure("database", getEducationProgramDatabaseMessage(dayError));
    }

    const dayIds = dayRows
      .map((day) => (typeof day.id === "string" ? day.id : ""))
      .filter(Boolean);

    let taskRows: DatabaseRow[] = [];
    if (dayIds.length > 0) {
      const { data, error } = await supabase
        .from(EDUCATION_PROGRAM_TEMPLATE_TASKS_TABLE)
        .select(
          "id,template_day_id,order_number,exercise_slug,exercise_title,result_exercise_type,duration_seconds,starting_level,settings_schema_version,settings,created_at,updated_at",
        )
        .in("template_day_id", dayIds)
        .order("order_number", { ascending: true });

      if (error || !Array.isArray(data)) {
        return educationProgramFailure("database", getEducationProgramDatabaseMessage(error));
      }
      taskRows = data as DatabaseRow[];
    }

    const days = dayRows
      .map((day) => mapDayRow(day as DatabaseRow, taskRows))
      .filter((day): day is EducationProgramTemplateDay => day !== null)
      .sort((first, second) => first.dayNumber - second.dayNumber);

    return { ok: true, value: { ...summary, days } };
  } catch (error) {
    return educationProgramFailure("database", getEducationProgramDatabaseMessage(error));
  }
}

async function cleanupTemplate(supabase: SupabaseClient, templateId: string): Promise<void> {
  try {
    await supabase.from(EDUCATION_PROGRAM_TEMPLATES_TABLE).delete().eq("id", templateId);
  } catch {
    // The original database error is returned to the caller. Cleanup is best effort.
  }
}

export async function createEducationProgramTemplate(
  supabase: SupabaseClient,
  rawInput: unknown,
  createdBy: string,
): Promise<EducationProgramRepositoryResult<{ templateId: string }>> {
  const validation = validateEducationProgramTemplateMetadata(rawInput);
  if (!validation.ok) {
    return educationProgramFailure("validation", validation.message);
  }

  const input: EducationProgramTemplateMetadataInput = validation.value;

  try {
    const { data: created, error: templateError } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATES_TABLE)
      .insert({
        name: input.name,
        admin_description: input.adminDescription,
        category: input.category,
        day_count: input.dayCount,
        status: "draft",
        created_by: createdBy,
      })
      .select("id")
      .single();

    if (templateError || !created || typeof created.id !== "string") {
      return educationProgramFailure(
        "database",
        getEducationProgramDatabaseMessage(templateError),
      );
    }

    const templateId = created.id;
    const { data: createdDays, error: daysError } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATE_DAYS_TABLE)
      .insert(buildEducationProgramDaySeed(templateId, input.dayCount))
      .select("id,day_number");

    if (
      daysError ||
      !Array.isArray(createdDays) ||
      createdDays.length !== input.dayCount
    ) {
      await cleanupTemplate(supabase, templateId);
      return educationProgramFailure("database", getEducationProgramDatabaseMessage(daysError));
    }

    const normalizedDays = createdDays
      .map((day) => ({
        id: typeof day.id === "string" ? day.id : "",
        day_number: Number(day.day_number),
      }))
      .filter((day) => day.id && Number.isInteger(day.day_number));

    if (normalizedDays.length !== input.dayCount) {
      await cleanupTemplate(supabase, templateId);
      return educationProgramFailure("database", "Program günleri oluşturulamadı.");
    }

    const taskSeed = buildEducationProgramEmptyTaskSeed(normalizedDays);
    const { error: tasksError } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATE_TASKS_TABLE)
      .insert(taskSeed);

    if (tasksError) {
      await cleanupTemplate(supabase, templateId);
      return educationProgramFailure("database", getEducationProgramDatabaseMessage(tasksError));
    }

    return { ok: true, value: { templateId } };
  } catch (error) {
    return educationProgramFailure("database", getEducationProgramDatabaseMessage(error));
  }
}

export async function saveEducationProgramTemplateDay(
  supabase: SupabaseClient,
  templateId: string,
  dayNumber: number,
  rawTasks: unknown,
): Promise<EducationProgramRepositoryResult<{ dayNumber: number }>> {
  const validation = validateEducationProgramDayTasks(rawTasks, {
    allowIncomplete: true,
    dayNumber,
  });
  if (!validation.ok) {
    return educationProgramFailure("validation", validation.message);
  }

  try {
    const { data: template, error: templateError } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATES_TABLE)
      .select("id,day_count,version")
      .eq("id", templateId)
      .maybeSingle();

    if (templateError) {
      return educationProgramFailure("database", getEducationProgramDatabaseMessage(templateError));
    }
    if (!template || dayNumber < 1 || dayNumber > Number(template.day_count)) {
      return educationProgramFailure("not_found", "Program günü bulunamadı.");
    }

    const { data: day, error: dayError } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATE_DAYS_TABLE)
      .select("id")
      .eq("template_id", templateId)
      .eq("day_number", dayNumber)
      .maybeSingle();

    if (dayError) {
      return educationProgramFailure("database", getEducationProgramDatabaseMessage(dayError));
    }
    if (!day || typeof day.id !== "string") {
      return educationProgramFailure("not_found", "Program günü bulunamadı.");
    }

    const rows = validation.value.map((task: EducationProgramTemplateTaskInput) => {
      const definition = task.exerciseSlug
        ? getEducationProgramExercise(task.exerciseSlug)
        : undefined;

      return {
        template_day_id: day.id,
        order_number: task.orderNumber,
        exercise_slug: definition?.slug ?? null,
        exercise_title: definition?.title ?? null,
        result_exercise_type: definition?.resultExerciseType ?? null,
        duration_seconds: definition ? task.durationSeconds : null,
        starting_level: definition?.supportsLevel ? task.startingLevel : null,
        settings_schema_version: definition?.settingsSchemaVersion ?? 1,
        settings: definition ? task.settings : {},
      };
    });

    const { error: statusError } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATES_TABLE)
      .update({
        status: "draft",
        version: Math.max(1, Number(template.version ?? 1)) + 1,
      })
      .eq("id", templateId);

    if (statusError) {
      return educationProgramFailure("database", getEducationProgramDatabaseMessage(statusError));
    }

    const { error: tasksError } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATE_TASKS_TABLE)
      .upsert(rows, { onConflict: "template_day_id,order_number" });

    if (tasksError) {
      return educationProgramFailure("database", getEducationProgramDatabaseMessage(tasksError));
    }

    return { ok: true, value: { dayNumber } };
  } catch (error) {
    return educationProgramFailure("database", getEducationProgramDatabaseMessage(error));
  }
}

const TEMPLATE_NAME_MAX_LENGTH = 120;
const DUPLICATE_NAME_SUFFIX = " - Kopya";

// Saf (side-effect'siz) fonksiyon - "Ad - Kopya" cakisiyorsa "Ad - Kopya 2",
// "Ad - Kopya 3" ... seklinde ilk bos ismi bulur. DB'deki
// education_program_templates_name_check (1-120 karakter) sinirini asmamak
// icin gerekirse kaynak adin sonu kirpilir.
export function generateDuplicateTemplateName(
  existingNames: readonly string[],
  sourceName: string,
): string {
  const existing = new Set(existingNames.map((name) => name.trim()));
  const trimmedSource = sourceName.trim();

  function buildCandidate(counterSuffix: string): string {
    const maxSourceLength = TEMPLATE_NAME_MAX_LENGTH - DUPLICATE_NAME_SUFFIX.length - counterSuffix.length;
    const safeSource =
      trimmedSource.length > maxSourceLength
        ? trimmedSource.slice(0, Math.max(0, maxSourceLength)).trim()
        : trimmedSource;
    return `${safeSource}${DUPLICATE_NAME_SUFFIX}${counterSuffix}`;
  }

  const baseCandidate = buildCandidate("");
  if (!existing.has(baseCandidate)) {
    return baseCandidate;
  }

  let counter = 2;
  while (true) {
    const candidate = buildCandidate(` ${counter}`);
    if (!existing.has(candidate)) {
      return candidate;
    }
    counter += 1;
  }
}

export async function duplicateEducationProgramTemplate(
  supabase: SupabaseClient,
  templateId: string,
  createdBy: string,
): Promise<EducationProgramRepositoryResult<{ templateId: string }>> {
  if (!templateId.trim()) {
    return educationProgramFailure("not_found", "Eğitim programı bulunamadı.");
  }

  try {
    const { data: sourceRow, error: sourceError } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATES_TABLE)
      .select("id,name")
      .eq("id", templateId)
      .maybeSingle();

    if (sourceError) {
      return educationProgramFailure("database", getEducationProgramDatabaseMessage(sourceError));
    }
    if (!sourceRow || typeof sourceRow.name !== "string") {
      return educationProgramFailure("not_found", "Eğitim programı bulunamadı.");
    }

    const { data: nameRows, error: nameError } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATES_TABLE)
      .select("name");

    if (nameError || !Array.isArray(nameRows)) {
      return educationProgramFailure("database", getEducationProgramDatabaseMessage(nameError));
    }

    const existingNames = nameRows
      .map((row) => (typeof row.name === "string" ? row.name : ""))
      .filter(Boolean);
    const newName = generateDuplicateTemplateName(existingNames, sourceRow.name);

    const { data: newTemplateId, error: rpcError } = await supabase.rpc(
      "duplicate_education_program_template_v1",
      {
        p_source_template_id: templateId,
        p_new_name: newName,
        p_created_by: createdBy,
      },
    );

    if (rpcError || typeof newTemplateId !== "string") {
      return educationProgramFailure("database", getEducationProgramDatabaseMessage(rpcError));
    }

    return { ok: true, value: { templateId: newTemplateId } };
  } catch (error) {
    return educationProgramFailure("database", getEducationProgramDatabaseMessage(error));
  }
}

// Kalici (hard) silme - kullanicinin acikca istedigi davranis ("Kalici Olarak
// Sil", "Bu islem geri alinamaz"). education_program_template_days/_tasks
// ON DELETE CASCADE ile otomatik temizlenir. Ogrenciye atanmis programlar
// (ayri, bagimsiz snapshot tablolari - bkz. studentProgramRepository.ts)
// yalniz kaynak sablon referansini kaybeder (DB tarafinda ON DELETE SET
// NULL), veri olarak hicbir sekilde etkilenmez veya silinmez.
export async function deleteEducationProgramTemplate(
  supabase: SupabaseClient,
  templateId: string,
): Promise<EducationProgramRepositoryResult<{ templateId: string }>> {
  if (!templateId.trim()) {
    return educationProgramFailure("not_found", "Eğitim programı bulunamadı.");
  }

  try {
    const { data, error } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATES_TABLE)
      .delete()
      .eq("id", templateId)
      .select("id")
      .maybeSingle();

    if (error) {
      return educationProgramFailure("database", getEducationProgramDatabaseMessage(error));
    }
    if (!data) {
      return educationProgramFailure("not_found", "Eğitim programı bulunamadı.");
    }

    return { ok: true, value: { templateId } };
  } catch (error) {
    return educationProgramFailure("database", getEducationProgramDatabaseMessage(error));
  }
}

export async function publishEducationProgramTemplate(
  supabase: SupabaseClient,
  templateId: string,
): Promise<EducationProgramRepositoryResult<{ templateId: string }>> {
  const templateResult = await getEducationProgramTemplate(supabase, templateId);
  if (!templateResult.ok) return templateResult;

  const validation = validateCompleteEducationProgramTemplate(templateResult.value);
  if (!validation.ok) {
    return educationProgramFailure("validation", validation.message);
  }

  try {
    const { error } = await supabase
      .from(EDUCATION_PROGRAM_TEMPLATES_TABLE)
      .update({ status: "published" })
      .eq("id", templateId);

    if (error) {
      return educationProgramFailure("database", getEducationProgramDatabaseMessage(error));
    }

    return { ok: true, value: { templateId } };
  } catch (error) {
    return educationProgramFailure("database", getEducationProgramDatabaseMessage(error));
  }
}
