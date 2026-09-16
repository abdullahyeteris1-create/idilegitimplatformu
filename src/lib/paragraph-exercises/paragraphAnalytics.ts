export const PARAGRAPH_CATEGORIES = [
  "main_idea",
  "supporting_idea",
  "inference",
  "completion",
  "flow",
] as const;

export const PARAGRAPH_GRADE_BANDS = ["4-5", "6-7", "8", "high-school"] as const;
export const PARAGRAPH_DIFFICULTIES = ["easy", "medium", "hard"] as const;
// The exercise records per-question elapsed time from performance.now(). There
// is no client-side cap, so an abandoned tab can produce very large values.
// Analytics keeps only plausible V1 observations (1 second to 10 minutes).
export const MIN_RESPONSE_TIME_MS = 1_000;
export const MAX_RESPONSE_TIME_MS = 600_000;
export const MIN_SLOW_TIME_SAMPLE = 5;

export type ParagraphCategory = (typeof PARAGRAPH_CATEGORIES)[number];
export type ParagraphGradeBand = (typeof PARAGRAPH_GRADE_BANDS)[number];
export type ParagraphDifficulty = (typeof PARAGRAPH_DIFFICULTIES)[number];
export type SampleStatus = "insufficient" | "preliminary" | "analyzable";

export type ParagraphQuestionMetadata = {
  id: string;
  category: ParagraphCategory;
  difficulty: ParagraphDifficulty;
  gradeBand: ParagraphGradeBand;
  question: string;
  source: string;
};

export type ParagraphSessionInput = {
  studentId?: unknown;
  details?: unknown;
};

export type ParagraphQuestionAnalytics = {
  questionId: string;
  gradeBand: ParagraphGradeBand | "unknown";
  category: ParagraphCategory | "unknown";
  storedDifficulty: ParagraphDifficulty | "unknown";
  source: string;
  questionPreview: string;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracyRate: number | null;
  averageResponseTimeMs: number | null;
  validResponseTimeCount: number;
  sampleStatus: SampleStatus;
  empiricalPerformance: "easy" | "medium" | "hard" | "insufficient";
  calibrationStatus: "easy" | "hard" | "aligned" | "insufficient" | "unknown";
  calibrationLabel: string;
};

export type ParagraphGroupAnalytics = {
  key: string;
  label: string;
  attemptCount: number;
  correctCount: number;
  accuracyRate: number | null;
  averageResponseTimeMs: number | null;
  uniqueQuestionCount: number;
};

export type ParagraphAnalytics = {
  kpis: {
    totalAnswers: number;
    validAnswers: number;
    overallAccuracyRate: number | null;
    averageResponseTimeMs: number | null;
    analyzedQuestionCount: number;
    activeStudentCount: number;
    sessionCount: number;
  };
  diagnostics: {
    malformedAnswerCount: number;
    malformedSessionCount: number;
    legacyAnswerCount: number;
    invalidResponseTimeCount: number;
    categorySnapshotCount: number;
  };
  questions: ParagraphQuestionAnalytics[];
  categories: ParagraphGroupAnalytics[];
  grades: ParagraphGroupAnalytics[];
  difficulties: ParagraphGroupAnalytics[];
  hardestQuestions: ParagraphQuestionAnalytics[];
  tooEasyHardQuestions: ParagraphQuestionAnalytics[];
  slowQuestions: ParagraphQuestionAnalytics[];
};

type MutableQuestion = {
  metadata: ParagraphQuestionAnalytics;
  responseTimeTotal: number;
};

const CATEGORY_LABELS: Record<ParagraphCategory, string> = {
  main_idea: "Ana Fikir",
  supporting_idea: "Yardımcı Düşünce",
  inference: "Çıkarım",
  completion: "Paragraf Tamamlama",
  flow: "Akış Bozan Cümle",
};

const GRADE_LABELS: Record<ParagraphGradeBand, string> = {
  "4-5": "4-5",
  "6-7": "6-7",
  "8": "8",
  "high-school": "Lise",
};

