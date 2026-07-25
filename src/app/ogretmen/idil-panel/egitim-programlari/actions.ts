"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth/adminSession";
import {
  createEducationProgramTemplate,
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
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const LIST_ROUTE = "/ogretmen/idil-panel/egitim-programlari";

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

    return {
      orderNumber,
      exerciseSlug,
      durationSeconds: durationRaw ? Number(durationRaw) : null,
      startingLevel: levelRaw ? Number(levelRaw) : null,
      settings: {},
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

  const saveResult = await saveEducationProgramTemplateDay(
    supabase,
    templateId,
    dayNumber,
    readTaskInputs(formData),
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
        "Program yayınlanamadı. Eksik gün ve çalışmaları tamamlayın.",
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
      message: "Program doğrulandı ve başarıyla kaydedildi.",
    };
  }

  revalidatePath(LIST_ROUTE);
  revalidatePath(editorRoute);
  return {
    status: "success",
    message: `Gün ${dayNumber} taslak olarak kaydedildi.`,
  };
}
