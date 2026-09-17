import test from "node:test";
import assert from "node:assert/strict";
import {
  buildParagraphAnalysis,
  getParagraphQuestionCategory,
  PARAGRAPH_ANALYSIS_MIN_SAMPLE,
} from "../src/lib/paragraph-exercises/paragraphAnalysis.ts";
import { paragraphQuestions } from "../src/lib/paragraph-exercises/paragraphQuestions.ts";

const questionByCategory = Object.fromEntries(
  ["main_idea", "supporting_idea", "inference", "completion", "flow"]
    .map((category) => [category, paragraphQuestions.find((question) => question.category === category)]),
);

function answer(category, correct = true, responseTimeMs = 2_000, extra = {}) {
  return {
    questionId: questionByCategory[category].id,
    category,
    correct,
    ...(responseTimeMs === undefined ? {} : { responseTimeMs }),
    ...extra,
  };
}

function result(id, day, answers, extra = {}) {
  const valid = Array.isArray(answers)
    ? answers.filter((item) => item && typeof item.correct === "boolean" && String(item.questionId ?? "").trim())
    : [];
  const correctCount = valid.filter((item) => item.correct).length;
  const wrongCount = valid.length - correctCount;
  return {
    id,
    date: `2026-09-${String(day).padStart(2, "0")}T10:00:00.000Z`,
    exerciseType: "paragraph",
    correctCount,
    wrongCount,
    successRate: valid.length ? Math.round(correctCount / valid.length * 100) : 0,
    details: Array.isArray(answers) ? { answers } : answers,
    ...extra,
  };
}

function accuracySession(id, day, correct, total = 20) {
  return result(id, day, Array.from({ length: total }, (_, index) => ({
    questionId: `unknown-${id}-${index}`,
    correct: index < correct,
    responseTimeMs: 2_000,
  })));
}

test("zero sessions returns null rates and no declarations", () => {
  const analysis = buildParagraphAnalysis([]);
  assert.equal(analysis.overall.completedSessionCount, 0);
  assert.equal(analysis.overall.accuracy, null);
  assert.equal(analysis.overall.averageResponseTimeMs, null);
  assert.equal(analysis.strongestCategory, null);
  assert.equal(analysis.needsImprovementCategory, null);
  assert.equal(analysis.trend.status, "insufficient");
});

test("one valid session derives canonical KPI and session fields", () => {
  const analysis = buildParagraphAnalysis([
    result("one", 1, [answer("main_idea", true, 1_000), answer("main_idea", false, 3_000)]),
  ]);
  assert.deepEqual(
    {
      totalAnswered: analysis.overall.totalAnswered,
      correctCount: analysis.overall.correctCount,
      incorrectCount: analysis.overall.incorrectCount,
      accuracy: analysis.overall.accuracy,
      validResponseTimeCount: analysis.overall.validResponseTimeCount,
      averageResponseTimeMs: analysis.overall.averageResponseTimeMs,
    },
    { totalAnswered: 2, correctCount: 1, incorrectCount: 1, accuracy: 50, validResponseTimeCount: 2, averageResponseTimeMs: 2_000 },
  );
  assert.equal(analysis.sessions[0].source, "answers");
});

test("answer validity is independent from response-time validity and selectedIndex", () => {
  const analysis = buildParagraphAnalysis([
    result("times", 1, [
      { questionId: questionByCategory.main_idea.id, category: "main_idea", correct: true },
      answer("main_idea", false, 999),
      answer("main_idea", true, 600_001),
      answer("main_idea", false, 1_000.5),
      answer("main_idea", true, 1_000),
      answer("main_idea", true, 600_000, { selectedIndex: undefined }),
    ]),
  ]);
  assert.equal(analysis.overall.totalAnswered, 6);
  assert.equal(analysis.overall.correctCount, 4);
  assert.equal(analysis.overall.validResponseTimeCount, 2);
  assert.equal(analysis.overall.averageResponseTimeMs, 300_500);
});

test("category resolution uses snapshot, DB metadata, static mapping, then unknown", () => {
  const staticQuestion = questionByCategory.main_idea;
  const analysis = buildParagraphAnalysis([
    result("categories", 1, [
      { questionId: staticQuestion.id, category: "inference", correct: true },
      { questionId: "db-only", correct: true },
      { questionId: questionByCategory.supporting_idea.id, correct: false },
      { questionId: "unknown", correct: true },
    ]),
  ], [{ id: staticQuestion.id, category: "completion" }, { id: "db-only", category: "flow" }]);
  assert.equal(analysis.categories.find((item) => item.category === "inference").answered, 1);
  assert.equal(analysis.categories.find((item) => item.category === "flow").answered, 1);
  assert.equal(analysis.categories.find((item) => item.category === "supporting_idea").answered, 1);
  assert.equal(analysis.categories.reduce((sum, item) => sum + item.answered, 0), 3);
  assert.equal(analysis.overall.totalAnswered, 4);
  assert.equal(getParagraphQuestionCategory("db-only", undefined, [{ id: "db-only", category: "flow" }]), "flow");
});

