export const COMPREHENSION_QUESTIONS_RELATION = "comprehension_questions";

export function hasComprehensionQuestions(row: Record<string, unknown>): boolean {
  const questions = row[COMPREHENSION_QUESTIONS_RELATION];
  return Array.isArray(questions) && questions.length > 0;
}

export function filterReadingPracticeTextRows<T extends Record<string, unknown>>(rows: readonly T[]): T[] {
  return rows.filter((row) => !hasComprehensionQuestions(row));
}
