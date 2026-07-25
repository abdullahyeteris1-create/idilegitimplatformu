import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Bu dosya migration/RPC icin STATIK sozlesme guvencesidir. Yerel Supabase
// CLI, Docker veya PostgreSQL baglantisi olmayan ortamlarda SQL'in gercek
// transaction davranisini kanitlamaz; o dogrulama integration fazinda yapilir.

const MIGRATION_URL = new URL(
  "../supabase/migrations/20260725170000_add_assignment_task_attempt_start.sql",
  import.meta.url,
);

async function readMigration() {
  return readFile(MIGRATION_URL, "utf8");
}

function executableSql(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

function section(sql, startMarker, endMarker) {
  const start = sql.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} bulunamadi`);
  const end = endMarker ? sql.indexOf(endMarker, start + startMarker.length) : sql.length;
  assert.notEqual(end, -1, `${endMarker} bulunamadi`);
  return sql.slice(start, end);
}

test("migration attempt_id kolonunu additive ve nullable olarak ekliyor", async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /alter table public\.student_assignment_program_tasks\s+add column if not exists attempt_id uuid\s*;/i,
  );
  assert.doesNotMatch(sql, /attempt_id uuid\s+not null/i);
});

test("partial unique index yalniz null olmayan attempt kimliklerini kapsiyor", async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /create unique index if not exists student_assignment_program_tasks_attempt_id_uidx\s+on public\.student_assignment_program_tasks \(attempt_id\)\s+where attempt_id is not null;/i,
  );
});

test("attempt_id, started_at ve expires_at V2 anlamlari COMMENT ile belgeleniyor", async () => {
  const sql = await readMigration();
  for (const column of ["attempt_id", "started_at", "expires_at"]) {
    assert.match(
      sql,
      new RegExp(`comment on column public\\.student_assignment_program_tasks\\.${column} is`, "i"),
    );
  }
  assert.match(sql, /new start supersedes the previous attempt/i);
  assert.match(sql, /started_at \+ duration_seconds/i);
  assert.match(sql, /completed tasks may retain/i);
});

test("RPC imzasi, JSONB sonucu ve guvenli execution ayarlari sabit", async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /create or replace function public\.start_student_assignment_program_task\(\s*p_student_id uuid,\s*p_task_id uuid,\s*p_attempt_id uuid,\s*p_exercise_slug text\s*\)\s*returns jsonb/i,
  );
  assert.match(sql, /^security definer$/m);
  assert.match(sql, /^set search_path = public, pg_temp$/m);
  assert.match(sql, /from public\.student_assignment_program_tasks/i);
  assert.match(sql, /from public\.student_assignment_program_days/i);
  assert.match(sql, /from public\.student_assignment_programs/i);
});

test("PUBLIC, anon ve authenticated execute yetkileri kaldirilip service_role'a veriliyor", async () => {
  const sql = await readMigration();
  const signature =
    String.raw`public\.start_student_assignment_program_task\(uuid, uuid, uuid, text\)`;
  for (const role of ["public", "anon", "authenticated"]) {
    assert.match(
      sql,
      new RegExp(`revoke all on function ${signature} from ${role};`, "i"),
      `${role} revoke eksik`,
    );
  }
  assert.match(
    sql,
    new RegExp(`grant execute on function ${signature} to service_role;`, "i"),
  );
});

test("null ve bos parametreler sabit hata kodlariyla reddediliyor", async () => {
  const sql = await readMigration();
  for (const code of [
    "INVALID_STUDENT_ID",
    "INVALID_TASK_ID",
    "INVALID_ATTEMPT_ID",
    "INVALID_EXERCISE_SLUG",
  ]) {
    assert.match(sql, new RegExp(`raise exception '${code}:`), `${code} eksik`);
  }
  assert.match(sql, /length\(btrim\(p_exercise_slug\)\) = 0/);
});

