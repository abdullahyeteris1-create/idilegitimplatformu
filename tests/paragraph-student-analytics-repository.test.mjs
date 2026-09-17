import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadParagraphStudentAnalyticsForVerifiedStudent } from "../src/lib/paragraph-exercises/paragraphStudentAnalyticsRepository.ts";

function clientWith({ results = [], questions = [], resultsError = null, questionsError = null } = {}) {
  const calls = { tables: [], filters: [], orders: [] };
  const client = {
    from(table) {
      calls.tables.push(table);
      if (table === "paragraph_questions") {
        return {
          select(columns) {
            assert.equal(columns, "id,category");
            return Promise.resolve({ data: questions, error: questionsError });
          },
        };
      }
      let orderCount = 0;
      return {
        select() { return this; },
        eq(field, value) {
          calls.filters.push([field, value]);
          return this;
        },
        order(field, options) {
          calls.orders.push([field, options]);
          orderCount += 1;
          return orderCount === 2 ? Promise.resolve({ data: results, error: resultsError }) : this;
        },
      };
    },
  };
  return { client, calls };
}

test("repository is explicitly server-only and exports no browser identity route", async () => {
  const source = await readFile("src/lib/paragraph-exercises/paragraphStudentAnalyticsRepository.ts", "utf8");
  assert.match(source, /^import "server-only";/);
  assert.match(source, /getSupabaseServiceRoleClient/);
  assert.doesNotMatch(source, /NextRequest|searchParams|request\.json/);
});

test("repository scopes results to verified student and paragraph type in deterministic order", async () => {
  const { client, calls } = clientWith({
    results: [{
      id: "one",
      correct_count: 1,
      wrong_count: 0,
      success_rate: 100,
      completed_at: "2026-09-01T10:00:00.000Z",
      created_at: "2026-09-01T10:00:00.000Z",
      details: { answers: [{ questionId: "db-q", correct: true, responseTimeMs: 2_000 }] },
    }],
    questions: [{ id: "db-q", category: "flow" }],
  });
  const analysis = await loadParagraphStudentAnalyticsForVerifiedStudent("student-verified", client);
  assert.deepEqual(calls.filters, [
    ["student_id", "student-verified"],
    ["exercise_type", "paragraph"],
  ]);
  assert.deepEqual(calls.orders, [
    ["completed_at", { ascending: true }],
    ["id", { ascending: true }],
  ]);
  assert.equal(analysis.overall.totalAnswered, 1);
  assert.equal(analysis.categories.find((item) => item.category === "flow").answered, 1);
});

test("repository rejects missing verified identity before querying", async () => {
  const { client, calls } = clientWith();
  await assert.rejects(
    loadParagraphStudentAnalyticsForVerifiedStudent("   ", client),
    /Verified student identity is required/,
  );
  assert.equal(calls.tables.length, 0);
});

test("repository fails closed on result or metadata query errors", async () => {
  await assert.rejects(
    loadParagraphStudentAnalyticsForVerifiedStudent("student", clientWith({ resultsError: { message: "down" } }).client),
    /results could not be loaded/,
  );
  await assert.rejects(
    loadParagraphStudentAnalyticsForVerifiedStudent("student", clientWith({ questionsError: { message: "down" } }).client),
    /metadata could not be loaded/,
  );
});
