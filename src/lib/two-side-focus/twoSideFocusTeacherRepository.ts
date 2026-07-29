import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  buildTwoSideFocusNormalizedKey,
  normalizeTwoSideFocusNormalizedKeyText,
  normalizeTwoSideFocusWord,
  type TwoSideFocusWordSetAdminItem,
  type TwoSideFocusWordSetRow,
} from "./twoSideFocusShared";
import {
  buildTwoSideFocusBulkPreview,
  createTwoSideFocusTeacherSummary,
  validateTwoSideFocusTeacherDraft,
  type TwoSideFocusTeacherDraftInput,
  type TwoSideFocusTeacherDraftValidationIssue,
  type TwoSideFocusTeacherItem,
  type TwoSideFocusTeacherSummary,
} from "./twoSideFocusCrud";

if (typeof window !== "undefined") {
  throw new Error("Two-Side Focus teacher repository can only run on the server.");
}

export const TWO_SIDE_FOCUS_WORD_SET_TABLE = "two_side_focus_word_sets";

export type TwoSideFocusTeacherListResult =
  | {
      ok: true;
      items: TwoSideFocusTeacherItem[];
      summary: TwoSideFocusTeacherSummary;
    }
  | {
      ok: false;
      message: string;
    };

export type TwoSideFocusMutationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      message: string;
      issues?: TwoSideFocusTeacherDraftValidationIssue[];
    };

export type TwoSideFocusBulkCreateResult = {
  insertedCount: number;
  duplicateCount: number;
  invalidCount: number;
  skippedCount: number;
  items: TwoSideFocusTeacherItem[];
};

type NormalizedTeacherRow = TwoSideFocusWordSetAdminItem;

function getClient(client: SupabaseClient | null | undefined): SupabaseClient | null {
  return client ?? getSupabaseServiceRoleClient();
}

function compareRows(left: NormalizedTeacherRow, right: NormalizedTeacherRow): number {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }

  const keyComparison = left.normalized_key.localeCompare(right.normalized_key, "tr-TR");
  if (keyComparison !== 0) {
    return keyComparison;
  }

  return left.base_word.localeCompare(right.base_word, "tr-TR");
}

function normalizeDbRow(row: unknown, options?: { allowInactive?: boolean }): NormalizedTeacherRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const candidate = row as Partial<TwoSideFocusWordSetRow> & { id?: unknown; variants?: unknown };
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.base_word !== "string" ||
    typeof candidate.normalized_key !== "string" ||
    typeof candidate.is_active !== "boolean" ||
    (!options?.allowInactive && !candidate.is_active) ||
    typeof candidate.sort_order !== "number" ||
    !Number.isSafeInteger(candidate.sort_order) ||
    candidate.sort_order < 0 ||
    !Array.isArray(candidate.variants) ||
    candidate.variants.length !== 3
  ) {
    return null;
  }

  const baseWord = normalizeTwoSideFocusWord(candidate.base_word);
  if (!baseWord) {
    return null;
  }

  const variants = candidate.variants.map((variant) =>
    typeof variant === "string" ? normalizeTwoSideFocusWord(variant) : null,
  );
  if (variants.some((variant) => variant === null)) {
    return null;
  }

  const normalizedVariants = variants as [string, string, string];
  if (new Set(normalizedVariants).size !== normalizedVariants.length) {
    return null;
  }

  if (normalizedVariants.some((variant) => variant === baseWord)) {
    return null;
  }

  const normalizedKey = buildTwoSideFocusNormalizedKey(baseWord, normalizedVariants);
  const storedKey = normalizeTwoSideFocusNormalizedKeyText(candidate.normalized_key);
  if (!normalizedKey || !storedKey || normalizedKey !== storedKey) {
    return null;
  }

  return {
    id: candidate.id,
    base_word: baseWord,
    variants: normalizedVariants,
    normalized_key: normalizedKey,
    is_active: candidate.is_active,
    sort_order: candidate.sort_order,
    created_at: typeof candidate.created_at === "string" ? candidate.created_at : null,
    updated_at: typeof candidate.updated_at === "string" ? candidate.updated_at : null,
  };
}

