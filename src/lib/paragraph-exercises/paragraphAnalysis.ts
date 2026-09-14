import { paragraphQuestions, type ParagraphCategory } from "./paragraphQuestions";

export const PARAGRAPH_ANALYSIS_MIN_SAMPLE = 5;
export const PARAGRAPH_CATEGORY_LABELS: Record<ParagraphCategory, string> = { main_idea: "Ana Fikir", supporting_idea: "Yardımcı Düşünce", inference: "Çıkarım Yapma", completion: "Paragraf Tamamlama", flow: "Akışı Bozan Cümle" };
export type ParagraphAnalysisAnswer = { questionId: string; category?: ParagraphCategory; correct: boolean; responseTimeMs: number };
export type ParagraphAnalysisResult = { id: string; date: string; exerciseType: string; correctCount: number; wrongCount: number; successRate: number; details?: Record<string, unknown> };
export type ParagraphCategoryStats = { category: ParagraphCategory; label: string; answeredQuestions: number; correct: number; wrong: number; accuracy: number; averageResponseTimeMs: number | null; hasEnoughData: boolean };
export type ParagraphSession = { id: string; date: string; category: ParagraphCategory | "mixed" | "unknown"; categoryLabel: string; answeredQuestions: number; correct: number; wrong: number; accuracy: number; averageResponseTimeMs: number | null };
export type ParagraphAnalysis = { sessions: ParagraphSession[]; categories: ParagraphCategoryStats[]; overall: { answeredQuestions: number; correct: number; wrong: number; accuracy: number | null; averageResponseTimeMs: number | null; completedSessions: number }; strongestCategory: ParagraphCategoryStats | null; needsImprovementCategory: ParagraphCategoryStats | null; trend: { status: "insufficient" | "improving" | "declining" | "stable"; recentAverage: number | null; previousAverage: number | null }; comment: string };

const QUESTION_METADATA = new Map(paragraphQuestions.map((question) => [question.id, { category: question.category }]));
const CATEGORY_ORDER = Object.keys(PARAGRAPH_CATEGORY_LABELS) as ParagraphCategory[];

function finiteNumber(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function readAnswers(details: Record<string, unknown> | undefined): ParagraphAnalysisAnswer[] {
  if (!details || !Array.isArray(details.answers)) return [];
  return details.answers.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const answer = item as Record<string, unknown>;
    const questionId = typeof answer.questionId === "string" ? answer.questionId : null;
    const responseTimeMs = finiteNumber(answer.responseTimeMs);
    if (!questionId || typeof answer.correct !== "boolean" || responseTimeMs === null || responseTimeMs <= 0) return [];
    const category = CATEGORY_ORDER.includes(answer.category as ParagraphCategory) ? answer.category as ParagraphCategory : undefined;
    return [{ questionId, ...(category ? { category } : {}), correct: answer.correct, responseTimeMs }];
  });
}
function summaryCount(result: ParagraphAnalysisResult, key: string, fallback: number): number { const value = finiteNumber(result.details?.[key]); return value !== null && value >= 0 ? Math.round(value) : fallback; }
function sessionFromResult(result: ParagraphAnalysisResult): ParagraphSession {
  const answers = readAnswers(result.details);
  const total = answers.length || summaryCount(result, "totalQuestions", result.correctCount + result.wrongCount);
  const correct = answers.length ? answers.filter((answer) => answer.correct).length : Math.max(0, result.correctCount);
  const wrong = answers.length ? Math.max(0, total - correct) : Math.max(0, result.wrongCount);
  const rawCategory = result.details?.category;
  const category = CATEGORY_ORDER.includes(rawCategory as ParagraphCategory) ? rawCategory as ParagraphCategory : rawCategory === "mixed" ? "mixed" : "unknown";
  const averageResponseTimeMs = answers.length ? Math.round(answers.reduce((sum, answer) => sum + answer.responseTimeMs, 0) / answers.length) : finiteNumber(result.details?.averageResponseTimeMs);
  const accuracy = finiteNumber(result.successRate);
  return { id: result.id, date: result.date, category, categoryLabel: category === "unknown" ? "Kategori bilgisi yok" : category === "mixed" ? "Karma Test" : PARAGRAPH_CATEGORY_LABELS[category], answeredQuestions: total, correct, wrong, accuracy: Math.max(0, Math.min(100, Math.round(accuracy ?? (total > 0 ? correct / total * 100 : 0)))), averageResponseTimeMs };
}

