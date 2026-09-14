import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { paragraphQuestions, type ParagraphCategory, type ParagraphQuestion } from "./paragraphQuestions";

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
