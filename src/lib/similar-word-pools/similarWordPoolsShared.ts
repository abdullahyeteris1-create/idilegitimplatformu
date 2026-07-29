import type { Difficulty } from "@/lib/data/wordPools";

export const SIMILAR_WORD_POOL_DIFFICULTIES = ["easy", "medium", "hard"] as const satisfies readonly Difficulty[];

export const SIMILAR_WORD_POOL_DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Kolay",
  medium: "Orta",
  hard: "Zor",
};

const TURKISH_LOCALE = "tr-TR";
const MOJIBAKE_RE = /[\uFFFDÃÄÅ]/u;
const WORD_RE = /^[\p{L}]+$/u;
const MULTISPACE_RE = /\s+/g;
const MAX_WORD_LENGTH = 80;
const MAX_KEY_LENGTH = 240;

export type SimilarWordPoolDraftInput = {
  difficulty: string;
  baseWord: string;
  variantsText: string;
  isActive: boolean;
  sortOrder: number;
};

export type SimilarWordPoolDraftValidationIssue = {
  field: "difficulty" | "baseWord" | "variantsText" | "sortOrder";
  message: string;
};

export type SimilarWordPoolNormalizedDraft = {
  difficulty: Difficulty;
  baseWord: string;
  variants: string[];
  normalizedKey: string;
  isActive: boolean;
  sortOrder: number;
};

export type SimilarWordPoolBulkInputRow = {
  lineNumber: number;
  rawLine: string;
  difficultyText: string;
  baseWordText: string;
  variantsText: string;
};

export type SimilarWordPoolBulkPreviewRowStatus = "valid" | "duplicate" | "invalid";

export type SimilarWordPoolBulkPreviewRow = {
  lineNumber: number;
  rawLine: string;
  difficultyText: string;
  difficulty: Difficulty | null;
  baseWordText: string;
  baseWord: string;
  variantsText: string;
  variants: string[];
  normalizedKey: string | null;
  status: SimilarWordPoolBulkPreviewRowStatus;
  messages: string[];
};

export type SimilarWordPoolBulkPreview = {
  rows: SimilarWordPoolBulkPreviewRow[];
  validRows: SimilarWordPoolBulkPreviewRow[];
  duplicateRows: SimilarWordPoolBulkPreviewRow[];
  invalidRows: SimilarWordPoolBulkPreviewRow[];
};

function normalizeWhitespace(value: string): string {
  return value.normalize("NFC").replace(MULTISPACE_RE, " ").trim();
}

function containsMojibake(value: string): boolean {
  return MOJIBAKE_RE.test(value);
}

