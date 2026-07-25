import type { SupabaseClient } from "@supabase/supabase-js";
import { ASSIGNMENT_CLASS_GROUPS, type AssignmentClassGroup } from "@/lib/assignments/classGroups";
import type {
  ProgramClassTemplate,
  ProgramTemplateSlot,
  ProgramTemplateSummary,
  ProgramTemplateWithSlots,
} from "@/lib/assignments/types";

/**
 * Elle kurulan odev sablonu kutuphanesinin veri erisim katmani. Sablon
 * basliklari `program_class_templates` tablosunda, her gunun 5 calismasi ise
 * `program_template_tasks` tablosunda yasar.
 *
 * NOT: `program_class_exercise_settings` tablosu bu dosyadan artik hic
 * okunmaz/yazilmaz - o tablo yalniz eski, kullanilmayan agirlikli-rastgele
 * uretim akisina aitti (bkz. ilgili migration'daki "DEPRECATED" yorumu).
 */

const PROGRAM_CLASS_TEMPLATES_TABLE = "program_class_templates";
const PROGRAM_TEMPLATE_TASKS_TABLE = "program_template_tasks";
const REPLACE_TEMPLATE_SLOTS_RPC = "replace_program_template_tasks";

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

function mapSlotRow(row: Record<string, unknown>): ProgramTemplateSlot {
  return {
    dayNumber: Number(row.day_number ?? 0),
    taskOrder: Number(row.task_order ?? 0),
    exerciseSlug: String(row.exercise_slug ?? ""),
    category: String(row.category ?? ""),
    startingLevel: Number(row.starting_level ?? 1),
    durationSeconds: Number(row.duration_seconds ?? 300),
    settings: (row.settings as Record<string, string | number | boolean>) ?? {},
  };
}

function expectedSlotCountFor(template: ProgramClassTemplate): number {
  return template.programDays * template.tasksPerDay;
}

/** Sablon kutuphanesi: her sablon + kac slotunun doldugu. Salt-okunur. */
export async function listTemplateLibrary(
  supabase: SupabaseClient,
  options?: { includeInactive?: boolean },
): Promise<ProgramTemplateSummary[]> {
  let query = supabase.from(PROGRAM_CLASS_TEMPLATES_TABLE).select("*");
  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error || !Array.isArray(data)) {
    return [];
  }

  const templates = (data as Record<string, unknown>[]).map(mapTemplateRow);
  if (templates.length === 0) {
    return [];
  }

  // Yalniz template_id kolonu cekilir - slot govdelerini (settings jsonb dahil)
  // liste ekraninda tasimanin anlami yok, sayim icin bu yeterli.
  const { data: slotRows } = await supabase
    .from(PROGRAM_TEMPLATE_TASKS_TABLE)
    .select("template_id")
    .in("template_id", templates.map((template) => template.id));

  const filledByTemplate = new Map<string, number>();
  if (Array.isArray(slotRows)) {
    for (const row of slotRows as Record<string, unknown>[]) {
      const templateId = String(row.template_id ?? "");
      filledByTemplate.set(templateId, (filledByTemplate.get(templateId) ?? 0) + 1);
    }
  }

  return templates
    .map((template) => ({
      ...template,
      filledSlotCount: filledByTemplate.get(template.id) ?? 0,
      expectedSlotCount: expectedSlotCountFor(template),
    }))
    .sort((a, b) => {
      const orderA = CLASS_GROUP_ORDER.get(a.classGroup) ?? Number.MAX_SAFE_INTEGER;
      const orderB = CLASS_GROUP_ORDER.get(b.classGroup) ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name, "tr");
    });
}

/** Bir sablonu tum gun/slot satirlariyla birlikte getirir. Salt-okunur. */
export async function getTemplateWithSlots(
  supabase: SupabaseClient,
  templateId: string,
): Promise<ProgramTemplateWithSlots | null> {
  const { data, error } = await supabase
    .from(PROGRAM_CLASS_TEMPLATES_TABLE)
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const template = mapTemplateRow(data as Record<string, unknown>);

  const { data: slotRows } = await supabase
    .from(PROGRAM_TEMPLATE_TASKS_TABLE)
    .select("day_number, task_order, exercise_slug, category, starting_level, duration_seconds, settings")
    .eq("template_id", templateId)
    .order("day_number", { ascending: true })
    .order("task_order", { ascending: true });

  return {
    template,
    slots: Array.isArray(slotRows) ? (slotRows as Record<string, unknown>[]).map(mapSlotRow) : [],
    expectedSlotCount: expectedSlotCountFor(template),
  };
}

export type CreateTemplateInput = {
  classGroup: AssignmentClassGroup;
  name: string;
  description: string | null;
  programDays: number;
  defaultTaskDurationSeconds: number;
  createdBy: string | null;
};

/** Bos bir sablon basligi olusturur (slotlar sonradan editorde doldurulur). */
export async function createTemplate(
  supabase: SupabaseClient,
  input: CreateTemplateInput,
): Promise<{ ok: true; templateId: string } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from(PROGRAM_CLASS_TEMPLATES_TABLE)
    .insert({
      class_group: input.classGroup,
      name: input.name,
      description: input.description,
      program_days: input.programDays,
      tasks_per_day: 5,
      default_task_duration_seconds: input.defaultTaskDurationSeconds,
      created_by: input.createdBy,
      is_active: true,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Template creation failed", { code: error?.code, message: error?.message });
    return { ok: false, message: "Sablon olusturulamadi." };
  }

  return { ok: true, templateId: String((data as Record<string, unknown>).id) };
}

