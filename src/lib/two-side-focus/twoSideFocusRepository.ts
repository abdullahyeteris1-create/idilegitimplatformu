import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { TWO_SIDE_FOCUS_WORD_SETS } from "./twoSideFocusStaticData";
import {
  buildTwoSideFocusNormalizedKey,
  normalizeTwoSideFocusNormalizedKeyText,
  normalizeTwoSideFocusWord,
  type TwoSideFocusFallbackReason,
  type TwoSideFocusWordSet,
  type TwoSideFocusWordSetAdminItem,
  type TwoSideFocusWordSetLoadResult,
  type TwoSideFocusWordSetRow,
  type TwoSideFocusWordSetSeedRow,
  validateTwoSideFocusWordSetDraft,
} from "./twoSideFocusShared";

export {
  buildTwoSideFocusNormalizedKey,
  normalizeTwoSideFocusNormalizedKeyText,
  normalizeTwoSideFocusText,
  normalizeTwoSideFocusWord,
  validateTwoSideFocusWordSetDraft,
} from "./twoSideFocusShared";

if (typeof window !== "undefined") {
  throw new Error("two-side-focus repository can only run on the server.");
}

export const TWO_SIDE_FOCUS_WORD_SET_TABLE = "two_side_focus_word_sets";

type NormalizedDbRow = TwoSideFocusWordSetAdminItem;

function compareTwoSideFocusRows(left: NormalizedDbRow, right: NormalizedDbRow): number {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }

  const keyComparison = left.normalized_key.localeCompare(right.normalized_key, "tr-TR");
  if (keyComparison !== 0) {
    return keyComparison;
  }

  return left.base_word.localeCompare(right.base_word, "tr-TR");
}

function compareTwoSideFocusSeedRows(left: TwoSideFocusWordSetSeedRow, right: TwoSideFocusWordSetSeedRow): number {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }

  const keyComparison = left.normalized_key.localeCompare(right.normalized_key, "tr-TR");
  if (keyComparison !== 0) {
    return keyComparison;
  }

  return left.base_word.localeCompare(right.base_word, "tr-TR");
}

function normalizeTwoSideFocusDbRow(
  row: unknown,
  options?: { allowInactive?: boolean },
): NormalizedDbRow | null {
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
    !Number.isInteger(candidate.sort_order) ||
    candidate.sort_order < 0 ||
    !Array.isArray(candidate.variants) ||
    candidate.variants.length === 0
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

  const normalizedVariants = variants as string[];
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

function rowsToWordSets(rows: Array<Pick<TwoSideFocusWordSetRow, "base_word" | "variants">>): TwoSideFocusWordSet[] {
  return rows.map((row) => ({
    base: row.base_word,
    variants: [...row.variants],
  }));
}

function createStaticLoadResult(reason: TwoSideFocusFallbackReason): TwoSideFocusWordSetLoadResult {
  const rows = buildTwoSideFocusSeedRows();

  return {
    wordSets: toTwoSideFocusWordSets(rows),
    source: "static",
    fallbackReasons: [reason],
    databaseRowCount: 0,
  };
}

export function buildTwoSideFocusSeedRows(): TwoSideFocusWordSetSeedRow[] {
  const rows: TwoSideFocusWordSetSeedRow[] = [];

  TWO_SIDE_FOCUS_WORD_SETS.forEach((wordSet, sortOrder) => {
    const validation = validateTwoSideFocusWordSetDraft({
      baseWord: wordSet.base,
      variants: wordSet.variants,
    });

    if (!validation.ok) {
      throw new Error(`Invalid two-side-focus seed set for ${wordSet.base}`);
    }

    rows.push({
      base_word: validation.value.base,
      variants: validation.value.variants,
      normalized_key: validation.value.normalizedKey,
      is_active: true,
      sort_order: sortOrder,
    });
  });

  return rows.sort(compareTwoSideFocusSeedRows);
}

export function toTwoSideFocusWordSets(
  rows: Array<Pick<TwoSideFocusWordSetRow, "base_word" | "variants">>,
): TwoSideFocusWordSet[] {
  return rows.map((row) => ({
    base: row.base_word,
    variants: [...row.variants],
  }));
}

export async function loadTwoSideFocusWordSets(
  client: SupabaseClient | null | undefined = getSupabaseServiceRoleClient(),
): Promise<TwoSideFocusWordSetLoadResult> {
  if (!client) {
    return createStaticLoadResult("service-role-client-unavailable");
  }

  try {
    const { data, error } = await client
      .from(TWO_SIDE_FOCUS_WORD_SET_TABLE)
      .select("id, base_word, variants, normalized_key, is_active, sort_order, created_at, updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error || !Array.isArray(data)) {
      return createStaticLoadResult("database-query-error");
    }

    if (data.length === 0) {
      return createStaticLoadResult("database-empty");
    }

    const normalizedRows: NormalizedDbRow[] = [];
    const seenKeys = new Set<string>();

    for (const rawRow of data) {
      const normalizedRow = normalizeTwoSideFocusDbRow(rawRow);
      if (!normalizedRow) {
        return createStaticLoadResult("database-invalid-row");
      }

      if (seenKeys.has(normalizedRow.normalized_key)) {
        return createStaticLoadResult("database-duplicate-key");
      }

      seenKeys.add(normalizedRow.normalized_key);
      normalizedRows.push(normalizedRow);
    }

    normalizedRows.sort(compareTwoSideFocusRows);

    return {
      wordSets: rowsToWordSets(normalizedRows),
      source: "database",
      fallbackReasons: [],
      databaseRowCount: normalizedRows.length,
    };
  } catch {
    return createStaticLoadResult("database-query-error");
  }
}
