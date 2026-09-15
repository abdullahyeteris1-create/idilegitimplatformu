import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { paragraphQuestions, type ParagraphCategory, type ParagraphQuestion } from "./paragraphQuestions";
import { resolveParagraphGradeBand, type ParagraphGradeBand } from "./paragraphGradeBand";

const PARAGRAPH_QUESTIONS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_PARAGRAPH_QUESTIONS_TABLE ?? "paragraph_questions";
const VALID_CATEGORIES = new Set<ParagraphCategory>(["main_idea", "supporting_idea", "inference", "completion", "flow"]);
const VALID_DIFFICULTIES = new Set<ParagraphQuestion["level"]>(["easy", "medium", "hard"]);
const VALID_GRADE_BANDS = new Set<ParagraphQuestion["gradeBand"]>(["4-5", "6-7", "8", "high-school"]);

export type ParagraphQuestionLoadResult = {
  questions: ParagraphQuestion[];
  source: "db" | "static-fallback";
  dbState: "success" | "empty" | "error";
  error: string | null;
};

export type StudentParagraphQuestionLoadResult = ParagraphQuestionLoadResult & {
  gradeBand: ParagraphGradeBand | null;
  seenQuestionIds: string[];
};

type ParagraphQuestionRow = {
  id: unknown;
  category: unknown;
  difficulty: unknown;
  grade_band: unknown;
  passage: unknown;
  question: unknown;
  options: unknown;
  correct_index: unknown;
  explanation: unknown;
};

function fallbackResult(error: string): ParagraphQuestionLoadResult {
  console.error("paragraph_questions_load_failed", { message: error, fallback: "static" });
  return {
    questions: paragraphQuestions,
    source: "static-fallback",
    dbState: "error",
    error,
  };
}

export function mapParagraphQuestionRow(row: ParagraphQuestionRow): ParagraphQuestion | null {
  const options = Array.isArray(row.options) ? row.options : null;
  const correctIndex = typeof row.correct_index === "number" ? row.correct_index : Number(row.correct_index);

  if (
    typeof row.id !== "string" ||
    !VALID_CATEGORIES.has(row.category as ParagraphCategory) ||
    !VALID_DIFFICULTIES.has(row.difficulty as ParagraphQuestion["level"]) ||
    !VALID_GRADE_BANDS.has(row.grade_band as ParagraphQuestion["gradeBand"]) ||
    typeof row.passage !== "string" ||
    typeof row.question !== "string" ||
    !options ||
    options.length !== 5 ||
    !options.every((option) => typeof option === "string" && option.trim().length > 0) ||
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex > 4 ||
    typeof row.explanation !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    category: row.category as ParagraphCategory,
    level: row.difficulty as ParagraphQuestion["level"],
    gradeBand: row.grade_band as ParagraphQuestion["gradeBand"],
    paragraph: row.passage,
    question: row.question,
    options: options as [string, string, string, string, string],
    correctIndex,
    explanation: row.explanation,
  };
}

export async function loadActiveParagraphQuestions(
  client: SupabaseClient | null = getSupabaseServerClient(),
): Promise<ParagraphQuestionLoadResult> {
  if (!client) {
    return fallbackResult("Supabase server istemcisi kullanılamıyor.");
  }

  const { data, error } = await client
    .from(PARAGRAPH_QUESTIONS_TABLE)
    .select("id,category,difficulty,grade_band,passage,question,options,correct_index,explanation")
    .eq("is_active", true)
    .is("archived_at", null)
    .order("id", { ascending: true });

  if (error || !Array.isArray(data)) {
    return fallbackResult(error?.message ?? "Paragraf soru havuzu okunamadı.");
  }

  if (data.length === 0) {
    return { questions: [], source: "db", dbState: "empty", error: null };
  }

  const questions = data.map((row) => mapParagraphQuestionRow(row as ParagraphQuestionRow));
  if (questions.some((question) => question === null)) {
    return fallbackResult("Paragraf soru havuzunda geçersiz kayıt bulundu.");
  }

  return { questions: questions as ParagraphQuestion[], source: "db", dbState: "success", error: null };
}

function collectSeenQuestionIds(rows: unknown[]): Set<string> {
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const details = (row as { details?: unknown }).details;
    if (!details || typeof details !== "object" || Array.isArray(details)) continue;
    const value = details as { questionIds?: unknown; answers?: unknown };
    if (typeof value.questionIds === "string") {
      value.questionIds.split(",").forEach((id) => { const trimmed = id.trim(); if (trimmed) seen.add(trimmed); });
    } else if (Array.isArray(value.questionIds)) {
      value.questionIds.forEach((id) => { if (typeof id === "string" && id.trim()) seen.add(id.trim()); });
    }
    if (Array.isArray(value.answers)) {
      value.answers.forEach((answer) => {
        if (answer && typeof answer === "object" && typeof (answer as { questionId?: unknown }).questionId === "string") {
          const id = (answer as { questionId: string }).questionId.trim();
          if (id) seen.add(id);
        }
      });
    }
  }
  return seen;
}

export async function loadStudentParagraphQuestions(
  studentId: string,
  studentClass: unknown,
  client: SupabaseClient | null = getSupabaseServerClient(),
): Promise<StudentParagraphQuestionLoadResult> {
  const gradeBand = resolveParagraphGradeBand(studentClass);
  if (!gradeBand) {
    return { questions: [], source: "db", dbState: "empty", error: null, gradeBand: null, seenQuestionIds: [] };
  }
  if (!client) {
    const seenQuestionIds: string[] = [];
    return {
      questions: [],
      source: "static-fallback",
      dbState: "error",
      error: "Supabase server istemcisi kullanılamıyor.",
      gradeBand,
      seenQuestionIds,
    };
  }
  const [questionsResult, historyResult] = await Promise.all([
    client.from(PARAGRAPH_QUESTIONS_TABLE)
      .select("id,category,difficulty,grade_band,passage,question,options,correct_index,explanation")
      .eq("is_active", true).is("archived_at", null).eq("grade_band", gradeBand).order("id", { ascending: true }),
    client.from(process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results")
      .select("details").eq("student_id", studentId).eq("exercise_type", "paragraph"),
  ]);
  const seen = collectSeenQuestionIds(Array.isArray(historyResult.data) ? historyResult.data : []);
  if (historyResult.error) {
    console.error("paragraph_question_history_load_failed", { message: historyResult.error.message });
    return { questions: [], source: "db", dbState: "error", error: historyResult.error.message, gradeBand, seenQuestionIds: [...seen] };
  }
  if (questionsResult.error || !Array.isArray(questionsResult.data)) {
    return {
      questions: paragraphQuestions.filter((question) => question.gradeBand === gradeBand && !seen.has(question.id)),
      source: "static-fallback", dbState: "error", error: questionsResult.error?.message ?? "Paragraf soruları okunamadı.", gradeBand, seenQuestionIds: [...seen],
    };
  }
  const mapped = questionsResult.data.map((row) => mapParagraphQuestionRow(row as ParagraphQuestionRow));
  if (mapped.some((question) => question === null)) {
    return { questions: [], source: "db", dbState: "error", error: "Paragraf soru havuzunda geçersiz kayıt bulundu.", gradeBand, seenQuestionIds: [...seen] };
  }
  return { questions: (mapped as ParagraphQuestion[]).filter((question) => !seen.has(question.id)), source: "db", dbState: questionsResult.data.length ? "success" : "empty", error: null, gradeBand, seenQuestionIds: [...seen] };
}
