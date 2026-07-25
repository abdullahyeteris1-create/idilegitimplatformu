import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Bu dosya guclu bir STATIK SQL sozlesme testidir. Gercek PostgreSQL olmadan
// row-lock yarisi, 299/300 duvar-saati siniri ve rollback davranisini runtime
// seviyesinde kanitlamaz; migration'in bu davranislari kuran SQL'ini sabitler.

const MIGRATION_URL = new URL(
  "../supabase/migrations/20260725180000_add_atomic_assignment_task_completion.sql",
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

test("V2 completion RPC imzasi JSONB result payload ve JSONB response kullaniyor", async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /create or replace function public\.complete_student_assignment_program_task_v2\(\s*p_student_id uuid,\s*p_task_id uuid,\s*p_attempt_id uuid,\s*p_exercise_slug text,\s*p_result jsonb\s*\)\s*returns jsonb/i,
  );
});

test("RPC SECURITY DEFINER ve sabit guvenli search_path kullaniyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /^security definer$/m);
  assert.match(sql, /^set search_path = public, pg_temp$/m);
  for (const table of [
    "student_assignment_program_tasks",
    "student_assignment_program_days",
    "student_assignment_programs",
    "exercise_results",
    "students",
  ]) {
    assert.match(sql, new RegExp(`public\\.${table}`), `${table} schema-qualified olmali`);
  }
});

test("execute yalniz service_role'a veriliyor", async () => {
  const sql = await readMigration();
  const signature =
    String.raw`public\.complete_student_assignment_program_task_v2\(uuid, uuid, uuid, text, jsonb\)`;
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

test("null/bos parametreler sabit request hata kodlariyla reddediliyor", async () => {
  const sql = await readMigration();
  for (const code of [
    "INVALID_STUDENT_ID",
    "INVALID_TASK_ID",
    "INVALID_ATTEMPT_ID",
    "INVALID_EXERCISE_SLUG",
    "INVALID_RESULT_PAYLOAD",
  ]) {
    assert.match(sql, new RegExp(`raise exception '${code}:`), `${code} eksik`);
  }
  assert.match(sql, /jsonb_typeof\(p_result\) <> 'object'/);
});

test("task, day ve program sabit task -> day -> program sirasinda FOR UPDATE kilitleniyor", async () => {
  const sql = await readMigration();
  const taskLock = /from public\.student_assignment_program_tasks t\s+where t\.id = p_task_id\s+for update;/i;
  const dayLock = /from public\.student_assignment_program_days d\s+where d\.id = v_program_day_id[\s\S]*?for update;/i;
  const programLock = /from public\.student_assignment_programs p\s+where p\.id = v_program_id\s+for update;/i;
  assert.match(sql, taskLock);
  assert.match(sql, dayLock);
  assert.match(sql, programLock);
  assert.ok(sql.search(taskLock) < sql.search(dayLock), "task lock once gelmeli");
  assert.ok(sql.search(dayLock) < sql.search(programLock), "day lock program lock'tan once gelmeli");
});

test("gorev bulunamama ve sahiplik hatalari sabit", async () => {
  const sql = await readMigration();
  assert.match(sql, /TASK_NOT_FOUND/);
  assert.match(sql, /v_task_student_id <> p_student_id[\s\S]*?TASK_NOT_OWNED/i);
  assert.match(sql, /v_program_student_id <> p_student_id[\s\S]*?TASK_NOT_OWNED/i);
});

test("program, gun ve gorev status kontrolleri repository degerlerini kullaniyor", async () => {
  const sql = await readMigration();
  for (const code of [
    "PROGRAM_NOT_ACTIVE",
    "DAY_LOCKED",
    "DAY_ALREADY_COMPLETED",
    "NOT_CURRENT_DAY",
    "TASK_LOCKED",
    "TASK_NOT_STARTED",
    "TASK_CANCELLED",
  ]) {
    assert.match(sql, new RegExp(code), `${code} eksik`);
  }
  assert.match(sql, /v_program_status <> 'active'/);
  assert.match(sql, /v_day_status not in \('available', 'in_progress'\)/);
  assert.match(sql, /v_task_status <> 'in_progress'/);
});

test("daha kucuk tamamlanmamis gun NOT_CURRENT_DAY ile engelleniyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /earlier_day\.day_number < v_day_number/i);
  assert.match(sql, /earlier_day\.status <> 'completed'/i);
  assert.match(sql, /NOT_CURRENT_DAY: Daha kucuk numarali tamamlanmamis/i);
});

test("attempt null, stale ve eksik zaman durumlari ayri hatalara sahip", async () => {
  const sql = await readMigration();
  assert.match(sql, /v_task_attempt_id is null[\s\S]*?TASK_NOT_STARTED/i);
  assert.match(sql, /v_task_attempt_id <> p_attempt_id[\s\S]*?STALE_ATTEMPT/i);
  assert.match(
    sql,
    /v_task_started_at is null or v_task_expires_at is null[\s\S]*?INVALID_ATTEMPT_STATE/i,
  );
});

test("slug trim edilip canonical task slug'i ile eslestiriliyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /v_normalized_exercise_slug := btrim\(p_exercise_slug\)/i);
  assert.match(sql, /v_normalized_exercise_slug <> v_task_exercise_slug/i);
  assert.match(sql, /EXERCISE_MISMATCH/);
});

