import { paragraphQuestions, type ParagraphCategory } from "./paragraphQuestions";

export const PARAGRAPH_ANALYSIS_MIN_SAMPLE = 5;
export const PARAGRAPH_ANALYSIS_MIN_TREND_SESSIONS = 6;
export const PARAGRAPH_ANALYSIS_MIN_RESPONSE_TIME_MS = 1_000;
export const PARAGRAPH_ANALYSIS_MAX_RESPONSE_TIME_MS = 600_000;

export const PARAGRAPH_CATEGORY_LABELS: Record<ParagraphCategory, string> = {
  main_idea: "Ana Fikir",
  supporting_idea: "Yardımcı Düşünce",
  inference: "Çıkarım Yapma",
  completion: "Paragraf Tamamlama",
  flow: "Akışı Bozan Cümle",
};

export type ParagraphQuestionMetadata = { id: string; category: ParagraphCategory };
export type ParagraphAnalysisAnswer = {
  questionId: string;
  category?: ParagraphCategory;
  correct: boolean;
  responseTimeMs?: number;
};
export type ParagraphAnalysisResult = {
  id: string;
  date: string;
  exerciseType: string;
  correctCount: number;
  wrongCount: number;
  successRate: number;
  details?: Record<string, unknown>;
};
export type ParagraphCategoryStats = {
  category: ParagraphCategory;
  label: string;
  answered: number;
  answeredQuestions: number;
  correct: number;
  incorrect: number;
  wrong: number;
  accuracy: number | null;
  validResponseTimeCount: number;
  averageResponseTimeMs: number | null;
  hasEnoughData: boolean;
};
export type ParagraphSession = {
  id: string;
  date: string;
  source: "answers" | "summary";
  category: ParagraphCategory | "mixed" | "unknown";
  categoryLabel: string;
  answered: number;
  answeredQuestions: number;
  correct: number;
  incorrect: number;
  wrong: number;
  accuracy: number;
  validResponseTimeCount: number;
  averageResponseTimeMs: number | null;
};
export type ParagraphAnalysis = {
  /** Chronological, oldest to newest. Reverse a copy for recent-first UI. */
  sessions: ParagraphSession[];
  categories: ParagraphCategoryStats[];
  overall: {
    totalAnswered: number;
    answeredQuestions: number;
    correctCount: number;
    correct: number;
    incorrectCount: number;
    wrong: number;
    accuracy: number | null;
    validResponseTimeCount: number;
    averageResponseTimeMs: number | null;
    completedSessionCount: number;
    completedSessions: number;
  };
  strongestCategory: ParagraphCategoryStats | null;
  needsImprovementCategory: ParagraphCategoryStats | null;
  trend: {
    status: "insufficient" | "improving" | "needs_attention" | "stable";
    latestAverage: number | null;
    recentAverage: number | null;
    previousAverage: number | null;
    difference: number | null;
  };
  comment: string;
};

type ParsedAnswer = Omit<ParagraphAnalysisAnswer, "responseTimeMs"> & {
  responseTimeMs: number | null;
};

const STATIC_QUESTION_METADATA = new Map(
  paragraphQuestions.map((question) => [question.id, question.category]),
);
const CATEGORY_ORDER = Object.keys(PARAGRAPH_CATEGORY_LABELS) as ParagraphCategory[];

function isParagraphCategory(value: unknown): value is ParagraphCategory {
  return typeof value === "string" && CATEGORY_ORDER.includes(value as ParagraphCategory);
}

function validResponseTime(value: unknown): number | null {
  return typeof value === "number"
    && Number.isInteger(value)
    && value >= PARAGRAPH_ANALYSIS_MIN_RESPONSE_TIME_MS
    && value <= PARAGRAPH_ANALYSIS_MAX_RESPONSE_TIME_MS
    ? value
    : null;
}

function validNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function readAnswers(details: Record<string, unknown> | undefined): ParsedAnswer[] {
  if (!details || !Array.isArray(details.answers)) return [];
  return details.answers.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const answer = item as Record<string, unknown>;
    const questionId = typeof answer.questionId === "string" ? answer.questionId.trim() : "";
    if (!questionId || typeof answer.correct !== "boolean") return [];
    return [{
      questionId,
      ...(isParagraphCategory(answer.category) ? { category: answer.category } : {}),
      correct: answer.correct,
      responseTimeMs: validResponseTime(answer.responseTimeMs),
    }];
  });
}

