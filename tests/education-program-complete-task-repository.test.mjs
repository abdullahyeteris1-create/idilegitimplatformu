import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  COMPLETE_EDUCATION_PROGRAM_TASK_RPC,
  completeEducationProgramTask,
} from "../src/lib/education-programs/studentProgramRepository.ts";

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_STUDENT_ID = "99999999-9999-4999-8999-999999999999";
const TASK_ID = "22222222-2222-4222-8222-222222222222";

function successRow(overrides = {}) {
  return {
    success: true,
    outcome: "task_completed_next_task_unlocked",
    already_completed: false,
    task_id: TASK_ID,
    task_status: "completed",
    day_id: "33333333-3333-4333-8333-333333333333",
    day_status: "in_progress",
    program_id: "44444444-4444-4444-8444-444444444444",
    program_status: "active",
    unlocked_task_id: "55555555-5555-4555-8555-555555555555",
    unlocked_day_id: null,
    current_day_number: 1,
    completed_days: 0,
    total_days: 20,
    program_completed: false,
    ...overrides,
  };
}

function makeSupabase({ rpcData = successRow(), rpcError = null, taskRow } = {}) {
  const calls = { rpc: [], from: [] };
  return {
    calls,
    async rpc(name, args) {
      calls.rpc.push({ name, args });
      return { data: rpcData, error: rpcError };
    },
    from(table) {
      calls.from.push(table);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: taskRow ?? null, error: null }),
          }),
        }),
      };
    },
  };
}

// 1) Dogru RPC adi cagrilir. 2) Yalniz p_student_id/p_task_id gonderilir.
test("1/2) dogru RPC adi ve yalniz p_student_id/p_task_id ile cagrilir", async () => {
  const supabase = makeSupabase();

  const result = await completeEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(supabase.calls.rpc[0].name, COMPLETE_EDUCATION_PROGRAM_TASK_RPC);
  assert.deepEqual(supabase.calls.rpc[0].args, { p_student_id: STUDENT_ID, p_task_id: TASK_ID });
  assert.equal(result.ok, true);
});

// 3) expectedResultExerciseType RPC'ye gonderilmez.
test("3) expectedResultExerciseType RPC parametrelerine hic eklenmez", async () => {
  const supabase = makeSupabase({
    taskRow: { student_id: STUDENT_ID, result_exercise_type: "square-vision" },
  });

  await completeEducationProgramTask(supabase, STUDENT_ID, TASK_ID, "square-vision");

  assert.deepEqual(supabase.calls.rpc[0].args, { p_student_id: STUDENT_ID, p_task_id: TASK_ID });
});

// 4) Expected type varsa task on sorgusu yapilir.
test("4) expectedResultExerciseType verilince RPC'den once on sorgu yapilir", async () => {
  const supabase = makeSupabase({
    taskRow: { student_id: STUDENT_ID, result_exercise_type: "square-vision" },
  });

  await completeEducationProgramTask(supabase, STUDENT_ID, TASK_ID, "square-vision");

  assert.deepEqual(supabase.calls.from, ["student_education_program_tasks"]);
  assert.equal(supabase.calls.rpc.length, 1);
});

test("expectedResultExerciseType verilmezse on sorgu hic yapilmaz", async () => {
  const supabase = makeSupabase();

  await completeEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.deepEqual(supabase.calls.from, []);
});

// 5) Task bulunamazsa task_not_found.
test("5) on sorguda task bulunamazsa task_not_found doner, RPC cagrilmaz", async () => {
  const supabase = makeSupabase({ taskRow: null });

  const result = await completeEducationProgramTask(
    supabase,
    STUDENT_ID,
    TASK_ID,
    "square-vision",
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "task_not_found");
  assert.equal(supabase.calls.rpc.length, 0);
});

// 6) Baska ogrenci task'i unauthorized_task.
test("6) on sorguda baska ogrenciye ait task unauthorized_task doner, RPC cagrilmaz", async () => {
  const supabase = makeSupabase({
    taskRow: { student_id: OTHER_STUDENT_ID, result_exercise_type: "square-vision" },
  });

  const result = await completeEducationProgramTask(
    supabase,
    STUDENT_ID,
    TASK_ID,
    "square-vision",
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "unauthorized_task");
  assert.equal(supabase.calls.rpc.length, 0);
});

// 7) Type mismatch exercise_mismatch.
test("7) on sorguda exercise turu uyusmazsa exercise_mismatch doner, RPC cagrilmaz", async () => {
  const supabase = makeSupabase({
    taskRow: { student_id: STUDENT_ID, result_exercise_type: "catch-same" },
  });

  const result = await completeEducationProgramTask(
    supabase,
    STUDENT_ID,
    TASK_ID,
    "square-vision",
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "exercise_mismatch");
  assert.equal(supabase.calls.rpc.length, 0);
});

// 8) Snake_case payload camelCase map edilir.
test("8) basarili RPC yaniti tam olarak camelCase'e map edilir", async () => {
  const supabase = makeSupabase();

  const result = await completeEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.deepEqual(result, {
    ok: true,
    value: {
      outcome: "task_completed_next_task_unlocked",
      alreadyCompleted: false,
      taskId: TASK_ID,
      taskStatus: "completed",
      dayId: "33333333-3333-4333-8333-333333333333",
      dayStatus: "in_progress",
      programId: "44444444-4444-4444-8444-444444444444",
      programStatus: "active",
      unlockedTaskId: "55555555-5555-4555-8555-555555555555",
      unlockedDayId: null,
      currentDayNumber: 1,
      completedDays: 0,
      totalDays: 20,
      programCompleted: false,
    },
  });
});

