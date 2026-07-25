import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MIGRATION_URL = new URL(
  "../supabase/migrations/20260725200000_complete_education_program_task_rpc.sql",
  import.meta.url,
);

async function readMigration() {
  return readFile(MIGRATION_URL, "utf8");
}

// 1) RPC dogru adla olusturuluyor. 2) Parametreler studentId ve taskId ile sinirli.
test("1/2) RPC dogru adla ve yalniz p_student_id/p_task_id parametreleriyle olusturuluyor", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /create or replace function public\.complete_education_program_task_v1\(\s*p_student_id uuid,\s*p_task_id uuid\s*\)/,
  );
  assert.match(sql, /returns jsonb/);
});

// 3-8) security definer, fixed search_path, revoke/grant.
test("3-8) security definer, sabit search_path, revoke/grant tam olarak dogru", async () => {
  const sql = await readMigration();

  assert.match(sql, /security definer\s*\nset search_path = public, pg_temp/);
  assert.match(
    sql,
    /revoke all on function public\.complete_education_program_task_v1\(uuid, uuid\) from public/,
  );
  assert.match(
    sql,
    /revoke all on function public\.complete_education_program_task_v1\(uuid, uuid\) from anon/,
  );
  assert.match(
    sql,
    /revoke all on function public\.complete_education_program_task_v1\(uuid, uuid\) from authenticated/,
  );
  assert.match(
    sql,
    /grant execute on function public\.complete_education_program_task_v1\(uuid, uuid\) to service_role/,
  );
});

// 9) task row lock var.
test("9) task satiri for update ile kilitleniyor", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /from public\.student_education_program_tasks t\s+where t\.id = p_task_id\s+for update/,
  );
});

// 10) program/day lock stratejisi var.
test("10) program ve gun satirlari for update ile kilitleniyor", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /from public\.student_education_programs p\s+where p\.id = v_program_id\s+for update/,
  );
  assert.match(
    sql,
    /from public\.student_education_program_days d\s+where d\.id = v_program_day_id\s+for update/,
  );
});

// 11) ownership kontrolu var.
test("11) gorev sahiplik kontrolu (student_id) mevcuttur", async () => {
  const sql = await readMigration();

  assert.match(sql, /if v_task_student_id <> p_student_id then/);
  assert.match(sql, /EDUCATION_TASK_COMPLETE_STUDENT_MISMATCH/);
});

// 12) program active guard var.
test("12) program active guard mevcuttur", async () => {
  const sql = await readMigration();

  assert.match(sql, /if v_program_status <> 'active' then/);
  assert.match(sql, /EDUCATION_TASK_COMPLETE_PROGRAM_NOT_ACTIVE/);
});

// 13) day status guard var.
test("13) gun available/in_progress guard mevcuttur", async () => {
  const sql = await readMigration();

  assert.match(sql, /if v_day_status not in \('available', 'in_progress'\) then/);
  assert.match(sql, /EDUCATION_TASK_COMPLETE_DAY_NOT_AVAILABLE/);
});

// 14) task in_progress guard var.
test("14) task in_progress guard mevcuttur, locked/available reddedilir", async () => {
  const sql = await readMigration();

  assert.match(sql, /if v_task_status <> 'in_progress' then/);
  assert.match(sql, /EDUCATION_TASK_COMPLETE_TASK_NOT_IN_PROGRESS/);
});

// 15) completed task idempotent branch var.
test("15) task zaten completed ise idempotent kisa-devre mevcuttur", async () => {
  const sql = await readMigration();
  const idempotentBranch =
    sql.split("if v_task_status = 'completed' then")[1]?.split("if v_task_status <> 'in_progress'")[0] ?? "";

  assert.notEqual(idempotentBranch, "");
  assert.match(idempotentBranch, /'already_completed', true/);
  assert.doesNotMatch(idempotentBranch, /update public\./);
});

