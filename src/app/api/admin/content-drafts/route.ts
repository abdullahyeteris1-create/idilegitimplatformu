import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAdminSessionValid } from "@/lib/auth/adminSession";
import {
  CONTENT_TYPES,
  DIFFICULTIES,
  GRADE_LEVELS,
  type ContentDifficulty,
  type ContentType,
  type GeneratedContent,
  type GradeLevel,
} from "@/lib/ai/contentGeneratorTypes";

export const runtime = "nodejs";

const TEXT_LIBRARY_TABLE = process.env.NEXT_PUBLIC_SUPABASE_TEXT_LIBRARY_TABLE ?? "text_library";
const QUESTION_LIBRARY_TABLE = process.env.NEXT_PUBLIC_SUPABASE_QUESTION_LIBRARY_TABLE ?? "question_library";
const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 50_000;
const MAX_SUMMARY_LENGTH = 2_000;

type DraftInput = GeneratedContent & {
  gradeLevel: GradeLevel;
  difficulty: ContentDifficulty;
  contentType: ContentType;
};

type ParsedDraft = DraftInput & { draftId?: string };

const CATEGORY_BY_CONTENT_TYPE: Record<ContentType, string> = {
  informative: "Genel Kültür",
  story: "Hikayeler",
  "general-culture": "Genel Kültür",
  scientific: "Bilim",
  "daily-life": "Yaşam",
};

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowed<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

function nonEmptyString(value: unknown, maximumLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximumLength;
}

function normalizeForMatch(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("tr-TR").replace(/\s+/gu, " ").trim();
}

function parseDraft(value: unknown, requireDraftId: boolean): ParsedDraft | null {
  if (!isRecord(value)) return null;

  const draftId = typeof value.draftId === "string" ? value.draftId.trim() : "";
  if (requireDraftId && !/^[a-zA-Z0-9-]{1,128}$/.test(draftId)) return null;
  if (
    !nonEmptyString(value.title, MAX_TITLE_LENGTH) ||
    !nonEmptyString(value.content, MAX_CONTENT_LENGTH) ||
    !nonEmptyString(value.summary, MAX_SUMMARY_LENGTH) ||
    !isAllowed(GRADE_LEVELS, value.gradeLevel) ||
    !isAllowed(DIFFICULTIES, value.difficulty) ||
    !isAllowed(CONTENT_TYPES, value.contentType) ||
    !Array.isArray(value.targetWords) ||
    value.targetWords.length < 1 ||
    value.targetWords.length > 8 ||
    !Array.isArray(value.questions) ||
    value.questions.length < 1 ||
    value.questions.length > 10
  ) {
    return null;
  }

  const content = value.content.trim();
  const normalizedContent = normalizeForMatch(content);
  const targetWords = [] as GeneratedContent["targetWords"];
  for (const item of value.targetWords) {
    if (!isRecord(item) || !nonEmptyString(item.word, 100) || !nonEmptyString(item.meaning, 500)) return null;
    const word = item.word.trim();
    if (!normalizedContent.includes(normalizeForMatch(word))) return null;
    targetWords.push({ word, meaning: item.meaning.trim() });
  }

  const questions = [] as GeneratedContent["questions"];
  for (const item of value.questions) {
    if (
      !isRecord(item) ||
      !nonEmptyString(item.question, 1_000) ||
      !Array.isArray(item.options) ||
      item.options.length !== 4 ||
      !item.options.every((option) => nonEmptyString(option, 500)) ||
      !Number.isInteger(item.correctOptionIndex) ||
      Number(item.correctOptionIndex) < 0 ||
      Number(item.correctOptionIndex) > 3 ||
      !nonEmptyString(item.explanation, 2_000)
    ) {
      return null;
    }

    questions.push({
      question: item.question.trim(),
      options: item.options.map((option) => option.trim()) as [string, string, string, string],
      correctOptionIndex: Number(item.correctOptionIndex),
      explanation: item.explanation.trim(),
    });
  }

  return {
    ...(requireDraftId ? { draftId } : {}),
    title: value.title.trim(),
    content,
    summary: value.summary.trim(),
    gradeLevel: value.gradeLevel,
    difficulty: value.difficulty,
    contentType: value.contentType,
    targetWords,
    questions,
  };
}

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function questionRows(draft: ParsedDraft, textId: string, questionIds?: string[]) {
  const now = Date.now();
  return draft.questions.map((question, index) => ({
    ...(questionIds?.[index] ? { id: questionIds[index] } : {}),
    ...(!questionIds ? { created_at: new Date(now + index).toISOString() } : {}),
    text_id: textId,
    question: question.question,
    options: question.options,
    correct_answer: question.options[question.correctOptionIndex],
    explanation: question.explanation,
    is_active: false,
    updated_at: new Date(now).toISOString(),
  }));
}

