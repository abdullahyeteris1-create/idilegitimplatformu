import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { paragraphQuestions, selectParagraphQuestionsFromPool } from "../src/lib/paragraph-exercises/paragraphQuestions.ts";
import { loadActiveParagraphQuestions, mapParagraphQuestionRow } from "../src/lib/paragraph-exercises/paragraphQuestionRepository.ts";
import { buildParagraphAnalysis } from "../src/lib/paragraph-exercises/paragraphAnalysis.ts";

const MIGRATION = "supabase/migrations/20260914120000_create_paragraph_questions.sql";

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function createMockSupabase({ data, error = null }) {
  const calls = [];
  const query = {
    select() { return this; },
    eq(...args) { calls.push(["eq", ...args]); return this; },
    is(...args) { calls.push(["is", ...args]); return this; },
    order() { return Promise.resolve({ data, error }); },
  };
  return { calls, from() { calls.push(["from", "paragraph_questions"]); return query; } };
}

test("paragraph_questions migration schema, constraints, RLS and minimum index mevcut", async () => {
  const migration = await readFile(MIGRATION, "utf8");
  assert.match(migration, /create table if not exists public\.paragraph_questions/i);
  assert.match(migration, /id text primary key/i);
  assert.match(migration, /jsonb_typeof\(options\) = 'array' and jsonb_array_length\(options\) = 5/i);
  assert.match(migration, /correct_index between 0 and 4/i);
  assert.match(migration, /alter table public\.paragraph_questions enable row level security/i);
  assert.match(migration, /alter table public\.paragraph_questions force row level security/i);
  assert.match(migration, /revoke all on table public\.paragraph_questions from anon, authenticated/i);
  assert.match(migration, /create policy paragraph_questions_service_role_select/i);
  assert.match(migration, /where is_active = true and archived_at is null/i);
});

test("static 60 sorunun migration seed temsilinde birebir parity korunur", async () => {
  const migration = await readFile(MIGRATION, "utf8");
  assert.equal(paragraphQuestions.length, 60);
  assert.equal(new Set(paragraphQuestions.map((question) => question.id)).size, 60);

  const categoryCounts = Object.groupBy(paragraphQuestions, (question) => question.category);
  for (const category of ["main_idea", "supporting_idea", "inference", "completion", "flow"]) {
    assert.equal(categoryCounts[category]?.length, 12);
  }

  const correctIndexCounts = paragraphQuestions.reduce((counts, question) => {
    counts[question.correctIndex] += 1;
    return counts;
  }, [0, 0, 0, 0, 0]);
  assert.deepEqual(correctIndexCounts, [12, 12, 12, 12, 12]);

  for (const question of paragraphQuestions) {
    const tuple = [
      sqlLiteral(question.id),
      sqlLiteral(question.category),
      sqlLiteral(question.level),
      sqlLiteral(question.gradeBand),
      sqlLiteral(question.paragraph),
      sqlLiteral(question.question),
      sqlJson(question.options),
      question.correctIndex,
      sqlLiteral(question.explanation),
      "true",
      "'migration'",
      "null",
    ].join(", ");
    assert.ok(migration.includes(tuple), `seed tuple missing: ${question.id}`);
  }
});

test("repository DB satırını domain modeline map eder ve aktif/archive filtresini uygular", async () => {
  const source = paragraphQuestions[0];
  const client = createMockSupabase({
    data: [{
      id: source.id,
      category: source.category,
      difficulty: source.level,
      grade_band: source.gradeBand,
      passage: source.paragraph,
      question: source.question,
      options: source.options,
      correct_index: source.correctIndex,
      explanation: source.explanation,
    }],
  });
  const result = await loadActiveParagraphQuestions(client);
  assert.equal(result.source, "db");
  assert.equal(result.dbState, "success");
  assert.deepEqual(result.questions[0], source);
  assert.deepEqual(client.calls.filter(([name]) => name === "eq" || name === "is"), [
    ["eq", "is_active", true],
    ["is", "archived_at", null],
  ]);
});

test("DB read hatası static fallback kullanır, aktif havuzun boş olması fallback kullanmaz", async () => {
  const errorResult = await loadActiveParagraphQuestions(createMockSupabase({ data: null, error: { message: "network down" } }));
  assert.equal(errorResult.source, "static-fallback");
  assert.equal(errorResult.dbState, "error");
  assert.equal(errorResult.questions.length, 60);

  const emptyResult = await loadActiveParagraphQuestions(createMockSupabase({ data: [], error: null }));
  assert.equal(emptyResult.source, "db");
  assert.equal(emptyResult.dbState, "empty");
  assert.deepEqual(emptyResult.questions, []);
});

test("DB satırındaki geçersiz seçenek veya index kabul edilmez", () => {
  const source = paragraphQuestions[0];
  assert.equal(mapParagraphQuestionRow({
    id: source.id,
    category: source.category,
    difficulty: source.level,
    grade_band: source.gradeBand,
    passage: source.paragraph,
    question: source.question,
    options: ["A"],
    correct_index: 0,
    explanation: source.explanation,
  }), null);
});

test("DB pool selection mevcut kategori ve karma davranışını korur", () => {
  const selectedCategory = selectParagraphQuestionsFromPool(paragraphQuestions, "main_idea", 10, () => 0.2);
  assert.equal(selectedCategory.length, 10);
  assert.ok(selectedCategory.every((question) => question.category === "main_idea"));

  const selectedMixed = selectParagraphQuestionsFromPool(paragraphQuestions, "mixed", 10, () => 0.2);
  assert.equal(selectedMixed.length, 10);
  for (const category of ["main_idea", "supporting_idea", "inference", "completion", "flow"]) {
    assert.equal(selectedMixed.filter((question) => question.category === category).length, 2);
  }
});

test("Paragraph Analysis yeni category snapshot'ı ve eski ID map'ini birlikte destekler", () => {
  const source = paragraphQuestions[0];
  const analysis = buildParagraphAnalysis([{
    id: "snapshot",
    date: "2026-09-14T10:00:00Z",
    exerciseType: "paragraph",
    correctCount: 2,
    wrongCount: 0,
    successRate: 100,
    details: {
      category: "mixed",
      answers: [
        { questionId: "future-db-id", category: "main_idea", correct: true, responseTimeMs: 1000 },
        { questionId: source.id, correct: true, responseTimeMs: 1100 },
      ],
    },
  }]);
  assert.equal(analysis.categories.find((item) => item.category === "main_idea").answeredQuestions, 2);
});