function toTeacherItem(row: NormalizedTeacherRow): TwoSideFocusTeacherItem {
  return { ...row };
}

function toTeacherItems(rows: NormalizedTeacherRow[]): TwoSideFocusTeacherItem[] {
  return rows.map(toTeacherItem).sort(compareRows);
}

function fallbackMessage(reason: string): string {
  return reason;
}

async function fetchTeacherRows(
  client: SupabaseClient,
): Promise<{ ok: true; rows: NormalizedTeacherRow[] } | { ok: false; message: string }> {
  const { data, error } = await client
    .from(TWO_SIDE_FOCUS_WORD_SET_TABLE)
    .select("id, base_word, variants, normalized_key, is_active, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error || !Array.isArray(data)) {
    return {
      ok: false,
      message: fallbackMessage("Çift Taraflı Odak içerikleri şu anda yüklenemiyor."),
    };
  }

  const rows: NormalizedTeacherRow[] = [];
  const seenKeys = new Set<string>();

  for (const rawRow of data) {
    const normalizedRow = normalizeDbRow(rawRow, { allowInactive: true });
    if (!normalizedRow) {
      return {
        ok: false,
        message: fallbackMessage("Çift Taraflı Odak tablosunda bozuk bir kayıt bulundu."),
      };
    }

    if (seenKeys.has(normalizedRow.normalized_key)) {
      return {
        ok: false,
        message: fallbackMessage("Çift Taraflı Odak tablosunda duplicate kayıt bulundu."),
      };
    }

    seenKeys.add(normalizedRow.normalized_key);
    rows.push(normalizedRow);
  }

  return { ok: true, rows };
}

async function findDuplicate(
  client: SupabaseClient,
  normalizedKey: string,
  excludeId?: string,
): Promise<{ ok: true; duplicateId: string | null } | { ok: false; message: string }> {
  let query = client.from(TWO_SIDE_FOCUS_WORD_SET_TABLE).select("id").eq("normalized_key", normalizedKey).limit(1);
  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    return { ok: false, message: "Aynı içerik kontrol edilirken hata oluştu." };
  }

  return { ok: true, duplicateId: data?.id ?? null };
}

export async function listTwoSideFocusWordSetsForTeacher(
  client: SupabaseClient | null | undefined = getSupabaseServiceRoleClient(),
): Promise<TwoSideFocusTeacherListResult> {
  const supabase = getClient(client);
  if (!supabase) {
    return {
      ok: false,
      message: "Çift Taraflı Odak servisi yapılandırılmamış.",
    };
  }

  const rowsResult = await fetchTeacherRows(supabase);
  if (!rowsResult.ok) {
    return rowsResult;
  }

  const items = toTeacherItems(rowsResult.rows);
  return {
    ok: true,
    items,
    summary: createTwoSideFocusTeacherSummary(items),
  };
}

export async function createTwoSideFocusWordSet(
  input: TwoSideFocusTeacherDraftInput,
  client: SupabaseClient | null | undefined = getSupabaseServiceRoleClient(),
): Promise<TwoSideFocusMutationResult<TwoSideFocusTeacherItem>> {
  const supabase = getClient(client);
  if (!supabase) {
    return {
      ok: false,
      message: "Çift Taraflı Odak servisi yapılandırılmamış.",
    };
  }

  const validation = validateTwoSideFocusTeacherDraft(input);
  if (!validation.ok) {
    return {
      ok: false,
      message: "Formda geçersiz alanlar var.",
      issues: validation.issues,
    };
  }

  const duplicateResult = await findDuplicate(supabase, validation.value.normalizedKey);
  if (!duplicateResult.ok) {
    return duplicateResult;
  }

  if (duplicateResult.duplicateId) {
    return {
      ok: false,
      message: "Aynı normalized_key ile bir kayıt zaten var.",
    };
  }

  const { data, error } = await supabase
    .from(TWO_SIDE_FOCUS_WORD_SET_TABLE)
    .insert({
      base_word: validation.value.baseWord,
      variants: validation.value.variants,
      normalized_key: validation.value.normalizedKey,
      is_active: validation.value.isActive,
      sort_order: validation.value.sortOrder,
    })
    .select("id, base_word, variants, normalized_key, is_active, sort_order, created_at, updated_at")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: "Yeni kayıt kaydedilemedi.",
    };
  }

  const normalizedRow = normalizeDbRow(data, { allowInactive: true });
  if (!normalizedRow) {
    return {
      ok: false,
      message: "Yeni kayıt doğrulanamadı.",
    };
  }

  return {
    ok: true,
    value: toTeacherItem(normalizedRow),
  };
}

