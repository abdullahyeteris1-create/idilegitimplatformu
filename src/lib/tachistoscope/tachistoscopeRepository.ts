import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeTachistoscopeLevel, type TachistoscopeLevel } from "@/lib/exercise-engine/tachistoscopeWords";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  buildTachistoscopeBulkPreview,
  buildTachistoscopeNormalizedKey,
  buildTachistoscopeSeedRows,
  createTachistoscopeTeacherSummary,
  normalizeTachistoscopeText,
  normalizeTachistoscopeWord,
  TACHISTOSCOPE_LOCALE,
  toTachistoscopeWordsByLevel,
  validateTachistoscopeDraft,
  type TachistoscopeBulkPreview,
  type TachistoscopeBulkPreviewRow,
  type TachistoscopeDraftInput,
  type TachistoscopeDraftValidationIssue,
  type TachistoscopeDraftValidationResult,
  type TachistoscopeTeacherFilterState,
  type TachistoscopeTeacherItem,
  type TachistoscopeTeacherSummary,
  type TachistoscopeWordRow,
  type TachistoscopeWordSeedRow,
  type TachistoscopeWords,
} from "./tachistoscopeShared";

export const TACHISTOSCOPE_TABLE = "tachistoscope_words";

export type TachistoscopeLoadSource = "database" | "mixed" | "static";

export type TachistoscopeLoadFallbackReason =
  | "service-role-client-unavailable"
  | "database-query-error"
  | "database-empty"
  | "database-invalid-row"
  | "database-duplicate-key";

export type TachistoscopeLoadResult = {
  wordsByLevel: TachistoscopeWords;
  source: TachistoscopeLoadSource;
  sourceByLevel: Record<TachistoscopeLevel, "database" | "static">;
  fallbackReasons: TachistoscopeLoadFallbackReason[];
  databaseRowCount: number;
};

export type TachistoscopeTeacherListResult =
  | {
      ok: true;
      items: TachistoscopeTeacherItem[];
      summary: TachistoscopeTeacherSummary;
    }
  | {
      ok: false;
      message: string;
    };

export type TachistoscopeMutationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      message: string;
      issues?: TachistoscopeDraftValidationIssue[];
    };

export type TachistoscopeBulkCreateResult = {
  insertedCount: number;
  duplicateCount: number;
  invalidCount: number;
  skippedCount: number;
  items: TachistoscopeTeacherItem[];
};

function createEmptyRowsByLevel(): Record<TachistoscopeLevel, Array<TachistoscopeWordRow & { id: string }>> {
  return {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
    8: [],
    9: [],
    10: [],
    11: [],
    12: [],
    13: [],
    14: [],
    15: [],
  };
}

function createEmptySourceByLevel(): Record<TachistoscopeLevel, "database" | "static"> {
  return {
    1: "static",
    2: "static",
    3: "static",
    4: "static",
    5: "static",
    6: "static",
    7: "static",
    8: "static",
    9: "static",
    10: "static",
    11: "static",
    12: "static",
    13: "static",
    14: "static",
    15: "static",
  };
}

function normalizeTachistoscopeDbRow(
  row: unknown,
  options?: { allowInactive?: boolean },
): (TachistoscopeWordRow & { id: string }) | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const candidate = row as Partial<TachistoscopeWordRow> & {
    id?: unknown;
    word?: unknown;
    normalized_key?: unknown;
  };

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.level !== "number" ||
    !Number.isInteger(candidate.level) ||
    normalizeTachistoscopeLevel(candidate.level) !== candidate.level ||
    typeof candidate.word !== "string" ||
    typeof candidate.normalized_key !== "string" ||
    typeof candidate.is_active !== "boolean" ||
    (!options?.allowInactive && !candidate.is_active) ||
    typeof candidate.sort_order !== "number" ||
    !Number.isInteger(candidate.sort_order) ||
    candidate.sort_order < 0
  ) {
    return null;
  }

  const word = normalizeTachistoscopeWord(candidate.word);
  if (!word) {
    return null;
  }

  const normalizedKey = buildTachistoscopeNormalizedKey(word);
  const storedKey = normalizeTachistoscopeText(candidate.normalized_key);
  if (!normalizedKey || !storedKey || normalizedKey !== storedKey) {
    return null;
  }

  return {
    id: candidate.id,
    level: candidate.level,
    word,
    normalized_key: normalizedKey,
    is_active: candidate.is_active,
    sort_order: candidate.sort_order,
    created_at: typeof candidate.created_at === "string" ? candidate.created_at : null,
    updated_at: typeof candidate.updated_at === "string" ? candidate.updated_at : null,
  };
}