export function buildParagraphAnalysis(results: ParagraphAnalysisResult[]): ParagraphAnalysis {
  const sessions = results.filter((result) => result.exerciseType === "paragraph").map(sessionFromResult).sort((left, right) => right.date.localeCompare(left.date));
  const categoryAnswers = new Map<ParagraphCategory, ParagraphAnalysisAnswer[]>(CATEGORY_ORDER.map((category) => [category, []]));
  for (const result of results) {
    if (result.exerciseType !== "paragraph") continue;
    for (const answer of readAnswers(result.details)) {
      const category = answer.category ?? QUESTION_METADATA.get(answer.questionId)?.category;
      if (category) categoryAnswers.get(category)?.push(answer);
    }
  }
  const categories = CATEGORY_ORDER.map((category) => { const answers = categoryAnswers.get(category) ?? []; const correct = answers.filter((answer) => answer.correct).length; return { category, label: PARAGRAPH_CATEGORY_LABELS[category], answeredQuestions: answers.length, correct, wrong: answers.length - correct, accuracy: answers.length ? Math.round(correct / answers.length * 100) : 0, averageResponseTimeMs: answers.length ? Math.round(answers.reduce((sum, answer) => sum + answer.responseTimeMs, 0) / answers.length) : null, hasEnoughData: answers.length >= PARAGRAPH_ANALYSIS_MIN_SAMPLE }; });
  const overall = sessions.reduce((summary, session) => ({ answeredQuestions: summary.answeredQuestions + session.answeredQuestions, correct: summary.correct + session.correct, wrong: summary.wrong + session.wrong }), { answeredQuestions: 0, correct: 0, wrong: 0 });
  const allAnswers = results.filter((result) => result.exerciseType === "paragraph").flatMap((result) => readAnswers(result.details));
  const eligible = categories.filter((category) => category.hasEnoughData);
  const strongestCategory = [...eligible].sort((a, b) => b.accuracy - a.accuracy || CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))[0] ?? null;
  const needsImprovementCategory = [...eligible].sort((a, b) => a.accuracy - b.accuracy || CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))[0] ?? null;
  const recent = sessions.slice(0, 3).map((session) => session.accuracy); const previous = sessions.slice(3, 6).map((session) => session.accuracy);
  const recentAverage = recent.length === 3 ? Math.round(recent.reduce((sum, value) => sum + value, 0) / 3) : null; const previousAverage = previous.length === 3 ? Math.round(previous.reduce((sum, value) => sum + value, 0) / 3) : null;
  const status = recentAverage === null || previousAverage === null ? "insufficient" : recentAverage > previousAverage ? "improving" : recentAverage < previousAverage ? "declining" : "stable";
  const fallbackTimeTotals = sessions.reduce((summary, session) => session.averageResponseTimeMs === null ? summary : { time: summary.time + session.averageResponseTimeMs * session.answeredQuestions, questions: summary.questions + session.answeredQuestions }, { time: 0, questions: 0 });
  const averageResponseTimeMs = allAnswers.length ? Math.round(allAnswers.reduce((sum, answer) => sum + answer.responseTimeMs, 0) / allAnswers.length) : fallbackTimeTotals.questions ? Math.round(fallbackTimeTotals.time / fallbackTimeTotals.questions) : null;
  return { sessions, categories, overall: { ...overall, accuracy: overall.answeredQuestions ? Math.round(overall.correct / overall.answeredQuestions * 100) : null, averageResponseTimeMs, completedSessions: sessions.length }, strongestCategory, needsImprovementCategory, trend: { status, recentAverage, previousAverage }, comment: strongestCategory && needsImprovementCategory ? `Öğrenci ${strongestCategory.label.toLocaleLowerCase("tr-TR")} sorularında güçlü, ${needsImprovementCategory.label.toLocaleLowerCase("tr-TR")} sorularında ise daha fazla çalışmaya ihtiyaç duyuyor.` : "Henüz ayrıntılı değerlendirme için yeterli paragraf çalışması bulunmuyor." };
}
export function getParagraphQuestionCategory(questionId: string, category?: ParagraphCategory): ParagraphCategory | null {
  return category && CATEGORY_ORDER.includes(category) ? category : QUESTION_METADATA.get(questionId)?.category ?? null;
}