test("duration pozitif olmali ve client duration alani result allowlist'inde yok", async () => {
  const sql = await readMigration();
  assert.match(sql, /v_task_duration_seconds is null or v_task_duration_seconds <= 0/i);
  assert.match(sql, /INVALID_TASK_DURATION/);
  const allowlist = section(sql, "where result_key.key not in (", ") then");
  assert.doesNotMatch(allowlist, /durationSeconds|duration_seconds|completedAt|exerciseType/);
});

test("sunucu zamani bir kez aliniyor; 299.x ret ve 300 siniri equality ile kabul ediliyor", async () => {
  const sql = await readMigration();
  const executable = executableSql(sql);
  assert.equal(
    (executable.match(/clock_timestamp\(\)/gi) ?? []).length,
    1,
    "tek authoritative clock_timestamp olmali",
  );
  assert.match(sql, /v_now := clock_timestamp\(\)/i);
  assert.match(sql, /if v_now < v_task_expires_at then/i);
  assert.doesNotMatch(sql, /v_now <= v_task_expires_at/i);
  assert.match(sql, /ceil\(extract\(epoch from \(v_task_expires_at - v_now\)\)\)/i);
  assert.match(sql, /DURATION_NOT_ELAPSED: remainingSeconds=%/);
});

test("result ust seviye alanlari tam allowlist ile sinirli", async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /result_key\.key not in \(\s*'score', 'successRate', 'correctCount', 'wrongCount', 'level', 'details'\s*\)/i,
  );
  assert.match(sql, /RESULT_SCHEMA_INVALID: Bilinmeyen ust seviye result alani/);
});

test("score/success/count ortak sayisal semasi ve sinirlari dogrulaniyor", async () => {
  const sql = await readMigration();
  for (const field of ["score", "successRate", "correctCount", "wrongCount"]) {
    assert.match(
      sql,
      new RegExp(`jsonb_typeof\\(p_result -> '${field}'\\) <> 'number'`),
      `${field} number kontrolu eksik`,
    );
  }
  assert.match(sql, /v_score < -1000000 or v_score > 1000000/);
  assert.match(sql, /v_success_rate < 0 or v_success_rate > 100/);
  assert.match(sql, /correctCount'\)::numeric < 0/);
  assert.match(sql, /wrongCount'\)::numeric < 0/);
  assert.match(sql, /trunc\(\(p_result ->> 'correctCount'\)::numeric\)/);
  assert.match(sql, /trunc\(\(p_result ->> 'wrongCount'\)::numeric\)/);
});

test("level optional null/tam sayi; details null ise object'e normalize ediliyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /p_result \? 'level' and p_result -> 'level' <> 'null'::jsonb/i);
  assert.match(sql, /level null veya 1-1000 arasi tam sayi/i);
  assert.match(
    sql,
    /not \(p_result \? 'details'\) or p_result -> 'details' = 'null'::jsonb[\s\S]*?v_result_details := '\{\}'::jsonb/i,
  );
  assert.match(sql, /jsonb_typeof\(p_result -> 'details'\) <> 'object'/i);
});

test("details boyutu ve kimlik/sure/completion override anahtarlari reddediliyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /octet_length\(v_result_details::text\) > 8192/i);
  for (const key of [
    "student_id",
    "program_task_id",
    "attempt_id",
    "duration_seconds",
    "exercise_type",
    "completed_at",
  ]) {
    assert.match(sql, new RegExp(`'${key}'`), `${key} reserved detail listesinde olmali`);
  }
});

test("authoritative duration ve optional level server tarafinda details'e ekleniyor", async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /v_result_details := v_result_details\s+\|\| jsonb_build_object\('durationSeconds', v_task_duration_seconds\)/i,
  );
  assert.match(sql, /jsonb_build_object\('level', v_level\)/i);
});

