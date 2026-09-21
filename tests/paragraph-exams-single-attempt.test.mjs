import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deriveStudentExamState } from "../src/lib/paragraph-exams/studentAttemptState.ts";

const root = process.cwd();
const read = (file) => readFileSync(`${root}/${file}`, "utf8");
const attempt = (id, status, createdAt, overrides = {}) => ({
  id,
  status,
  createdAt,
  updatedAt: createdAt,
  submittedAt: status === "submitted" || status === "expired" ? createdAt : null,
  score: status === "submitted" || status === "expired" ? 80 : null,
  ...overrides,
});

test("new student has a not_started state", () => {
  assert.deepEqual(deriveStudentExamState([]), {
    status: "not_started",
    attemptId: null,
    completedAt: null,
    score: null,
    resultAvailable: false,
  });
});

test("active student resumes the same in-progress attempt", () => {
  const state = deriveStudentExamState([attempt("active-1", "in_progress", "2026-09-21T10:00:00.000Z")]);
  assert.equal(state.status, "in_progress");
  assert.equal(state.attemptId, "active-1");
  assert.equal(state.resultAvailable, false);
});

test("completed submitted attempt takes priority over active legacy attempts", () => {
  const state = deriveStudentExamState([
    attempt("active-1", "in_progress", "2026-09-21T11:00:00.000Z"),
    attempt("done-1", "submitted", "2026-09-21T10:00:00.000Z", { score: 92 }),
  ]);
  assert.equal(state.status, "completed");
  assert.equal(state.attemptId, "done-1");
  assert.equal(state.score, 92);
  assert.equal(state.resultAvailable, true);
});

test("expired attempt is completed and result remains available", () => {
  const state = deriveStudentExamState([attempt("expired-1", "expired", "2026-09-21T10:00:00.000Z")]);
  assert.equal(state.status, "completed");
  assert.equal(state.attemptId, "expired-1");
  assert.equal(state.resultAvailable, true);
});

test("newest finalized attempt is the student-facing result when historical duplicates exist", () => {
  const state = deriveStudentExamState([
    attempt("old-done", "submitted", "2026-09-20T10:00:00.000Z", { score: 60 }),
    attempt("new-done", "expired", "2026-09-21T10:00:00.000Z", { score: 40 }),
  ]);
  assert.equal(state.attemptId, "new-done");
  assert.equal(state.score, 40);
});

test("student list and detail APIs expose batched student state", () => {
  const list = read("src/app/api/student/paragraph-exams/route.ts");
  const detail = read("src/app/api/student/paragraph-exams/[examId]/route.ts");
  assert.match(list, /getStudentExamStates/);
  assert.match(list, /toStudentExamSummaryDto/);
  assert.match(detail, /getStudentExamState/);
  assert.match(detail, /toStudentExamSummaryDto/);
  assert.doesNotMatch(list, /exams\.map\(async/);
});

test("create, resume, and direct play paths enforce completed priority", () => {
  const repository = read("src/lib/paragraph-exams/studentRepository.ts");
  const playRoute = read("src/app/api/student/paragraph-exams/[examId]/attempt/[attemptId]/route.ts");
  assert.match(repository, /Bu denemeyi daha önce tamamladınız\./);
  assert.match(repository, /status === "completed"/);
  assert.match(repository, /getStudentAttemptForPlay/);
  assert.match(playRoute, /getStudentAttemptForPlay/);
});

test("student UI distinguishes completed, active, and not-started exams", () => {
  const client = read("src/app/ogrenci/paragraf-denemeleri/StudentParagraphExamsClient.tsx");
  assert.match(client, /studentStatus === "completed"/);
  assert.match(client, /✓ Deneme Çözüldü/);
  assert.match(client, /Sonucu Gör/);
  assert.match(client, /active/);
  assert.match(client, /Devam Et/);
  assert.match(client, /completedAttemptId/);
});

test("prepared migration serializes the lifetime guard and preserves historical rows", () => {
  const migration = read("supabase/migrations/20260922100000_prevent_paragraph_exam_retakes.sql");
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /status in \('submitted', 'expired'\)/);
  assert.match(migration, /paragraph_exam_attempts_single_lifetime_uidx/);
  assert.match(migration, /Bu denemeyi daha önce tamamladınız\./);
  assert.match(migration, /drop trigger if exists paragraph_exam_attempts_exam_lock/);
});

test("concurrent first start relies on the DB race guard and resumes the winner", () => {
  const repository = read("src/lib/paragraph-exams/studentRepository.ts");
  const migration = read("supabase/migrations/20260922100000_prevent_paragraph_exam_retakes.sql");
  assert.match(migration, /paragraph_exam_attempts_one_active_uidx/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(repository, /const UNIQUE_VIOLATION = "23505"/);
  assert.match(repository, /const raced = await loadActiveAttempt/);
  assert.match(repository, /resumed: true/);
});

test("completed start returns 409 while submitted and expired results stay readable", () => {
  const repository = read("src/lib/paragraph-exams/studentRepository.ts");
  const resultRoute = read("src/app/api/student/paragraph-exams/[examId]/attempt/[attemptId]/result/route.ts");
  assert.match(repository, /status: 409/);
  assert.match(repository, /status in \("submitted", "expired"\)|status === "completed"/);
  assert.match(resultRoute, /getStudentAttempt/);
  assert.match(resultRoute, /toResultDto/);
});

test("student attempt state query is batched and scoped to the authenticated student", () => {
  const repository = read("src/lib/paragraph-exams/studentRepository.ts");
  const listRoute = read("src/app/api/student/paragraph-exams/route.ts");
  assert.match(repository, /eq\("student_id", studentId\)/);
  assert.match(repository, /select\(ATTEMPT_FIELDS\)/);
  assert.doesNotMatch(listRoute, /map\(async/);
});