function compareTachistoscopeRows(
  left: TachistoscopeWordRow & { id: string },
  right: TachistoscopeWordRow & { id: string },
): number {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }

  const keyComparison = left.normalized_key.localeCompare(right.normalized_key, TACHISTOSCOPE_LOCALE);
  if (keyComparison !== 0) {
    return keyComparison;
  }

  return left.word.localeCompare(right.word, TACHISTOSCOPE_LOCALE);
}

function staticRowsByLevel(): Record<TachistoscopeLevel, Array<TachistoscopeWordRow & { id: string }>> {
  const rows = buildTachistoscopeSeedRows();
  const rowsByLevel = createEmptyRowsByLevel();

  for (const row of rows) {
    rowsByLevel[row.level].push({
      id: `${row.level}-${row.sort_order}-${row.normalized_key}`,
      level: row.level,
      word: row.word,
      normalized_key: row.normalized_key,
      is_active: row.is_active,
      sort_order: row.sort_order,
      created_at: null,
      updated_at: null,
    });
  }

  return rowsByLevel;
}

function createStaticLoadResult(reason: TachistoscopeLoadFallbackReason): TachistoscopeLoadResult {
  return {
    wordsByLevel: toTachistoscopeWordsByLevel(buildTachistoscopeSeedRows()),
    source: "static",
    sourceByLevel: createEmptySourceByLevel(),
    fallbackReasons: [reason],
    databaseRowCount: 0,
  };
}

function rowsToWordsByLevel(
  rowsByLevel: Record<TachistoscopeLevel, Array<TachistoscopeWordRow & { id: string }>>,
): TachistoscopeWords {
  return toTachistoscopeWordsByLevel(
    Object.values(rowsByLevel).flat().map((row) => ({
      level: row.level,
      word: row.word,
      normalized_key: row.normalized_key,
      sort_order: row.sort_order,
    })),
  );
}

