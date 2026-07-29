export const TWO_SIDE_FOCUS_LOCALE = "tr-TR";

const MOJIBAKE_RE = /[\uFFFDÃÄÅ]/u;
const WORD_RE = /^[\p{L}]+$/u;
const KEY_RE = /^[\p{L}|]+$/u;
const MULTISPACE_RE = /\s+/g;
const MAX_WORD_LENGTH = 80;
const MAX_KEY_LENGTH = 240;

export type TwoSideFocusWordSet = {
  base: string;
  variants: string[];
};

export type TwoSideFocusWordSetDraftInput = {
  baseWord: string;
  variants: string[];
};

export type TwoSideFocusWordSetValidationIssue = {
  field: "baseWord" | "variants";
  message: string;
};

export type TwoSideFocusWordSetNormalizedDraft = {
  base: string;
  variants: string[];
  normalizedKey: string;
};

export type TwoSideFocusWordSetRow = {
  id?: string;
  base_word: string;
  variants: string[];
  normalized_key: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TwoSideFocusWordSetSeedRow = Omit<TwoSideFocusWordSetRow, "id" | "created_at" | "updated_at">;

export type TwoSideFocusWordSetAdminItem = TwoSideFocusWordSetRow & {
  id: string;
};

export type TwoSideFocusWordSetLoadSource = "database" | "static";

export type TwoSideFocusFallbackReason =
  | "service-role-client-unavailable"
  | "database-query-error"
  | "database-empty"
  | "database-invalid-row"
  | "database-duplicate-key";

export type TwoSideFocusWordSetLoadResult = {
  wordSets: TwoSideFocusWordSet[];
  source: TwoSideFocusWordSetLoadSource;
  fallbackReasons: TwoSideFocusFallbackReason[];
  databaseRowCount: number;
};

function normalizeWhitespace(value: string): string {
  return value.normalize("NFC").replace(MULTISPACE_RE, " ").trim();
}

function containsMojibake(value: string): boolean {
  return MOJIBAKE_RE.test(value);
}

export function normalizeTwoSideFocusText(value: string): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  if (!normalized || containsMojibake(normalized)) {
    return null;
  }

  return normalized;
}

export function normalizeTwoSideFocusWord(value: string): string | null {
  const normalized = normalizeTwoSideFocusText(value);
  if (!normalized || normalized.length > MAX_WORD_LENGTH || !WORD_RE.test(normalized)) {
    return null;
  }

  return normalized;
}

export function normalizeTwoSideFocusNormalizedKeyText(value: string): string | null {
  const normalized = normalizeTwoSideFocusText(value);
  if (!normalized || normalized.length > MAX_KEY_LENGTH || !KEY_RE.test(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeTwoSideFocusKeyPart(value: string): string | null {
  const normalizedWord = normalizeTwoSideFocusWord(value);
  if (!normalizedWord) {
    return null;
  }

  return normalizedWord.toLocaleLowerCase(TWO_SIDE_FOCUS_LOCALE);
}

function hasDuplicateValues(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

export function buildTwoSideFocusNormalizedKey(baseWord: string, variants: string[]): string | null {
  const normalizedBaseWord = normalizeTwoSideFocusKeyPart(baseWord);
  if (!normalizedBaseWord || variants.length === 0) {
    return null;
  }

  const normalizedVariants = variants.map((variant) => normalizeTwoSideFocusKeyPart(variant));
  if (normalizedVariants.some((variant) => variant === null)) {
    return null;
  }

  const sortedVariants = (normalizedVariants as string[]).sort((left, right) =>
    left.localeCompare(right, TWO_SIDE_FOCUS_LOCALE),
  );

  return [normalizedBaseWord, ...sortedVariants].join("|");
}

export function validateTwoSideFocusWordSetDraft(
  input: TwoSideFocusWordSetDraftInput,
):
  | {
      ok: true;
      value: TwoSideFocusWordSetNormalizedDraft;
    }
  | {
      ok: false;
      issues: TwoSideFocusWordSetValidationIssue[];
    } {
  const issues: TwoSideFocusWordSetValidationIssue[] = [];
  const base = normalizeTwoSideFocusWord(input.baseWord);
  const variants = Array.isArray(input.variants) ? input.variants : [];
  const normalizedVariants: string[] = [];

  if (!base) {
    issues.push({
      field: "baseWord",
      message: "Temel kelime boş, geçersiz veya bozuk karakter içeriyor.",
    });
  }

  if (variants.length === 0) {
    issues.push({
      field: "variants",
      message: "En az bir geçerli varyant girin.",
    });
  }

  for (const variant of variants) {
    const normalizedVariant = normalizeTwoSideFocusWord(variant);
    if (!normalizedVariant) {
      issues.push({
        field: "variants",
        message: "Varyantlar geçerli değil veya bozuk karakter içeriyor.",
      });
      continue;
    }

    normalizedVariants.push(normalizedVariant);
  }

  if (normalizedVariants.length > 0 && hasDuplicateValues(normalizedVariants)) {
    issues.push({
      field: "variants",
      message: "Varyantlar birbirinin aynısı olamaz.",
    });
  }

  if (base && normalizedVariants.some((variant) => variant === base)) {
    issues.push({
      field: "variants",
      message: "Temel kelime varyantlar arasında yer alamaz.",
    });
  }

  if (issues.length > 0 || !base || normalizedVariants.length === 0) {
    return { ok: false, issues };
  }

  const normalizedKey = buildTwoSideFocusNormalizedKey(base, normalizedVariants);
  if (!normalizedKey) {
    return {
      ok: false,
      issues: [
        {
          field: "variants",
          message: "Varyantlar için geçerli bir normalize anahtar üretilemedi.",
        },
      ],
    };
  }

  return {
    ok: true,
    value: {
      base,
      variants: normalizedVariants,
      normalizedKey,
    },
  };
}
