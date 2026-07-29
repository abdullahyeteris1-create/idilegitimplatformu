"use server";

import { revalidatePath } from "next/cache";

import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  bulkCreateTwoSideFocusWordSets,
  createTwoSideFocusWordSet,
  deleteTwoSideFocusWordSet,
  listTwoSideFocusWordSetsForTeacher,
  setTwoSideFocusWordSetActive,
  updateTwoSideFocusWordSet,
  type TwoSideFocusBulkCreateResult,
  type TwoSideFocusTeacherItem,
  type TwoSideFocusTeacherSummary,
} from "@/lib/two-side-focus/twoSideFocusTeacherRepository";
import type { TwoSideFocusTeacherDraftValidationIssue } from "@/lib/two-side-focus/twoSideFocusCrud";

const LIST_ROUTE = "/ogretmen/icerik-yonetimi/cift-tarafli-odak";
const CONTENT_MANAGEMENT_ROUTE = "/ogretmen/icerik-yonetimi";

export type TwoSideFocusActionSuccess = {
  ok: true;
  message: string;
  items: TwoSideFocusTeacherItem[];
  summary: TwoSideFocusTeacherSummary;
  bulkResult?: TwoSideFocusBulkCreateResult;
};

export type TwoSideFocusActionFailure = {
  ok: false;
  message: string;
  issues?: TwoSideFocusTeacherDraftValidationIssue[];
};

export type TwoSideFocusActionResponse = TwoSideFocusActionSuccess | TwoSideFocusActionFailure;

async function assertTeacherAccess(): Promise<void> {
  await requireTeacherSession();
}

async function buildSuccessResponse(
  message: string,
  bulkResult?: TwoSideFocusBulkCreateResult,
): Promise<TwoSideFocusActionResponse> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Çift Taraflı Odak servisi yapılandırılmamış.",
    };
  }

  const listResult = await listTwoSideFocusWordSetsForTeacher(supabase);
  if (!listResult.ok) {
    return {
      ok: false,
      message: listResult.message,
    };
  }

  revalidatePath(LIST_ROUTE);
  revalidatePath(CONTENT_MANAGEMENT_ROUTE);

  return {
    ok: true,
    message,
    items: listResult.items,
    summary: listResult.summary,
    ...(bulkResult ? { bulkResult } : {}),
  };
}

function buildFailureResponse(result: { message: string; issues?: TwoSideFocusTeacherDraftValidationIssue[] }): TwoSideFocusActionFailure {
  return {
    ok: false,
    message: result.message,
    ...(result.issues ? { issues: result.issues } : {}),
  };
}

export async function createTwoSideFocusWordSetAction(input: {
  baseWord: string;
  variantOne: string;
  variantTwo: string;
  variantThree: string;
  isActive: boolean;
  sortOrder: number;
}): Promise<TwoSideFocusActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Çift Taraflı Odak servisi yapılandırılmamış.",
    };
  }

  const result = await createTwoSideFocusWordSet(input, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse("Çift Taraflı Odak içeriği eklendi.");
}

export async function updateTwoSideFocusWordSetAction(input: {
  id: string;
  baseWord: string;
  variantOne: string;
  variantTwo: string;
  variantThree: string;
  isActive: boolean;
  sortOrder: number;
}): Promise<TwoSideFocusActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Çift Taraflı Odak servisi yapılandırılmamış.",
    };
  }

  const result = await updateTwoSideFocusWordSet(input.id, input, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse("Çift Taraflı Odak içeriği güncellendi.");
}

export async function setTwoSideFocusWordSetActiveAction(input: {
  id: string;
  isActive: boolean;
}): Promise<TwoSideFocusActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Çift Taraflı Odak servisi yapılandırılmamış.",
    };
  }

  const result = await setTwoSideFocusWordSetActive(input.id, input.isActive, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse(input.isActive ? "İçerik aktif hale getirildi." : "İçerik pasife alındı.");
}

export async function deleteTwoSideFocusWordSetAction(input: { id: string }): Promise<TwoSideFocusActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Çift Taraflı Odak servisi yapılandırılmamış.",
    };
  }

  const result = await deleteTwoSideFocusWordSet(input.id, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse("Çift Taraflı Odak içeriği silindi.");
}

export async function bulkCreateTwoSideFocusWordSetsAction(rawText: string): Promise<TwoSideFocusActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Çift Taraflı Odak servisi yapılandırılmamış.",
    };
  }

  const result = await bulkCreateTwoSideFocusWordSets(rawText, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse(
    `Toplu aktarım tamamlandı. ${result.value.insertedCount} kayıt eklendi, ${result.value.skippedCount} kayıt atlandı.`,
    result.value,
  );
}