export async function loadTachistoscopeWords(
  client: SupabaseClient | null = getSupabaseServiceRoleClient(),
): Promise<TachistoscopeLoadResult> {
  if (!client) {
    return createStaticLoadResult("service-role-client-unavailable");
  }

  try {
    const staticRows = staticRowsByLevel();
    const { data, error } = await client
      .from(TACHISTOSCOPE_TABLE)
      .select("id, level, word, normalized_key, is_active, sort_order, created_at, updated_at")
      .eq("is_active", true)
      .order("level", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error || !Array.isArray(data)) {
      return createStaticLoadResult("database-query-error");
    }

    if (data.length === 0) {
      return createStaticLoadResult("database-empty");
    }

    const rowsByLevel = createEmptyRowsByLevel();
    const sourceByLevel = createEmptySourceByLevel();
    const seenKeysByLevel: Record<TachistoscopeLevel, Set<string>> = {
      1: new Set(),
      2: new Set(),
      3: new Set(),
      4: new Set(),
      5: new Set(),
      6: new Set(),
      7: new Set(),
      8: new Set(),
      9: new Set(),
      10: new Set(),
      11: new Set(),
      12: new Set(),
      13: new Set(),
      14: new Set(),
      15: new Set(),
    };
    const rejectedReasonsByLevel = new Map<TachistoscopeLevel, TachistoscopeLoadFallbackReason>();
    const fallbackReasons = new Set<TachistoscopeLoadFallbackReason>();

    for (const rawRow of data) {
      const normalizedRow = normalizeTachistoscopeDbRow(rawRow);
      if (!normalizedRow) {
        fallbackReasons.add("database-invalid-row");

        if (rawRow && typeof rawRow === "object" && "level" in rawRow) {
          const rawLevel = (rawRow as { level?: unknown }).level;
          if (
            typeof rawLevel === "number" &&
            Number.isInteger(rawLevel) &&
            rawLevel >= 1 &&
            rawLevel <= 15
          ) {
            const levelValue = normalizeTachistoscopeLevel(rawLevel);
            rejectedReasonsByLevel.set(levelValue, "database-invalid-row");
            rowsByLevel[levelValue] = [];
          }
        }

        continue;
      }

      const { level, normalized_key } = normalizedRow;
      if (rejectedReasonsByLevel.has(level)) {
        continue;
      }

      const seenKeys = seenKeysByLevel[level];
      if (seenKeys.has(normalized_key)) {
        fallbackReasons.add("database-duplicate-key");
        rejectedReasonsByLevel.set(level, "database-duplicate-key");
        rowsByLevel[level] = [];
        continue;
      }

      seenKeys.add(normalized_key);
      rowsByLevel[level].push(normalizedRow);
    }

    const databaseRowCount = Object.values(rowsByLevel).reduce(
      (total, levelRows) => total + levelRows.length,
      0,
    );

    for (const level of [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ] as const) {
      if (rejectedReasonsByLevel.has(level) || rowsByLevel[level].length === 0) {
        if (rejectedReasonsByLevel.has(level)) {
          fallbackReasons.add(rejectedReasonsByLevel.get(level)!);
        } else {
          fallbackReasons.add("database-empty");
        }

        rowsByLevel[level] = staticRows[level];
        sourceByLevel[level] = "static";
      } else {
        rowsByLevel[level].sort(compareTachistoscopeRows);
        sourceByLevel[level] = "database";
      }
    }

    const source: TachistoscopeLoadSource =
      sourceByLevel[1] === "database" &&
      sourceByLevel[2] === "database" &&
      sourceByLevel[3] === "database" &&
      sourceByLevel[4] === "database" &&
      sourceByLevel[5] === "database" &&
      sourceByLevel[6] === "database" &&
      sourceByLevel[7] === "database" &&
      sourceByLevel[8] === "database" &&
      sourceByLevel[9] === "database" &&
      sourceByLevel[10] === "database" &&
      sourceByLevel[11] === "database" &&
      sourceByLevel[12] === "database" &&
      sourceByLevel[13] === "database" &&
      sourceByLevel[14] === "database" &&
      sourceByLevel[15] === "database"
        ? "database"
        : sourceByLevel[1] === "static" &&
            sourceByLevel[2] === "static" &&
            sourceByLevel[3] === "static" &&
            sourceByLevel[4] === "static" &&
            sourceByLevel[5] === "static" &&
            sourceByLevel[6] === "static" &&
            sourceByLevel[7] === "static" &&
            sourceByLevel[8] === "static" &&
            sourceByLevel[9] === "static" &&
            sourceByLevel[10] === "static" &&
            sourceByLevel[11] === "static" &&
            sourceByLevel[12] === "static" &&
            sourceByLevel[13] === "static" &&
            sourceByLevel[14] === "static" &&
            sourceByLevel[15] === "static"
          ? "static"
          : "mixed";

    return {
      wordsByLevel: rowsToWordsByLevel(rowsByLevel),
      source,
      sourceByLevel,
      fallbackReasons: [...fallbackReasons],
      databaseRowCount,
    };
  } catch {
    return createStaticLoadResult("database-query-error");
  }
}

function compareTachistoscopeTeacherItems(left: TachistoscopeTeacherItem, right: TachistoscopeTeacherItem): number {
  if (left.level !== right.level) {
    return left.level - right.level;
  }

  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }

  const keyComparison = left.normalized_key.localeCompare(right.normalized_key, TACHISTOSCOPE_LOCALE);
  if (keyComparison !== 0) {
    return keyComparison;
  }

  return left.word.localeCompare(right.word, TACHISTOSCOPE_LOCALE);
}

function mapRowToTeacherItem(row: TachistoscopeWordRow & { id: string }): TachistoscopeTeacherItem {
  return {
    ...row,
  };
}

function buildTeacherItemsFromRows(rows: Array<TachistoscopeWordRow & { id: string }>): TachistoscopeTeacherItem[] {
  return rows.map(mapRowToTeacherItem).sort(compareTachistoscopeTeacherItems);
}

