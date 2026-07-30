import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const client = read("src/app/egzersizler/buyuyen-sekiller-altigen/GrowingShapesHexagonExerciseClient.tsx");
const page = read("src/app/egzersizler/buyuyen-sekiller-altigen/page.tsx");
const migration = read("supabase/migrations/20260730140000_add_buyuyen_sekiller_altigen_to_exercise_whitelist.sql");

test("growing shapes route and result identity are integrated", () => {
  assert.match(page, /buyuyen-sekiller-altigen/);
  assert.match(client, /growing-shapes-hexagon/);
  assert.match(client, /Büyüyen Şekiller/);
  assert.match(client, /useEducationProgramTaskCompletion\(educationProgramLaunch\?\.taskId, EXERCISE_TYPE\)/);
});

test("animation settings are applied and lifecycle cleanup is explicit", () => {
  assert.match(client, /getGrowingShapesProgress\(/);
  assert.match(client, /jumpDurationMs, jumpEndDurationMs/);
  assert.match(client, /cancelAnimationFrame/);
  assert.match(client, /clearInterval/);
  assert.match(client, /window\.addEventListener\("resize"/);
  assert.match(client, /AudioContext/);
  assert.match(client, /stopAudio/);
});

test("migration preserves the RPC contract and adds only the new slug", () => {
  assert.match(migration, /create or replace function public\.assign_education_program_template_v1/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = public, pg_temp/);
  assert.match(migration, /'buyuyen-sekiller-altigen'/);
  assert.match(migration, /grant execute on function public\.assign_education_program_template_v1\(uuid, uuid, text, text, text, text\) to service_role/);
  assert.equal(migration.includes("13-nokta-emoji-takip"), true);
});

test("the new migration is not executed by the test suite", () => {
  assert.equal(migration.includes("supabase db push"), false);
});
