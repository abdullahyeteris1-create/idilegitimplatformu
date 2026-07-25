import assert from "node:assert/strict";
import test from "node:test";

import { getEducationProgramTaskLaunchContext } from "../src/lib/education-programs/studentProgramRepository.ts";

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_STUDENT_ID = "99999999-9999-4999-8999-999999999999";
const TASK_ID = "22222222-2222-4222-8222-222222222222";
const PROGRAM_ID = "33333333-3333-4333-8333-333333333333";
const DAY_ID = "44444444-4444-4444-8444-444444444444";

function makeSupabase({
  task,
  program = { status: "active" },
  day = { status: "in_progress" },
} = {}) {
  return {
    from(table) {
      if (table === "student_education_program_tasks") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: task, error: null }),
            }),
          }),
        };
      }
      if (table === "student_education_programs") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: program, error: null }),
            }),
          }),
        };
      }
      if (table === "student_education_program_days") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: day, error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

function baseTaskRow(overrides = {}) {
  return {
    id: TASK_ID,
    program_id: PROGRAM_ID,
    program_day_id: DAY_ID,
    student_id: STUDENT_ID,
    status: "in_progress",
    exercise_slug: "kare-gorme-alani",
    duration_seconds: 90,
    starting_level: 3,
    result_exercise_type: "square-vision",
    settings: { gridSize: 13 },
    settings_schema_version: 1,
    ...overrides,
  };
}

test("1) gecerli in_progress gorev kabul edilir ve snapshot alanlari dogru okunur", async () => {
  const supabase = makeSupabase({ task: baseTaskRow() });

  const result = await getEducationProgramTaskLaunchContext(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    taskId: TASK_ID,
    programId: PROGRAM_ID,
    dayId: DAY_ID,
    exerciseSlug: "kare-gorme-alani",
    durationSeconds: 90,
    initialLevel: 3,
    resultExerciseType: "square-vision",
    settings: { gridSize: 13 },
    settingsSchemaVersion: 1,
  });
});

test("5) baska ogrenciye ait gorev reddedilir", async () => {
  const supabase = makeSupabase({ task: baseTaskRow({ student_id: OTHER_STUDENT_ID }) });

  const result = await getEducationProgramTaskLaunchContext(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "not_found");
  assert.equal(result.message, "Bu görev size ait değil.");
});

test("6) locked gorev reddedilir", async () => {
  const supabase = makeSupabase({ task: baseTaskRow({ status: "locked" }) });

  const result = await getEducationProgramTaskLaunchContext(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "conflict");
});

test("7) completed gorev reddedilir", async () => {
  const supabase = makeSupabase({ task: baseTaskRow({ status: "completed" }) });

  const result = await getEducationProgramTaskLaunchContext(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "conflict");
});

test("8) program active degilse reddedilir", async () => {
  const supabase = makeSupabase({
    task: baseTaskRow(),
    program: { status: "completed" },
  });

  const result = await getEducationProgramTaskLaunchContext(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "conflict");
  assert.equal(result.message, "Bu program artık aktif değil.");
});

test("9) gun locked ise reddedilir", async () => {
  const supabase = makeSupabase({
    task: baseTaskRow(),
    day: { status: "locked" },
  });

  const result = await getEducationProgramTaskLaunchContext(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "conflict");
});

test("11) DB'deki farkli exercise_slug oldugu gibi donulur (eslesme kontrolu cagiran route'ta yapilir)", async () => {
  const supabase = makeSupabase({
    task: baseTaskRow({ exercise_slug: "ayni-olani-yakala" }),
  });

  const result = await getEducationProgramTaskLaunchContext(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, true);
  assert.equal(result.value.exerciseSlug, "ayni-olani-yakala");
});

test("12) gecersiz task UUID icin supabase hic cagrilmadan not_found doner", async () => {
  let called = false;
  const supabase = {
    from() {
      called = true;
      throw new Error("should not be called");
    },
  };

  const result = await getEducationProgramTaskLaunchContext(supabase, STUDENT_ID, "gecersiz-uuid");

  assert.equal(called, false);
  assert.equal(result.ok, false);
  assert.equal(result.code, "not_found");
});

test("gorev bulunamazsa not_found doner", async () => {
  const supabase = makeSupabase({ task: null });

  const result = await getEducationProgramTaskLaunchContext(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "not_found");
});

test("initialLevel null olabilir (starting_level null ise)", async () => {
  const supabase = makeSupabase({ task: baseTaskRow({ starting_level: null }) });

  const result = await getEducationProgramTaskLaunchContext(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, true);
  assert.equal(result.value.initialLevel, null);
});

test("repository fonksiyonu eski assignment tablolarina bagli degildir", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL("../src/lib/education-programs/studentProgramRepository.ts", import.meta.url),
    "utf8",
  );
  const launchFunction =
    source.split("export async function getEducationProgramTaskLaunchContext")[1] ?? "";

  assert.doesNotMatch(launchFunction, /student_assignment_program/);
  assert.doesNotMatch(launchFunction, /@\/lib\/assignments\//);
});
