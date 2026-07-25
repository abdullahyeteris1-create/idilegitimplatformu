import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MIGRATION_URL = new URL(
  "../supabase/migrations/20260725170000_create_education_program_template_system.sql",
  import.meta.url,
);

async function readMigration() {
  return readFile(MIGRATION_URL, "utf8");
}

test("migration yalniz uc education program sablon tablosunu olusturur", async () => {
  const sql = await readMigration();
  const tables = [...sql.matchAll(/create table if not exists public\.([a-z_]+)/g)]
    .map((match) => match[1]);

  assert.deepEqual(tables, [
    "education_program_templates",
    "education_program_template_days",
    "education_program_template_tasks",
  ]);
  assert.doesNotMatch(sql, /create table if not exists public\.student_education_program/);
});

test("migration kategori, 1-60 gun ve 1-5 sira constraintlerini icerir", async () => {
  const sql = await readMigration();

  for (const category of [
    "grade_1",
    "grade_2",
    "grade_3",
    "grade_4",
    "grade_5_6",
    "grade_7_8",
    "high_school",
    "general_adult",
  ]) {
    assert.match(sql, new RegExp(`'${category}'`));
  }

  assert.match(sql, /day_count between 1 and 60/);
  assert.match(sql, /day_number between 1 and 60/);
  assert.match(sql, /order_number between 1 and 5/);
});

test("migration her tabloda RLS force ve anon-authenticated revoke uygular", async () => {
  const sql = await readMigration();

  for (const table of [
    "education_program_templates",
    "education_program_template_days",
    "education_program_template_tasks",
  ]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated`));
  }
});

test("migration RPC, student tablosu veya mevcut alanlara bagimlilik eklemez", async () => {
  const sql = await readMigration();

  assert.doesNotMatch(sql, /security definer/i);
  assert.doesNotMatch(sql, /grant execute on function/i);
  assert.doesNotMatch(sql, /student_education_program/i);
  assert.doesNotMatch(sql, /student_assignment_program/i);
  assert.doesNotMatch(sql, /daily_assignment/i);
  assert.doesNotMatch(sql, /program_class_template/i);
});

test("migration ayni gun sira ve ayni gun egzersiz tekrarini engeller", async () => {
  const sql = await readMigration();

  assert.match(sql, /unique \(template_day_id, order_number\)/);
  assert.match(
    sql,
    /on public\.education_program_template_tasks \(template_day_id, exercise_slug\)[\s\S]*where exercise_slug is not null/,
  );
});
