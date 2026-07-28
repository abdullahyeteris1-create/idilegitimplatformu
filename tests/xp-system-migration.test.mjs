import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MIGRATION_URL = new URL("../supabase/migrations/20260728100000_create_student_xp_system.sql", import.meta.url);

async function readMigration() {
  return readFile(MIGRATION_URL, "utf8");
}

test("1-3) XP tablolari ve temel kural seti vardir", async () => {
  const sql = await readMigration();

  assert.match(sql, /create table if not exists public\.student_xp_events/);
  assert.match(sql, /create table if not exists public\.student_xp_summary/);
  assert.match(sql, /unique \(student_id, idempotency_key\)/);
  assert.match(sql, /student_xp_events_xp_amount_check check \(xp_amount > 0\)/);
  assert.match(sql, /student_xp_events_event_type_check check \(btrim\(event_type\) <> ''\)/);
  assert.match(sql, /student_xp_events_idempotency_key_check check \(btrim\(idempotency_key\) <> ''\)/);
  assert.match(sql, /student_xp_summary_total_xp_check check \(total_xp >= 0\)/);
});

test("4-8) RLS ve service_role yetkileri kilitlidir", async () => {
  const sql = await readMigration();

  for (const table of ["student_xp_events", "student_xp_summary"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated`));
    assert.match(sql, new RegExp(`grant select, insert, update, delete on public\\.${table} to service_role`));
  }

  assert.match(sql, /create or replace function public\.award_student_xp_v1/);
  assert.match(sql, /security definer\s+set search_path = public, pg_temp/);
  assert.match(sql, /revoke all on function public\.award_student_xp_v1\(uuid, text, text, text, text, jsonb\) from public/);
  assert.match(sql, /revoke all on function public\.award_student_xp_v1\(uuid, text, text, text, text, jsonb\) from anon/);
  assert.match(sql, /revoke all on function public\.award_student_xp_v1\(uuid, text, text, text, text, jsonb\) from authenticated/);
  assert.match(sql, /grant execute on function public\.award_student_xp_v1\(uuid, text, text, text, text, jsonb\) to service_role/);
});

test("9-10) login_first_of_day için 10 XP verilir ve summary ayni fonksiyonda guncellenir", async () => {
  const sql = await readMigration();

  assert.match(sql, /when 'login_first_of_day' then\s+v_xp_amount := 10;/);
  assert.match(sql, /raise exception 'XP_AWARD_UNSUPPORTED_EVENT_TYPE'/);
  assert.match(sql, /insert into public\.student_xp_events/);
  assert.match(sql, /insert into public\.student_xp_summary \(student_id, total_xp, updated_at\)/);
  assert.match(sql, /on conflict \(student_id\) do update/);
  assert.match(sql, /when unique_violation then/);
});

