import { ASSIGNMENT_EXERCISE_CATALOG, type AssignmentExerciseCategory } from "@/lib/assignments/exerciseCatalog";
import { CATEGORY_EXERCISE_SLUGS } from "@/components/exercises-preview/exercisePreviewGroups";

export type RecommendationTrend = "improving" | "stable" | "declining" | "insufficient_data";
export type RecommendationPriority = "high" | "medium" | "low";
export type RecommendationReasonCode = "low_performance" | "declining" | "needs_practice" | "balanced_practice" | "insufficient_data";

export type RecommendationResultInput = {
  id?: string;
  exerciseType: string;
  successRate?: number | null;
  completedAt?: string | null;
  date?: string | null;
};

export type StudentSkillAnalysis = {
  categoryId: AssignmentExerciseCategory;
  categoryTitle: string;
  sampleCount: number;
  averageSuccessRate: number | null;
  recentAverageSuccessRate: number | null;
  previousAverageSuccessRate: number | null;
  trend: RecommendationTrend;
  score: number | null;
  lastPracticedAt: string | null;
  recommendedPriority: RecommendationPriority;
};

export type StudentExerciseRecommendation = {
  exerciseSlug: string;
  exerciseTitle: string;
  categoryId: AssignmentExerciseCategory;
  categoryTitle: string;
  reasonCode: RecommendationReasonCode;
  reasonText: string;
  priorityScore: number;
};

export type RecommendationArea = {
  categoryId: string;
  categoryTitle: string;
  score: number;
};

export type ImprovingRecommendationArea = RecommendationArea & {
  trendDelta: number;
};

export type StudentCoachTone = "encouraging" | "progress" | "focus" | "balanced" | "getting_started";

export type StudentCoachMessage = {
  title: string;
  message: string;
  tone: StudentCoachTone;
  highlightedCategory?: string;
  recommendedExerciseSlug?: string;
};

export type RecommendationSummary = {
  strengths: RecommendationArea[];
  developmentAreas: RecommendationArea[];
  improvingAreas: ImprovingRecommendationArea[];
  strongestArea: RecommendationArea | null;
  coachSummary: string | null;
  coachMessage: StudentCoachMessage;
  trends: Array<{ categoryId: string; categoryTitle: string; trend: RecommendationTrend; trendDelta: number | null }>;
  recommendedExercises: Array<{ slug: string; categoryId: string }>;
};

export const RECOMMENDATION_CONFIG = {
  windowDays: 14,
  maxMeaningfulResults: 10,
  minimumSampleCount: 3,
  trendWindowSize: 5,
  trendThreshold: 5,
  staleAfterDays: 7,
  maximumRecommendations: 3,
  strongAreaThreshold: 80,
  developmentAreaThreshold: 70,
} as const;

export const RECOMMENDATION_REASON_WEIGHT: Readonly<Record<RecommendationReasonCode, number>> = {
  declining: 5,
  low_performance: 4,
  needs_practice: 3,
  balanced_practice: 2,
  insufficient_data: 1,
};

const AKIL_VE_ZEKA_OYUNLARI_GROUP_ID = "word-games";

/** Recommendation disallow-list derives from the student catalog group. */
export const AKIL_VE_ZEKA_OYUNLARI_EXERCISE_SLUGS = Object.freeze([
  ...(CATEGORY_EXERCISE_SLUGS[AKIL_VE_ZEKA_OYUNLARI_GROUP_ID] ?? []),
]);

const AKIL_VE_ZEKA_OYUNLARI_SLUG_SET = new Set(AKIL_VE_ZEKA_OYUNLARI_EXERCISE_SLUGS);
const AKIL_VE_ZEKA_OYUNLARI_RESULT_TYPES = new Set(
  ASSIGNMENT_EXERCISE_CATALOG
    .filter((exercise) => AKIL_VE_ZEKA_OYUNLARI_SLUG_SET.has(exercise.slug))
    .map((exercise) => exercise.resultExerciseType),
);

const CATEGORY_TITLES: Record<AssignmentExerciseCategory, string> = {
  speed: "Okuma Hızı",
  attention: "Dikkat",
  eye: "Göz Egzersizleri",
  memory: "Hafıza",
  comprehension: "Anlama",
};

