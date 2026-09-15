import test from "node:test";
import assert from "node:assert/strict";
import { paragraphQuestions, selectParagraphQuestionsFromPool } from "../src/lib/paragraph-exercises/paragraphQuestions.ts";
import { resolveParagraphGradeBand } from "../src/lib/paragraph-exercises/paragraphGradeBand.ts";
import { loadStudentParagraphQuestions } from "../src/lib/paragraph-exercises/paragraphQuestionRepository.ts";

test("grade band resolver accepts stored class formats and fails closed", () => {
  for (const [value, expected] of [[4,"4-5"],[5,"4-5"],["6","6-7"],["7. Sınıf","6-7"],[8,"8"],["9. Sınıf","high-school"],[10,"high-school"],["11 Sınıf","high-school"],[12,"high-school"]]) {
    assert.equal(resolveParagraphGradeBand(value), expected);
  }
  for (const value of [null, "", "3", "13", "6A", "sınıf 6", {}, 6.5]) assert.equal(resolveParagraphGradeBand(value), null);
});

test("category selection excludes seen and returns only remaining questions", () => {
  const seen = new Set(paragraphQuestions.filter((q) => q.category === "main_idea").slice(0, 2).map((q) => q.id));
  const selected = selectParagraphQuestionsFromPool(paragraphQuestions, "main_idea", 10, () => 0.2, seen);
  assert.equal(selected.length, 10);
  assert.equal(selected.some((q) => seen.has(q.id)), false);
  assert.equal(new Set(selected.map((q) => q.id)).size, selected.length);
});

test("mixed selection excludes global seen IDs, preserves balance, and does not repeat", () => {
  const seen = new Set(paragraphQuestions.filter((q) => q.category === "main_idea").slice(0, 12).map((q) => q.id));
  const selected = selectParagraphQuestionsFromPool(paragraphQuestions, "mixed", 10, () => 0.2, seen);
  assert.equal(selected.length, 10);
  assert.equal(selected.some((q) => seen.has(q.id)), false);
  assert.equal(new Set(selected.map((q) => q.id)).size, 10);
  assert.ok(selected.filter((q) => q.category === "main_idea").length < 2);
});

test("category and mixed modes never leak another grade", () => {
  const pool = [
    { ...paragraphQuestions[0], id: "a", gradeBand: "6-7" },
    { ...paragraphQuestions[1], id: "b", gradeBand: "4-5" },
    { ...paragraphQuestions[2], id: "c", gradeBand: "8" },
    { ...paragraphQuestions[3], id: "d", gradeBand: "high-school" },
  ];
  const gradeSix = pool.filter((question) => question.gradeBand === "6-7");
  assert.deepEqual(selectParagraphQuestionsFromPool(gradeSix, "main_idea", 10).map((q) => q.id), ["a"]);
  assert.deepEqual(selectParagraphQuestionsFromPool(gradeSix, "mixed", 10).map((q) => q.id), ["a"]);
});

test("partial and empty remaining pools stay partial/empty", () => {
  const pool = paragraphQuestions.slice(0, 3);
  assert.equal(selectParagraphQuestionsFromPool(pool, "main_idea", 10).length, 3);
  assert.equal(selectParagraphQuestionsFromPool(pool, "main_idea", 10, Math.random, new Set(pool.map((q) => q.id))).length, 0);
});

function mockSupabase(questionData, historyData, historyError = null) {
  return {
    from(table) {
      const state = { table, filters: [] };
      const query = {
        select() { return query; },
        eq(...args) { state.filters.push(args); return query; },
        is(...args) { state.filters.push(args); return query; },
        order() { return query; },
        then(resolve, reject) {
          const isHistory = state.filters.some(([key, value]) => key === "exercise_type" && value === "paragraph");
          return Promise.resolve(isHistory ? { data: historyData, error: historyError } : { data: questionData, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

test("student loader filters grade server-side and removes both legacy and current seen IDs", async () => {
  const source = paragraphQuestions.filter((q) => q.category === "main_idea").slice(0, 3);
  const result = await loadStudentParagraphQuestions("student-1", "6. Sınıf", mockSupabase(source.map((q) => ({ id:q.id, category:q.category, difficulty:q.level, grade_band:q.gradeBand, passage:q.paragraph, question:q.question, options:q.options, correct_index:q.correctIndex, explanation:q.explanation })), [
    { details: { questionIds: [source[0].id], answers: [{ questionId: source[1].id, correct: false }] } },
  ]));
  assert.equal(result.gradeBand, "6-7");
  assert.deepEqual(result.questions.map((q) => q.id), [source[2].id]);
  assert.deepEqual(new Set(result.seenQuestionIds), new Set([source[0].id, source[1].id]));
});

test("student loader does not fallback to all grades on a successful empty DB query", async () => {
  const result = await loadStudentParagraphQuestions("student-1", 8, mockSupabase([], []));
  assert.equal(result.dbState, "empty");
  assert.deepEqual(result.questions, []);
});