function buildTachistoscopeSummary(items: TachistoscopeTeacherItem[]): TachistoscopeTeacherSummary {
  return createTachistoscopeTeacherSummary(items);
}

async function fetchTachistoscopeTeacherRows(
  client: SupabaseClient,
): Promise<
  | { ok: true; rows: Array<TachistoscopeWordRow & { id: string }> }
  | { ok: false; message: string }
> {
  const { data, error } = await client
    .from(TACHISTOSCOPE_TABLE)
    .select("id, level, word, normalized_key, is_active, sort_order, created_at, updated_at")
    .order("level", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error || !Array.isArray(data)) {
    return {
      ok: false,
      message: "Takistoskop içerikleri şu anda yüklenemiyor.",
    };
  }

  const rows: Array<TachistoscopeWordRow & { id: string }> = [];
  for (const rawRow of data) {
    const normalizedRow = normalizeTachistoscopeDbRow(rawRow, { allowInactive: true });
    if (!normalizedRow || typeof normalizedRow.id !== "string") {
      return {
        ok: false,
        message: "Takistoskop tablosunda bozuk bir kayıt bulundu.",
      };
    }

    rows.push(normalizedRow as TachistoscopeWordRow & { id: string });
  }

  return { ok: true, rows };
}

async function findTachistoscopeDuplicate(
  client: SupabaseClient,
  level: TachistoscopeLevel,
  normalizedKey: string,
  excludeId?: string,
): Promise<{ ok: true; duplicateId: string | null } | { ok: false; message: string }> {
  let query = client
    .from(TACHISTOSCOPE_TABLE)
    .select("id")
    .eq("level", level)
    .eq("normalized_key", normalizedKey)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    return { ok: false, message: "Aynı kelime kontrol edilirken hata oluştu." };
  }

  return { ok: true, duplicateId: data?.id ?? null };
}

async function getNextTachistoscopeSortOrder(
  client: SupabaseClient,
  level: TachistoscopeLevel,
): Promise<{ ok: true; sortOrder: number } | { ok: false; message: string }> {
  const { data, error } = await client
    .from(TACHISTOSCOPE_TABLE)
    .select("sort_order")
    .eq("level", level)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, message: "Yeni sıra numarası hesaplanamadı." };
  }

  const currentMax = typeof data?.sort_order === "number" && Number.isInteger(data.sort_order) ? data.sort_order : -1;
  return { ok: true, sortOrder: currentMax + 1 };
}

export async function listTachistoscopeWordsForTeacher(
  client: SupabaseClient | null | undefined = getSupabaseServiceRoleClient(),
): Promise<TachistoscopeTeacherListResult> {
  if (!client) {
    return {
      ok: false,
      message: "Takistoskop servisi yapılandırılmamış.",
    };
  }

  const rowsResult = await fetchTachistoscopeTeacherRows(client);
  if (!rowsResult.ok) {
    return rowsResult;
  }

  const items = buildTeacherItemsFromRows(rowsResult.rows);
  return {
    ok: true,
    items,
    summary: buildTachistoscopeSummary(items),
  };
}

export async function createTachistoscopeWord(
  input: TachistoscopeDraftInput,
  client: SupabaseClient | null | undefined = getSupabaseServiceRoleClient(),
): Promise<TachistoscopeMutationResult<TachistoscopeTeacherItem>> {
  if (!client) {
    return {
      ok: false,
      message: "Takistoskop servisi yapılandırılmamış.",
    };
  }

  const validation = validateTachistoscopeDraft(input);
  if (!validation.ok) {
    return {
      ok: false,
      message: "Formda geçersiz alanlar var.",
      issues: validation.issues,
    };
  }

  const duplicateResult = await findTachistoscopeDuplicate(client, validation.value.level, validation.value.normalizedKey);
  if (!duplicateResult.ok) {
    return duplicateResult;
  }

  if (duplicateResult.duplicateId) {
    return {
      ok: false,
      message: "Aynı seviye ve kelime zaten var.",
    };
  }

  const nextSortOrderResult = await getNextTachistoscopeSortOrder(client, validation.value.level);
  if (!nextSortOrderResult.ok) {
    return nextSortOrderResult;
  }

  const { data, error } = await client
    .from(TACHISTOSCOPE_TABLE)
    .insert({
      level: validation.value.level,
      word: validation.value.word,
      normalized_key: validation.value.normalizedKey,
      is_active: validation.value.isActive,
      sort_order: nextSortOrderResult.sortOrder,
    })
    .select("id, level, word, normalized_key, is_active, sort_order, created_at, updated_at")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: "Yeni takistoskop kelimesi kaydedilemedi.",
    };
  }

  const normalizedRow = normalizeTachistoscopeDbRow({ ...data, id: data.id }, { allowInactive: true });
  if (!normalizedRow || typeof normalizedRow.id !== "string") {
    return {
      ok: false,
      message: "Yeni kayıt doğrulanamadı.",
    };
  }

  return {
    ok: true,
    value: mapRowToTeacherItem(normalizedRow as TachistoscopeWordRow & { id: string }),
  };
}