test("dokuz assignment slug'i canonical result exercise type'a map ediliyor", async () => {
  const sql = await readMigration();
  const mappings = new Map([
    ["kare-gorme-alani", "square-vision"],
    ["ayni-olani-yakala", "catch-same"],
    ["benzer-kelimeler", "similar-words"],
    ["kelime-bulma", "word-finding"],
    ["goz-egzersizleri-kolonlar", "eye-columns"],
    ["takistoskop", "tachistoscope"],
    ["harf-rakam-sayma", "letter-number-counting-focus"],
    ["hafiza-gelistirme", "memory-game"],
    ["kart-eslestirme", "card-matching"],
  ]);
  for (const [slug, resultType] of mappings) {
    assert.match(
      sql,
      new RegExp(`when '${slug}' then '${resultType}'`),
      `${slug} -> ${resultType} eksik`,
    );
  }
});

test("result insert mevcut exercise_results kolon sozlesmesine uyuyor", async () => {
  const sql = await readMigration();
  const insert = section(
    sql,
    "insert into public.exercise_results (",
    "returning id into v_result_id;",
  );
  for (const column of [
    "student_id",
    "student_name",
    "username",
    "exercise_type",
    "exercise_title",
    "correct_count",
    "wrong_count",
    "score",
    "success_rate",
    "details",
    "completed_at",
    "program_task_id",
  ]) {
    assert.match(insert, new RegExp(`\\b${column}\\b`), `${column} insert'te eksik`);
  }
});

test("result insert ve task update ayni RPC govdesinde; task sonucu atomik bagliyor", async () => {
  const sql = await readMigration();
  const insertPosition = sql.indexOf("insert into public.exercise_results");
  const taskUpdatePosition = sql.indexOf("update public.student_assignment_program_tasks", insertPosition);
  assert.ok(insertPosition > 0);
  assert.ok(taskUpdatePosition > insertPosition);
  const taskUpdate = sql.slice(taskUpdatePosition, sql.indexOf("-- 8) Day completion", taskUpdatePosition));
  assert.match(taskUpdate, /status = 'completed'/);
  assert.match(taskUpdate, /result_id = v_result_id/);
  assert.match(taskUpdate, /completed_at = v_now/);
  assert.match(taskUpdate, /completion_reason = 'duration_completed'/);
  assert.match(taskUpdate, /attempt_id = p_attempt_id/);
  assert.doesNotMatch(taskUpdate, /attempt_id\s*=\s*null|started_at\s*=|expires_at\s*=|last_heartbeat_at\s*=/i);
});

test("completion_reason check'i duration_completed degerini geriye uyumlu ekliyor", async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /completion_reason in \('result_submitted', 'time_expired', 'duration_completed'\)/i,
  );
});

test("gun gercek task sayisini tasks_per_day ile capraz kontrol ediyor", async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /count\(\*\),\s*count\(\*\) filter \(where t\.status = 'completed'\)/i,
  );
  assert.match(sql, /v_total_tasks_in_day <> v_tasks_per_day/i);
  assert.match(sql, /v_completed_tasks_in_day = v_total_tasks_in_day/i);
});

test("ilk dort gorevde gun ve sonraki gun ilerlemesi calismiyor", async () => {
  const sql = await readMigration();
  const dayProgress = section(sql, "-- 8) Day completion", "return jsonb_build_object(");
  assert.match(dayProgress, /if v_completed_tasks_in_day = v_total_tasks_in_day then/i);
  assert.match(dayProgress, /if v_day_completed and v_day_number >= v_total_days then/i);
  assert.match(dayProgress, /elsif v_day_completed then/i);
});

test("besinci gorev gunu completed yapiyor ve completed_days saymakla turetiliyor", async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /update public\.student_assignment_program_days\s+set\s+status = 'completed',\s+completed_at = v_now/i,
  );
  assert.match(
    sql,
    /select count\(\*\)\s+into v_completed_days\s+from public\.student_assignment_program_days d[\s\S]*?d\.status = 'completed'/i,
  );
  assert.doesNotMatch(sql, /completed_days\s*=\s*completed_days\s*\+\s*1/i);
});

test("yalniz day_number + 1 kilitleniyor ve locked ise available oluyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /d\.day_number = v_day_number \+ 1\s+for update;/i);
  assert.match(
    sql,
    /if v_next_day_status = 'locked' then\s+update public\.student_assignment_program_days\s+set\s+status = 'available'/i,
  );
  assert.doesNotMatch(executableSql(sql), /v_day_number\s*\+\s*2/i);
});

test("sonraki gunun yalniz locked task'lari available yapiliyor", async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /update public\.student_assignment_program_tasks\s+set status = 'available'\s+where program_day_id = v_next_day_id\s+and status = 'locked';/i,
  );
  assert.doesNotMatch(
    sql,
    /where program_day_id = v_next_day_id[\s\S]*?status in \('completed', 'cancelled'\)/i,
  );
});

test("son gun programi completed ve completed_at=v_now yapiyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /v_day_completed and v_day_number >= v_total_days/i);
  assert.match(
    sql,
    /update public\.student_assignment_programs\s+set\s+status = 'completed',\s+completed_days = v_completed_days,\s+completed_at = v_now/i,
  );
});