function safeSummary(result: ParagraphAnalysisResult) {
  const correct = validNonNegativeInteger(result.correctCount);
  const incorrect = validNonNegativeInteger(result.wrongCount);
  if (correct === null || incorrect === null || correct + incorrect === 0) return null;
  return { answered: correct + incorrect, correct, incorrect };
}

function average(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function sessionCategory(details: Record<string, unknown> | undefined): ParagraphSession["category"] {
  if (isParagraphCategory(details?.category)) return details.category;
  return details?.category === "mixed" ? "mixed" : "unknown";
}

function categoryLabel(category: ParagraphSession["category"]): string {
  if (category === "mixed") return "Karma Test";
  if (category === "unknown") return "Kategori bilgisi yok";
  return PARAGRAPH_CATEGORY_LABELS[category];
}

function sessionFromResult(result: ParagraphAnalysisResult): ParagraphSession | null {
  const answers = readAnswers(result.details);
  const summary = answers.length > 0
    ? {
        answered: answers.length,
        correct: answers.filter((answer) => answer.correct).length,
        incorrect: answers.filter((answer) => !answer.correct).length,
      }
    : safeSummary(result);
  if (!summary) return null;

  const validTimes = answers.flatMap((answer) => answer.responseTimeMs === null ? [] : [answer.responseTimeMs]);
  const category = sessionCategory(result.details);
  return {
    id: result.id,
    date: result.date,
    source: answers.length > 0 ? "answers" : "summary",
    category,
    categoryLabel: categoryLabel(category),
    answered: summary.answered,
    answeredQuestions: summary.answered,
    correct: summary.correct,
    incorrect: summary.incorrect,
    wrong: summary.incorrect,
    accuracy: Math.round((summary.correct / summary.answered) * 100),
    validResponseTimeCount: validTimes.length,
    averageResponseTimeMs: average(validTimes),
  };
}

function questionMetadataMap(metadata: ParagraphQuestionMetadata[]): Map<string, ParagraphCategory> {
  return new Map(metadata.flatMap((question) => {
    const id = typeof question.id === "string" ? question.id.trim() : "";
    return id && isParagraphCategory(question.category) ? [[id, question.category]] : [];
  }));
}

function resolveCategory(
  answer: ParsedAnswer,
  liveMetadata: Map<string, ParagraphCategory>,
): ParagraphCategory | null {
  return answer.category
    ?? liveMetadata.get(answer.questionId)
    ?? STATIC_QUESTION_METADATA.get(answer.questionId)
    ?? null;
}

function compareDates(left: ParagraphSession, right: ParagraphSession): number {
  const leftTime = Date.parse(left.date);
  const rightTime = Date.parse(right.date);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return left.date.localeCompare(right.date) || left.id.localeCompare(right.id);
}

export function buildParagraphAnalysis(
  results: ParagraphAnalysisResult[],
  questionMetadata: ParagraphQuestionMetadata[] = [],
): ParagraphAnalysis {
  const paragraphResults = results.filter((result) => result.exerciseType === "paragraph");
  const sessions = paragraphResults
    .flatMap((result) => {
      try {
        const session = sessionFromResult(result);
        return session ? [session] : [];
      } catch {
        return [];
      }
    })
    .sort(compareDates);

  const liveMetadata = questionMetadataMap(questionMetadata);
  const categoryAnswers = new Map<ParagraphCategory, ParsedAnswer[]>(
    CATEGORY_ORDER.map((category) => [category, []]),
  );
  const allAnswerTimes: number[] = [];
  for (const result of paragraphResults) {
    for (const answer of readAnswers(result.details)) {
      if (answer.responseTimeMs !== null) allAnswerTimes.push(answer.responseTimeMs);
      const category = resolveCategory(answer, liveMetadata);
      if (category) categoryAnswers.get(category)?.push(answer);
    }
  }

  const categories = CATEGORY_ORDER.map((category): ParagraphCategoryStats => {
    const answers = categoryAnswers.get(category) ?? [];
    const correct = answers.filter((answer) => answer.correct).length;
    const times = answers.flatMap((answer) => answer.responseTimeMs === null ? [] : [answer.responseTimeMs]);
    const answered = answers.length;
    const incorrect = answered - correct;
    return {
      category,
      label: PARAGRAPH_CATEGORY_LABELS[category],
      answered,
      answeredQuestions: answered,
      correct,
      incorrect,
      wrong: incorrect,
      accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null,
      validResponseTimeCount: times.length,
      averageResponseTimeMs: average(times),
      hasEnoughData: answered >= PARAGRAPH_ANALYSIS_MIN_SAMPLE,
    };
  });

  const totals = sessions.reduce(
    (summary, session) => ({
      answered: summary.answered + session.answered,
      correct: summary.correct + session.correct,
      incorrect: summary.incorrect + session.incorrect,
    }),
    { answered: 0, correct: 0, incorrect: 0 },
  );

  const eligible = categories.filter((category) => category.hasEnoughData);
  const strongestCategory = eligible.length >= 2
    ? [...eligible].sort((left, right) =>
        (right.accuracy ?? -1) - (left.accuracy ?? -1)
        || CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category))[0]
    : null;
  const needsImprovementCategory = eligible.length >= 2
    ? [...eligible].filter((category) => category.category !== strongestCategory?.category).sort((left, right) =>
        (left.accuracy ?? 101) - (right.accuracy ?? 101)
        || CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category))[0]
    : null;

  const latestSix = sessions.slice(-PARAGRAPH_ANALYSIS_MIN_TREND_SESSIONS);
  const previousAverage = latestSix.length === PARAGRAPH_ANALYSIS_MIN_TREND_SESSIONS
    ? average(latestSix.slice(0, 3).map((session) => session.accuracy))
    : null;
  const latestAverage = latestSix.length === PARAGRAPH_ANALYSIS_MIN_TREND_SESSIONS
    ? average(latestSix.slice(3).map((session) => session.accuracy))
    : null;
  const difference = previousAverage !== null && latestAverage !== null
    ? latestAverage - previousAverage
    : null;
  const status = difference === null
    ? "insufficient"
    : difference >= 5
      ? "improving"
      : difference <= -5
        ? "needs_attention"
        : "stable";

  const completedSessionCount = sessions.length;
  return {
    sessions,
    categories,
    overall: {
      totalAnswered: totals.answered,
      answeredQuestions: totals.answered,
      correctCount: totals.correct,
      correct: totals.correct,
      incorrectCount: totals.incorrect,
      wrong: totals.incorrect,
      accuracy: totals.answered > 0 ? Math.round((totals.correct / totals.answered) * 100) : null,
      validResponseTimeCount: allAnswerTimes.length,
      averageResponseTimeMs: average(allAnswerTimes),
      completedSessionCount,
      completedSessions: completedSessionCount,
    },
    strongestCategory,
    needsImprovementCategory,
    trend: {
      status,
      latestAverage,
      recentAverage: latestAverage,
      previousAverage,
      difference,
    },
    comment: strongestCategory && needsImprovementCategory
      ? `Öğrenci ${strongestCategory.label.toLocaleLowerCase("tr-TR")} sorularında güçlü, ${needsImprovementCategory.label.toLocaleLowerCase("tr-TR")} sorularında ise daha fazla çalışmaya ihtiyaç duyuyor.`
      : "Henüz ayrıntılı değerlendirme için yeterli paragraf çalışması bulunmuyor.",
  };
}

export function getParagraphQuestionCategory(
  questionId: string,
  category?: ParagraphCategory,
  questionMetadata: ParagraphQuestionMetadata[] = [],
): ParagraphCategory | null {
  if (isParagraphCategory(category)) return category;
  const normalizedId = questionId.trim();
  return questionMetadataMap(questionMetadata).get(normalizedId)
    ?? STATIC_QUESTION_METADATA.get(normalizedId)
    ?? null;
}
