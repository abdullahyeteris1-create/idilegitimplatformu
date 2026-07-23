import type { SupabaseClient } from "@supabase/supabase-js";
import { ASSIGNMENT_CLASS_GROUPS, type AssignmentClassGroup } from "@/lib/assignments/classGroups";
import type { ProgramClassExerciseSetting, ProgramClassTemplate, ProgramClassTemplateWithSettings } from "@/lib/assignments/types";

const PROGRAM_CLASS_TEMPLATES_TABLE = "program_class_templates";
const PROGRAM_CLASS_EXERCISE_SETTINGS_TABLE = "program_class_exercise_settings";

const CLASS_GROUP_ORDER = new Map<string, number>(ASSIGNMENT_CLASS_GROUPS.map((group, index) => [group, index]));

function mapTemplateRow(row: Record<string, unknown>): ProgramClassTemplate {
  return {
    id: String(row.id ?? ""),
    classGroup: row.class_group as AssignmentClassGroup,
    name: String(row.name ?? ""),
    description: typeof row.description === "string" ? row.description : null,
    programDays: Number(row.program_days ?? 20),
    tasksPerDay: Number(row.tasks_per_day ?? 5),
    defaultTaskDurationSeconds: Number(row.default_task_duration_seconds ?? 300),
    isActive: row.is_active !== false,
    createdBy: typeof row.created_by === "string" ? row.created_by : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapExerciseSettingRow(row: Record<string, unknown>): ProgramClassExerciseSetting {
  return {
    id: String(row.id ?? ""),
    templateId: String(row.template_id ?? ""),
    exerciseSlug: String(row.exercise_slug ?? ""),
    enabled: row.enabled !== false,
    startingLevel: Number(row.starting_level ?? 1),
    durationSeconds: Number(row.duration_seconds ?? 300),
    settings: (row.settings as Record<string, string | number | boolean>) ?? {},
    dailyWeight: Number(row.daily_weight ?? 1),
    repeatCooldownDays: Number(row.repeat_cooldown_days ?? 0),
    maxOccurrencesPerProgram: typeof row.max_occurrences_per_program === "number" ? row.max_occurrences_per_program : null,
    displayOrder: Number(row.display_order ?? 0),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function sortExerciseSettings(rows: ProgramClassExerciseSetting[]): ProgramClassExerciseSetting[] {
  return [...rows].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.exerciseSlug.localeCompare(b.exerciseSlug);
  });
}

function sortTemplates(templates: ProgramClassTemplateWithSettings[]): ProgramClassTemplateWithSettings[] {
  return [...templates].sort((a, b) => {
    const orderA = CLASS_GROUP_ORDER.get(a.template.classGroup) ?? Number.MAX_SAFE_INTEGER;
    const orderB = CLASS_GROUP_ORDER.get(b.template.classGroup) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.template.name.localeCompare(b.template.name);
  });
}

async function loadExerciseSettingsForTemplates(
  supabase: SupabaseClient,
  templateIds: string[],
): Promise<Map<string, ProgramClassExerciseSetting[]>> {
  const byTemplate = new Map<string, ProgramClassExerciseSetting[]>();
  if (templateIds.length === 0) {
    return byTemplate;
  }

  const { data } = await supabase
    .from(PROGRAM_CLASS_EXERCISE_SETTINGS_TABLE)
    .select("*")
    .in("template_id", templateIds);

  if (!Array.isArray(data)) {
    return byTemplate;
  }

  for (const row of data as Record<string, unknown>[]) {
    const setting = mapExerciseSettingRow(row);
    const list = byTemplate.get(setting.templateId) ?? [];
    list.push(setting);
    byTemplate.set(setting.templateId, list);
  }

  for (const [templateId, list] of byTemplate) {
    byTemplate.set(templateId, sortExerciseSettings(list));
  }

  return byTemplate;
}

/** Butun sinif sablonlarini (istege bagli classGroup filtresiyle) ayarlariyla birlikte listeler. Salt-okunur. */
export async function listProgramClassTemplates(
  supabase: SupabaseClient,
  classGroup?: AssignmentClassGroup,
): Promise<ProgramClassTemplateWithSettings[]> {
  let query = supabase.from(PROGRAM_CLASS_TEMPLATES_TABLE).select("*");
  if (classGroup) {
    query = query.eq("class_group", classGroup);
  }

  const { data, error } = await query;
  if (error || !Array.isArray(data)) {
    return [];
  }

  const templates = (data as Record<string, unknown>[]).map(mapTemplateRow);
  const settingsByTemplate = await loadExerciseSettingsForTemplates(
    supabase,
    templates.map((template) => template.id),
  );

  return sortTemplates(
    templates.map((template) => ({
      template,
      exerciseSettings: settingsByTemplate.get(template.id) ?? [],
    })),
  );
}

/** Tek bir sablonu id ile ayarlariyla birlikte getirir. Salt-okunur. */
export async function getProgramClassTemplateById(
  supabase: SupabaseClient,
  templateId: string,
): Promise<ProgramClassTemplateWithSettings | null> {
  const { data, error } = await supabase
    .from(PROGRAM_CLASS_TEMPLATES_TABLE)
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const template = mapTemplateRow(data as Record<string, unknown>);
  const settingsByTemplate = await loadExerciseSettingsForTemplates(supabase, [template.id]);

  return {
    template,
    exerciseSettings: settingsByTemplate.get(template.id) ?? [],
  };
}

export type UpsertExerciseSettingInput = {
  exerciseSlug: string;
  enabled: boolean;
  startingLevel: number;
  durationSeconds: number;
  dailyWeight: number;
  repeatCooldownDays: number;
  maxOccurrencesPerProgram: number | null;
  displayOrder: number;
  settings: Record<string, string | number | boolean>;
};

export type UpsertProgramClassTemplateInput = {
  templateId?: string;
  classGroup: AssignmentClassGroup;
  name: string;
  description: string | null;
  defaultTaskDurationSeconds: number;
  exercises: UpsertExerciseSettingInput[];
};

/**
 * Sablonu ve egzersiz ayarlarini kaydeder/gunceller.
 *
 * TRANSACTION NOTU: Supabase JS istemcisi coklu-tablo transaction saglamaz;
 * bu turda yeni bir SQL RPC/migration yazilmadigi icin en guvenli mevcut
 * yaklasim izlendi: (1) sablon satiri TEK bir upsert ile yazilir, (2)
 * gonderilen tum egzersiz ayarlari TEK bir toplu upsert cagrisiyla yazilir
 * (Supabase/Postgrest coklu-satir upsert'i TEK bir SQL ifadesi olarak
 * calistirir, bu yuzden o coklu-satir islem kendi icinde atomiktir), (3)
 * istekte YER ALMAYAN mevcut satirlar SILINMEZ, yalniz `enabled=false`
 * yapilir (destructive delete-all-then-insert yaklasimindan bilerek
 * kacinildi). Adim (1) basarili olup adim (2) basarisiz olursa, sablon
 * satisi yeni/guncel haliyle kalir ama egzersiz ayarlari eskisi gibi kalmis
 * olabilir - bu KISMI BASARISIZLIK RISKI yalniz gercek bir RPC/transaction
 * ile tam olarak ortadan kaldirilabilir (bu turda yaziLMADI).
 */
export async function upsertProgramClassTemplate(
  supabase: SupabaseClient,
  input: UpsertProgramClassTemplateInput,
): Promise<{ ok: true; result: ProgramClassTemplateWithSettings } | { ok: false; message: string }> {
  const templatePayload: Record<string, unknown> = {
    class_group: input.classGroup,
    name: input.name,
    description: input.description,
    default_task_duration_seconds: input.defaultTaskDurationSeconds,
  };

  let templateId = input.templateId;

  if (templateId) {
    const { data, error } = await supabase
      .from(PROGRAM_CLASS_TEMPLATES_TABLE)
      .update(templatePayload)
      .eq("id", templateId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, message: "Sablon guncellenemedi veya bulunamadi." };
    }
  } else {
    const { data, error } = await supabase
      .from(PROGRAM_CLASS_TEMPLATES_TABLE)
      .insert(templatePayload)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, message: "Sablon olusturulamadi." };
    }
    templateId = String((data as Record<string, unknown>).id);
  }

  if (input.exercises.length > 0) {
    const settingsRows = input.exercises.map((exercise) => ({
      template_id: templateId,
      exercise_slug: exercise.exerciseSlug,
      enabled: exercise.enabled,
      starting_level: exercise.startingLevel,
      duration_seconds: exercise.durationSeconds,
      daily_weight: exercise.dailyWeight,
      repeat_cooldown_days: exercise.repeatCooldownDays,
      max_occurrences_per_program: exercise.maxOccurrencesPerProgram,
      display_order: exercise.displayOrder,
      settings: exercise.settings,
    }));

    const { error: upsertError } = await supabase
      .from(PROGRAM_CLASS_EXERCISE_SETTINGS_TABLE)
      .upsert(settingsRows, { onConflict: "template_id,exercise_slug" });

    if (upsertError) {
      return { ok: false, message: "Egzersiz ayarlari kaydedilemedi." };
    }

    // exerciseSlug degerleri her zaman kebab-case (harf/rakam/tire) oldugu
    // icin (bkz. ASSIGNMENT_EXERCISE_CATALOG) PostgREST'in "in.(a,b,c)"
    // liste sozdizimine ekstra tirnaklama gerekmeden guvenle yazilabilir.
    const incomingSlugs = input.exercises.map((exercise) => exercise.exerciseSlug);
    await supabase
      .from(PROGRAM_CLASS_EXERCISE_SETTINGS_TABLE)
      .update({ enabled: false })
      .eq("template_id", templateId)
      .not("exercise_slug", "in", `(${incomingSlugs.join(",")})`);
  }

  const result = await getProgramClassTemplateById(supabase, templateId);
  if (!result) {
    return { ok: false, message: "Sablon kaydedildi ancak yeniden okunamadi." };
  }

  return { ok: true, result };
}
