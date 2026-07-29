import {
  buildTwoSideFocusNormalizedKey,
  normalizeTwoSideFocusText,
  normalizeTwoSideFocusWord,
  validateTwoSideFocusWordSetDraft,
  type TwoSideFocusWordSetAdminItem,
} from "./twoSideFocusShared";

export const TWO_SIDE_FOCUS_VARIANT_COUNT = 3;
export const TWO_SIDE_FOCUS_MAX_SORT_ORDER = Number.MAX_SAFE_INTEGER;

const TURKISH_LOCALE = "tr-TR";
const BULK_LINE_SEPARATOR = "|";
const BULK_VARIANT_SEPARATOR = ",";
const MOJIBAKE_RE = /[\uFFFDÃƒÃ„Ã…]/u;

export type TwoSideFocusTeacherItem = TwoSideFocusWordSetAdminItem;

export type TwoSideFocusTeacherSummary = {
  total: number;
  active: number;
  passive: number;
};

export type TwoSideFocusTeacherFilterState = {
  searchTerm: string;
  statusFilter: "all" | "active" | "passive";
};

export type TwoSideFocusTeacherDraftInput = {
  baseWord: string;
  variantOne: string;
  variantTwo: string;
  variantThree: string;
  isActive: boolean;
  sortOrder: unknown;
};

export type TwoSideFocusTeacherDraftValidationIssue = {
  field: "baseWord" | "variants" | "sortOrder";
  message: string;
};

export type TwoSideFocusTeacherDraftNormalizedValue = {
  baseWord: string;
  variants: [string, string, string];
  normalizedKey: string;
  isActive: boolean;
  sortOrder: number;
};

export type TwoSideFocusTeacherDraftValidationResult =
  | {
      ok: true;
      value: TwoSideFocusTeacherDraftNormalizedValue;
    }
  | {
      ok: false;
      issues: TwoSideFocusTeacherDraftValidationIssue[];
    };

export type TwoSideFocusBulkPreviewRowStatus = "valid" | "duplicate" | "invalid";

export type TwoSideFocusBulkPreviewRow = {
  lineNumber: number;
  rawLine: string;
  baseWordText: string;
  variantsText: string;
  baseWord: string;
  variants: string[];
  normalizedKey: string | null;
  status: TwoSideFocusBulkPreviewRowStatus;
  messages: string[];
};

export type TwoSideFocusBulkPreview = {
  rows: TwoSideFocusBulkPreviewRow[];
  validRows: TwoSideFocusBulkPreviewRow[];
  duplicateRows: TwoSideFocusBulkPreviewRow[];
  invalidRows: TwoSideFocusBulkPreviewRow[];
};

function normalizeSearchText(value: string): string {
  return normalizeTwoSideFocusText(value)?.toLocaleLowerCase(TURKISH_LOCALE) ?? "";
}

function containsMojibake(value: string): boolean {
  return MOJIBAKE_RE.test(value);
}

function parseSortOrder(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && /^\s*\d+\s*$/u.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

function hasDuplicateValues(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

function splitBulkLine(rawLine: string): { baseWordText: string; variantsText: string } | null {
  const parts = rawLine.split(BULK_LINE_SEPARATOR);
  if (parts.length !== 2) {
    return null;
  }

  return {
    baseWordText: parts[0].trim(),
    variantsText: parts[1].trim(),
  };
}

function normalizeBulkVariants(variantsText: string): string[] {
  return variantsText
    .split(BULK_VARIANT_SEPARATOR)
    .map((variant) => normalizeTwoSideFocusWord(variant))
    .filter((variant): variant is string => Boolean(variant));
}

export function validateTwoSideFocusTeacherDraft(
  input: TwoSideFocusTeacherDraftInput,
): TwoSideFocusTeacherDraftValidationResult {
  const issues: TwoSideFocusTeacherDraftValidationIssue[] = [];
  const sortOrder = parseSortOrder(input.sortOrder);
  const variants = [input.variantOne, input.variantTwo, input.variantThree];
  const validation = validateTwoSideFocusWordSetDraft({
    baseWord: input.baseWord,
    variants,
  });

  if (!validation.ok) {
    for (const issue of validation.issues) {
      issues.push(issue);
    }
  }

  if (sortOrder === null) {
    issues.push({
      field: "sortOrder",
      message: "Sıralama numarası sıfır veya daha büyük güvenli bir tam sayı olmalı.",
    });
  }

  if (issues.length > 0 || !validation.ok || sortOrder === null) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      baseWord: validation.value.base,
      variants: validation.value.variants as [string, string, string],
      normalizedKey: validation.value.normalizedKey,
      isActive: Boolean(input.isActive),
      sortOrder,
    },
  };
}

