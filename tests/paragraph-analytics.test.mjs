import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateParagraphAnalytics,
  getCalibration,
  getEmpiricalPerformance,
  getSampleStatus,
} from "../src/lib/paragraph-exercises/paragraphAnalytics.ts";

const metadata = [
  { id: "q-hard", category: "main_idea", difficulty: "hard", gradeBand: "8", question: "Zor soru", source: "migration" },
  { id: "q-easy", category: "flow", difficulty: "easy", gradeBand: "4-5", question: "Kolay soru", source: "manual" },
  { id: "q-zero", category: "completion", difficulty: "medium", gradeBand: "high-school", question: "Henüz çözülmedi", source: "ai" },
];

const answers = (questionId, count, correctCount, responseTimeMs = 1_000, extra = {}) => Array.from({ length: count }, (_, index) => ({
  questionId,
  correct: index < correctCount,
  responseTimeMs: index === count - 1 ? extra.responseTimeMs ?? responseTimeMs : responseTimeMs,
  ...(extra.category ? { category: extra.category } : {}),
}));

test("sample status and empirical performance thresholds are stable", () => {
  assert.equal(getSampleStatus(0), "insufficient");
  assert.equal(getSampleStatus(4), "insufficient");
  assert.equal(getSampleStatus(5), "preliminary");
  assert.equal(getSampleStatus(9), "preliminary");
  assert.equal(getSampleStatus(10), "analyzable");
  assert.equal(getEmpiricalPerformance(9, 100), "insufficient");
  assert.equal(getEmpiricalPerformance(10, 80), "easy");
  assert.equal(getEmpiricalPerformance(10, 79.9), "medium");
  assert.equal(getEmpiricalPerformance(10, 60), "medium");
  assert.equal(getEmpiricalPerformance(10, 59.9), "hard");
});

test("calibration flags only describe sufficiently sampled stored labels", () => {
  assert.equal(getCalibration(9, "hard", 90).calibrationStatus, "insufficient");
  assert.equal(getCalibration(10, "hard", 80).calibrationLabel, "Beklenenden kolay olabilir");
  assert.equal(getCalibration(10, "easy", 59.9).calibrationLabel, "Beklenenden zor olabilir");
  assert.equal(getCalibration(10, "medium", 85).calibrationLabel, "Beklenenden kolay olabilir");
  assert.equal(getCalibration(10, "medium", 49.9).calibrationLabel, "Beklenenden zor olabilir");
  assert.equal(getCalibration(10, "medium", 70).calibrationLabel, "Beklentiyle uyumlu");
});

test("malformed details are skipped and legacy category falls back to question metadata", () => {
  const result = aggregateParagraphAnalytics(metadata, [
    { studentId: "student-a", details: { answers: [...answers("q-hard", 10, 8, 2_000), { questionId: "q-legacy", correct: true, responseTimeMs: 1_500 }] } },
    { studentId: "student-b", details: { answers: [{ questionId: "q-easy", correct: true, responseTimeMs: 2_000, category: "flow" }, { questionId: "", correct: true, responseTimeMs: 2_000 }] } },
    { studentId: "student-c", details: null },
  ], [
    { id: "q-legacy", category: "supporting_idea", difficulty: "medium", gradeBand: "6-7", question: "Eski soru", source: "legacy-static" },
  ]);

  assert.equal(result.kpis.totalAnswers, 12);
  assert.equal(result.kpis.overallAccuracyRate, 83.3);
  assert.equal(result.kpis.averageResponseTimeMs, 1_958);
  assert.equal(result.kpis.activeStudentCount, 3);
  assert.equal(result.diagnostics.malformedAnswerCount, 1);
  assert.equal(result.diagnostics.malformedSessionCount, 1);
  assert.equal(result.diagnostics.legacyAnswerCount, 11);
  assert.equal(result.diagnostics.categorySnapshotCount, 1);
  assert.equal(result.questions.find((row) => row.questionId === "q-legacy")?.category, "supporting_idea");
});