export async function updateTachistoscopeWord(
  id: string,
  input: TachistoscopeDraftInput,
  client: SupabaseClient | null | undefined = getSupabaseServiceRoleClient(),
): Promise<TachistoscopeMutationResult<TachistoscopeTeacherItem>> {
  if (!client) {
    return {
      ok: false,
      message: "Takistoskop servisi yapılandırılmamış.",
    };
  }

  const existingResult = await client.from(TACHISTOSCOPE_TABLE).select("id, level, sort_order").eq("id", id).maybeSingle();
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

  const validation = validateTachistoscopeDraft(input);
  if (!validation.ok) {
    return {
      ok: false,
      message: "Formda geçersiz alanlar var.",
      issues: validation.issues,
    };
  }

  const duplicateResult = await findTachistoscopeDuplicate(
    client,
    validation.value.level,
    validation.value.normalizedKey,
    id,
  );
  if (!duplicateResult.ok) {
    return duplicateResult;
  }

  if (duplicateResult.duplicateId) {
    return {
      ok: false,
      message: "Aynı seviye ve kelime için başka bir kayıt var.",
    };
  }

  const nextSortOrderResult =
    existingResult.data.level === validation.value.level && typeof existingResult.data.sort_order === "number"
      ? { ok: true as const, sortOrder: existingResult.data.sort_order }
      : await getNextTachistoscopeSortOrder(client, validation.value.level);

  if (!nextSortOrderResult.ok) {
    return {
      ok: false,
      message: nextSortOrderResult.message,
    };
  }

  const { data, error } = await client
    .from(TACHISTOSCOPE_TABLE)
    .update({
      level: validation.value.level,
      word: validation.value.word,
      normalized_key: validation.value.normalizedKey,
      is_active: validation.value.isActive,
      sort_order: nextSortOrderResult.sortOrder,
    })
    .eq("id", id)
    .select("id, level, word, normalized_key, is_active, sort_order, created_at, updated_at")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: "Kayıt güncellenemedi.",
    };
  }

  const normalizedRow = normalizeTachistoscopeDbRow({ ...data, id: data.id }, { allowInactive: true });
  if (!normalizedRow || typeof normalizedRow.id !== "string") {
    return {
      ok: false,
      message: "Güncel kayıt doğrulanamadı.",
    };
  }

  return {
    ok: true,
    value: mapRowToTeacherItem(normalizedRow as TachistoscopeWordRow & { id: string }),
  };
}

export async function setTachistoscopeWordActive(
  id: string,
  isActive: boolean,
  client: SupabaseClient | null | undefined = getSupabaseServiceRoleClient(),
): Promise<TachistoscopeMutationResult<TachistoscopeTeacherItem>> {
  if (!client) {
    return {
      ok: false,
      message: "Takistoskop servisi yapılandırılmamış.",
    };
  }

  const { data, error } = await client
    .from(TACHISTOSCOPE_TABLE)
    .update({ is_active: isActive })
    .eq("id", id)
    .select("id, level, word, normalized_key, is_active, sort_order, created_at, updated_at")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      message: "Kayıt durumu güncellenemedi.",
    };
  }

  const normalizedRow = normalizeTachistoscopeDbRow({ ...data, id: data.id }, { allowInactive: true });
  if (!normalizedRow || typeof normalizedRow.id !== "string") {
    return {
      ok: false,
      message: "Güncel kayıt doğrulanamadı.",
    };
  }

  return {
    ok: true,
    value: mapRowToTeacherItem(normalizedRow as TachistoscopeWordRow & { id: string }),
  };
}