// 9) already_completed dogru map edilir.
test("9) already_completed:true alreadyCompleted:true olarak map edilir", async () => {
  const supabase = makeSupabase({
    rpcData: successRow({ outcome: "already_completed", already_completed: true }),
  });

  const result = await completeEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, true);
  assert.equal(result.value.alreadyCompleted, true);
  assert.equal(result.value.outcome, "already_completed");
});

// 10) nullable unlocked ids dogru map edilir.
test("10) unlocked_task_id/unlocked_day_id null iken null olarak kalir (undefined degil)", async () => {
  const supabase = makeSupabase({
    rpcData: successRow({
      outcome: "program_completed",
      unlocked_task_id: null,
      unlocked_day_id: null,
      program_completed: true,
      program_status: "completed",
    }),
  });

  const result = await completeEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, true);
  assert.strictEqual(result.value.unlockedTaskId, null);
  assert.strictEqual(result.value.unlockedDayId, null);
  assert.equal(result.value.programCompleted, true);
});

// 11) null payload completion_failed.
test("11) RPC data:null donerse completion_failed doner", async () => {
  const supabase = makeSupabase({ rpcData: null });

  const result = await completeEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "completion_failed");
});

// 12) array payload completion_failed.
test("12) RPC data bir dizi donerse completion_failed doner", async () => {
  const supabase = makeSupabase({ rpcData: [successRow()] });

  const result = await completeEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "completion_failed");
});

// 13) malformed payload completion_failed.
test("13) eksik/yanlis tipli alan iceren payload completion_failed doner", async () => {
  const supabase = makeSupabase({
    rpcData: successRow({ current_day_number: "bir" }),
  });

  const result = await completeEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "completion_failed");
});

// 14) RPC hata kodlari normalize edilir.
test("14) RPC'nin 9 gercek hata kodu dogru domain koduna map edilir", async () => {
  const cases = [
    ["EDUCATION_TASK_COMPLETE_TASK_NOT_FOUND: Gorev bulunamadi.", "task_not_found"],
    ["EDUCATION_TASK_COMPLETE_STUDENT_MISMATCH: Gorev bu ogrenciye ait degil.", "unauthorized_task"],
    ["EDUCATION_TASK_COMPLETE_PROGRAM_NOT_ACTIVE: Program aktif degil.", "program_not_active"],
    ["EDUCATION_TASK_COMPLETE_DAY_NOT_AVAILABLE: Gun uygun degil.", "day_not_available"],
    ["EDUCATION_TASK_COMPLETE_TASK_NOT_IN_PROGRESS: Gorev in_progress degil.", "task_not_in_progress"],
    ["EDUCATION_TASK_COMPLETE_PROGRAM_NOT_FOUND: Program bulunamadi.", "completion_conflict"],
    ["EDUCATION_TASK_COMPLETE_DAY_NOT_FOUND: Gun bulunamadi.", "completion_conflict"],
    ["EDUCATION_TASK_COMPLETE_NEXT_DAY_NOT_FOUND: Sonraki gun bulunamadi.", "completion_conflict"],
    ["EDUCATION_TASK_COMPLETE_INVALID_INPUT: Girdi gecersiz.", "completion_conflict"],
  ];

  for (const [message, expectedCode] of cases) {
    const supabase = makeSupabase({ rpcData: null, rpcError: { code: "P0001", message } });
    const result = await completeEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

    assert.equal(result.ok, false, message);
    assert.equal(result.code, expectedCode, message);
  }
});

test("bilinmeyen/tanimsiz RPC hatasi completion_failed'e duser", async () => {
  const supabase = makeSupabase({
    rpcData: null,
    rpcError: { code: "08000", message: "connection error" },
  });

  const result = await completeEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "completion_failed");
});

// 15) raw DB error disari sizmaz.
test("15) ham error.message/details donen mesajda gorunmez, yalniz sabit Turkce metin doner", async () => {
  const supabase = makeSupabase({
    rpcData: null,
    rpcError: {
      code: "P0001",
      message: "EDUCATION_TASK_COMPLETE_TASK_NOT_IN_PROGRESS: cok gizli ic detay XYZ123",
      details: "internal-secret-detail",
      hint: "internal-hint",
    },
  });

  const result = await completeEducationProgramTask(supabase, STUDENT_ID, TASK_ID);

  assert.equal(result.message, "Bu görev şu anda tamamlanamaz.");
  assert.doesNotMatch(result.message, /XYZ123|internal-secret-detail|internal-hint/);
});

// 16) server-only sinir + 17) Assignment V2 import edilmez.
test("16/17) repository dosyasi server-only kalir, Assignment V2 import etmez", async () => {
  const source = await readFile(
    new URL("../src/lib/education-programs/studentProgramRepository.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /"use client"/);
  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /student_assignment_program/);
  assert.doesNotMatch(source, /daily_assignment/);
});

test("gecersiz UUID icin ne on sorgu ne RPC cagrilir, task_not_found doner", async () => {
  const supabase = makeSupabase();

  const result = await completeEducationProgramTask(supabase, "gecersiz-uuid", TASK_ID);

  assert.equal(result.ok, false);
  assert.equal(result.code, "task_not_found");
  assert.equal(supabase.calls.rpc.length, 0);
  assert.equal(supabase.calls.from.length, 0);
});

test("on sorgunun kendi DB hatasi completion_failed'e duser", async () => {
  const supabase = {
    calls: { rpc: [], from: [] },
    async rpc(name, args) {
      this.calls.rpc.push({ name, args });
      return { data: successRow(), error: null };
    },
    from(table) {
      this.calls.from.push(table);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: { code: "500", message: "db down" } }),
          }),
        }),
      };
    },
  };

  const result = await completeEducationProgramTask(
    supabase,
    STUDENT_ID,
    TASK_ID,
    "square-vision",
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "completion_failed");
  assert.equal(supabase.calls.rpc.length, 0);
});
