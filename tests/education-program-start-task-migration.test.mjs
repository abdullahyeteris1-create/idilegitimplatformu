import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MIGRATION_URL = new URL(
  "../supabase/migrations/20260725190000_start_education_program_task_rpc.sql",
  import.meta.url,
);

async function readMigration() {
  return readFile(MIGRATION_URL, "utf8");
}

test("RPC security definer, search_path pinli ve yalniz service_role yetkilidir", async () => {
  const sql = await readMigration();

  assert.match(sql, /create or replace function public\.start_education_program_task_v1/);
  assert.match(sql, /security definer\s+set search_path = public, pg_temp/);
  assert.match(
    sql,
    /revoke all on function public\.start_education_program_task_v1\(uuid, uuid\) from public/,
  );
  assert.match(
    sql,
    /revoke all on function public\.start_education_program_task_v1\(uuid, uuid\) from anon/,
  );
  assert.match(
    sql,
    /revoke all on function public\.start_education_program_task_v1\(uuid, uuid\) from authenticated/,
  );
  assert.match(
    sql,
    /grant execute on function public\.start_education_program_task_v1\(uuid, uuid\) to service_role/,
  );
});

test("gorev sahiplik kontrolu ve for update kilidi mevcuttur", async () => {
  const sql = await readMigration();

  assert.match(sql, /from public\.student_education_program_tasks t\s+where t\.id = p_task_id\s+for update/);
  assert.match(sql, /if v_task_student_id <> p_student_id then/);
  assert.match(sql, /EDUCATION_TASK_START_STUDENT_MISMATCH/);
});

test("program aktiflik ve gun baslatilabilirlik kontrolleri mevcuttur", async () => {
  const sql = await readMigration();

  assert.match(sql, /EDUCATION_TASK_START_PROGRAM_NOT_FOUND/);
  assert.match(sql, /if v_program_status <> 'active' then/);
  assert.match(sql, /EDUCATION_TASK_START_PROGRAM_NOT_ACTIVE/);
  assert.match(
    sql,
    /if v_day_status not in \('available', 'in_progress'\) then/,
  );
  assert.match(sql, /EDUCATION_TASK_START_DAY_NOT_STARTABLE/);
});

test("yalniz available gorev baslatilabilir, locked/completed reddedilir", async () => {
  const sql = await readMigration();

  assert.match(sql, /if v_task_status <> 'available' then/);
  assert.match(sql, /EDUCATION_TASK_START_TASK_NOT_STARTABLE/);
});

test("available -> in_progress atomik gecisi ve started_at ilk kez yazilir", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /update public\.student_education_program_tasks\s+set status = 'in_progress', started_at = now\(\)\s+where id = p_task_id\s+returning started_at into v_result_started_at/,
  );
});

test("gun yalniz available ise in_progress olur ve started_at yalniz null ise doldurulur", async () => {
  const sql = await readMigration();

  assert.match(sql, /if v_day_status = 'available' then/);
  assert.match(
    sql,
    /update public\.student_education_program_days\s+set status = 'in_progress', started_at = coalesce\(started_at, now\(\)\)\s+where id = v_program_day_id/,
  );
});

test("gorev zaten in_progress ise idempotent doner ve hicbir update calismaz", async () => {
  const sql = await readMigration();
  const idempotentBranch =
    sql.split("if v_task_status = 'in_progress' then")[1]?.split("end if;")[0] ?? "";

  assert.match(idempotentBranch, /'idempotent', true/);
  assert.doesNotMatch(idempotentBranch, /update public\./);
});

test("migration Assignment System V2'ye veya tamamlanma/puanlamaya dokunmaz", async () => {
  const sql = await readMigration();

  assert.doesNotMatch(sql, /public\.student_assignment_program/);
  assert.doesNotMatch(sql, /public\.daily_assignment/);
  assert.doesNotMatch(sql, /public\.exercise_results/);
  assert.doesNotMatch(sql, /completed_at\s*=\s*now\(\)/);
  assert.doesNotMatch(sql, /status = 'completed'/);
  assert.doesNotMatch(sql, /completed_days/);
});