export async function updateTwoSideFocusWordSet(
  id: string,
  input: TwoSideFocusTeacherDraftInput,
  client: SupabaseClient | null | undefined = getSupabaseServiceRoleClient(),
): Promise<TwoSideFocusMutationResult<TwoSideFocusTeacherItem>> {
  const supabase = getClient(client);
  if (!supabase) {
    return {
      ok: false,
      message: "Çift Taraflı Odak servisi yapılandırılmamış.",
    };
  }

  const existingResult = await supabase.from(TWO_SIDE_FOCUS_WORD_SET_TABLE).select("id").eq("id", id).maybeSingle();
  if (existingResult.error) {
    return {
      ok: false,
      message: "Kayıt okunamadı.",
    };
  }
  if (!existingResult.data) {
    return {
      ok: false,
      message: "Güncellenecek kayıt bulunamadı.",
    };
  }

  const validation = validateTwoSideFocusTeacherDraft(input);
  if (!validation.ok) {
    return {
      ok: false,
      message: "Formda geçersiz alanlar var.",
      issues: validation.issues,
    };
  }

  const duplicateResult = await findDuplicate(supabase, validation.value.normalizedKey, id);
  if (!duplicateResult.ok) {
    return duplicateResult;
  }

  if (duplicateResult.duplicateId) {
    return {
      ok: false,
      message: "Aynı normalized_key ile başka bir kayıt var.",
    };
  }

  const { data, error } = await supabase
    .from(TWO_SIDE_FOCUS_WORD_SET_TABLE)
    .update({
      base_word: validation.value.baseWord,
      variants: validation.value.variants,
      normalized_key: validation.value.normalizedKey,
      is_active: validation.value.isActive,
      sort_order: validation.value.sortOrder,
    })
    .eq("id", id)
    .select("id, base_word, variants, normalized_key, is_active, sort_order, created_at, updated_at")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: "Kayıt güncellenemedi.",
    };
  }

  const normalizedRow = normalizeDbRow(data, { allowInactive: true });
  if (!normalizedRow) {
    return {
      ok: false,
      message: "Güncel kayıt doğrulanamadı.",
    };
  }

  return {
    ok: true,
    value: toTeacherItem(normalizedRow),
  };
}

export async function setTwoSideFocusWordSetActive(
  id: string,
  isActive: boolean,
  client: SupabaseClient | null | undefined = getSupabaseServiceRoleClient(),
): Promise<TwoSideFocusMutationResult<TwoSideFocusTeacherItem>> {
  const supabase = getClient(client);
  if (!supabase) {
    return {
      ok: false,
      message: "Çift Taraflı Odak servisi yapılandırılmamış.",
    };
  }

  const { data, error } = await supabase
    .from(TWO_SIDE_FOCUS_WORD_SET_TABLE)
    .update({ is_active: isActive })
    .eq("id", id)
    .select("id, base_word, variants, normalized_key, is_active, sort_order, created_at, updated_at")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      message: "Kayıt durumu güncellenemedi.",
    };
  }

  const normalizedRow = normalizeDbRow(data, { allowInactive: true });
  if (!normalizedRow) {
    return {
      ok: false,
      message: "Güncel kayıt doğrulanamadı.",
    };
  }

  return {
    ok: true,
    value: toTeacherItem(normalizedRow),
  };
}

