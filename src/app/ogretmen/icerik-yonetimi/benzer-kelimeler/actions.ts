"use server";

import { revalidatePath } from "next/cache";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import {
  bulkCreateSimilarWordPools,
  createSimilarWordPool,
  deleteSimilarWordPool,
  listSimilarWordPoolsForTeacher,
  setSimilarWordPoolActive,
  updateSimilarWordPool,
  type SimilarWordPoolBulkCreateResult,
  type SimilarWordPoolTeacherItem,
  type SimilarWordPoolTeacherSummary,
} from "@/lib/similar-word-pools/similarWordPoolsRepository";
import type { SimilarWordPoolDraftValidationIssue } from "@/lib/similar-word-pools/similarWordPoolsShared";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const LIST_ROUTE = "/ogretmen/icerik-yonetimi/benzer-kelimeler";
const CONTENT_MANAGEMENT_ROUTE = "/ogretmen/icerik-yonetimi";

export type SimilarWordPoolActionSuccess = {
  ok: true;
  message: string;
  items: SimilarWordPoolTeacherItem[];
  summary: SimilarWordPoolTeacherSummary;
  bulkResult?: SimilarWordPoolBulkCreateResult;
};

export type SimilarWordPoolActionFailure = {
  ok: false;
  message: string;
  issues?: SimilarWordPoolDraftValidationIssue[];
};

export type SimilarWordPoolActionResponse = SimilarWordPoolActionSuccess | SimilarWordPoolActionFailure;

async function assertTeacherAccess(): Promise<void> {
  await requireTeacherSession();
}

async function buildSuccessResponse(
  message: string,
  bulkResult?: SimilarWordPoolBulkCreateResult,
): Promise<SimilarWordPoolActionResponse> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Benzer Kelimeler servisi yapılandırılmamış.",
    };
  }

  const listResult = await listSimilarWordPoolsForTeacher(supabase);
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

async function buildFailureResponse(result: { message: string; issues?: SimilarWordPoolDraftValidationIssue[] }): Promise<SimilarWordPoolActionFailure> {
  return {
    ok: false,
    message: result.message,
    ...(result.issues ? { issues: result.issues } : {}),
  };
}

export async function createSimilarWordPoolAction(
  input: {
    difficulty: string;
    baseWord: string;
    variantsText: string;
    isActive: boolean;
    sortOrder: number;
  },
): Promise<SimilarWordPoolActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Benzer Kelimeler servisi yapılandırılmamış.",
    };
  }

  const result = await createSimilarWordPool(input, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse("Benzer kelime içeriği eklendi.");
}

export async function updateSimilarWordPoolAction(
  input: {
    id: string;
    difficulty: string;
    baseWord: string;
    variantsText: string;
    isActive: boolean;
    sortOrder: number;
  },
): Promise<SimilarWordPoolActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Benzer Kelimeler servisi yapılandırılmamış.",
    };
  }

  const result = await updateSimilarWordPool(input.id, input, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse("Benzer kelime içeriği güncellendi.");
}

export async function setSimilarWordPoolActiveAction(
  input: {
    id: string;
    isActive: boolean;
  },
): Promise<SimilarWordPoolActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Benzer Kelimeler servisi yapılandırılmamış.",
    };
  }

  const result = await setSimilarWordPoolActive(input.id, input.isActive, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse(input.isActive ? "İçerik aktif hale getirildi." : "İçerik pasife alındı.");
}

export async function deleteSimilarWordPoolAction(input: {
  id: string;
}): Promise<SimilarWordPoolActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Benzer Kelimeler servisi yapılandırılmamış.",
    };
  }

  const result = await deleteSimilarWordPool(input.id, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse("Benzer kelime içeriği silindi.");
}

export async function bulkCreateSimilarWordPoolsAction(rawText: string): Promise<SimilarWordPoolActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Benzer Kelimeler servisi yapılandırılmamış.",
    };
  }

  const result = await bulkCreateSimilarWordPools(rawText, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse(
    `Toplu aktarım tamamlandı. ${result.value.insertedCount} kayıt eklendi, ${result.value.skippedCount} kayıt atlandı.`,
    result.value,
  );
}
