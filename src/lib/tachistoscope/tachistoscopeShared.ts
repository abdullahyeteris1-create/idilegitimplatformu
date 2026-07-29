import {
  TACHISTOSCOPE_WORDS_BY_LEVEL,
  normalizeTachistoscopeLevel,
  type TachistoscopeLevel,
} from "@/lib/exercise-engine/tachistoscopeWords";

export const TACHISTOSCOPE_LEVELS = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
] as const satisfies readonly TachistoscopeLevel[];

export const TACHISTOSCOPE_LOCALE = "tr-TR";
export const TACHISTOSCOPE_LEVEL_LABELS: Record<TachistoscopeLevel, string> = {
  1: "Seviye 1",
  2: "Seviye 2",
  3: "Seviye 3",
  4: "Seviye 4",
  5: "Seviye 5",
  6: "Seviye 6",
  7: "Seviye 7",
  8: "Seviye 8",
  9: "Seviye 9",
  10: "Seviye 10",
  11: "Seviye 11",
  12: "Seviye 12",
  13: "Seviye 13",
  14: "Seviye 14",
  15: "Seviye 15",
};

const MOJIBAKE_RE = /[\uFFFDÃƒÃ„Ã…]/u;
const WORD_RE = /^[\p{L}]+$/u;
const MULTISPACE_RE = /\s+/g;
const MAX_WORD_LENGTH = 80;
const MAX_KEY_LENGTH = 80;

export type TachistoscopeWords = Record<TachistoscopeLevel, string[]>;

export type TachistoscopeWordRow = {
  level: TachistoscopeLevel;
  word: string;
  normalized_key: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TachistoscopeWordSeedRow = Omit<TachistoscopeWordRow, "created_at" | "updated_at">;
export type TachistoscopeTeacherItem = TachistoscopeWordRow & { id: string };

export type TachistoscopeTeacherSummary = {
  total: number;
  active: number;
  passive: number;
  byLevel: Record<TachistoscopeLevel, number>;
};

export type TachistoscopeTeacherFilterState = {
  searchTerm: string;
  levelFilter: "all" | TachistoscopeLevel;
  statusFilter: "all" | "active" | "passive";
};

export type TachistoscopeDraftInput = {
  level: unknown;
  word: unknown;
  isActive: boolean;
};

export type TachistoscopeDraftValidationIssue = {
  field: "level" | "word";
  message: string;
};

export type TachistoscopeDraftValidationResult =
  | {
      ok: true;
      value: {
        level: TachistoscopeLevel;
        word: string;
        normalizedKey: string;
        isActive: boolean;
      };
    }
  | {
      ok: false;
      issues: TachistoscopeDraftValidationIssue[];
    };

export type TachistoscopeBulkPreviewRow = {
  lineNumber: number;
  rawText: string;
  word: string | null;
  normalizedKey: string | null;
  status: "valid" | "duplicate" | "invalid";
  messages: string[];
};

export type TachistoscopeBulkPreview = {
  rows: TachistoscopeBulkPreviewRow[];
  validRows: TachistoscopeBulkPreviewRow[];
  duplicateRows: TachistoscopeBulkPreviewRow[];
  invalidRows: TachistoscopeBulkPreviewRow[];
};

function createEmptyRowsByLevel(): Record<TachistoscopeLevel, TachistoscopeWordSeedRow[]> {
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

function createEmptyWordMap(): TachistoscopeWords {
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

function compareTachistoscopeWordRows(
  left: Pick<TachistoscopeWordRow, "normalized_key" | "sort_order" | "word">,
  right: Pick<TachistoscopeWordRow, "normalized_key" | "sort_order" | "word">,
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

function normalizeTachistoscopeText(value: string): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.normalize("NFC").replace(MULTISPACE_RE, " ").trim();
  if (!normalized || MOJIBAKE_RE.test(normalized)) {
    return null;
  }

  return normalized;
}

export function normalizeTachistoscopeWord(value: string): string | null {
  const normalized = normalizeTachistoscopeText(value);
  if (!normalized || normalized.length > MAX_WORD_LENGTH || !WORD_RE.test(normalized)) {
    return null;
  }

  return normalized;
}

export function buildTachistoscopeNormalizedKey(word: string): string | null {
  const normalized = normalizeTachistoscopeWord(word);
  if (!normalized) {
    return null;
  }

  const key = normalized.toLocaleLowerCase(TACHISTOSCOPE_LOCALE);
  if (!key || key.length > MAX_KEY_LENGTH) {
    return null;
  }

  return key;
}

function splitTachistoscopeBulkLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseTachistoscopeDraftLevel(value: unknown): TachistoscopeLevel | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 15) {
    return value as TachistoscopeLevel;
  }

  if (typeof value === "string" && /^\s*\d+\s*$/u.test(value)) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 15) {
      return parsed as TachistoscopeLevel;
    }
  }

  return null;
}

export function validateTachistoscopeDraft(input: TachistoscopeDraftInput): TachistoscopeDraftValidationResult {
  const issues: TachistoscopeDraftValidationIssue[] = [];
  const level = parseTachistoscopeDraftLevel(input.level);

  if (!level) {
    issues.push({ field: "level", message: "Seviye 1 ile 15 arasında olmalı." });
  }

  const word = normalizeTachistoscopeWord(String(input.word ?? ""));
  if (!word) {
    issues.push({
      field: "word",
      message: "Kelime boş olamaz, yalnızca harf içermeli ve bozuk karakter barındırmamalı.",
    });
  }

  const normalizedKey = word ? buildTachistoscopeNormalizedKey(word) : null;
  if (!normalizedKey) {
    issues.push({ field: "word", message: "Kelime için geçerli bir normalize anahtar üretilemedi." });
  }

  if (issues.length > 0 || !level || !word || !normalizedKey) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      level,
      word,
      normalizedKey,
      isActive: Boolean(input.isActive),
    },
  };
}

