import {
  PARAGRAPH_CATEGORIES,
  type ParagraphCategory,
} from "@/lib/paragraph-exercises/paragraphQuestions";
import {
  PARAGRAPH_EXAM_DIFFICULTIES,
  PARAGRAPH_EXAM_GRADE_BANDS,
  PARAGRAPH_EXAM_STATUSES,
  type ParagraphExamInput,
  type ParagraphExamPassageInput,
  type ParagraphExamQuestionInput,
  type ParagraphExamGradeBand,
  type ParagraphExamDifficulty,
  type ParagraphExamQuestionOptions,
} from "./types";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function nonEmptyString(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}

export function normalizeQuestionOptions(value: unknown): ParagraphExamQuestionOptions | null {
  if (!Array.isArray(value) || (value.length !== 4 && value.length !== 5)) return null;
  const options = value.map((option) => typeof option === "string" ? option.trim().normalize("NFKC") : null);
  if (options.slice(0, 4).some((option) => !option || option.length > 500)) return null;
  const e = options[4];
  if (e !== undefined && e !== null && e.length > 0 && e.length > 500) return null;
  const normalized = e ? [...options.slice(0, 4), e] : options.slice(0, 4);
  if (normalized.some((option) => !option)) return null;
  const comparable = (normalized as string[]).map((option) => option.toLocaleLowerCase("tr-TR"));
  if (new Set(comparable).size !== normalized.length) return null;
  return normalized as ParagraphExamQuestionOptions;
}
export function validateExamInput(value: unknown):
  | { ok: true; value: ParagraphExamInput }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object") return { ok: false, error: "Geçersiz sınav verisi." };
  const body = value as Record<string, unknown>;
  if (!nonEmptyString(body.title, 1, 200)) return { ok: false, error: "Sınav başlığı geçersiz." };
  if (!isOneOf(body.gradeBand, PARAGRAPH_EXAM_GRADE_BANDS)) return { ok: false, error: "Sınıf düzeyi geçersiz." };
  if (!Number.isInteger(body.durationSeconds) || Number(body.durationSeconds) < 60 || Number(body.durationSeconds) > 7200) {
    return { ok: false, error: "Süre 60 ile 7200 saniye arasında olmalıdır." };
  }
  if (body.description !== undefined && body.description !== null && (typeof body.description !== "string" || body.description.length > 2000)) {
    return { ok: false, error: "Açıklama geçersiz." };
  }
  return {
    ok: true,
    value: {
      title: body.title.trim(),
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      gradeBand: body.gradeBand as ParagraphExamGradeBand,
      durationSeconds: Number(body.durationSeconds),
    },
  };
}

export function validatePassageInput(value: unknown):
  | { ok: true; value: ParagraphExamPassageInput }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object") return { ok: false, error: "Geçersiz pasaj verisi." };
  const body = value as Record<string, unknown>;
  if (!nonEmptyString(body.passageText, 10, 20000)) return { ok: false, error: "Pasaj uzunluğu geçersiz." };
  if (!Number.isInteger(body.position) || Number(body.position) < 1) return { ok: false, error: "Pasaj sırası geçersiz." };
  if (body.label !== undefined && body.label !== null && (typeof body.label !== "string" || body.label.length > 200)) {
    return { ok: false, error: "Pasaj etiketi geçersiz." };
  }
  return {
    ok: true,
    value: {
      passageText: body.passageText.trim(),
      label: typeof body.label === "string" ? body.label.trim() || null : null,
      position: Number(body.position),
    },
  };
}

export function validateQuestionInput(value: unknown):
  | { ok: true; value: ParagraphExamQuestionInput }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object") return { ok: false, error: "Geçersiz soru verisi." };
  const body = value as Record<string, unknown>;
  if (!nonEmptyString(body.questionText, 1, 2000)) return { ok: false, error: "Soru metni geçersiz." };
  const normalizedOptions = normalizeQuestionOptions(body.options);
  if (!normalizedOptions) return { ok: false, error: "A-D seçenekleri zorunludur; E seçeneği isteğe bağlıdır." };
  if (!Number.isInteger(body.correctOption) || Number(body.correctOption) < 0 || Number(body.correctOption) >= normalizedOptions.length) {
    return { ok: false, error: "Doğru seçenek mevcut seçenekler arasında olmalıdır." };
  }
  if (!nonEmptyString(body.explanation, 1, 4000)) return { ok: false, error: "Açıklama geçersiz." };
  if (!isOneOf(body.category, PARAGRAPH_CATEGORIES.filter((item) => item.key !== "mixed").map((item) => item.key))) return { ok: false, error: "Kategori geçersiz." };
  if (!isOneOf(body.difficulty, PARAGRAPH_EXAM_DIFFICULTIES)) return { ok: false, error: "Zorluk geçersiz." };
  if (!isOneOf(body.gradeBand, PARAGRAPH_EXAM_GRADE_BANDS)) return { ok: false, error: "Sınıf düzeyi geçersiz." };
  if (!Number.isInteger(body.position) || Number(body.position) < 1) return { ok: false, error: "Soru sırası geçersiz." };
  if (body.points !== undefined && (!Number.isInteger(body.points) || Number(body.points) < 1 || Number(body.points) > 100)) {
    return { ok: false, error: "Soru puanı 1 ile 100 arasında olmalıdır." };
  }
  if (body.passageId !== undefined && body.passageId !== null && !isUuid(body.passageId)) return { ok: false, error: "Pasaj kimliği geçersiz." };
  if (body.sourceQuestionId !== undefined && body.sourceQuestionId !== null && !nonEmptyString(body.sourceQuestionId, 1, 200)) {
    return { ok: false, error: "Kaynak soru kimliği geçersiz." };
  }
  return {
    ok: true,
    value: {
      passageId: typeof body.passageId === "string" ? body.passageId.trim() : null,
      sourceQuestionId: typeof body.sourceQuestionId === "string" ? body.sourceQuestionId.trim() : null,
      questionText: body.questionText.trim(),
      options: normalizedOptions,
      correctOption: Number(body.correctOption),
      explanation: body.explanation.trim(),
      category: body.category as ParagraphCategory,
      difficulty: body.difficulty as ParagraphExamDifficulty,
      gradeBand: body.gradeBand as ParagraphExamGradeBand,
      position: Number(body.position),
      points: body.points === undefined ? 1 : Number(body.points),
    },
  };
}

export function isExamStatus(value: unknown): value is (typeof PARAGRAPH_EXAM_STATUSES)[number] {
  return isOneOf(value, PARAGRAPH_EXAM_STATUSES);
}

export function isSelectedOption(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 4);
}
