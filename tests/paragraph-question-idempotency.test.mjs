import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile("supabase/migrations/20260915100000_add_paragraph_question_idempotency.sql", "utf8");
const repo = await readFile("src/lib/paragraph-exercises/paragraphQuestionAdminRepository.ts", "utf8");
const ui = await readFile("src/app/ogretmen/icerik-yonetimi/paragraf-sorulari/ParagraphQuestionAIGeneratorHardened.tsx", "utf8");
const route = await readFile("src/app/api/admin/paragraph-questions/ai-save/route.ts", "utf8");
const { ParagraphQuestionRepositoryError, isParagraphQuestionIdempotencyConflict, createQuestionFingerprint } =
  await import("@/lib/paragraph-exercises/paragraphQuestionAdminRepository");

test("persistent fingerprint covers the complete logical question", () => {
  for (const field of ["category", "difficulty", "gradeBand", "passage", "question", "options", "correctIndex"]) assert.match(repo, new RegExp(field));
  assert.match(migration, /add column if not exists content_fingerprint text/);
  assert.match(migration, /create unique index if not exists/);
  assert.match(migration, /on public\.paragraph_questions \(content_fingerprint\)/);
  assert.match(migration, /where content_fingerprint is not null/);
  assert.doesNotMatch(migration, /lower\s*\(/i);
  assert.doesNotMatch(migration, /regexp_replace\s*\(/i);
  assert.doesNotMatch(migration, /\b(update|delete|insert)\b/i);
  assert.match(repo, /createQuestionFingerprint/);
});

test("fingerprint is deterministic and sensitive to ordered options and answer index", () => {
  const base = { category: "main_idea", difficulty: "easy", gradeBand: "4-5", passage: "Türkçe   metin", question: "Ana fikir?", options: ["A", "B", "C", "D", "E"], correctIndex: 0 };
  const a = createQuestionFingerprint(base);
  assert.equal(a, createQuestionFingerprint({ ...base }));
  assert.notEqual(a, createQuestionFingerprint({ ...base, options: ["B", "A", "C", "D", "E"] }));
  assert.notEqual(a, createQuestionFingerprint({ ...base, correctIndex: 1 }));
  assert.equal(a, createQuestionFingerprint({ ...base, passage: " Türkçe metin ", question: "Ana fikir?" }));
  assert.match(a, /^[a-f0-9]{64}$/);
});

test("createQuestion server-side insert contract includes fingerprint for AI/manual and ignores client field", () => {
  assert.match(repo, /source === "manual" \|\| source === "ai"/);
  assert.match(repo, /content_fingerprint: contentFingerprint/);
  assert.doesNotMatch(repo, /input\.contentFingerprint/);
});

test("AI preview save uses a per-draft lock", () => {
  assert.match(ui, /saving.*Set<number>/);
  assert.match(ui, /disabled=\{saving\.has\(i\)\}/);
  assert.match(ui, /Kaydediliyor/);
  assert.match(ui, /if\(saving\.has\(i\)/);
});
test("only the idempotency unique conflict maps to 409", () => {
  assert.match(route, /isParagraphQuestionIdempotencyConflict\(e\)/);
  assert.match(route, /status: 409/);
  assert.match(route, /status: 500/);
});

test("repository preserves and parses Supabase unique-error metadata", () => {
  const conflict = new ParagraphQuestionRepositoryError({
    code: "23505",
    message: 'duplicate key value violates unique constraint "paragraph_questions_content_fingerprint_uidx"',
  });
  assert.equal(conflict.constraint, "paragraph_questions_content_fingerprint_uidx");
  assert.equal(isParagraphQuestionIdempotencyConflict(conflict), true);
  assert.equal(
    isParagraphQuestionIdempotencyConflict(
      new ParagraphQuestionRepositoryError({ code: "23505", constraint: "other_unique" }),
    ),
    false,
  );
  assert.equal(
    isParagraphQuestionIdempotencyConflict(
      new ParagraphQuestionRepositoryError({ code: "23503", constraint: "paragraph_questions_content_fingerprint_uidx" }),
    ),
    false,
  );
});

test("race-path contract is one success plus one mapped conflict (mock only)", () => {
  const outcomes = [
    { status: 201 },
    { status: isParagraphQuestionIdempotencyConflict(new ParagraphQuestionRepositoryError({ code: "23505", constraint: "paragraph_questions_content_fingerprint_uidx" })) ? 409 : 500 },
  ];
  assert.deepEqual(outcomes.map((o) => o.status), [201, 409]);
});
