import type { SupabaseClient } from "@supabase/supabase-js";

import { SIMILAR_WORD_POOLS, type SimilarWordPools, type SimilarWordTemplate } from "@/lib/data/similarWordPools";
import type { Difficulty } from "@/lib/data/wordPools";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const SIMILAR_WORD_POOL_DIFFICULTIES = ["easy", "medium", "hard"] as const;

const SIMILAR_WORD_POOL_TABLE = "similar_word_pools";
const TURKISH_LOCALE = "tr-TR";
const MOJIBAKE_RE = /[�ÃÄÅ]/u;
const WORD_RE = /^[\p{L}]+$/u;
const KEY_RE = /^[\p{L}:]+$/u;
const MULTISPACE_RE = /\s+/g;
const MAX_WORD_LENGTH = 80;
const MAX_KEY_LENGTH = 240;

export type SimilarWordPoolRow = {
  difficulty: Difficulty;
  base_word: string;
  variants: string[];
  normalized_key: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SimilarWordPoolSeedRow = Omit<SimilarWordPoolRow, "created_at" | "updated_at">;

export type SimilarWordPoolsLoadSource = "database" | "mixed" | "static";

export type SimilarWordPoolsFallbackReason =
  | "service-role-client-unavailable"
  | "database-query-error"
  | "database-empty"
  | "database-invalid-row"
  | "database-duplicate-key";

export type SimilarWordPoolsLoadResult = {
  pools: SimilarWordPools;
  source: SimilarWordPoolsLoadSource;
  sourceByDifficulty: Record<Difficulty, "database" | "static">;
  fallbackReasons: SimilarWordPoolsFallbackReason[];
  databaseRowCount: number;
};

function isDifficulty(value: string): value is Difficulty {
  return SIMILAR_WORD_POOL_DIFFICULTIES.includes(value as Difficulty);
}

function normalizeWhitespace(value: string): string {
  return value.normalize("NFC").replace(MULTISPACE_RE, " ").trim();
}

function containsMojibake(value: string): boolean {
  return MOJIBAKE_RE.test(value);
}

export function normalizeSimilarWordPoolText(value: string): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  if (!normalized || containsMojibake(normalized)) {
    return null;
  }

  return normalized;
}