async function cleanupNewDraft(supabase: SupabaseClient, draftId: string): Promise<void> {
  const { error: questionCleanupError } = await supabase
    .from(QUESTION_LIBRARY_TABLE)
    .delete()
    .eq("text_id", draftId)
    .eq("is_active", false);
  if (questionCleanupError && process.env.NODE_ENV === "development") {
    console.error("AI draft question cleanup failed", {
      code: questionCleanupError.code,
      message: questionCleanupError.message,
    });
  }

  const { error: textCleanupError } = await supabase
    .from(TEXT_LIBRARY_TABLE)
    .delete()
    .eq("id", draftId)
    .eq("is_active", false);
  if (textCleanupError && process.env.NODE_ENV === "development") {
    console.error("AI draft text cleanup failed", {
      code: textCleanupError.code,
      message: textCleanupError.message,
    });
  }
}

async function readPayload(request: NextRequest, requireDraftId: boolean): Promise<ParsedDraft | null> {
  try {
    return parseDraft(await request.json(), requireDraftId);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) return errorResponse("Yetkisiz erişim.", 401);

  const draft = await readPayload(request, false);
  if (!draft) return errorResponse("Taslak bilgilerini kontrol edin.", 400);
  const supabase = getSupabaseClient();
  if (!supabase) return errorResponse("İçerik kayıt sistemi yapılandırılmamış.", 500);

  const now = new Date().toISOString();
  const { data: textRow, error: textError } = await supabase
    .from(TEXT_LIBRARY_TABLE)
    .insert({
      title: draft.title,
      category: CATEGORY_BY_CONTENT_TYPE[draft.contentType],
      content: draft.content,
      is_active: false,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (textError || !textRow?.id) {
    if (process.env.NODE_ENV === "development" && textError) {
      console.error("AI draft text save failed", { code: textError.code, message: textError.message });
    }
    return errorResponse("Taslak kaydedilemedi. Lütfen yeniden deneyin.", 500);
  }

  const draftId = String(textRow.id);
  const { error: questionError } = await supabase.from(QUESTION_LIBRARY_TABLE).insert(questionRows(draft, draftId));
  if (questionError) {
    if (process.env.NODE_ENV === "development") {
      console.error("AI draft question save failed", { code: questionError.code, message: questionError.message });
    }
    await cleanupNewDraft(supabase, draftId);
    return errorResponse("Taslak kaydedilemedi. Lütfen yeniden deneyin.", 500);
  }

  return NextResponse.json({
    ok: true,
    draftId,
    message: "Taslak başarıyla kaydedildi.",
    publicationStatus: "draft",
  });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminSessionValid(request)) return errorResponse("Yetkisiz erişim.", 401);

  const draft = await readPayload(request, true);
  if (!draft?.draftId) return errorResponse("Taslak bilgilerini kontrol edin.", 400);
  const supabase = getSupabaseClient();
  if (!supabase) return errorResponse("İçerik kayıt sistemi yapılandırılmamış.", 500);

  const { data: existingQuestions, error: questionLookupError } = await supabase
    .from(QUESTION_LIBRARY_TABLE)
    .select("id,created_at")
    .eq("text_id", draft.draftId)
    .eq("is_active", false)
    .order("created_at", { ascending: true });

  if (questionLookupError) {
    if (process.env.NODE_ENV === "development") {
      console.error("AI draft question lookup failed", { code: questionLookupError.code, message: questionLookupError.message });
    }
    return errorResponse("Taslak güncellenemedi. Lütfen yeniden deneyin.", 500);
  }
  if (!existingQuestions || existingQuestions.length !== draft.questions.length) {
    return errorResponse("Taslağın soru yapısı değiştiği için güncellenemedi.", 409);
  }

  const { data: textRow, error: textError } = await supabase
    .from(TEXT_LIBRARY_TABLE)
    .update({
      title: draft.title,
      category: CATEGORY_BY_CONTENT_TYPE[draft.contentType],
      content: draft.content,
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draft.draftId)
    .eq("is_active", false)
    .select("id")
    .maybeSingle();

  if (textError || !textRow?.id) {
    if (process.env.NODE_ENV === "development" && textError) {
      console.error("AI draft text update failed", { code: textError.code, message: textError.message });
    }
    return errorResponse(textError ? "Taslak güncellenemedi. Lütfen yeniden deneyin." : "Taslak bulunamadı veya artık aktif.", textError ? 500 : 404);
  }

  const questionIds = existingQuestions.map((question) => String(question.id));
  const { error: questionError } = await supabase
    .from(QUESTION_LIBRARY_TABLE)
    .upsert(questionRows(draft, draft.draftId, questionIds), { onConflict: "id" });

  if (questionError) {
    if (process.env.NODE_ENV === "development") {
      console.error("AI draft question update failed", { code: questionError.code, message: questionError.message });
    }
    return errorResponse("Taslak güncellenemedi. Lütfen yeniden deneyin.", 500);
  }

  return NextResponse.json({
    ok: true,
    draftId: draft.draftId,
    message: "Taslak başarıyla güncellendi.",
    publicationStatus: "draft",
  });
}
