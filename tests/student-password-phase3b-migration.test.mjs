import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/20260731130000_secure_student_password_writes_v1.sql";
const migration = await readFile(migrationPath, "utf8");
const updateRoute = await readFile("src/app/api/admin/students/[studentId]/route.ts", "utf8");
const createRoute = await readFile("src/app/api/admin/students/route.ts", "utf8");
const bulkRoute = await readFile("src/app/api/admin/students/bulk/route.ts", "utf8");

test("Faz 3B migration password kolonunu nullable yapar ve toplu null güncellemesi içermez", () => {
  assert.match(migration, /alter table if exists public\.students[\s\S]*alter column password drop not null/);
  assert.doesNotMatch(migration, /update public\.students[\s\S]*where id is null/i);
  assert.match(migration, /update public\.students[\s\S]*password\s*=\s*null[\s\S]*where public\.students\.id\s*=\s*p_student_id/i);
});

test("atomik admin parola RPC'si hash, legacy null ve session sürümünü birlikte günceller", () => {
  assert.match(migration, /create or replace function public\.admin_update_student_password_v1/);
  assert.match(migration, /password = null/);
  assert.match(migration, /password_hash = p_password_hash/);
  assert.match(migration, /password_hash_version = p_password_hash_version/);
  assert.match(migration, /password_changed_at = now\(\)/);
  assert.match(migration, /session_version = coalesce\(public\.students\.session_version, 0\) \+ 1/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = public, pg_temp/);
  assert.match(migration, /grant execute on function public\.admin_update_student_password_v1\(uuid, text, smallint\) to service_role/);
  assert.match(updateRoute, /admin_update_student_password_v1/);
});

test("oluşturma ve CSV bulk payload'ları plaintext password yazmaz", () => {
  for (const source of [createRoute, bulkRoute]) {
    assert.match(source, /password_hash/);
    assert.doesNotMatch(source, /\bpassword,\s*password_hash/);
  }
});