// 16) task completed_at COALESCE veya esdeger ilk-yazim korumasi var.
test("16) task completed_at yalniz gercek tamamlamada (idempotent dalinda degil) yazilir", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /update public\.student_education_program_tasks\s+set status = 'completed', completed_at = now\(\)\s+where id = p_task_id;/,
  );
  // Idempotent dal bu UPDATE'i hic calistirmiyor (15. testte doesNotMatch ile
  // zaten dogrulandi) - yani completed_at yalniz task ilk kez completed
  // olurken yazilir, tekrar cagride asla ezilmez.
});

// 17) siradaki locked task ORDER BY + LIMIT 1 ile aciliyor. 18) yalniz tek gorev available yapiliyor.
test("17/18) siradaki TEK kilitli gorev order_number ASC + LIMIT 1 ile aciliyor", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /where program_day_id = v_program_day_id\s+and order_number > v_order_number\s+and status = 'locked'\s+order by order_number asc\s+limit 1/,
  );
  assert.match(
    sql,
    /update public\.student_education_program_tasks\s+set status = 'available'\s+where id = v_unlocked_task_id\s+and status = 'locked';/,
  );
});

// 19) gunun tum gorevlerinin completed oldugu kontrol ediliyor.
test("19) gunun tum gorevlerinin completed oldugu dinamik COUNT ile kontrol ediliyor", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /count\(\*\) filter \(where status = 'completed'\),\s*count\(\*\)\s*\n\s*into v_completed_task_count, v_total_task_count\s*\n\s*from public\.student_education_program_tasks\s+where program_day_id = v_program_day_id/,
  );
  assert.match(sql, /if v_completed_task_count >= v_total_task_count and v_day_status <> 'completed' then/);
});

// 20) day completed_at ilk-yazim korumasi var.
test("20) gun completed_at yalniz gun henuz completed degilken yazilir", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /update public\.student_education_program_days\s+set status = 'completed', completed_at = now\(\)\s+where id = v_program_day_id\s+and status <> 'completed';/,
  );
});

// 21) sonraki gun ORDER BY day_number + LIMIT 1 ile bulunuyor.
test("21) sonraki gun day_number ASC + LIMIT 1 ile bulunuyor", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /from public\.student_education_program_days\s+where program_id = v_program_id\s+and day_number > v_day_number\s+order by day_number asc\s+limit 1/,
  );
});

// 22) sonraki gun available yapiliyor.
test("22) sonraki gun yalniz locked ise available yapiliyor", async () => {
  const sql = await readMigration();

  assert.match(sql, /if v_next_day_status = 'locked' then/);
  assert.match(
    sql,
    /update public\.student_education_program_days\s+set status = 'available', available_at = now\(\)\s+where id = v_next_day_id\s+and status = 'locked';/,
  );
});

// 23) sonraki gunun ilk gorevi available yapiliyor.
test("23) sonraki gunun yalniz order_number=1 gorevi available yapiliyor", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /from public\.student_education_program_tasks\s+where program_day_id = v_next_day_id\s+and order_number = 1/,
  );
  assert.match(
    sql,
    /update public\.student_education_program_tasks\s+set status = 'available'\s+where id = v_next_day_first_task_id\s+and status = 'locked';/,
  );
});

// 24) program completed yapiliyor.
test("24) sonraki gun yoksa (son gun) program completed yapiliyor", async () => {
  const sql = await readMigration();

  assert.match(sql, /if v_day_number >= v_program_total_days then/);
  assert.match(
    sql,
    /update public\.student_education_programs\s+set status = 'completed', completed_at = now\(\)\s+where id = v_program_id\s+and status <> 'completed';/,
  );
});

// 25) program completed_at ilk-yazim korumasi var.
test("25) program completed_at yalniz status completed degilken yazilir", async () => {
  const sql = await readMigration();
  const programCompleteStatement = sql.match(
    /update public\.student_education_programs\s+set status = 'completed', completed_at = now\(\)\s+where id = v_program_id\s+and status <> 'completed';/,
  );

  assert.notEqual(programCompleteStatement, null);
});