// Yalnız successRate'ı güvenilir ve 0-100 aralığında olan sonuçlar v1 skoruna girer.
// Katalogda olup sonuç kaydetmeyen oyunlar burada yer almadığında doğal olarak dışarıda kalır.
export const EXERCISE_ANALYSIS_MAP: Readonly<Record<string, {
  categoryId: AssignmentExerciseCategory;
  usableMetric: "successRate";
  recommendationEligible: boolean;
}>> = Object.fromEntries(
  ASSIGNMENT_EXERCISE_CATALOG
    .filter((item) => item.resultExerciseType !== "reading-speed-test")
    .map((item) => [item.resultExerciseType, {
      categoryId: item.category,
      usableMetric: "successRate" as const,
      recommendationEligible: !AKIL_VE_ZEKA_OYUNLARI_RESULT_TYPES.has(item.resultExerciseType),
    }]),
);

function finitePercentage(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

function timestamp(value: string | null | undefined): number {
  const parsed = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function priorityFor(score: number | null, trend: RecommendationTrend, lastPracticedAt: string | null, now: number): number {
  if (score === null) return 0;
  const daysSincePractice = lastPracticedAt ? Math.max(0, (now - timestamp(lastPracticedAt)) / 86_400_000) : RECOMMENDATION_CONFIG.staleAfterDays;
  const staleBoost = Math.min(12, Math.max(0, daysSincePractice - 2) * 1.5);
  const trendBoost = trend === "declining" ? 15 : trend === "improving" ? -5 : 0;
  return round((100 - score) + trendBoost + staleBoost);
}

function priorityLabel(score: number | null, trend: RecommendationTrend, priorityScore: number): RecommendationPriority {
  if (score === null || trend === "insufficient_data") return "low";
  return priorityScore >= 65 ? "high" : priorityScore >= 35 ? "medium" : "low";
}

function reasonFor(analysis: StudentSkillAnalysis, now: number): { code: RecommendationReasonCode; text: string } {
  if (analysis.trend === "insufficient_data") {
    return { code: "insufficient_data", text: "Bu alanda seni daha iyi tanıyabilmem için birkaç çalışma daha yapabilirsin." };
  }
  if (analysis.trend === "declining") {
    return { code: "declining", text: "Bu alandaki son sonuçların önceki sonuçlarına göre düşüş gösteriyor." };
  }
  if ((analysis.score ?? 100) < 70) {
    return { code: "low_performance", text: `Son çalışmalarında bu alandaki ortalama başarın %${Math.round(analysis.score ?? 0)}.` };
  }
  const days = analysis.lastPracticedAt ? Math.floor((now - timestamp(analysis.lastPracticedAt)) / 86_400_000) : 0;
  if (days >= RECOMMENDATION_CONFIG.staleAfterDays) {
    return { code: "needs_practice", text: `Bu alanı ${days} gündür çalışmadığın için tekrar öneriyorum.` };
  }
  return { code: "balanced_practice", text: "Gelişimini dengeli biçimde sürdürmek için bu çalışmayı önerebilirim." };
}

export function getRecommendationRankingScore(recommendation: Pick<StudentExerciseRecommendation, "reasonCode" | "priorityScore">): number {
  return RECOMMENDATION_REASON_WEIGHT[recommendation.reasonCode] * 1_000 + recommendation.priorityScore;
}

function areaFromAnalysis(item: StudentSkillAnalysis): RecommendationArea {
  return { categoryId: item.categoryId, categoryTitle: item.categoryTitle, score: item.score! };
}

export function buildStudentCoachSummary(strongestArea: RecommendationArea | null, developmentAreas: RecommendationArea[]): string | null {
  const developmentArea = developmentAreas[0];
  if (!strongestArea || !developmentArea) return null;
  return `${strongestArea.categoryTitle} alanındaki güçlü performansını korurken, ${developmentArea.categoryTitle} çalışmalarına biraz daha ağırlık verebilirsin.`;
}

type StudentCoachMessageInput = {
  strengths: RecommendationArea[];
  developmentAreas: RecommendationArea[];
  improvingAreas: ImprovingRecommendationArea[];
  strongestArea: RecommendationArea | null;
  trends: Array<{ categoryId: string; categoryTitle: string; trend: RecommendationTrend; trendDelta: number | null }>;
  recommendations: Array<Pick<StudentExerciseRecommendation, "exerciseSlug" | "exerciseTitle" | "categoryId">>;
};

function stableRecommendationFor(
  recommendations: StudentCoachMessageInput["recommendations"],
  categoryId?: string,
): StudentCoachMessageInput["recommendations"][number] | null {
  return recommendations.find((item) => (!categoryId || item.categoryId === categoryId) && !AKIL_VE_ZEKA_OYUNLARI_SLUG_SET.has(item.exerciseSlug)) ?? null;
}

export function buildStudentCoachMessage(input: StudentCoachMessageInput): StudentCoachMessage {
  const recommendations = input.recommendations.filter((item) => !AKIL_VE_ZEKA_OYUNLARI_SLUG_SET.has(item.exerciseSlug));
  const improving = input.improvingAreas[0];
  const declining = input.trends.find((item) => item.trend === "declining");
  const development = input.developmentAreas[0];
  const strong = input.strengths[0] ?? null;
  const recommendation = stableRecommendationFor(recommendations, improving?.categoryId ?? declining?.categoryId ?? development?.categoryId ?? strong?.categoryId);
  const fallbackRecommendation = recommendation ?? stableRecommendationFor(recommendations);
  const title = "🧠 Akıllı Koç";

  if (improving) {
    const sameAsStrong = strong?.categoryId === improving.categoryId;
    return {
      title,
      tone: "progress",
      message: sameAsStrong
        ? `${improving.categoryTitle} alanında güçlü sonuçlar alıyor ve gelişmeye devam ediyorsun. Bugün ${fallbackRecommendation?.exerciseTitle ?? "kısa bir tekrar"} ile bu güzel ilerlemeyi sürdürebilirsin.`
        : `${improving.categoryTitle} alanında son çalışmalarında +${Math.round(improving.trendDelta)} puanlık güzel bir yükseliş var. Bugün ${fallbackRecommendation?.exerciseTitle ?? "kısa bir tekrar"} ile bu gelişimi sürdürebilirsin.`,
      highlightedCategory: improving.categoryTitle,
      ...(fallbackRecommendation ? { recommendedExerciseSlug: fallbackRecommendation.exerciseSlug } : {}),
    };
  }

  if (declining) {
    return {
      title,
      tone: "focus",
      message: `${declining.categoryTitle} alanındaki son sonuçların biraz dalgalanmış. Bugün ${fallbackRecommendation?.exerciseTitle ?? "kısa ve sakin bir tekrar"} iyi bir seçim olabilir.`,
      highlightedCategory: declining.categoryTitle,
      ...(fallbackRecommendation ? { recommendedExerciseSlug: fallbackRecommendation.exerciseSlug } : {}),
    };
  }

  if (strong && development) {
    const developmentRecommendation = stableRecommendationFor(recommendations, development.categoryId) ?? fallbackRecommendation;
    return {
      title,
      tone: "balanced",
      message: `${strong.categoryTitle} alanındaki güçlü performansını korurken, ${development.categoryTitle} çalışmalarına biraz daha ağırlık verebilirsin. Bugün ${developmentRecommendation?.exerciseTitle ?? "kısa bir tekrar"} iyi bir seçim olabilir.`,
      highlightedCategory: development.categoryTitle,
      ...(developmentRecommendation ? { recommendedExerciseSlug: developmentRecommendation.exerciseSlug } : {}),
    };
  }

  if (development) {
    return {
      title,
      tone: "focus",
      message: `${development.categoryTitle} çalışmalarına bugün biraz daha ağırlık vermek gelişimini destekleyebilir. ${fallbackRecommendation?.exerciseTitle ?? "Kısa bir tekrar"} ile düzenli pratik yapabilirsin.`,
      highlightedCategory: development.categoryTitle,
      ...(fallbackRecommendation ? { recommendedExerciseSlug: fallbackRecommendation.exerciseSlug } : {}),
    };
  }

  if (strong) {
    return {
      title,
      tone: "encouraging",
      message: `${strong.categoryTitle} alanında güçlü ve istikrarlı sonuçlar alıyorsun. Bu başarını korurken bugün ${fallbackRecommendation?.exerciseTitle ?? "dengeli bir tekrar"} ile çalışabilirsin.`,
      highlightedCategory: strong.categoryTitle,
      ...(fallbackRecommendation ? { recommendedExerciseSlug: fallbackRecommendation.exerciseSlug } : {}),
    };
  }

  return {
    title,
    tone: "getting_started",
    message: "Seni daha iyi tanımam için birkaç çalışma daha tamamlaman yeterli. Sonuçlarına göre sana daha kişisel öneriler sunacağım.",
  };
}

export function analyzeStudentSkills(input: RecommendationResultInput[], now = new Date()): StudentSkillAnalysis[] {
  const meaningful = input
    .map((result) => ({ ...result, score: finitePercentage(result.successRate), at: result.completedAt ?? result.date ?? null }))
    .filter((result) => result.score !== null && EXERCISE_ANALYSIS_MAP[result.exerciseType]?.recommendationEligible)
    .sort((left, right) => timestamp(right.at) - timestamp(left.at))
    .slice(0, RECOMMENDATION_CONFIG.maxMeaningfulResults);
  const byCategory = new Map<AssignmentExerciseCategory, typeof meaningful>();
  for (const result of meaningful) {
    const category = EXERCISE_ANALYSIS_MAP[result.exerciseType].categoryId;
    const current = byCategory.get(category) ?? [];
    current.push(result);
    byCategory.set(category, current);
  }

  return [...byCategory.entries()].map(([categoryId, results]) => {
    const sampleCount = results.length;
    const scores = results.map((result) => result.score as number);
    const average = scores.reduce((sum, score) => sum + score, 0) / sampleCount;
    const recent = scores.slice(0, RECOMMENDATION_CONFIG.trendWindowSize);
    const previous = scores.slice(RECOMMENDATION_CONFIG.trendWindowSize, RECOMMENDATION_CONFIG.trendWindowSize * 2);
    const recentAverage = recent.reduce((sum, score) => sum + score, 0) / recent.length;
    const previousAverage = previous.length ? previous.reduce((sum, score) => sum + score, 0) / previous.length : null;
    const difference = previousAverage === null ? null : recentAverage - previousAverage;
    const trend: RecommendationTrend = sampleCount < RECOMMENDATION_CONFIG.minimumSampleCount || previous.length < 2
      ? (sampleCount < RECOMMENDATION_CONFIG.minimumSampleCount ? "insufficient_data" : "stable")
      : difference! >= RECOMMENDATION_CONFIG.trendThreshold ? "improving"
        : difference! <= -RECOMMENDATION_CONFIG.trendThreshold ? "declining" : "stable";
    const lastPracticedAt = results.map((result) => result.at).find((at): at is string => Boolean(at)) ?? null;
    const score = round(average);
    const priorityScore = priorityFor(score, trend, lastPracticedAt, now.getTime());
    return {
      categoryId,
      categoryTitle: CATEGORY_TITLES[categoryId],
      sampleCount,
      averageSuccessRate: score,
      recentAverageSuccessRate: round(recentAverage),
      previousAverageSuccessRate: previousAverage === null ? null : round(previousAverage),
      trend,
      score,
      lastPracticedAt,
      recommendedPriority: priorityLabel(score, trend, priorityScore),
    } satisfies StudentSkillAnalysis;
  }).sort((left, right) => priorityFor(right.score, right.trend, right.lastPracticedAt, now.getTime()) - priorityFor(left.score, left.trend, left.lastPracticedAt, now.getTime()));
}

export function getStudentExerciseRecommendations(input: RecommendationResultInput[], now = new Date()): {
  analysis: StudentSkillAnalysis[];
  recommendations: StudentExerciseRecommendation[];
  summary: RecommendationSummary;
} {
  const analysis = analyzeStudentSkills(input, now);
  const sufficient = analysis.filter((item) => item.sampleCount >= RECOMMENDATION_CONFIG.minimumSampleCount && item.score !== null);
  const candidates: StudentExerciseRecommendation[] = [];
  const recentTypes = new Set(input.slice(0, 3).map((result) => result.exerciseType));
  for (const item of analysis) {
    const reason = reasonFor(item, now.getTime());
    const priorityScore = priorityFor(item.score, item.trend, item.lastPracticedAt, now.getTime());
    const exercises = ASSIGNMENT_EXERCISE_CATALOG.filter((exercise) => exercise.category === item.categoryId && exercise.assignmentEnabled && exercise.isStudentCatalogVisible !== false && !AKIL_VE_ZEKA_OYUNLARI_SLUG_SET.has(exercise.slug));
    const chosen = exercises.find((exercise) => !recentTypes.has(exercise.resultExerciseType)) ?? exercises[0];
    if (chosen) candidates.push({ exerciseSlug: chosen.slug, exerciseTitle: chosen.title, categoryId: item.categoryId, categoryTitle: item.categoryTitle, reasonCode: reason.code, reasonText: reason.text, priorityScore });
  }
  const recommendations = (sufficient.length === 0 ? [] : candidates)
    .sort((left, right) => getRecommendationRankingScore(right) - getRecommendationRankingScore(left))
    .filter((item, index, list) => index === list.findIndex((other) => other.categoryId === item.categoryId))
    .slice(0, RECOMMENDATION_CONFIG.maximumRecommendations);
  const strongAreas = sufficient
    .filter((item) => (item.score ?? 0) >= RECOMMENDATION_CONFIG.strongAreaThreshold)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0) || left.categoryId.localeCompare(right.categoryId))
    .slice(0, 2)
    .map(areaFromAnalysis);
  const developmentAreas = sufficient
    .filter((item) => (item.score ?? 100) < RECOMMENDATION_CONFIG.developmentAreaThreshold)
    .sort((left, right) => (left.score ?? 100) - (right.score ?? 100) || left.categoryId.localeCompare(right.categoryId))
    .slice(0, 2)
    .map(areaFromAnalysis);
  const strongestArea = sufficient
    .slice()
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0) || left.categoryId.localeCompare(right.categoryId))[0];
  const improvingAreas = analysis
    .filter((item) => item.trend === "improving" && item.previousAverageSuccessRate !== null && item.recentAverageSuccessRate !== null)
    .map((item) => ({ ...areaFromAnalysis(item), trendDelta: round(item.recentAverageSuccessRate! - item.previousAverageSuccessRate!) }))
    .sort((left, right) => right.trendDelta - left.trendDelta || left.categoryId.localeCompare(right.categoryId))
    .slice(0, 2);
  const strongest = strongestArea ? areaFromAnalysis(strongestArea) : null;
  const summary = {
    strengths: strongAreas,
    developmentAreas,
    improvingAreas,
    strongestArea: strongest,
    coachSummary: buildStudentCoachSummary(strongest, developmentAreas),
    trends: analysis.map((item) => ({ categoryId: item.categoryId, categoryTitle: item.categoryTitle, trend: item.trend, trendDelta: item.previousAverageSuccessRate === null || item.recentAverageSuccessRate === null ? null : round(item.recentAverageSuccessRate - item.previousAverageSuccessRate) })),
    recommendedExercises: recommendations.map((item) => ({ slug: item.exerciseSlug, categoryId: item.categoryId })),
    coachMessage: buildStudentCoachMessage({
      strengths: strongAreas,
      developmentAreas,
      improvingAreas,
      strongestArea: strongest,
      trends: analysis.map((item) => ({ categoryId: item.categoryId, categoryTitle: item.categoryTitle, trend: item.trend, trendDelta: item.previousAverageSuccessRate === null || item.recentAverageSuccessRate === null ? null : round(item.recentAverageSuccessRate - item.previousAverageSuccessRate) })),
      recommendations,
    }),
  } satisfies RecommendationSummary;
  return { analysis, recommendations, summary };
}