/** Sablon basligini gunceller (ad/aciklama). Gun sayisi burada degistirilmez. */
export async function updateTemplateMeta(
  supabase: SupabaseClient,
  templateId: string,
  input: { name: string; description: string | null },
): Promise<boolean> {
  const { error } = await supabase
    .from(PROGRAM_CLASS_TEMPLATES_TABLE)
    .update({ name: input.name, description: input.description })
    .eq("id", templateId);

  return !error;
}

/** Sablonu pasiflestirir (kalici silme YAPILMAZ - atanmis programlarin kokeni korunur). */
export async function deactivateTemplate(supabase: SupabaseClient, templateId: string): Promise<boolean> {
  const { error } = await supabase
    .from(PROGRAM_CLASS_TEMPLATES_TABLE)
    .update({ is_active: false })
    .eq("id", templateId);

  return !error;
}

/**
 * Bir sablonun TUM slotlarini degistirir. Sil+yaz islemi
 * replace_program_template_tasks RPC'si icinde TEK transaction olarak
 * yapilir - yarim kaydedilmis bir sablon olusamaz.
 */
export async function replaceTemplateSlots(
  supabase: SupabaseClient,
  templateId: string,
  slots: ProgramTemplateSlot[],
): Promise<{ ok: true; slotCount: number } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc(REPLACE_TEMPLATE_SLOTS_RPC, {
    p_template_id: templateId,
    p_tasks: slots.map((slot) => ({
      dayNumber: slot.dayNumber,
      taskOrder: slot.taskOrder,
      exerciseSlug: slot.exerciseSlug,
      category: slot.category,
      startingLevel: slot.startingLevel,
      durationSeconds: slot.durationSeconds,
      settings: slot.settings,
    })),
  });

  if (error) {
    console.error("replace_program_template_tasks failed", { code: error.code, message: error.message });
    return { ok: false, message: "Sablon slotlari kaydedilemedi." };
  }

  const slotCount = typeof data === "object" && data && typeof (data as Record<string, unknown>).slotCount === "number"
    ? ((data as Record<string, unknown>).slotCount as number)
    : slots.length;

  return { ok: true, slotCount };
}

/**
 * Tek bir slotu yazar/gunceller (grid'de tek hucre duzenlerken). Ayni gun
 * icinde ayni egzersizin tekrarini engelleyen unique constraint bu yolda da
 * gecerlidir - ihlal durumunda anlasilir bir mesaj donulur.
 */
export async function upsertTemplateSlot(
  supabase: SupabaseClient,
  templateId: string,
  slot: ProgramTemplateSlot,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase
    .from(PROGRAM_TEMPLATE_TASKS_TABLE)
    .upsert(
      {
        template_id: templateId,
        day_number: slot.dayNumber,
        task_order: slot.taskOrder,
        exercise_slug: slot.exerciseSlug,
        category: slot.category,
        starting_level: slot.startingLevel,
        duration_seconds: slot.durationSeconds,
        settings: slot.settings,
      },
      { onConflict: "template_id,day_number,task_order" },
    );

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Bu egzersiz ayni gun icinde zaten kullaniliyor." };
    }
    console.error("Template slot upsert failed", { code: error.code, message: error.message });
    return { ok: false, message: "Slot kaydedilemedi." };
  }

  return { ok: true };
}

/** Tek bir slotu bosaltir. */
export async function deleteTemplateSlot(
  supabase: SupabaseClient,
  templateId: string,
  dayNumber: number,
  taskOrder: number,
): Promise<boolean> {
  const { error } = await supabase
    .from(PROGRAM_TEMPLATE_TASKS_TABLE)
    .delete()
    .eq("template_id", templateId)
    .eq("day_number", dayNumber)
    .eq("task_order", taskOrder);

  return !error;
}

/**
 * Bir sablonu tum slotlariyla birlikte kopyalar - ogretmenin tek
 * hizlandiricisi: "1. Sinif sablonunu cogalt, adini degistir, seviyeleri
 * yukselt". Slot kopyalama, hedef sablon olustuktan sonra tek bir
 * replaceTemplateSlots cagrisiyla atomik olarak yapilir.
 */
export async function duplicateTemplate(
  supabase: SupabaseClient,
  sourceTemplateId: string,
  input: { name: string; classGroup?: AssignmentClassGroup; createdBy: string | null },
): Promise<{ ok: true; templateId: string } | { ok: false; message: string }> {
  const source = await getTemplateWithSlots(supabase, sourceTemplateId);
  if (!source) {
    return { ok: false, message: "Kopyalanacak sablon bulunamadi." };
  }

  const created = await createTemplate(supabase, {
    classGroup: input.classGroup ?? source.template.classGroup,
    name: input.name,
    description: source.template.description,
    programDays: source.template.programDays,
    defaultTaskDurationSeconds: source.template.defaultTaskDurationSeconds,
    createdBy: input.createdBy,
  });

  if (!created.ok) {
    return created;
  }

  if (source.slots.length > 0) {
    const replaced = await replaceTemplateSlots(supabase, created.templateId, source.slots);
    if (!replaced.ok) {
      // Slot kopyalama basarisiz olduysa yarim kalmis basligi geride birakma.
      await supabase.from(PROGRAM_CLASS_TEMPLATES_TABLE).delete().eq("id", created.templateId);
      return { ok: false, message: "Sablon kopyalanamadi." };
    }
  }

  return { ok: true, templateId: created.templateId };
}