test("gorev satiri FOR UPDATE ile kilitleniyor ve bulunamazsa TASK_NOT_FOUND donuyor", async () => {
  const sql = await readMigration();
  const taskLock = section(sql, "-- 2) Lock exactly the requested task", "-- 3) Lock and validate");
  assert.match(taskLock, /where t\.id = p_task_id\s+for update;/i);
  assert.match(taskLock, /TASK_NOT_FOUND/);
});

test("task ve program ogrenci sahipligi TASK_NOT_OWNED ile korunuyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /if v_task_student_id <> p_student_id then\s+raise exception 'TASK_NOT_OWNED:/i);
  assert.match(sql, /if v_program_student_id <> p_student_id then\s+raise exception 'TASK_NOT_OWNED:/i);
});

test("yalniz active program baslatilabiliyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /if v_program_status <> 'active' then/i);
  assert.match(sql, /PROGRAM_NOT_ACTIVE/);
});

test("locked, completed ve current olmayan gunler ayri hata kodlariyla reddediliyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /v_day_status = 'locked'[\s\S]*?DAY_LOCKED/i);
  assert.match(sql, /v_day_status = 'completed'[\s\S]*?DAY_ALREADY_COMPLETED/i);
  assert.match(sql, /earlier_day\.day_number < v_day_number/i);
  assert.match(sql, /earlier_day\.status <> 'completed'/i);
  assert.match(sql, /NOT_CURRENT_DAY/);
});

test("locked, completed ve cancelled gorevler gercek status sozlesmesine gore reddediliyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /v_task_status = 'locked'[\s\S]*?TASK_LOCKED/i);
  assert.match(sql, /v_task_status = 'completed'[\s\S]*?TASK_ALREADY_COMPLETED/i);
  assert.match(sql, /v_task_status = 'cancelled'[\s\S]*?TASK_CANCELLED/i);
  assert.match(sql, /v_task_status not in \('available', 'in_progress'\)/i);
  assert.ok(
    sql.indexOf("if v_task_status = 'completed'") < sql.indexOf("if v_day_status = 'locked'"),
    "completed gorev hatasi gun kilidi kontrolunden once gelmeli",
  );
});

test("exercise slug trim ediliyor ve DB slug'i ile birebir eslesiyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /v_normalized_exercise_slug := btrim\(p_exercise_slug\)/i);
  assert.match(sql, /v_normalized_exercise_slug <> v_task_exercise_slug/i);
  assert.match(sql, /EXERCISE_MISMATCH/);
});

test("gecersiz task suresi INVALID_TASK_DURATION ile reddediliyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /v_duration_seconds is null or v_duration_seconds <= 0/i);
  assert.match(sql, /INVALID_TASK_DURATION/);
});

test("ilk ve farkli attempt start'i tek sunucu zamaniyla task'i in_progress yapiyor", async () => {
  const sql = await readMigration();
  const executable = executableSql(sql);
  assert.equal(
    (executable.match(/clock_timestamp\(\)/gi) ?? []).length,
    1,
    "clock_timestamp yalniz bir kez alinmali",
  );
  assert.match(sql, /v_now := clock_timestamp\(\)/i);
  assert.match(
    sql,
    /set\s+attempt_id = p_attempt_id,\s+started_at = v_now,\s+expires_at = v_now \+ make_interval\(secs => v_duration_seconds\),\s+last_heartbeat_at = null,\s+status = 'in_progress'/i,
  );
});

test("ayni attempt retry'si zamanlari degistirmeden idempotent true donuyor", async () => {
  const sql = await readMigration();
  const retryBlock = section(sql, "-- 6) Same-attempt retry", "-- 7) Give a stable");
  assert.match(
    retryBlock,
    /v_task_status = 'in_progress'\s+and v_current_attempt_id = p_attempt_id/i,
  );
  assert.match(retryBlock, /'startedAt', v_started_at/i);
  assert.match(retryBlock, /'expiresAt', v_expires_at/i);
  assert.match(retryBlock, /'idempotent', true/i);
  assert.doesNotMatch(retryBlock, /update public\./i);
});