export async function deleteTwoSideFocusWordSet(
  id: string,
  client: SupabaseClient | null | undefined = getSupabaseServiceRoleClient(),
): Promise<TwoSideFocusMutationResult<{ id: string }>> {
  const supabase = getClient(client);
  if (!supabase) {
    return {
      ok: false,
      message: "Çift Taraflı Odak servisi yapılandırılmamış.",
    };
  }

  const { data, error } = await supabase.from(TWO_SIDE_FOCUS_WORD_SET_TABLE).delete().eq("id", id).select("id").maybeSingle();
  if (error || !data) {
    return {
      ok: false,
      message: "Kayıt silinemedi.",
    };
  }

  return {
    ok: true,
    value: { id: data.id },
  };
}

export async function bulkCreateTwoSideFocusWordSets(
  rawText: string,
  client: SupabaseClient | null | undefined = getSupabaseServiceRoleClient(),
): Promise<TwoSideFocusMutationResult<TwoSideFocusBulkCreateResult>> {
  const supabase = getClient(client);
  if (!supabase) {
    return {
      ok: false,
      message: "Çift Taraflı Odak servisi yapılandırılmamış.",
    };
  }

  const existingRowsResult = await supabase.from(TWO_SIDE_FOCUS_WORD_SET_TABLE).select("normalized_key, sort_order");
  if (existingRowsResult.error || !Array.isArray(existingRowsResult.data)) {
    return {
      ok: false,
      message: "Mevcut kayıtlar doğrulanamadı.",
    };
  }

  const existingKeySet = new Set(
    existingRowsResult.data
      .filter((row) => row && typeof row === "object")
      .map((row) => String((row as { normalized_key?: unknown }).normalized_key)),
  );
  const preview = buildTwoSideFocusBulkPreview(rawText, existingKeySet);
  const invalidCount = preview.invalidRows.length;
  let duplicateCount = preview.duplicateRows.length;
  const seenKeys = new Set<string>();
  const nextOrder =
    existingRowsResult.data.reduce((max, row) => {
      const sortOrder = Boolean(row) && typeof (row as { sort_order?: unknown }).sort_order === "number" ? Number((row as { sort_order?: unknown }).sort_order) : -1;
      return Math.max(max, sortOrder);
    }, -1) + 1;

  const payloads: Array<{
    base_word: string;
    variants: string[];
    normalized_key: string;
    is_active: boolean;
    sort_order: number;
  }> = [];

  for (const row of preview.validRows) {
    if (!row.normalizedKey || seenKeys.has(row.normalizedKey)) {
      duplicateCount += 1;
      continue;
    }

    seenKeys.add(row.normalizedKey);
    payloads.push({
      base_word: row.baseWord,
      variants: row.variants,
      normalized_key: row.normalizedKey,
      is_active: true,
      sort_order: nextOrder + payloads.length,
    });
  }

  let insertedItems: TwoSideFocusTeacherItem[] = [];
  if (payloads.length > 0) {
    const { data, error } = await supabase
      .from(TWO_SIDE_FOCUS_WORD_SET_TABLE)
      .insert(payloads)
      .select("id, base_word, variants, normalized_key, is_active, sort_order, created_at, updated_at");

    if (error || !Array.isArray(data)) {
      return {
        ok: false,
        message: "Toplu kayıt eklenemedi.",
      };
    }

    const normalizedRows = data
      .map((row) => normalizeDbRow(row, { allowInactive: true }))
      .filter((row): row is NormalizedTeacherRow => Boolean(row));

    insertedItems = toTeacherItems(normalizedRows);
  }

  return {
    ok: true,
    value: {
      insertedCount: insertedItems.length,
      duplicateCount,
      invalidCount,
      skippedCount: duplicateCount + invalidCount,
      items: insertedItems,
    },
  };
}

export {
  buildTwoSideFocusBulkPreview,
  createTwoSideFocusTeacherSummary,
  validateTwoSideFocusTeacherDraft,
};

export type { TwoSideFocusTeacherItem, TwoSideFocusTeacherSummary } from "./twoSideFocusCrud";