test("malformed answers fail soft one item at a time", () => {
  const analysis = buildParagraphAnalysis([
    result("partial", 1, [
      answer("main_idea", true),
      null,
      { questionId: "", correct: true },
      { questionId: "bad" },
      { questionId: "valid-without-time", correct: false },
    ]),
  ]);
  assert.equal(analysis.overall.totalAnswered, 2);
  assert.equal(analysis.overall.correctCount, 1);
  assert.equal(analysis.overall.validResponseTimeCount, 1);
});

test("unusable details uses marked summary fallback without fake category data", () => {
  const legacy = result("legacy", 1, null, {
    correctCount: 3,
    wrongCount: 2,
    details: { category: "main_idea", averageResponseTimeMs: 2_000 },
  });
  const analysis = buildParagraphAnalysis([
    legacy,
    result("good", 2, [answer("supporting_idea", true)]),
  ]);
  assert.equal(analysis.sessions[0].source, "summary");
  assert.equal(analysis.sessions[0].answered, 5);
  assert.equal(analysis.sessions[0].validResponseTimeCount, 0);
  assert.equal(analysis.overall.totalAnswered, 6);
  assert.equal(analysis.categories.find((item) => item.category === "main_idea").answered, 0);
  assert.equal(analysis.categories.find((item) => item.category === "supporting_idea").answered, 1);
});

test("one unusable session does not break other sessions", () => {
  const analysis = buildParagraphAnalysis([
    { id: "broken", date: "", exerciseType: "paragraph", correctCount: -1, wrongCount: -1, successRate: 0, details: { answers: "bad" } },
    result("good", 2, [answer("main_idea", true)]),
  ]);
  assert.equal(analysis.sessions.length, 1);
  assert.equal(analysis.sessions[0].id, "good");
});

test("one eligible category cannot be both strongest and development", () => {
  const analysis = buildParagraphAnalysis([
    result("one-category", 1, Array.from({ length: PARAGRAPH_ANALYSIS_MIN_SAMPLE }, () => answer("main_idea", true))),
  ]);
  assert.equal(analysis.strongestCategory, null);
  assert.equal(analysis.needsImprovementCategory, null);
});

test("two eligible category ties are deterministic and distinct", () => {
  const answers = [
    ...Array.from({ length: 5 }, (_, index) => answer("main_idea", index < 4)),
    ...Array.from({ length: 5 }, (_, index) => answer("supporting_idea", index < 4)),
  ];
  const analysis = buildParagraphAnalysis([result("ties", 1, answers)]);
  assert.equal(analysis.strongestCategory.category, "main_idea");
  assert.equal(analysis.needsImprovementCategory.category, "supporting_idea");
});

test("sessions are chronological and fewer than six is insufficient", () => {
  const analysis = buildParagraphAnalysis([
    accuracySession("third", 3, 10),
    accuracySession("first", 1, 10),
    accuracySession("second", 2, 10),
  ]);
  assert.deepEqual(analysis.sessions.map((session) => session.id), ["first", "second", "third"]);
  assert.equal(analysis.trend.status, "insufficient");
});

test("six-session trend uses previous three versus latest three at +5 boundary", () => {
  const analysis = buildParagraphAnalysis([
    accuracySession("6", 6, 11),
    accuracySession("2", 2, 10),
    accuracySession("4", 4, 11),
    accuracySession("1", 1, 10),
    accuracySession("5", 5, 11),
    accuracySession("3", 3, 10),
  ]);
  assert.equal(analysis.trend.previousAverage, 50);
  assert.equal(analysis.trend.latestAverage, 55);
  assert.equal(analysis.trend.difference, 5);
  assert.equal(analysis.trend.status, "improving");
});

test("trend uses needs_attention at -5 boundary and stable inside band", () => {
  const needsAttention = buildParagraphAnalysis([
    ...[1, 2, 3].map((day) => accuracySession(`high-${day}`, day, 11)),
    ...[4, 5, 6].map((day) => accuracySession(`low-${day}`, day, 10)),
  ]);
  assert.equal(needsAttention.trend.status, "needs_attention");
  assert.equal(needsAttention.trend.difference, -5);

  const stable = buildParagraphAnalysis([
    ...[1, 2, 3].map((day) => accuracySession(`a-${day}`, day, 10)),
    accuracySession("b-4", 4, 10),
    accuracySession("b-5", 5, 10),
    accuracySession("b-6", 6, 11),
  ]);
  assert.equal(stable.trend.status, "stable");
});

test("non-paragraph results are ignored", () => {
  const other = { ...result("other", 1, [answer("main_idea", true)]), exerciseType: "reading-comprehension" };
  assert.equal(buildParagraphAnalysis([other]).overall.completedSessionCount, 0);
});