const DIFFICULTY_LABELS: Record<ParagraphDifficulty, string> = {
  easy: "Kolay",
  medium: "Orta",
  hard: "Zor",
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const isCategory = (value: unknown): value is ParagraphCategory => (
  typeof value === "string" && (PARAGRAPH_CATEGORIES as readonly string[]).includes(value)
);



const normalizeString = (value: unknown): string | null => (
  typeof value === "string" && value.trim() ? value.trim() : null
);

const roundRate = (correctCount: number, attemptCount: number): number | null => (
  attemptCount > 0 ? Number(((correctCount / attemptCount) * 100).toFixed(1)) : null
);

const average = (total: number, count: number): number | null => (
  count > 0 ? Math.round(total / count) : null
);

export function getSampleStatus(attemptCount: number): SampleStatus {
  if (attemptCount >= 10) return "analyzable";
  if (attemptCount >= 5) return "preliminary";
  return "insufficient";
}

export function getEmpiricalPerformance(attemptCount: number, accuracyRate: number | null): ParagraphQuestionAnalytics["empiricalPerformance"] {
  if (attemptCount < 10 || accuracyRate === null) return "insufficient";
  if (accuracyRate >= 80) return "easy";
  if (accuracyRate >= 60) return "medium";
  return "hard";
}

export function getCalibration(
  attemptCount: number,
  storedDifficulty: ParagraphDifficulty | "unknown",
  accuracyRate: number | null,
): Pick<ParagraphQuestionAnalytics, "calibrationStatus" | "calibrationLabel"> {
  if (attemptCount < 10 || accuracyRate === null) {
    return { calibrationStatus: "insufficient", calibrationLabel: "Yetersiz veri" };
  }

  if (storedDifficulty === "hard" && accuracyRate >= 80) {
    return { calibrationStatus: "easy", calibrationLabel: "Beklenenden kolay olabilir" };
  }
  if (storedDifficulty === "easy" && accuracyRate < 60) {
    return { calibrationStatus: "hard", calibrationLabel: "Beklenenden zor olabilir" };
  }
  if (storedDifficulty === "medium" && accuracyRate >= 85) {
    return { calibrationStatus: "easy", calibrationLabel: "Beklenenden kolay olabilir" };
  }
  if (storedDifficulty === "medium" && accuracyRate < 50) {
    return { calibrationStatus: "hard", calibrationLabel: "Beklenenden zor olabilir" };
  }
  if (storedDifficulty === "unknown") {
    return { calibrationStatus: "unknown", calibrationLabel: "Etiket bulunamadı" };
  }
  return { calibrationStatus: "aligned", calibrationLabel: "Beklentiyle uyumlu" };
}

function makeMetadataRow(metadata: ParagraphQuestionMetadata): ParagraphQuestionAnalytics {
  const row = {
    questionId: metadata.id,
    gradeBand: metadata.gradeBand,
    category: metadata.category,
    storedDifficulty: metadata.difficulty,
    source: metadata.source,
    questionPreview: metadata.question.replace(/\s+/gu, " ").trim().slice(0, 140),
    attemptCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    accuracyRate: null,
    averageResponseTimeMs: null,
    validResponseTimeCount: 0,
    sampleStatus: "insufficient" as SampleStatus,
    empiricalPerformance: "insufficient" as ParagraphQuestionAnalytics["empiricalPerformance"],
    calibrationStatus: "insufficient" as ParagraphQuestionAnalytics["calibrationStatus"],
    calibrationLabel: "Yetersiz veri",
  };
  return row;
}

function makeUnknownRow(questionId: string, category?: ParagraphCategory): ParagraphQuestionAnalytics {
  const row = makeMetadataRow({
    id: questionId,
    category: category ?? "main_idea",
    difficulty: "easy",
    gradeBand: "4-5",
    question: "Soru kaydı bulunamadı",
    source: "legacy",
  });
  return {
    ...row,
    category: category ?? "unknown",
    gradeBand: "unknown",
    storedDifficulty: "unknown",
    source: "legacy",
    questionPreview: "Soru kaydı bulunamadı",
    calibrationStatus: "unknown",
    calibrationLabel: "Etiket bulunamadı",
  };
}

function buildGroupRows(
  rows: ParagraphQuestionAnalytics[],
  keys: readonly string[],
  labels: Record<string, string>,
  keySelector: (row: ParagraphQuestionAnalytics) => string,
): ParagraphGroupAnalytics[] {
  return keys.map((key) => {
    const matching = rows.filter((row) => keySelector(row) === key && row.attemptCount > 0);
    const timeSamples = matching.reduce((sum, row) => sum + (row.averageResponseTimeMs ?? 0) * row.validResponseTimeCount, 0);
    const timeCount = matching.reduce((sum, row) => sum + row.validResponseTimeCount, 0);
    return {
      key,
      label: labels[key] ?? key,
      attemptCount: matching.reduce((sum, row) => sum + row.attemptCount, 0),
      correctCount: matching.reduce((sum, row) => sum + row.correctCount, 0),
      accuracyRate: roundRate(
        matching.reduce((sum, row) => sum + row.correctCount, 0),
        matching.reduce((sum, row) => sum + row.attemptCount, 0),
      ),
      averageResponseTimeMs: average(timeSamples, timeCount),
      uniqueQuestionCount: matching.length,
    };
  });
}

export function aggregateParagraphAnalytics(
  questionMetadata: ParagraphQuestionMetadata[],
  sessions: ParagraphSessionInput[],
  staticMetadata: ParagraphQuestionMetadata[] = [],
): ParagraphAnalytics {
  const metadataById = new Map<string, ParagraphQuestionMetadata>();
  for (const metadata of staticMetadata) metadataById.set(metadata.id, metadata);
  for (const metadata of questionMetadata) metadataById.set(metadata.id, metadata);

  const mutableById = new Map<string, MutableQuestion>();
  for (const metadata of metadataById.values()) mutableById.set(metadata.id, { metadata: makeMetadataRow(metadata), responseTimeTotal: 0 });

  const studentIds = new Set<string>();
  let sessionCount = 0;
  let validAnswerCount = 0;
  let totalCorrectCount = 0;
  let totalResponseTime = 0;
  let responseTimeCount = 0;
  let malformedAnswerCount = 0;
  let malformedSessionCount = 0;
  let legacyAnswerCount = 0;
  let invalidResponseTimeCount = 0;
  let categorySnapshotCount = 0;
  const answeredQuestionIds = new Set<string>();

  for (const session of sessions) {
    sessionCount += 1;
    const studentId = normalizeString(session.studentId);
    if (studentId) studentIds.add(studentId);

    const details = isRecord(session.details) ? session.details : null;
    const rawAnswers = details?.answers;
    if (!Array.isArray(rawAnswers)) {
      malformedSessionCount += 1;
      continue;
    }

    for (const rawAnswer of rawAnswers) {
      if (!isRecord(rawAnswer)) {
        malformedAnswerCount += 1;
        continue;
      }
      const questionId = normalizeString(rawAnswer.questionId);
      const correct = rawAnswer.correct;
      if (!questionId || typeof correct !== "boolean") {
        malformedAnswerCount += 1;
        continue;
      }

      const snapshotCategory = isCategory(rawAnswer.category) ? rawAnswer.category : null;
      if (snapshotCategory) categorySnapshotCount += 1;
      if (!snapshotCategory) legacyAnswerCount += 1;

      let mutable = mutableById.get(questionId);
      if (!mutable) {
        mutable = { metadata: makeUnknownRow(questionId), responseTimeTotal: 0 };
        mutableById.set(questionId, mutable);
      }

      const row = mutable.metadata;
      if (snapshotCategory) row.category = snapshotCategory;
      row.attemptCount += 1;
      validAnswerCount += 1;
      answeredQuestionIds.add(questionId);
      if (correct) {
        row.correctCount += 1;
        totalCorrectCount += 1;
      } else {
        row.incorrectCount += 1;
      }

      const responseTime = rawAnswer.responseTimeMs;
      if (typeof responseTime === "number" && Number.isFinite(responseTime) && Number.isInteger(responseTime)
        && responseTime >= MIN_RESPONSE_TIME_MS && responseTime <= MAX_RESPONSE_TIME_MS) {
        row.validResponseTimeCount += 1;
        mutable.responseTimeTotal += responseTime;
        totalResponseTime += responseTime;
        responseTimeCount += 1;
      } else {
        invalidResponseTimeCount += 1;
      }
    }
  }

  const questions = [...mutableById.values()].map(({ metadata, responseTimeTotal }) => {
    metadata.accuracyRate = roundRate(metadata.correctCount, metadata.attemptCount);
    metadata.averageResponseTimeMs = average(responseTimeTotal, metadata.validResponseTimeCount);
    metadata.sampleStatus = getSampleStatus(metadata.attemptCount);
    metadata.empiricalPerformance = getEmpiricalPerformance(metadata.attemptCount, metadata.accuracyRate);
    Object.assign(metadata, getCalibration(metadata.attemptCount, metadata.storedDifficulty, metadata.accuracyRate));
    return metadata;
  });

  const categories = buildGroupRows(questions, PARAGRAPH_CATEGORIES, CATEGORY_LABELS, (row) => row.category);
  const grades = buildGroupRows(questions, PARAGRAPH_GRADE_BANDS, GRADE_LABELS, (row) => row.gradeBand);
  const difficulties = buildGroupRows(questions, PARAGRAPH_DIFFICULTIES, DIFFICULTY_LABELS, (row) => row.storedDifficulty);
  const byAccuracy = (left: ParagraphQuestionAnalytics, right: ParagraphQuestionAnalytics) => (
    (left.accuracyRate ?? 101) - (right.accuracyRate ?? 101)
      || right.attemptCount - left.attemptCount
      || left.questionId.localeCompare(right.questionId)
  );
  const hardestQuestions = questions.filter((row) => row.attemptCount >= 10).toSorted(byAccuracy).slice(0, 10);
  const tooEasyHardQuestions = questions
    .filter((row) => row.attemptCount >= 10 && row.storedDifficulty === "hard" && (row.accuracyRate ?? 0) >= 80)
    .toSorted(byAccuracy);
  const slowQuestions = questions
    .filter((row) => row.attemptCount >= 10 && row.validResponseTimeCount >= MIN_SLOW_TIME_SAMPLE)
    .toSorted((left, right) => (right.averageResponseTimeMs ?? 0) - (left.averageResponseTimeMs ?? 0) || left.questionId.localeCompare(right.questionId))
    .slice(0, 10);

  return {
    kpis: {
      totalAnswers: validAnswerCount,
      validAnswers: validAnswerCount,
      overallAccuracyRate: roundRate(totalCorrectCount, validAnswerCount),
      averageResponseTimeMs: average(totalResponseTime, responseTimeCount),
      analyzedQuestionCount: answeredQuestionIds.size,
      activeStudentCount: studentIds.size,
      sessionCount,
    },
    diagnostics: {
      malformedAnswerCount,
      malformedSessionCount,
      legacyAnswerCount,
      invalidResponseTimeCount,
      categorySnapshotCount,
    },
    questions: questions.toSorted((left, right) => left.questionId.localeCompare(right.questionId)),
    categories,
    grades,
    difficulties,
    hardestQuestions,
    tooEasyHardQuestions,
    slowQuestions,
  };
}

export const paragraphCategoryLabels = CATEGORY_LABELS;
export const paragraphGradeLabels = GRADE_LABELS;
export const paragraphDifficultyLabels = DIFFICULTY_LABELS;