export function normalizeSimilarWordPoolWord(value: string): string | null {
  const normalized = normalizeSimilarWordPoolText(value);
  if (!normalized || normalized.length > MAX_WORD_LENGTH || !WORD_RE.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeSimilarWordPoolKeyString(value: string): string | null {
  const normalized = normalizeSimilarWordPoolText(value);
  if (!normalized || normalized.length > MAX_KEY_LENGTH || !KEY_RE.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeSimilarWordPoolKeyPart(value: string): string | null {
  const normalizedWord = normalizeSimilarWordPoolWord(value);
  if (!normalizedWord) {
    return null;
  }

  return normalizedWord.toLocaleLowerCase(TURKISH_LOCALE);
}

export function buildSimilarWordPoolNormalizedKey(baseWord: string, variants: string[]): string | null {
  const normalizedBaseWord = normalizeSimilarWordPoolKeyPart(baseWord);
  if (!normalizedBaseWord) {
    return null;
  }

  const normalizedVariants = variants.map((variant) => normalizeSimilarWordPoolKeyPart(variant));
  if (normalizedVariants.some((variant) => variant === null)) {
    return null;
  }

  const sortedVariants = (normalizedVariants as string[]).sort((left, right) =>
    left.localeCompare(right, TURKISH_LOCALE),
  );

  return [normalizedBaseWord, ...sortedVariants].join("::");
}

function normalizeSimilarWordPoolTemplate(template: SimilarWordTemplate): Omit<
  SimilarWordPoolSeedRow,
  "difficulty" | "sort_order" | "is_active"
> | null {
  const base_word = normalizeSimilarWordPoolWord(template.base);
  if (!base_word || template.variants.length === 0) {
    return null;
  }

  const variants = template.variants.map((variant) => normalizeSimilarWordPoolWord(variant));
  if (variants.some((variant) => variant === null)) {
    return null;
  }

  const normalized_key = buildSimilarWordPoolNormalizedKey(base_word, variants as string[]);
  if (!normalized_key) {
    return null;
  }

  return {
    base_word,
    variants: variants as string[],
    normalized_key,
  };
}

export function buildSimilarWordPoolSeedRows(): SimilarWordPoolSeedRow[] {
  const rows: SimilarWordPoolSeedRow[] = [];

  for (const difficulty of SIMILAR_WORD_POOL_DIFFICULTIES) {
    const templates = SIMILAR_WORD_POOLS[difficulty];

    templates.forEach((template, sortOrder) => {
      const normalizedTemplate = normalizeSimilarWordPoolTemplate(template);
      if (!normalizedTemplate) {
        throw new Error(`Invalid similar word pool seed for ${difficulty}:${template.base}`);
      }

      rows.push({
        difficulty,
        base_word: normalizedTemplate.base_word,
        variants: normalizedTemplate.variants,
        normalized_key: normalizedTemplate.normalized_key,
        is_active: true,
        sort_order: sortOrder,
      });
    });
  }

  return rows;
}

function normalizeSimilarWordPoolDbRow(row: unknown): SimilarWordPoolRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const candidate = row as Partial<SimilarWordPoolRow> & { variants?: unknown };

  if (
    typeof candidate.difficulty !== "string" ||
    !isDifficulty(candidate.difficulty) ||
    typeof candidate.base_word !== "string" ||
    typeof candidate.normalized_key !== "string" ||
    typeof candidate.is_active !== "boolean" ||
    !candidate.is_active ||
    typeof candidate.sort_order !== "number" ||
    !Number.isInteger(candidate.sort_order) ||
    candidate.sort_order < 0 ||
    !Array.isArray(candidate.variants) ||
    candidate.variants.length === 0
  ) {
    return null;
  }

  const base_word = normalizeSimilarWordPoolWord(candidate.base_word);
  if (!base_word) {
    return null;
  }

  const variants = candidate.variants.map((variant) =>
    typeof variant === "string" ? normalizeSimilarWordPoolWord(variant) : null,
  );
  if (variants.some((variant) => variant === null)) {
    return null;
  }

  const normalized_key = buildSimilarWordPoolNormalizedKey(base_word, variants as string[]);
  const storedKey = normalizeSimilarWordPoolKeyString(candidate.normalized_key);
  if (!normalized_key || !storedKey || normalized_key !== storedKey) {
    return null;
  }

  return {
    difficulty: candidate.difficulty,
    base_word,
    variants: variants as string[],
    normalized_key,
    is_active: true,
    sort_order: candidate.sort_order,
    created_at: typeof candidate.created_at === "string" ? candidate.created_at : null,
    updated_at: typeof candidate.updated_at === "string" ? candidate.updated_at : null,
  };
}

function compareSimilarWordPoolRows(left: SimilarWordPoolRow, right: SimilarWordPoolRow): number {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }

  const keyComparison = left.normalized_key.localeCompare(right.normalized_key, TURKISH_LOCALE);
  if (keyComparison !== 0) {
    return keyComparison;
  }

  return left.base_word.localeCompare(right.base_word, TURKISH_LOCALE);
}

function rowsToPools(rowsByDifficulty: Record<Difficulty, SimilarWordPoolRow[]>): SimilarWordPools {
  return {
    easy: rowsByDifficulty.easy.map((row) => ({ base: row.base_word, variants: [...row.variants] })),
    medium: rowsByDifficulty.medium.map((row) => ({ base: row.base_word, variants: [...row.variants] })),
    hard: rowsByDifficulty.hard.map((row) => ({ base: row.base_word, variants: [...row.variants] })),
  };
}

function staticRowsByDifficulty(): Record<Difficulty, SimilarWordPoolRow[]> {
  const rows = buildSimilarWordPoolSeedRows();

  return {
    easy: rows.filter((row) => row.difficulty === "easy"),
    medium: rows.filter((row) => row.difficulty === "medium"),
    hard: rows.filter((row) => row.difficulty === "hard"),
  };
}

function createStaticLoadResult(reason: SimilarWordPoolsFallbackReason): SimilarWordPoolsLoadResult {
  const rows = staticRowsByDifficulty();

  return {
    pools: rowsToPools(rows),
    source: "static",
    sourceByDifficulty: {
      easy: "static",
      medium: "static",
      hard: "static",
    },
    fallbackReasons: [reason],
    databaseRowCount: 0,
  };
}

function createLoadResult(
  rowsByDifficulty: Record<Difficulty, SimilarWordPoolRow[]>,
  fallbackReasons: SimilarWordPoolsFallbackReason[],
): SimilarWordPoolsLoadResult {
  const sourceByDifficulty: Record<Difficulty, "database" | "static"> = {
    easy: rowsByDifficulty.easy.length > 0 ? "database" : "static",
    medium: rowsByDifficulty.medium.length > 0 ? "database" : "static",
    hard: rowsByDifficulty.hard.length > 0 ? "database" : "static",
  };

  const source: SimilarWordPoolsLoadSource =
    sourceByDifficulty.easy === "database" &&
    sourceByDifficulty.medium === "database" &&
    sourceByDifficulty.hard === "database"
      ? "database"
      : sourceByDifficulty.easy === "static" &&
          sourceByDifficulty.medium === "static" &&
          sourceByDifficulty.hard === "static"
        ? "static"
        : "mixed";

  return {
    pools: rowsToPools(rowsByDifficulty),
    source,
    sourceByDifficulty,
    fallbackReasons,
    databaseRowCount:
      rowsByDifficulty.easy.length + rowsByDifficulty.medium.length + rowsByDifficulty.hard.length,
  };
}

export async function loadSimilarWordPools(
  client: SupabaseClient | null = getSupabaseServiceRoleClient(),
): Promise<SimilarWordPoolsLoadResult> {
  if (!client) {
    return createStaticLoadResult("service-role-client-unavailable");
  }

  try {
    const staticRows = staticRowsByDifficulty();
    const { data, error } = await client
      .from(SIMILAR_WORD_POOL_TABLE)
      .select("id, difficulty, base_word, variants, normalized_key, is_active, sort_order, created_at, updated_at")
      .eq("is_active", true)
      .order("difficulty", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error || !Array.isArray(data)) {
      return createStaticLoadResult("database-query-error");
    }

    if (data.length === 0) {
      return createStaticLoadResult("database-empty");
    }

    const rowsByDifficulty: Record<Difficulty, SimilarWordPoolRow[]> = {
      easy: [],
      medium: [],
      hard: [],
    };
    const seenKeysByDifficulty: Record<Difficulty, Set<string>> = {
      easy: new Set(),
      medium: new Set(),
      hard: new Set(),
    };
    const fallbackReasons = new Set<SimilarWordPoolsFallbackReason>();
    const rejectedDifficulties = new Set<Difficulty>();

    for (const rawRow of data) {
      const normalizedRow = normalizeSimilarWordPoolDbRow(rawRow);
      if (!normalizedRow) {
        fallbackReasons.add("database-invalid-row");
        if (
          typeof rawRow === "object" &&
          rawRow !== null &&
          "difficulty" in rawRow &&
          isDifficulty(String((rawRow as { difficulty?: unknown }).difficulty))
        ) {
          rejectedDifficulties.add(String((rawRow as { difficulty?: unknown }).difficulty) as Difficulty);
        }
        continue;
      }

      if (rejectedDifficulties.has(normalizedRow.difficulty)) {
        continue;
      }

      const bucket = rowsByDifficulty[normalizedRow.difficulty];
      const keyBucket = seenKeysByDifficulty[normalizedRow.difficulty];
      if (keyBucket.has(normalizedRow.normalized_key)) {
        fallbackReasons.add("database-duplicate-key");
        rejectedDifficulties.add(normalizedRow.difficulty);
        rowsByDifficulty[normalizedRow.difficulty] = [];
        continue;
      }

      bucket.push(normalizedRow);
      keyBucket.add(normalizedRow.normalized_key);
    }

    for (const difficulty of SIMILAR_WORD_POOL_DIFFICULTIES) {
      if (rejectedDifficulties.has(difficulty) || rowsByDifficulty[difficulty].length === 0) {
        fallbackReasons.add("database-empty");
        rowsByDifficulty[difficulty] = staticRows[difficulty];
      } else {
        rowsByDifficulty[difficulty].sort(compareSimilarWordPoolRows);
      }
    }

    return createLoadResult(rowsByDifficulty, [...fallbackReasons]);
  } catch {
    return createStaticLoadResult("database-query-error");
  }
}

export function toSimilarWordPools(rows: SimilarWordPoolSeedRow[]): SimilarWordPools {
  const rowsByDifficulty: Record<Difficulty, SimilarWordPoolSeedRow[]> = {
    easy: [],
    medium: [],
    hard: [],
  };

  for (const row of rows) {
    rowsByDifficulty[row.difficulty].push(row);
  }

  return {
    easy: rowsByDifficulty.easy.map((row) => ({ base: row.base_word, variants: [...row.variants] })),
    medium: rowsByDifficulty.medium.map((row) => ({ base: row.base_word, variants: [...row.variants] })),
    hard: rowsByDifficulty.hard.map((row) => ({ base: row.base_word, variants: [...row.variants] })),
  };
}
