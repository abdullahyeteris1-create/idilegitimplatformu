import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const RESULT_MIGRATION_URL = new URL(
  "../supabase/migrations/20260728170000_phase_1c_transactional_result_xp_and_summary_repair.sql",
  import.meta.url,
);
const PROGRAM_COMPLETE_MIGRATION_URL = new URL(
  "../supabase/migrations/20260728171000_phase_1c_education_program_task_xp_atomic.sql",
  import.meta.url,
);
const RESULTS_ROUTE_URL = new URL("../src/app/api/student/results/route.ts", import.meta.url);
const PROGRAM_ROUTE_URL = new URL(
  "../src/app/api/student/education-program-tasks/[taskId]/complete/route.ts",
  import.meta.url,
);
const XP_REPOSITORY_URL = new URL("../src/lib/xp/xpRepository.ts", import.meta.url);

async function read(url) {
  return readFile(url, "utf8");
}

test("phase 1c result migration adds transactional result and summary repair RPCs", async () => {
  const sql = await read(RESULT_MIGRATION_URL);

  assert.match(sql, /create or replace function public\.record_student_result_and_award_xp_v1\(/);
  assert.match(sql, /create or replace function public\.repair_student_xp_summary_v1\(/);
  assert.match(sql, /security definer\s+set search_path = public, pg_temp/);
  assert.match(
    sql,
    /grant execute on function public\.record_student_result_and_award_xp_v1\(uuid, text, text, text, text, numeric, numeric, integer, integer, integer, timestamptz, text, jsonb\) to service_role/,
  );
  assert.match(sql, /grant execute on function public\.repair_student_xp_summary_v1\(uuid\) to service_role/);
});

test("result route uses transactional RPC and returns replay as additive response", async () => {
  const source = await read(RESULTS_ROUTE_URL);

  assert.match(source, /recordStudentResultAndAwardXp\(/);
  assert.match(source, /replayed: recorded\.replayed/);
  assert.match(source, /mapResult\(recorded\.resultRow, access\.studentId\)/);
  assert.doesNotMatch(source, /awardStudentXpEvent\(/);
});

test("education program route no longer performs a separate XP call", async () => {
  const source = await read(PROGRAM_ROUTE_URL);

  assert.match(source, /completeEducationProgramTask\(/);
  assert.doesNotMatch(source, /awardStudentXpEvent\(/);
  assert.match(source, /rewardKey:\s*`program-task:\$\{taskId\}`/);
});

test("education program completion RPC awards XP in the same transaction", async () => {
  const sql = await read(PROGRAM_COMPLETE_MIGRATION_URL);

  assert.match(sql, /create or replace function public\.complete_education_program_task_v1\(/);
  assert.match(sql, /public\.award_student_xp_v1\(/);
  assert.match(sql, /p_event_type := 'education_program_task_completed'/);
  assert.match(sql, /p_idempotency_key := 'program-task:' \|\| p_task_id::text/);
});

test("xp repository exposes transactional result and summary repair helpers", async () => {
  const source = await read(XP_REPOSITORY_URL);

  assert.match(source, /export async function recordStudentResultAndAwardXp\(/);
  assert.match(source, /export async function repairStudentXpSummaryByStudentId\(/);
  assert.match(source, /const STUDENT_RESULT_AWARD_RPC = "record_student_result_and_award_xp_v1"/);
  assert.match(source, /const STUDENT_XP_SUMMARY_REPAIR_RPC = "repair_student_xp_summary_v1"/);
});