test("farkli attempt onceki current attempt'i degistiriyor ve idempotent false donuyor", async () => {
  const sql = await readMigration();
  const newAttemptBlock = section(sql, "-- 8) A different attempt", "end;\n$$;");
  assert.match(newAttemptBlock, /attempt_id = p_attempt_id/i);
  assert.match(newAttemptBlock, /started_at = v_now/i);
  assert.match(newAttemptBlock, /expires_at = v_now \+ make_interval/i);
  assert.match(newAttemptBlock, /'idempotent', false/i);
});

test("baska gorevdeki attempt hem on kontrolde hem unique-race handler'inda uygulama hatasina cevriliyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /other_task\.attempt_id = p_attempt_id/i);
  assert.match(sql, /when unique_violation then/i);
  assert.match(sql, /v_constraint_name = 'student_assignment_program_tasks_attempt_id_uidx'/i);
  assert.equal(
    (sql.match(/ATTEMPT_ID_ALREADY_IN_USE/g) ?? []).length,
    2,
    "on kontrol ve unique violation handler'i ayni uygulama kodunu kullanmali",
  );
});

test("available gun ilk start'ta in_progress oluyor ve ilk started_at korunuyor", async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /if v_day_status = 'available' then\s+update public\.student_assignment_program_days\s+set\s+status = 'in_progress',\s+started_at = coalesce\(started_at, v_now\)\s+where id = v_program_day_id;/i,
  );
});

test("basari yaniti gerekli butun structured alanlari kesin olarak iceriyor", async () => {
  const sql = await readMigration();
  const successBlock = section(sql, "return jsonb_build_object(\n    'taskId', p_task_id", "end;\n$$;");
  for (const field of [
    "taskId",
    "attemptId",
    "startedAt",
    "expiresAt",
    "serverNow",
    "durationSeconds",
    "taskStatus",
    "dayStatus",
    "idempotent",
  ]) {
    assert.match(successBlock, new RegExp(`'${field}'`), `${field} eksik`);
  }
});

test("start yalniz secili task ve onun gununu guncelliyor; sonraki gun veya baska gorev acmiyor", async () => {
  const sql = await readMigration();
  const executable = executableSql(sql);
  assert.doesNotMatch(executable, /day_number\s*\+\s*1/i);
  assert.doesNotMatch(executable, /set\s+status\s*=\s*'available'/i);
  assert.equal(
    (executable.match(/update public\.student_assignment_program_tasks/g) ?? []).length,
    1,
  );
  assert.match(executable, /update public\.student_assignment_program_tasks[\s\S]*?where id = p_task_id;/i);
  assert.match(executable, /update public\.student_assignment_program_days[\s\S]*?where id = v_program_day_id;/i);
});

test("migration kati attempt check constraint'i veya mevcut veri rewrite'i eklemiyor", async () => {
  const sql = await readMigration();
  const executable = executableSql(sql);
  assert.doesNotMatch(executable, /add constraint[\s\S]*attempt_id/i);
  assert.doesNotMatch(executable, /drop column|drop table|truncate/i);
  assert.doesNotMatch(executable, /update public\.student_assignment_program_tasks\s+set\s+attempt_id\s*=\s*null/i);
});

test("migration mevcut completion RPC'sini tanimlamiyor, cagirmiyor veya kaldirmiyor", async () => {
  const sql = await readMigration();
  const executable = executableSql(sql);
  assert.doesNotMatch(
    executable,
    /create or replace function public\.complete_student_assignment_program_task/i,
  );
  assert.doesNotMatch(executable, /drop function public\.complete_student_assignment_program_task/i);
  assert.doesNotMatch(executable, /select public\.complete_student_assignment_program_task/i);
  assert.doesNotMatch(executable, /perform public\.complete_student_assignment_program_task/i);
});
