import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MIGRATION_URL = new URL(
  "../supabase/migrations/20260725180000_create_student_education_program_system.sql",
  import.meta.url,
);

async function readMigration() {
  return readFile(MIGRATION_URL, "utf8");
}

test("migration tam uc student education program tablosu olusturur", async () => {
  const sql = await readMigration();
  const tables = [...sql.matchAll(/create table if not exists public\.([a-z_]+)/g)]
    .map((match) => match[1]);

  assert.deepEqual(tables, [
    "student_education_programs",
    "student_education_program_days",
    "student_education_program_tasks",
  ]);
  assert.doesNotMatch(sql, /public\.student_assignment_program/);
  assert.doesNotMatch(sql, /public\.daily_assignment/);
});

test("program, gun ve gorev foreign key ve silme davranislari dogrudur", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /student_id uuid not null\s+references public\.students\(id\)\s+on delete restrict/,
  );
  assert.match(
    sql,
    /source_template_id uuid\s+references public\.education_program_templates\(id\)\s+on delete set null/,
  );
  assert.match(
    sql,
    /program_id uuid not null\s+references public\.student_education_programs\(id\)\s+on delete cascade/,
  );
  assert.match(
    sql,
    /program_day_id uuid not null\s+references public\.student_education_program_days\(id\)\s+on delete cascade/,
  );
});

test("aktif program unique indexi, status ve aralik kontrolleri mevcuttur", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /create unique index if not exists student_education_programs_one_active_per_student[\s\S]*where status = 'active'/,
  );
  assert.match(sql, /status in \('active', 'completed', 'cancelled'\)/);
  assert.match(
    sql,
    /status in \('locked', 'available', 'in_progress', 'completed'\)/,
  );
  assert.match(sql, /total_days between 1 and 60/);
  assert.match(sql, /current_day_number between 1 and 60/);
  assert.match(sql, /completed_days between 0 and 60/);
  assert.match(sql, /completed_days <= total_days/);
  assert.match(sql, /current_day_number <= total_days/);
  assert.match(sql, /day_number between 1 and 60/);
  assert.match(sql, /order_number between 1 and 5/);
  assert.match(sql, /duration_seconds > 0/);
  assert.match(sql, /jsonb_typeof\(settings\) = 'object'/);
  assert.match(sql, /unique \(program_id, day_number\)/);
  assert.match(sql, /unique \(program_day_id, order_number\)/);
});