test("invalid response times do not affect averages but remain diagnostics", () => {
  const result = aggregateParagraphAnalytics(metadata, [{
    studentId: "student-a",
    details: { answers: [
      { questionId: "q-easy", correct: true, responseTimeMs: 999 },
      { questionId: "q-easy", correct: true, responseTimeMs: 1_000 },
      { questionId: "q-easy", correct: false, responseTimeMs: 600_001 },
      { questionId: "q-easy", correct: true, responseTimeMs: "1000" },
    ] },
  }]);
  const row = result.questions.find((item) => item.questionId === "q-easy");
  assert.equal(row?.attemptCount, 4);
  assert.equal(row?.correctCount, 3);
  assert.equal(row?.averageResponseTimeMs, 1_000);
  assert.equal(row?.validResponseTimeCount, 1);
  assert.equal(result.diagnostics.invalidResponseTimeCount, 3);
});
test("analytics time bounds include exact maximum and exclude maximum plus one", () => {
  const result = aggregateParagraphAnalytics(metadata, [{ details: { answers: [
    { questionId: "q-easy", correct: true, responseTimeMs: 600_000 },
    { questionId: "q-easy", correct: true, responseTimeMs: 600_001 },
  ] } }]);
  const row = result.questions.find((item) => item.questionId === "q-easy");
  assert.equal(row?.validResponseTimeCount, 1);
  assert.equal(row?.averageResponseTimeMs, 600_000);
  assert.equal(result.diagnostics.invalidResponseTimeCount, 1);
});
test("zero-attempt questions remain visible and groups use observed questions only", () => {
  const result = aggregateParagraphAnalytics(metadata, [{ studentId: "student-a", details: { answers: answers("q-easy", 5, 4, 500, { category: "flow" }) } }]);
  const zero = result.questions.find((row) => row.questionId === "q-zero");
  assert.equal(zero?.attemptCount, 0);
  assert.equal(zero?.accuracyRate, null);
  assert.equal(zero?.averageResponseTimeMs, null);
  assert.equal(zero?.empiricalPerformance, "insufficient");
  assert.equal(result.categories.find((row) => row.key === "flow")?.uniqueQuestionCount, 1);
  assert.equal(result.grades.find((row) => row.key === "4-5")?.attemptCount, 5);
  assert.equal(result.difficulties.find((row) => row.key === "easy")?.accuracyRate, 80);
  assert.doesNotMatch(JSON.stringify(result), /student-a|student-b|@/u);
});
test("unknown question IDs remain measurable without invented metadata", () => {
  const result = aggregateParagraphAnalytics(metadata, [{ details: { answers: [
    { questionId: "retired-question", correct: true, responseTimeMs: 1_000 },
    { questionId: "retired-question", correct: false, responseTimeMs: 2_000 },
  ] } }]);
  const row = result.questions.find((item) => item.questionId === "retired-question");
  assert.equal(row?.attemptCount, 2);
  assert.equal(row?.correctCount, 1);
  assert.equal(row?.accuracyRate, 50);
  assert.equal(row?.gradeBand, "unknown");
  assert.equal(row?.category, "unknown");
  assert.equal(row?.storedDifficulty, "unknown");
});
test("valid answer category takes precedence and session category does not invent unknown metadata", () => {
  const result = aggregateParagraphAnalytics(metadata, [
    { details: { category: "flow", answers: [{ questionId: "q-hard", category: "inference", correct: true, responseTimeMs: 1_000 }] } },
    { details: { category: "flow", answers: [{ questionId: "retired", correct: true, responseTimeMs: 1_000 }] } },
  ]);
  assert.equal(result.questions.find((row) => row.questionId === "q-hard")?.category, "inference");
  assert.equal(result.questions.find((row) => row.questionId === "retired")?.category, "unknown");
});