test("ayni attempt completed retry yeni result olusturmadan idempotent true donuyor", async () => {
  const sql = await readMigration();
  const idempotency = section(sql, "-- 3) Completed-task idempotency", "-- 4) Fresh completion");
  assert.match(idempotency, /if v_task_status = 'completed' then/i);
  assert.match(idempotency, /v_task_attempt_id is distinct from p_attempt_id/i);
  assert.match(idempotency, /from public\.exercise_results r/i);
  assert.match(idempotency, /r\.program_task_id = p_task_id/i);
  assert.match(idempotency, /'idempotent', true/i);
  assert.doesNotMatch(idempotency, /insert into public\.exercise_results/i);
});

test("farkli attempt completed gorev ve tutarsiz completed veri guvenli reddediliyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /ALREADY_COMPLETED_BY_ANOTHER_ATTEMPT/);
  assert.match(sql, /v_task_result_id is null or v_task_completed_at is null/i);
  assert.match(sql, /DATA_INTEGRITY_ERROR: Tamamlanmis gorevin bagli sonucu bulunamadi/i);
});

test("program_task result unique race ham PostgreSQL hatasi sizdirmiyor", async () => {
  const sql = await readMigration();
  assert.match(sql, /when unique_violation then/i);
  assert.match(sql, /v_constraint_name = 'exercise_results_program_task_id_uidx'/i);
  assert.match(sql, /DATA_INTEGRITY_ERROR: Gorev icin zaten bagli bir result satiri var/i);
});

test("result/task/day/next-day/program yazmalari tek fonksiyonda ve explicit commit olmadan atomik", async () => {
  const sql = await readMigration();
  const executable = executableSql(sql);
  for (const operation of [
    "insert into public.exercise_results",
    "update public.student_assignment_program_tasks",
    "update public.student_assignment_program_days",
    "update public.student_assignment_programs",
  ]) {
    assert.match(executable, new RegExp(operation.replaceAll(".", String.raw`\.`), "i"));
  }
  assert.doesNotMatch(executable, /\bcommit\b|\brollback\b|dblink/i);
  assert.match(sql, /Result olustu ancak gorev atomik olarak tamamlanamadi/i);
});

test("basari yaniti API fazinin gerektirdigi tum alanlari iceriyor", async () => {
  const sql = await readMigration();
  const fields = [
    "ok",
    "idempotent",
    "taskId",
    "attemptId",
    "resultId",
    "taskCompleted",
    "dayCompleted",
    "completedTasksInDay",
    "totalTasksInDay",
    "nextDayUnlocked",
    "programCompleted",
    "completedDays",
    "totalDays",
    "serverCompletedAt",
  ];
  for (const field of fields) {
    assert.match(sql, new RegExp(`'${field}'`), `${field} response'ta eksik`);
  }
});

test("istenen tum sabit V2 hata kodlari migration'da bulunuyor", async () => {
  const sql = await readMigration();
  const codes = [
    "INVALID_STUDENT_ID",
    "INVALID_TASK_ID",
    "INVALID_ATTEMPT_ID",
    "INVALID_EXERCISE_SLUG",
    "INVALID_RESULT_PAYLOAD",
    "TASK_NOT_FOUND",
    "TASK_NOT_OWNED",
    "PROGRAM_NOT_ACTIVE",
    "DAY_LOCKED",
    "DAY_ALREADY_COMPLETED",
    "NOT_CURRENT_DAY",
    "TASK_LOCKED",
    "TASK_NOT_STARTED",
    "TASK_CANCELLED",
    "STALE_ATTEMPT",
    "INVALID_ATTEMPT_STATE",
    "INVALID_TASK_DURATION",
    "EXERCISE_MISMATCH",
    "DURATION_NOT_ELAPSED",
    "RESULT_SCHEMA_INVALID",
    "ALREADY_COMPLETED_BY_ANOTHER_ATTEMPT",
    "DATA_INTEGRITY_ERROR",
  ];
  for (const code of codes) {
    assert.match(sql, new RegExp(code), `${code} eksik`);
  }
});

test("migration eski completion RPC'sini veya Faz 1 start RPC'sini degistirmiyor", async () => {
  const sql = executableSql(await readMigration());
  assert.doesNotMatch(
    sql,
    /create or replace function public\.complete_student_assignment_program_task\(/i,
  );
  assert.doesNotMatch(sql, /drop function public\.complete_student_assignment_program_task/i);
  assert.doesNotMatch(
    sql,
    /create or replace function public\.start_student_assignment_program_task\(/i,
  );
  assert.doesNotMatch(sql, /drop function public\.start_student_assignment_program_task/i);
});
