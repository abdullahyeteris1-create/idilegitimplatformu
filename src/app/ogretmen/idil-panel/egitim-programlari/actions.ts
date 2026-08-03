"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth/adminSession";
import {
  createEducationProgramTemplate,
  EDUCATION_PROGRAM_TEMPLATES_TABLE,
  getEducationProgramTemplate,
  publishEducationProgramTemplate,
  saveEducationProgramTemplateDay,
} from "@/lib/education-programs/repository";
import type {
  EducationProgramActionState,
  EducationProgramTemplateTaskInput,
} from "@/lib/education-programs/types";
import {
  validateCompleteEducationProgramTemplate,
  validateEducationProgramTemplateMetadata,
} from "@/lib/education-programs/validation";
import { buildPublishValidationMessage } from "@/lib/education-programs/publishMessages";
import { isEducationProgramExerciseSelectable } from "@/lib/education-programs/exerciseCatalog";
import { getExerciseSettingsSchema, readRawExerciseSettingsFromFormData } from "@/lib/education-programs/exerciseSettingsSchemas";
import { assignStudentEducationProgram } from "@/lib/education-programs/studentProgramRepository";
import type { StudentEducationProgramActionState } from "@/lib/education-programs/studentProgramTypes";
import { validateStudentEducationProgramAssignment } from "@/lib/education-programs/studentProgramValidation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const LIST_ROUTE = "/ogretmen/idil-panel/egitim-programlari";
const ASSIGN_ROUTE = `${LIST_ROUTE}/ata`;
const STUDENT_PROGRAMS_ROUTE = "/ogretmen/idil-panel/ogrenci-programlari";

async function hasAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  return typeof token === "string" && token.trim().length >= 16;
}

function errorState(
  message: string,
  issues?: EducationProgramActionState["issues"],
): EducationProgramActionState {
  return { status: "error", message, ...(issues ? { issues } : {}) };
}

function assignmentErrorState(
  message: string,
  issues?: StudentEducationProgramActionState["issues"],
): StudentEducationProgramActionState {
  return { status: "error", message, ...(issues ? { issues } : {}) };
}

function readTaskInputs(formData: FormData): EducationProgramTemplateTaskInput[] {
  return Array.from({ length: 5 }, (_, index) => {
    const orderNumber = index + 1;
    const prefix = `task-${orderNumber}`;
    const exerciseSlug = String(formData.get(`${prefix}-exerciseSlug`) ?? "").trim();

    if (!exerciseSlug) {
      return {
        orderNumber,
        exerciseSlug: null,
        durationSeconds: null,
        startingLevel: null,
        settings: {},
      };
    }

    const durationRaw = String(formData.get(`${prefix}-durationSeconds`) ?? "").trim();
    const levelRaw = String(formData.get(`${prefix}-startingLevel`) ?? "").trim();
    const settingsSchema = getExerciseSettingsSchema(exerciseSlug);
    // Ham (dogrulanmamis) deger okunur - asil dogrulama/acik hata uretimi tek
    // noktada, validateEducationProgramDayTasks (validation.ts) icinde
    // validateExerciseSettingsValueDetailed araciligiyla yapilir.
    const settings = settingsSchema
      ? readRawExerciseSettingsFromFormData(settingsSchema, formData, `${prefix}-settings-`)
      : {};

    return {
      orderNumber,
      exerciseSlug,
      durationSeconds: durationRaw ? Number(durationRaw) : null,
      startingLevel: levelRaw ? Number(levelRaw) : null,
      settings,
    };
  });
}

export async function createEducationProgramAction(
  _previousState: EducationProgramActionState,
  formData: FormData,
): Promise<EducationProgramActionState> {
  if (!(await hasAdminSession())) {
    return errorState("Yönetici oturumu geçerli değil. Lütfen yeniden giriş yapın.");
  }

  const validation = validateEducationProgramTemplateMetadata({
    name: formData.get("name"),
    category: formData.get("category"),
    adminDescription: formData.get("adminDescription"),
    dayCount: Number(formData.get("dayCount")),
  });

  if (!validation.ok) {
    return errorState(validation.message, validation.issues);
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return errorState("Eğitim programı servisi yapılandırılmamış.");
  }

  const result = await createEducationProgramTemplate(
    supabase,
    validation.value,
    process.env.ADMIN_USERNAME?.trim() || "teacher",
  );
  if (!result.ok) {
    return errorState(result.message);
  }

  revalidatePath(LIST_ROUTE);

  const intent = formData.get("intent") === "draft" ? "draft" : "edit";
  if (intent === "draft") {
    redirect(LIST_ROUTE);
  }

  redirect(`${LIST_ROUTE}/template/${result.value.templateId}`);
}

