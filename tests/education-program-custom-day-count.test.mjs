import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { mapActiveEducationProgramForStudent } from "../src/lib/education-programs/studentProgramRepository.ts";

const MIGRATION_PATH =
  "supabase/migrations/20260810120000_repair_education_program_assignment_whitelist.sql";
const BASE_ASSIGNMENT_MIGRATION_PATH =
  "supabase/migrations/20260730140000_add_buyuyen_sekiller_altigen_to_exercise_whitelist.sql";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function taskRows(programId, studentId, dayNumber, dayId) {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `${dayNumber}-${index + 1}`,
    program_id: programId,
    program_day_id: dayId,
    student_id: studentId,
    day_number: dayNumber,
    order_number: index + 1,
    exercise_slug: "hafiza-gelistirme",
    exercise_title: "Hafıza Geliştirme",
    duration_seconds: 300,
    starting_level: 2,
    status: index === 0 && dayNumber === 1 ? "available" : "locked",
  }));
}

test("2 günlük student snapshot gün 1 ve gün 2 task kayıtlarını render modeline taşır", () => {
  const programId = "11111111-1111-4111-8111-111111111111";
  const studentId = "22222222-2222-4222-8222-222222222222";
  const dayOneId = "33333333-3333-4333-8333-333333333333";
  const dayTwoId = "44444444-4444-4444-8444-444444444444";
  const view = mapActiveEducationProgramForStudent(
    {
      id: programId,
      student_id: studentId,
      visible_name: "2 Günlük Test Programı",
      student_message: null,
      status: "active",
      current_day_number: 1,
      completed_days: 0,
      total_days: 2,
      assigned_at: "2026-08-10T10:00:00.000Z",
      started_at: null,
    },
    [
      { id: dayOneId, program_id: programId, day_number: 1, title: "Gün 1", status: "available" },
      { id: dayTwoId, program_id: programId, day_number: 2, title: "Gün 2", status: "locked" },
    ],
    [...taskRows(programId, studentId, 1, dayOneId), ...taskRows(programId, studentId, 2, dayTwoId)],
    studentId,
  );

  assert.ok(view);
  assert.equal(view.totalDays, 2);
  assert.deepEqual(view.days.map((day) => [day.dayNumber, day.tasks.length]), [[1, 5], [2, 5]]);
});

test("assignment RPC repair yalnız whitelist'i günceller ve custom day_count guardlarını korur", async () => {
  const source = await read(MIGRATION_PATH);
  const baseSource = await read(BASE_ASSIGNMENT_MIGRATION_PATH);

  assert.match(source, /regexp_replace/);
  assert.match(baseSource, /v_template\.day_count/);
  assert.match(baseSource, /v_template\.day_count \* 5/);
  assert.match(baseSource, /v_template\.day_count < 1 or v_template\.day_count > 60/);
  assert.match(baseSource, /create or replace function public\.assign_education_program_template_v1/);
  assert.doesNotMatch(source, /day_count\s*<>\s*20/);

  for (const slug of [
    "hafiza-gelistirme",
    "blok-okuma",
    "goz-kaslari",
    "13-nokta-emoji-takip",
    "buyuyen-sekiller-altigen",
    "kelime-yarisi",
  ]) {
    assert.match(source, new RegExp(`'${slug}'`));
  }
});