export async function deleteTachistoscopeWord(
  id: string,
  client: SupabaseClient | null | undefined = getSupabaseServiceRoleClient(),
): Promise<TachistoscopeMutationResult<{ id: string }>> {
  if (!client) {
    return {
      ok: false,
      message: "Takistoskop servisi yapılandırılmamış.",
    };
  }

  const { data, error } = await client.from(TACHISTOSCOPE_TABLE).delete().eq("id", id).select("id").maybeSingle();
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

export async function bulkCreateTachistoscopeWords(
  level: TachistoscopeLevel,
  rawText: string,
  client: SupabaseClient | null | undefined = getSupabaseServiceRoleClient(),
): Promise<TachistoscopeMutationResult<TachistoscopeBulkCreateResult>> {
  if (!client) {
    return {
      ok: false,
      message: "Takistoskop servisi yapılandırılmamış.",
    };
  }

  const existingRowsResult = await client
    .from(TACHISTOSCOPE_TABLE)
    .select("level, normalized_key, sort_order")
    .eq("level", level);
  if (existingRowsResult.error || !Array.isArray(existingRowsResult.data)) {
    return {
      ok: false,
      message: "Mevcut kayıtlar doğrulanamadı.",
    };
  }

  const existingKeys = new Set(
    existingRowsResult.data
      .filter((row) => row && typeof row === "object")
      .map((row) => `${String((row as { level?: unknown }).level)}::${String((row as { normalized_key?: unknown }).normalized_key)}`),
  );
  const preview = buildTachistoscopeBulkPreview(
    rawText,
    level,
    existingKeys,
  );

  const validRows = preview.validRows;
  const duplicateCount = preview.duplicateRows.length;
  const invalidCount = preview.invalidRows.length;

  const sortOrderBase = existingRowsResult.data.reduce((max, row) => {
    const value = typeof row.sort_order === "number" && Number.isInteger(row.sort_order) ? row.sort_order : -1;
    return Math.max(max, value);
  }, -1);

  const payloads = validRows.map((row, index) => ({
    level,
    word: row.word as string,
    normalized_key: row.normalizedKey as string,
    is_active: true,
    sort_order: sortOrderBase + index + 1,
  }));

  let insertedItems: TachistoscopeTeacherItem[] = [];
  if (payloads.length > 0) {
    const { data, error } = await client
      .from(TACHISTOSCOPE_TABLE)
      .insert(payloads)
      .select("id, level, word, normalized_key, is_active, sort_order, created_at, updated_at");

    if (error || !Array.isArray(data)) {
      return {
        ok: false,
        message: "Toplu kayıt eklenemedi.",
      };
    }

    const normalizedRows = data
      .map((row) => normalizeTachistoscopeDbRow(row, { allowInactive: true }))
      .filter(
        (row): row is TachistoscopeWordRow & { id: string } => row !== null && typeof row.id === "string",
      );
    insertedItems = buildTeacherItemsFromRows(normalizedRows);
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
  buildTachistoscopeNormalizedKey,
  buildTachistoscopeSeedRows,
  buildTachistoscopeBulkPreview,
  createTachistoscopeTeacherSummary,
  normalizeTachistoscopeText,
  normalizeTachistoscopeWord,
  normalizeTachistoscopeLevel,
  validateTachistoscopeDraft,
  toTachistoscopeWordsByLevel,
  type TachistoscopeWordRow,
  type TachistoscopeWordSeedRow,
  type TachistoscopeTeacherItem,
  type TachistoscopeTeacherSummary,
  type TachistoscopeTeacherFilterState,
  type TachistoscopeDraftInput,
  type TachistoscopeDraftValidationIssue,
  type TachistoscopeDraftValidationResult,
  type TachistoscopeBulkPreview,
  type TachistoscopeBulkPreviewRow,
  type TachistoscopeWords,
};