test("uc tabloda RLS zorlanir ve dogrudan kullanici yetkileri kaldirilir", async () => {
  const sql = await readMigration();

  for (const table of [
    "student_education_programs",
    "student_education_program_days",
    "student_education_program_tasks",
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated`));
    assert.match(
      sql,
      new RegExp(
        `grant select, insert, update, delete on public\\.${table} to service_role`,
      ),
    );
    assert.match(sql, new RegExp(`before update on public\\.${table}`));
  }
});

test("snapshot RPC security definer ve yalniz service_role yetkilidir", async () => {
  const sql = await readMigration();

  assert.match(sql, /create or replace function public\.assign_education_program_template_v1/);
  assert.match(sql, /security definer\s+set search_path = public, pg_temp/);
  assert.match(
    sql,
    /revoke all on function public\.assign_education_program_template_v1\([\s\S]*\) from public/,
  );
  assert.match(
    sql,
    /revoke all on function public\.assign_education_program_template_v1\([\s\S]*\) from anon/,
  );
  assert.match(
    sql,
    /revoke all on function public\.assign_education_program_template_v1\([\s\S]*\) from authenticated/,
  );
  assert.match(
    sql,
    /grant execute on function public\.assign_education_program_template_v1\([\s\S]*\) to service_role/,
  );
});

test("RPC gecerli yayinlanmis ve aktif sablon ile aktif ogrenciyi zorunlu tutar", async () => {
  const sql = await readMigration();

  assert.match(sql, /STUDENT_EDUCATION_STUDENT_NOT_FOUND/);
  assert.match(sql, /STUDENT_EDUCATION_STUDENT_INACTIVE/);
  assert.match(sql, /STUDENT_EDUCATION_TEMPLATE_NOT_FOUND/);
  assert.match(sql, /if not v_template\.is_active/);
  assert.match(sql, /if v_template\.status <> 'published'/);
  assert.match(sql, /STUDENT_EDUCATION_TEMPLATE_NOT_PUBLISHED/);
  assert.match(sql, /STUDENT_EDUCATION_TEMPLATE_INVALID/);
});

test("RPC eksiksiz gunleri, her gun 1-5 tam bes gorevi ve toplam kopya sayisini dogrular", async () => {
  const sql = await readMigration();

  assert.match(sql, /v_first_day <> 1/);
  assert.match(sql, /v_last_day <> v_template\.day_count/);
  assert.match(sql, /having count\(t\.id\) <> 5/);
  assert.match(sql, /count\(distinct t\.order_number\) <> 5/);
  assert.match(sql, /min\(t\.order_number\) <> 1/);
  assert.match(sql, /max\(t\.order_number\) <> 5/);
  assert.match(sql, /v_task_count <> v_template\.day_count \* 5/);
  assert.match(
    sql,
    /from public\.student_education_program_tasks\s+where program_id = v_program_id\s+\) <> v_template\.day_count \* 5/,
  );
});

test("20 gunluk sablon RPC sozlesmesine gore 20 gun ve 100 gorev snapshotlar", async () => {
  const sql = await readMigration();

  assert.match(sql, /insert into public\.student_education_program_days/);
  assert.match(sql, /insert into public\.student_education_program_tasks/);
  assert.match(sql, /v_template\.day_count \* 5/);
  assert.equal(20 * 5, 100);
});

test("ilk gun ve ilk gorev available, kalan snapshot kayitlari locked olur", async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /case when d\.day_number = 1 then 'available' else 'locked' end/,
  );
  assert.match(
    sql,
    /when template_day\.day_number = 1 and template_task\.order_number = 1\s+then 'available'\s+else 'locked'/,
  );
});

test("snapshot tum gerekli sablon alanlarini kopyalar ve yonetici metadata'sini kopyalamaz", async () => {
  const sql = await readMigration();
  const taskInsert = sql.match(
    /insert into public\.student_education_program_tasks \([\s\S]*?from public\.education_program_template_days template_day[\s\S]*?order by template_day\.day_number, template_task\.order_number;/,
  )?.[0] ?? "";
  const dayInsert = sql.match(
    /insert into public\.student_education_program_days \([\s\S]*?from public\.education_program_template_days d[\s\S]*?order by d\.day_number;/,
  )?.[0] ?? "";

  for (const field of [
    "exercise_slug",
    "exercise_title",
    "result_exercise_type",
    "starting_level",
    "duration_seconds",
    "settings_schema_version",
    "settings",
  ]) {
    assert.match(taskInsert, new RegExp(`template_task\\.${field}`));
  }
  assert.match(dayInsert, /d\.title/);
  assert.match(dayInsert, /d\.description/);
  assert.doesNotMatch(taskInsert, /category|admin_description|published_at/);
  assert.doesNotMatch(dayInsert, /category|admin_description|published_at/);
});

test("snapshot sonradan sablon degisikliginden bagimsiz kalacak fiziksel kopyadir", async () => {
  const sql = await readMigration();

  assert.match(sql, /insert into public\.student_education_program_days/);
  assert.match(sql, /insert into public\.student_education_program_tasks/);
  assert.doesNotMatch(
    sql,
    /create\s+(?:or replace\s+)?view\s+public\.student_education_program/i,
  );
  assert.doesNotMatch(sql, /on update cascade/i);
});

test("kategori uyusmazligi atamayi engellemez", async () => {
  const sql = await readMigration();
  const rpc = sql.split(
    "create or replace function public.assign_education_program_template_v1",
  )[1] ?? "";

  assert.doesNotMatch(rpc, /v_template\.category|class_name|education_level/);
});

test("ikinci ve eszamanli aktif atamalar tek programla sinirlanir", async () => {
  const sql = await readMigration();

  assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\(p_student_id::text, 0\)\)/);
  assert.match(sql, /where student_id = p_student_id\s+and status = 'active'/);
  assert.match(sql, /when unique_violation then/);
  assert.match(sql, /STUDENT_EDUCATION_ACTIVE_PROGRAM_EXISTS/);
});

test("migration completion, sonuc inserti ve assignment bagimliligi eklemez", async () => {
  const sql = await readMigration();

  assert.doesNotMatch(sql, /create or replace function public\..*complete/i);
  assert.doesNotMatch(sql, /insert into public\.exercise_results/i);
  assert.doesNotMatch(sql, /public\.student_assignment_program/);
  assert.doesNotMatch(sql, /public\.daily_assignment/);
  assert.doesNotMatch(sql, /public\.assignment_/);
});