export function createTwoSideFocusTeacherSummary(items: TwoSideFocusTeacherItem[]): TwoSideFocusTeacherSummary {
  const active = items.filter((item) => item.is_active).length;

  return {
    total: items.length,
    active,
    passive: items.length - active,
  };
}

export function filterTwoSideFocusTeacherItems(
  items: TwoSideFocusTeacherItem[],
  filters: TwoSideFocusTeacherFilterState,
): TwoSideFocusTeacherItem[] {
  const normalizedSearch = normalizeSearchText(filters.searchTerm);

  return items.filter((item) => {
    const matchesStatus =
      filters.statusFilter === "all" ||
      (filters.statusFilter === "active" && item.is_active) ||
      (filters.statusFilter === "passive" && !item.is_active);

    const searchableText = normalizeSearchText([item.base_word, item.normalized_key, item.variants.join(" ")].join(" "));
    const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });
}

export function buildTwoSideFocusBulkPreview(
  rawText: string,
  existingKeys: Iterable<string> = [],
): TwoSideFocusBulkPreview {
  const existingKeySet = new Set(existingKeys);
  const seenKeys = new Set<string>();

  const rows = rawText
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map<TwoSideFocusBulkPreviewRow>((rawLine, index) => {
      const lineNumber = index + 1;
      const parsed = splitBulkLine(rawLine);
      const messages: string[] = [];
      let status: TwoSideFocusBulkPreviewRowStatus = "valid";

      if (!parsed) {
        return {
          lineNumber,
          rawLine,
          baseWordText: rawLine,
          variantsText: "",
          baseWord: "",
          variants: [],
          normalizedKey: null,
          status: "invalid",
          messages: ["Format hatalı. Beklenen biçim: ana kelime | varyant1, varyant2, varyant3."],
        };
      }

      if (containsMojibake(rawLine)) {
        messages.push("Bozuk karakter bulundu.");
        status = "invalid";
      }

      const baseWord = normalizeTwoSideFocusWord(parsed.baseWordText);
      if (!baseWord) {
        messages.push("Geçerli bir ana kelime girin.");
        status = "invalid";
      }

      const variantCandidates = parsed.variantsText
        ? parsed.variantsText.split(BULK_VARIANT_SEPARATOR).map((variant) => variant.trim())
        : [];

      if (variantCandidates.length !== TWO_SIDE_FOCUS_VARIANT_COUNT) {
        messages.push("Tam 3 varyant girin.");
        status = "invalid";
      }

      const variants = normalizeBulkVariants(parsed.variantsText);
      if (variantCandidates.some((variant) => !normalizeTwoSideFocusWord(variant))) {
        messages.push("Varyantlardan en az biri geçersiz veya bozuk karakter içeriyor.");
        status = "invalid";
      }

      if (variants.length === TWO_SIDE_FOCUS_VARIANT_COUNT && hasDuplicateValues(variants)) {
        messages.push("Varyantlar birbirinin aynı olamaz.");
        status = "invalid";
      }

      if (baseWord && variants.some((variant) => variant === baseWord)) {
        messages.push("Ana kelime varyantlar arasında yer alamaz.");
        status = "invalid";
      }

      const normalizedKey =
        status === "invalid" || !baseWord || variants.length !== TWO_SIDE_FOCUS_VARIANT_COUNT
          ? null
          : buildTwoSideFocusNormalizedKey(baseWord, variants);

      if (!normalizedKey && status !== "invalid") {
        messages.push("Geçerli bir normalize anahtar üretilemedi.");
        status = "invalid";
      }

      if (status === "valid" && normalizedKey) {
        if (existingKeySet.has(normalizedKey)) {
          messages.push("Bu kayıt veritabanında zaten var.");
          status = "duplicate";
        } else if (seenKeys.has(normalizedKey)) {
          messages.push("Aynı toplu aktarım içinde duplicate kayıt var.");
          status = "duplicate";
        }

        seenKeys.add(normalizedKey);
      }

      if (messages.length === 0) {
        messages.push("Kaydedilmeye hazır.");
      }

      return {
        lineNumber,
        rawLine,
        baseWordText: parsed.baseWordText,
        variantsText: parsed.variantsText,
        baseWord: baseWord ?? "",
        variants,
        normalizedKey,
        status,
        messages,
      };
    });

  return {
    rows,
    validRows: rows.filter((row) => row.status === "valid"),
    duplicateRows: rows.filter((row) => row.status === "duplicate"),
    invalidRows: rows.filter((row) => row.status === "invalid"),
  };
}

export {
  buildTwoSideFocusNormalizedKey,
  normalizeTwoSideFocusText,
  normalizeTwoSideFocusWord,
  validateTwoSideFocusWordSetDraft,
};
