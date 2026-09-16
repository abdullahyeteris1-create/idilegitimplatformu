import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { paragraphQuestions } from "./paragraphQuestions";
import {
  aggregateParagraphAnalytics,
  type ParagraphAnalytics,
  type ParagraphQuestionMetadata,
  type ParagraphSessionInput,
} from "./paragraphAnalytics";

type DatabaseQuestionRow = {
  id: unknown;
  category: unknown;
  difficulty: unknown;
  grade_band: unknown;
  question: unknown;
  source: unknown;
};

type DatabaseResultRow = {
  student_id: unknown;
  details: unknown;
};

const QUESTION_FIELDS = "id,category,difficulty,grade_band,question,source";
const RESULT_FIELDS = "student_id,details";

function staticQuestionMetadata(): ParagraphQuestionMetadata[] {
  return paragraphQuestions.map((question) => ({
    id: question.id,
    category: question.category,
    difficulty: question.level,
    gradeBand: question.gradeBand,
    question: question.question,
    source: "legacy-static",
  }));
}

function mapDatabaseQuestion(row: DatabaseQuestionRow): ParagraphQuestionMetadata | null {
  if (
    typeof row.id !== "string" ||
    typeof row.category !== "string" ||
    typeof row.difficulty !== "string" ||
    typeof row.grade_band !== "string" ||
    typeof row.question !== "string" ||
    typeof row.source !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    category: row.category as ParagraphQuestionMetadata["category"],
    difficulty: row.difficulty as ParagraphQuestionMetadata["difficulty"],
    gradeBand: row.grade_band as ParagraphQuestionMetadata["gradeBand"],
    question: row.question,
    source: row.source,
  };
}

export async function loadParagraphAnalytics(): Promise<ParagraphAnalytics> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    throw new Error("Supabase analytics service is not configured.");
  }

  const [questionResult, sessionResult] = await Promise.all([
    supabase
      .from("paragraph_questions")
      .select(QUESTION_FIELDS)
      .order("id", { ascending: true }),
    supabase
      .from("exercise_results")
      .select(RESULT_FIELDS)
      .eq("exercise_type", "paragraph"),
  ]);

  if (questionResult.error) {
    throw new Error("Paragraph question metadata could not be loaded.");
  }
  if (sessionResult.error) {
    throw new Error("Paragraph exercise results could not be loaded.");
  }

  const questionMetadata = (questionResult.data as DatabaseQuestionRow[])
    .map(mapDatabaseQuestion)
    .filter((row): row is ParagraphQuestionMetadata => row !== null);
  const sessions = (sessionResult.data as DatabaseResultRow[]).map<ParagraphSessionInput>((row) => ({
    studentId: row.student_id,
    details: row.details,
  }));

  return aggregateParagraphAnalytics(questionMetadata, sessions, staticQuestionMetadata());
}

export async function loadParagraphQuestionMetadata(): Promise<ParagraphQuestionMetadata[]> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    throw new Error("Supabase analytics service is not configured.");
  }

  const { data, error } = await supabase
    .from("paragraph_questions")
    .select(QUESTION_FIELDS)
    .order("id", { ascending: true });

  if (error) {
    throw new Error("Paragraph question metadata could not be loaded.");
  }

  return (data as DatabaseQuestionRow[])
    .map(mapDatabaseQuestion)
    .filter((row): row is ParagraphQuestionMetadata => row !== null);
}