function normalizeKeyPart(value: string): string | null {
  const normalized = normalizeSimilarWordPoolWord(value);
  if (!normalized) {
    return null;
  }

  return normalized.toLocaleLowerCase(TURKISH_LOCALE);
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

function normalizeDifficulty(value: string): Difficulty | null {
  const normalized = normalizeSimilarWordPoolText(value)?.toLocaleLowerCase(TURKISH_LOCALE);
  if (!normalized) {
    return null;
  }

  return SIMILAR_WORD_POOL_DIFFICULTIES.includes(normalized as Difficulty)
    ? (normalized as Difficulty)
    : null;
}

export function buildSimilarWordPoolNormalizedKey(baseWord: string, variants: string[]): string | null {
  const normalizedBaseWord = normalizeKeyPart(baseWord);
  if (!normalizedBaseWord) {
    return null;
  }

  const normalizedVariants = variants.map((variant) => normalizeKeyPart(variant));
  if (normalizedVariants.some((variant) => variant === null)) {
    return null;
  }

  const sortedVariants = (normalizedVariants as string[]).sort((left, right) =>
    left.localeCompare(right, TURKISH_LOCALE),
  );

  const normalizedKey = [normalizedBaseWord, ...sortedVariants].join("::");
  return normalizedKey.length > MAX_KEY_LENGTH ? null : normalizedKey;
}

export function parseSimilarWordPoolVariantsText(rawValue: string): string[] {
  return rawValue
    .split(/\r?\n|,/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function hasDuplicateValues(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

export function validateSimilarWordPoolDraft(
  input: SimilarWordPoolDraftInput,
  options?: { allowDuplicateVariants?: boolean },
):
  | {
      ok: true;
      value: SimilarWordPoolNormalizedDraft;
    }
  | {
      ok: false;
      issues: SimilarWordPoolDraftValidationIssue[];
    } {
  const issues: SimilarWordPoolDraftValidationIssue[] = [];
  const difficulty = normalizeDifficulty(input.difficulty);
  const baseWord = normalizeSimilarWordPoolWord(input.baseWord);
  const variants = parseSimilarWordPoolVariantsText(input.variantsText).map((variant) =>
    normalizeSimilarWordPoolWord(variant),
  );
  const normalizedVariants = variants.filter((variant): variant is string => Boolean(variant));
  const hasDuplicateVariants = hasDuplicateValues(normalizedVariants);
  const sortOrder = Number.isInteger(input.sortOrder) && input.sortOrder >= 0 ? input.sortOrder : NaN;

  if (!difficulty) {
    issues.push({ field: "difficulty", message: "Zorluk seviyesi easy, medium veya hard olmalı." });
  }

  if (!baseWord) {
    issues.push({ field: "baseWord", message: "Temel kelime boş, geçersiz veya bozuk karakter içeriyor." });
  }

  if (normalizedVariants.length === 0) {
    issues.push({ field: "variantsText", message: "En az bir geçerli varyant girin." });
  }

  if (!options?.allowDuplicateVariants && hasDuplicateVariants) {
    issues.push({ field: "variantsText", message: "Varyantlar birbirinin aynısı olamaz." });
  }

  if (Number.isNaN(sortOrder)) {
    issues.push({ field: "sortOrder", message: "Sıralama numarası sıfır veya daha büyük bir tam sayı olmalı." });
  }

  if (baseWord && normalizedVariants.length > 0) {
    const normalizedKey = buildSimilarWordPoolNormalizedKey(baseWord, normalizedVariants);
    if (!normalizedKey) {
      issues.push({ field: "variantsText", message: "Varyantlar geçerli değil veya bozuk karakter içeriyor." });
    }
  }

  if (issues.length > 0 || !difficulty || !baseWord || Number.isNaN(sortOrder)) {
    return { ok: false, issues };
  }

  const normalizedKey = buildSimilarWordPoolNormalizedKey(baseWord, normalizedVariants);
  if (!normalizedKey) {
    return {
      ok: false,
      issues: [{ field: "variantsText", message: "Varyantlar geçerli değil." }],
    };
  }

  return {
    ok: true,
    value: {
      difficulty,
      baseWord,
      variants: normalizedVariants,
      normalizedKey,
      isActive: input.isActive,
      sortOrder,
    },
  };
}

export function parseSimilarWordPoolBulkInput(rawText: string): SimilarWordPoolBulkInputRow[] {
  return rawText
    .split(/\r?\n/g)
    .map((line, index) => ({
      lineNumber: index + 1,
      rawLine: line,
      difficultyText: line.split("|")[0]?.trim() ?? "",
      baseWordText: line.split("|")[1]?.trim() ?? "",
      variantsText: line.split("|").slice(2).join("|").trim(),
    }))
    .filter((row) => row.rawLine.trim().length > 0);
}

export function buildSimilarWordPoolBulkPreview(rawText: string): SimilarWordPoolBulkPreview {
  const rows = parseSimilarWordPoolBulkInput(rawText);
  const previewRows: SimilarWordPoolBulkPreviewRow[] = [];
  const seenKeys = new Set<string>();

  for (const row of rows) {
    const validation = validateSimilarWordPoolDraft(
      {
        difficulty: row.difficultyText,
        baseWord: row.baseWordText,
        variantsText: row.variantsText,
        isActive: true,
        sortOrder: previewRows.length,
      },
      { allowDuplicateVariants: true },
    );

    const normalizedKey = validation.ok ? validation.value.normalizedKey : null;
    const messages = validation.ok ? [] : validation.issues?.map((issue) => issue.message) ?? [];
    let status: SimilarWordPoolBulkPreviewRowStatus = validation.ok ? "valid" : "invalid";

    if (validation.ok && normalizedKey) {
      if (seenKeys.has(normalizedKey)) {
        status = "duplicate";
        messages.push("Bu satır aynı dosya içindeki başka bir satırla duplicate.");
      }
      seenKeys.add(normalizedKey);
    }

    previewRows.push({
      lineNumber: row.lineNumber,
      rawLine: row.rawLine,
      difficultyText: row.difficultyText,
      difficulty: validation.ok ? validation.value.difficulty : null,
      baseWordText: row.baseWordText,
      baseWord: validation.ok ? validation.value.baseWord : "",
      variantsText: row.variantsText,
      variants: validation.ok ? validation.value.variants : [],
      normalizedKey,
      status,
      messages,
    });
  }

  return {
    rows: previewRows,
    validRows: previewRows.filter((row) => row.status === "valid"),
    duplicateRows: previewRows.filter((row) => row.status === "duplicate"),
    invalidRows: previewRows.filter((row) => row.status === "invalid"),
  };
}
