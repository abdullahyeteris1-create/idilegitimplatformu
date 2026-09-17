import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  buildParagraphAnalysis,
  type ParagraphAnalysis,
  type ParagraphAnalysisResult,
  type ParagraphQuestionMetadata,
} from "./paragraphAnalysis";
import type { ParagraphCategory } from "./paragraphQuestions";

const RESULTS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_RESULTS_TABLE ?? "exercise_results";
const QUESTIONS_TABLE = process.env.NEXT_PUBLIC_SUPABASE_PARAGRAPH_QUESTIONS_TABLE ?? "paragraph_questions";
const VALID_CATEGORIES = new Set<ParagraphCategory>([
  "main_idea",
  "supporting_idea",
  "inference",
  "completion",
  "flow",
]);

type ResultRow = Record<string, unknown>;
type QuestionRow = Record<string, unknown>;

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function resultFromRow(row: ResultRow): ParagraphAnalysisResult {
  const completedAt = typeof row.completed_at === "string"
    ? row.completed_at
    : typeof row.created_at === "string"
      ? row.created_at
      : "";
  return {
    id: typeof row.id === "string" ? row.id : String(row.id ?? ""),
    date: completedAt,
    exerciseType: "paragraph",
    correctCount: finiteNumber(row.correct_count),
    wrongCount: finiteNumber(row.wrong_count),
    successRate: finiteNumber(row.success_rate),
    details: typeof row.details === "object" && row.details !== null && !Array.isArray(row.details)
      ? row.details as Record<string, unknown>
      : undefined,
  };
}

function metadataFromRows(rows: QuestionRow[]): ParagraphQuestionMetadata[] {
  return rows.flatMap((row) => {
    const id = typeof row.id === "string" ? row.id.trim() : "";
    if (!id || !VALID_CATEGORIES.has(row.category as ParagraphCategory)) return [];
    return [{ id, category: row.category as ParagraphCategory }];
  });
}

/**
 * Server-only data loader. Callers must derive verifiedStudentId from an
 * authenticated student session or an authorized teacher boundary.
 */
export async function loadParagraphStudentAnalyticsForVerifiedStudent(
  verifiedStudentId: string,
  client: SupabaseClient | null = getSupabaseServiceRoleClient(),
): Promise<ParagraphAnalysis> {
  if (!verifiedStudentId.trim()) {
    throw new Error("Verified student identity is required.");
  }
  if (!client) {
    throw new Error("Paragraph analytics service is unavailable.");
  }

  const [resultsResponse, questionsResponse] = await Promise.all([
    client
      .from(RESULTS_TABLE)
      .select("id,correct_count,wrong_count,success_rate,details,completed_at,created_at")
      .eq("student_id", verifiedStudentId)
      .eq("exercise_type", "paragraph")
      .order("completed_at", { ascending: true })
      .order("id", { ascending: true }),
    client
      .from(QUESTIONS_TABLE)
      .select("id,category"),
  ]);

  if (resultsResponse.error || !Array.isArray(resultsResponse.data)) {
    throw new Error("Paragraph results could not be loaded.");
  }
  if (questionsResponse.error || !Array.isArray(questionsResponse.data)) {
    throw new Error("Paragraph question metadata could not be loaded.");
  }

  return buildParagraphAnalysis(
    resultsResponse.data.map((row) => resultFromRow(row as ResultRow)),
    metadataFromRows(questionsResponse.data as QuestionRow[]),
  );
}