export async function saveEducationProgramDayAction(
  templateId: string,
  dayNumber: number,
  _previousState: EducationProgramActionState,
  formData: FormData,
): Promise<EducationProgramActionState> {
  if (!(await hasAdminSession())) {
    return errorState("Yönetici oturumu geçerli değil. Lütfen yeniden giriş yapın.");
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return errorState("Eğitim programı servisi yapılandırılmamış.");
  }

  const taskInputs = readTaskInputs(formData);
  const existingTemplateResult = await getEducationProgramTemplate(supabase, templateId);
  if (!existingTemplateResult.ok) {
    return errorState(existingTemplateResult.message);
  }

  // Yayin disi bir egzersiz yeni goreve eklenemez. Ancak ayni gunde zaten
  // kayitli eski bir gorev korunabilir ve diger alanlari duzenlenebilir.
  const existingDay = existingTemplateResult.value.days.find((day) => day.dayNumber === dayNumber);
  const legacyUnselectableSlugs = new Set(
    (existingDay?.tasks ?? [])
      .map((task) => task.exerciseSlug)
      .filter(
        (exerciseSlug): exerciseSlug is string =>
          typeof exerciseSlug === "string" && !isEducationProgramExerciseSelectable(exerciseSlug),
      ),
  );
  const newlyUnavailableTask = taskInputs.find(
    (task) =>
      task.exerciseSlug &&
      !isEducationProgramExerciseSelectable(task.exerciseSlug) &&
      !legacyUnselectableSlugs.has(task.exerciseSlug),
  );
  if (newlyUnavailableTask?.exerciseSlug) {
    return errorState("Seçilen çalışma şu anda yeni eğitim programı görevlerine eklenemiyor.");
  }

  // Bu gun kaydindan ONCE mevcut status okunur - saveEducationProgramTemplateDay
  // her cagrida statusu kosulsuz "draft"a dondurur (bkz. repository.ts), bu
  // yuzden yayinda bir sablonun sessizce taslaga dustugunu tespit etmenin tek
  // yolu save'den once statusu bilmektir.
  const { data: statusRow } = await supabase
    .from(EDUCATION_PROGRAM_TEMPLATES_TABLE)
    .select("status")
    .eq("id", templateId)
    .maybeSingle();
  const wasPublished = statusRow?.status === "published";

  const saveResult = await saveEducationProgramTemplateDay(
    supabase,
    templateId,
    dayNumber,
    taskInputs,
  );
  if (!saveResult.ok) {
    return errorState(saveResult.message);
  }

  const editorRoute = `${LIST_ROUTE}/template/${templateId}`;
  const intent = formData.get("intent") === "publish" ? "publish" : "draft";

  if (intent === "publish") {
    const templateResult = await getEducationProgramTemplate(supabase, templateId);
    if (!templateResult.ok) {
      return errorState(templateResult.message);
    }

    const validation = validateCompleteEducationProgramTemplate(templateResult.value);
    if (!validation.ok) {
      revalidatePath(editorRoute);
      return errorState(
        buildPublishValidationMessage(validation.issues, templateResult.value.dayCount),
        validation.issues,
      );
    }

    const publishResult = await publishEducationProgramTemplate(supabase, templateId);
    if (!publishResult.ok) {
      return errorState(publishResult.message);
    }

    revalidatePath(LIST_ROUTE);
    revalidatePath(editorRoute);
    return {
      status: "success",
      message: "Program yayınlandı.",
    };
  }

  revalidatePath(LIST_ROUTE);
  revalidatePath(editorRoute);

  if (wasPublished) {
    return {
      status: "warning",
      message: `Gün ${dayNumber} kaydedildi. Şablonda değişiklik yaptığınız için şablon tekrar taslak durumuna alındı. Öğrencilere atayabilmek için yeniden yayınlamanız gerekir.`,
    };
  }

  return {
    status: "success",
    message: `Gün ${dayNumber} taslak olarak kaydedildi.`,
  };
}

export async function assignEducationProgramAction(
  _previousState: StudentEducationProgramActionState,
  formData: FormData,
): Promise<StudentEducationProgramActionState> {
  if (!(await hasAdminSession())) {
    return assignmentErrorState(
      "Yönetici oturumu geçerli değil. Lütfen yeniden giriş yapın.",
    );
  }

  const validation = validateStudentEducationProgramAssignment({
    studentId: formData.get("studentId"),
    templateId: formData.get("templateId"),
    visibleName: formData.get("visibleName"),
    studentMessage: formData.get("studentMessage"),
    adminNote: formData.get("adminNote"),
  });
  if (!validation.ok) {
    return assignmentErrorState(validation.message, validation.issues);
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return assignmentErrorState("Eğitim programı servisi yapılandırılmamış.");
  }

  const result = await assignStudentEducationProgram(
    supabase,
    validation.value,
    process.env.ADMIN_USERNAME?.trim() || "teacher",
  );
  if (!result.ok) {
    return assignmentErrorState(result.message);
  }

  revalidatePath(ASSIGN_ROUTE);
  revalidatePath(STUDENT_PROGRAMS_ROUTE);
  redirect(`${STUDENT_PROGRAMS_ROUTE}/${result.value.programId}?assigned=1`);
}