// 26) completed_days drift-safe guncelleniyor.
test("26) completed_days kor +1 yerine gercek COUNT ile guncelleniyor", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /select count\(\*\)\s+into v_result_completed_days\s+from public\.student_education_program_days\s+where program_id = v_program_id\s+and status = 'completed';/,
  );
  assert.doesNotMatch(sql, /completed_days\s*=\s*completed_days\s*\+\s*1/);
  assert.doesNotMatch(sql, /completed_days\s*=\s*v_day_number/);
});

// 27) current_day_number guvenli guncelleniyor.
test("27) current_day_number yalniz ileri yonde ve gecerli sonraki gune guncelleniyor", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /update public\.student_education_programs\s+set current_day_number = v_next_day_number\s+where id = v_program_id\s+and current_day_number < v_next_day_number;/,
  );
});

// 28) raw client studentId trust edilmedigi server-only model korunuyor.
test("28) studentId dogrudan client'tan degil, parametre olarak zorunlu tutuluyor", async () => {
  const sql = await readMigration();

  assert.match(sql, /p_student_id uuid/);
  assert.match(sql, /if p_student_id is null or p_task_id is null then/);
  assert.match(sql, /EDUCATION_TASK_COMPLETE_INVALID_INPUT/);
});

// 29) ogrenci UPDATE policy/grant eklenmiyor.
test("29) ogrenciye/authenticated'a hicbir UPDATE grant'i eklenmiyor", async () => {
  const sql = await readMigration();

  assert.doesNotMatch(sql, /grant\s+(update|insert|delete|select)\s+on\s+(table\s+)?public\.student_education_program/i);
  assert.doesNotMatch(sql, /create policy/i);
  assert.doesNotMatch(sql, /to authenticated/i);
});

// 30) Assignment V2 tablolarina dokunulmuyor.
test("30) Assignment System V2 tablolarina/RPC'lerine hicbir bagimlilik yoktur", async () => {
  const sql = await readMigration();

  assert.doesNotMatch(sql, /public\.student_assignment_program/);
  assert.doesNotMatch(sql, /public\.daily_assignment/);
  assert.doesNotMatch(sql, /public\.exercise_results/);
  assert.doesNotMatch(sql, /complete_student_assignment_program_task/);
});

// 31) launch RPC degistirilmemis (ayri dosya, bu migration hic dokunmuyor).
test("31) start_education_program_task_v1 (launch RPC) bu migration'da hic gecmiyor", async () => {
  const sql = await readMigration();

  assert.doesNotMatch(sql, /start_education_program_task_v1/);
});

// 32) migration yalniz beklenen bounded context'i etkiliyor.
test("32) migration yalniz student_education_program_* tablolarina ve yeni RPC'ye dokunuyor", async () => {
  const sql = await readMigration();

  assert.doesNotMatch(sql, /create table/i);
  assert.doesNotMatch(sql, /alter table.*add column/is);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /create index|create unique index/i);
  assert.match(sql, /student_education_program_tasks|student_education_program_days|student_education_programs/);
});

test("sirali gun-ici gorev acma modeli (Assignment V2'nin 'hepsi birden' modelinden farkli) belgelenmis ve uygulanmis", async () => {
  const sql = await readMigration();

  assert.match(sql, /order_number > v_order_number/);
  assert.match(sql, /order by order_number asc\s+limit 1/);
});

test("guvenli ozet donusu ham DB hatasi/kisisel veri icermez", async () => {
  const sql = await readMigration();
  const returnBlock = sql.slice(sql.lastIndexOf("return jsonb_build_object("));

  assert.doesNotMatch(returnBlock, /student_id/);
  assert.doesNotMatch(returnBlock, /SQLERRM/);
});