export function createTachistoscopeTeacherSummary(items: TachistoscopeTeacherItem[]): TachistoscopeTeacherSummary {
  const byLevel: Record<TachistoscopeLevel, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
    9: 0,
    10: 0,
    11: 0,
    12: 0,
    13: 0,
    14: 0,
    15: 0,
  };

  for (const item of items) {
    byLevel[item.level] += 1;
  }

  const active = items.filter((item) => item.is_active).length;

  return {
    total: items.length,
    active,
    passive: items.length - active,
    byLevel,
  };
}

export function filterTachistoscopeTeacherItems(
  items: TachistoscopeTeacherItem[],
  filters: TachistoscopeTeacherFilterState,
): TachistoscopeTeacherItem[] {
  const normalizedSearch = normalizeTachistoscopeText(filters.searchTerm)?.toLocaleLowerCase(TACHISTOSCOPE_LOCALE) ?? "";

  return items.filter((item) => {
    const matchesLevel = filters.levelFilter === "all" || item.level === filters.levelFilter;
    const matchesStatus =
      filters.statusFilter === "all" ||
      (filters.statusFilter === "active" && item.is_active) ||
      (filters.statusFilter === "passive" && !item.is_active);
    const searchable = `${item.word} ${item.normalized_key} ${item.level}`.toLocaleLowerCase(TACHISTOSCOPE_LOCALE);
    const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);

    return matchesLevel && matchesStatus && matchesSearch;
  });
}

export function buildTachistoscopeBulkPreview(
  rawText: string,
  level: TachistoscopeLevel,
  existingKeys: Iterable<string> = [],
): TachistoscopeBulkPreview {
  const existingKeySet = new Set(existingKeys);
  const seenKeys = new Set<string>();

  const rows = splitTachistoscopeBulkLines(rawText).map<TachistoscopeBulkPreviewRow>((line, index) => {
    const lineNumber = index + 1;
    const word = normalizeTachistoscopeWord(line);
    if (!word) {
      return {
        lineNumber,
        rawText: line,
        word: null,
        normalizedKey: null,
        status: "invalid",
        messages: ["Geçersiz kelime.", "Yalnızca harf içermeli ve bozuk karakter barındırmamalı."],
      };
    }

    const normalizedKey = buildTachistoscopeNormalizedKey(word);
    if (!normalizedKey) {
      return {
        lineNumber,
        rawText: line,
        word: null,
        normalizedKey: null,
        status: "invalid",
        messages: ["Normalize anahtar üretilemedi."],
      };
    }

    const compositeKey = `${level}::${normalizedKey}`;
    if (existingKeySet.has(compositeKey) || seenKeys.has(compositeKey)) {
      seenKeys.add(compositeKey);
      return {
        lineNumber,
        rawText: line,
        word,
        normalizedKey,
        status: "duplicate",
        messages: ["Bu seviye ve kelime zaten mevcut."],
      };
    }

    seenKeys.add(compositeKey);
    return {
      lineNumber,
      rawText: line,
      word,
      normalizedKey,
      status: "valid",
      messages: ["Kayıt için uygun."],
    };
  });

  return {
    rows,
    validRows: rows.filter((row) => row.status === "valid"),
    duplicateRows: rows.filter((row) => row.status === "duplicate"),
    invalidRows: rows.filter((row) => row.status === "invalid"),
  };
}

export function buildTachistoscopeSeedRows(): TachistoscopeWordSeedRow[] {
  const rows: TachistoscopeWordSeedRow[] = [];

  for (const level of TACHISTOSCOPE_LEVELS) {
    const words = TACHISTOSCOPE_WORDS_BY_LEVEL[level];

    words.forEach((word, sortOrder) => {
      const normalizedWord = normalizeTachistoscopeWord(word);
      if (!normalizedWord) {
        throw new Error(`Invalid tachistoscope seed word for level ${level}: ${word}`);
      }

      const normalizedKey = buildTachistoscopeNormalizedKey(normalizedWord);
      if (!normalizedKey) {
        throw new Error(`Invalid tachistoscope normalized key for level ${level}: ${word}`);
      }

      rows.push({
        level,
        word: normalizedWord,
        normalized_key: normalizedKey,
        is_active: true,
        sort_order: sortOrder,
      });
    });
  }

  return rows;
}

export function toTachistoscopeWordsByLevel(
  rows: Array<Pick<TachistoscopeWordRow, "level" | "word" | "normalized_key" | "sort_order">>,
): TachistoscopeWords {
  const rowsByLevel = createEmptyRowsByLevel();

  for (const row of rows) {
    if (!Object.prototype.hasOwnProperty.call(rowsByLevel, row.level)) {
      continue;
    }

    rowsByLevel[row.level].push({
      level: row.level,
      word: row.word,
      normalized_key: row.normalized_key,
      is_active: true,
      sort_order: row.sort_order,
    });
  }

  for (const level of TACHISTOSCOPE_LEVELS) {
    rowsByLevel[level].sort(compareTachistoscopeWordRows);
  }

  const wordMap = createEmptyWordMap();
  for (const level of TACHISTOSCOPE_LEVELS) {
    wordMap[level] = rowsByLevel[level].map((row) => row.word);
  }

  return wordMap;
}

export { normalizeTachistoscopeLevel, normalizeTachistoscopeText };
