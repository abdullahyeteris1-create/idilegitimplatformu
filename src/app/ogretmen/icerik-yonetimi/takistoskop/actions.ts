"use server";

import { revalidatePath } from "next/cache";
import { requireTeacherSession } from "@/lib/auth/teacherSession";
import { type TachistoscopeLevel } from "@/lib/exercise-engine/tachistoscopeWords";
import {
  bulkCreateTachistoscopeWords,
  createTachistoscopeWord,
  deleteTachistoscopeWord,
  listTachistoscopeWordsForTeacher,
  setTachistoscopeWordActive,
  updateTachistoscopeWord,
  type TachistoscopeBulkCreateResult,
  type TachistoscopeDraftInput,
  type TachistoscopeDraftValidationIssue,
  type TachistoscopeTeacherItem,
  type TachistoscopeTeacherSummary,
} from "@/lib/tachistoscope/tachistoscopeRepository";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const LIST_ROUTE = "/ogretmen/icerik-yonetimi/takistoskop";
const CONTENT_MANAGEMENT_ROUTE = "/ogretmen/icerik-yonetimi";

export type TachistoscopeActionSuccess = {
  ok: true;
  message: string;
  items: TachistoscopeTeacherItem[];
  summary: TachistoscopeTeacherSummary;
  bulkResult?: TachistoscopeBulkCreateResult;
};

export type TachistoscopeActionFailure = {
  ok: false;
  message: string;
  issues?: TachistoscopeDraftValidationIssue[];
};

export type TachistoscopeActionResponse = TachistoscopeActionSuccess | TachistoscopeActionFailure;

async function assertTeacherAccess(): Promise<void> {
  await requireTeacherSession();
}

async function buildSuccessResponse(
  message: string,
  bulkResult?: TachistoscopeBulkCreateResult,
): Promise<TachistoscopeActionResponse> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Takistoskop servisi yapılandırılmamış.",
    };
  }

  const listResult = await listTachistoscopeWordsForTeacher(supabase);
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

function buildFailureResponse(result: { message: string; issues?: TachistoscopeDraftValidationIssue[] }): TachistoscopeActionFailure {
  return {
    ok: false,
    message: result.message,
    ...(result.issues ? { issues: result.issues } : {}),
  };
}

export async function createTachistoscopeWordAction(
  input: TachistoscopeDraftInput,
): Promise<TachistoscopeActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Takistoskop servisi yapılandırılmamış.",
    };
  }

  const result = await createTachistoscopeWord(input, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse("Takistoskop kelimesi eklendi.");
}

export async function updateTachistoscopeWordAction(
  input: {
    id: string;
    level: unknown;
    word: unknown;
    isActive: boolean;
  },
): Promise<TachistoscopeActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Takistoskop servisi yapılandırılmamış.",
    };
  }

  const result = await updateTachistoscopeWord(
    input.id,
    {
      level: input.level,
      word: input.word,
      isActive: input.isActive,
    },
    supabase,
  );
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse("Takistoskop kelimesi güncellendi.");
}

export async function setTachistoscopeWordActiveAction(input: {
  id: string;
  isActive: boolean;
}): Promise<TachistoscopeActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Takistoskop servisi yapılandırılmamış.",
    };
  }

  const result = await setTachistoscopeWordActive(input.id, input.isActive, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse(input.isActive ? "Kayıt aktif hale getirildi." : "Kayıt pasife alındı.");
}

export async function deleteTachistoscopeWordAction(input: { id: string }): Promise<TachistoscopeActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Takistoskop servisi yapılandırılmamış.",
    };
  }

  const result = await deleteTachistoscopeWord(input.id, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse("Takistoskop kelimesi silindi.");
}

export async function bulkCreateTachistoscopeWordsAction(input: {
  level: number;
  rawText: string;
}): Promise<TachistoscopeActionResponse> {
  await assertTeacherAccess();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Takistoskop servisi yapılandırılmamış.",
    };
  }

  const result = await bulkCreateTachistoscopeWords(input.level as TachistoscopeLevel, input.rawText, supabase);
  if (!result.ok) {
    return buildFailureResponse(result);
  }

  return buildSuccessResponse(
    `Toplu aktarım tamamlandı. ${result.value.insertedCount} kayıt eklendi, ${result.value.skippedCount} kayıt atlandı.`,
    result.value,
  );
}
