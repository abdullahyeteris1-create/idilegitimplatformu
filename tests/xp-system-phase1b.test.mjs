import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MIGRATION_URL = new URL("../supabase/migrations/20260728150000_add_phase_1b_xp_idempotency.sql", import.meta.url);
const SECURE_STORAGE_URL = new URL("../src/lib/results/secureResultStorage.ts", import.meta.url);
const RESULTS_ROUTE_URL = new URL("../src/app/api/student/results/route.ts", import.meta.url);
const PROGRAM_ROUTE_URL = new URL("../src/app/api/student/education-program-tasks/[taskId]/complete/route.ts", import.meta.url);
const XP_REPOSITORY_URL = new URL("../src/lib/xp/xpRepository.ts", import.meta.url);

async function read(url) {
  return readFile(url, "utf8");
}

test("1-2) Phase 1B migration submission_key ve yeni XP event tiplerini ekler", async () => {
  const sql = await read(MIGRATION_URL);

  assert.match(sql, /alter table if exists public\.exercise_results\s+add column if not exists submission_key text;/);
  assert.match(sql, /create unique index if not exists exercise_results_student_submission_key_uidx/);
  assert.match(sql, /when 'exercise_completed' then\s+v_xp_amount := 5;/);
  assert.match(sql, /when 'education_program_task_completed' then\s+v_xp_amount := 15;/);
  assert.match(sql, /when 'reading_comprehension_completed' then\s+v_xp_amount := 20;/);
  assert.match(sql, /when 'reading_speed_test_completed' then\s+v_xp_amount := 20;/);
});

test("3-4) secureResultStorage submissionKey'i ayni payload nesnesinde saklar ve API'ye yollar", async () => {
  const source = await read(SECURE_STORAGE_URL);

  assert.match(source, /submissionKey\?: string;/);
  assert.match(source, /input\.submissionKey = nextKey;/);
  assert.match(source, /submissionKey,\s*assignmentItemId,/s);
});

test("5-7) results route submissionKey zorunlu kilar ve XP'yi sonucla ayni idempotency anahtarina baglar", async () => {
  const source = await read(RESULTS_ROUTE_URL);

  assert.match(source, /"submissionKey"/);
  assert.match(source, /submissionKey: string;/);
  assert.match(source, /getXpAwardForResult\(body\.exerciseType\)/);
  assert.match(source, /idempotencyKey: `result:\$\{body\.submissionKey\}`/);
  assert.match(source, /eventType: "exercise_completed"/);
  assert.match(source, /eventType: "reading_comprehension_completed"/);
  assert.match(source, /eventType: "reading_speed_test_completed"/);
});

test("8-9) education program task tamamlaninca XP program-task idempotency anahtariyla verilir", async () => {
  const source = await read(PROGRAM_ROUTE_URL);

  assert.match(source, /awardStudentXpEvent\(/);
  assert.match(source, /eventType: "education_program_task_completed"/);
  assert.match(source, /idempotencyKey: `program-task:\$\{taskId\}`/);
  assert.match(source, /sourceType: "education_program_task"/);
});

test("10-12) XP repository yeni event tiplerini ve award helper'ini expose eder", async () => {
  const source = await read(XP_REPOSITORY_URL);

  assert.match(source, /export type StudentXpAwardEventType =/);
  assert.match(source, /"exercise_completed"/);
  assert.match(source, /"education_program_task_completed"/);
  assert.match(source, /"reading_comprehension_completed"/);
  assert.match(source, /"reading_speed_test_completed"/);
  assert.match(source, /export async function awardStudentXpEvent\(/);
});
