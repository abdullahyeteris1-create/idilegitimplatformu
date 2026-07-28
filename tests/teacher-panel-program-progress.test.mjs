import assert from "node:assert/strict";
import test from "node:test";

import {
  loadTeacherStudentProgramProgress,
  mapTeacherStudentProgramContext,
} from "../src/lib/teachers/studentProgramProgress.ts";

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const PROGRAM_ID = "22222222-2222-4222-8222-222222222222";
const DAY_1_ID = "33333333-3333-4333-8333-333333333333";
const DAY_2_ID = "44444444-4444-4444-8444-444444444444";
const TASK_1_ID = "55555555-5555-4555-8555-555555555555";
const TASK_2_ID = "66666666-6666-4666-8666-666666666666";
const TASK_3_ID = "77777777-7777-4777-8777-777777777777";
const TASK_4_ID = "88888888-8888-4888-8888-888888888888";
const RESULT_1_ID = "99999999-9999-4999-8999-999999999999";

function makeQuery(result) {
  const query = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    order() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };

  return query;
}

function makeSupabase({ dayResult, taskResult }) {
  const calls = { from: [] };

  return {
    calls,
    from(table) {
      calls.from.push(table);
      if (table === "student_education_program_days") {
        return makeQuery(dayResult);
      }
      if (table === "student_education_program_tasks") {
        return makeQuery(taskResult);
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

test("program ilerleme DTO'su gun, gorev, result ve XP baglarini dogru kurar", async () => {
  const activeProgram = mapTeacherStudentProgramContext({
    id: PROGRAM_ID,
    visibleName: "Kasif Okuyucu",
    status: "active",
    currentDayNumber: 2,
    completedDays: 1,
    totalDays: 2,
    assignedAt: "2026-07-28T08:00:00.000Z",
    startedAt: "2026-07-28T08:10:00.000Z",
  });

  const supabase = makeSupabase({
    dayResult: {
      data: [
        {
          id: DAY_1_ID,
          program_id: PROGRAM_ID,
          day_number: 1,
          title: "İlk Gün",
          description: "Başlangıç",
          status: "completed",
          available_at: "2026-07-28T08:00:00.000Z",
          started_at: "2026-07-28T08:15:00.000Z",
          completed_at: "2026-07-28T08:40:00.000Z",
        },
        {
          id: DAY_2_ID,
          program_id: PROGRAM_ID,
          day_number: 2,
          title: "İkinci Gün",
          description: null,
          status: "in_progress",
          available_at: "2026-07-28T09:00:00.000Z",
          started_at: "2026-07-28T09:10:00.000Z",
          completed_at: null,
        },
      ],
      error: null,
    },
    taskResult: {
      data: [
        {
          id: TASK_1_ID,
          program_id: PROGRAM_ID,
          program_day_id: DAY_1_ID,
          student_id: STUDENT_ID,
          day_number: 1,
          order_number: 1,
          exercise_slug: "reading-speed-test",
          exercise_title: "Hız Testi",
          result_exercise_type: "reading-speed-test",
          status: "completed",
          started_at: "2026-07-28T08:16:00.000Z",
          completed_at: "2026-07-28T08:18:00.000Z",
          result_id: RESULT_1_ID,
        },
        {
          id: TASK_2_ID,
          program_id: PROGRAM_ID,
          program_day_id: DAY_1_ID,
          student_id: STUDENT_ID,
          day_number: 1,
          order_number: 2,
          exercise_slug: "shadow-reading",
          exercise_title: "Gölge Okuma",
          result_exercise_type: "shadow-reading",
          status: "completed",
          started_at: "2026-07-28T08:20:00.000Z",
          completed_at: "2026-07-28T08:40:00.000Z",
          result_id: null,
        },
        {
          id: TASK_3_ID,
          program_id: PROGRAM_ID,
          program_day_id: DAY_2_ID,
          student_id: STUDENT_ID,
          day_number: 2,
          order_number: 1,
          exercise_slug: "square-vision",
          exercise_title: "Kare Görme Alanı",
          result_exercise_type: "square-vision",
          status: "available",
          started_at: null,
          completed_at: null,
          result_id: null,
        },
        {
          id: TASK_4_ID,
          program_id: PROGRAM_ID,
          program_day_id: DAY_2_ID,
          student_id: STUDENT_ID,
          day_number: 2,
          order_number: 2,
          exercise_slug: "catch-same",
          exercise_title: "Aynı Olanı Yakala",
          result_exercise_type: "catch-same",
          status: "locked",
          started_at: null,
          completed_at: null,
          result_id: null,
        },
      ],
      error: null,
    },
  });

  const result = await loadTeacherStudentProgramProgress(
    supabase,
    activeProgram,
    null,
    STUDENT_ID,
    [
      {
        id: RESULT_1_ID,
        studentId: STUDENT_ID,
        studentName: "Deneme Öğrenci",
        username: "ogrenci",
        exerciseType: "reading-speed-test",
        exerciseTitle: "Hız Testi",
        date: "2026-07-28T08:18:00.000Z",
        durationSeconds: 120,
        correctCount: 0,
        wrongCount: 0,
        score: 80,
        successRate: 0,
        details: {
          readingSpeedWpm: 220,
        },
      },
    ],
    [
      {
        idempotency_key: `program-task:${TASK_1_ID}`,
        xp_amount: 15,
        event_type: "education_program_task_completed",
        source_type: "student_education_program_tasks",
        source_id: TASK_1_ID,
        earned_at: "2026-07-28T08:18:00.000Z",
      },
    ],
  );

  assert.equal(result.programProgressError, null);
  assert.ok(result.programProgress);
  assert.equal(result.programProgress?.totalDays, 2);
  assert.equal(result.programProgress?.completedDays, 1);
  assert.equal(result.programProgress?.totalTasks, 4);
  assert.equal(result.programProgress?.completedTasks, 2);
  assert.equal(result.programProgress?.dayProgressPercent, 50);
  assert.equal(result.programProgress?.taskProgressPercent, 50);
  assert.equal(result.programProgress?.overallProgressPercent, 50);
  assert.deepEqual(result.programProgress?.days.map((day) => day.progressPercent), [100, 0]);
  assert.equal(result.programProgress?.lastCompletedTask?.taskId, TASK_2_ID);
  assert.equal(result.programProgress?.nextPendingTask?.taskId, TASK_3_ID);
  assert.match(result.programProgress?.days[0]?.tasks[0]?.resultSummary ?? "", /220 WPM/);
  assert.match(result.programProgress?.days[0]?.tasks[0]?.resultSummary ?? "", /80 puan/);
  assert.equal(result.programProgress?.days[0]?.tasks[0]?.awardedXp, 15);
});

test("gorev olmayan gunler icin ilerleme 100'e tamamlama durumunda yazilir", async () => {
  const activeProgram = mapTeacherStudentProgramContext({
    id: PROGRAM_ID,
    visibleName: "Bos Gunlu Program",
    status: "active",
    currentDayNumber: 1,
    completedDays: 1,
    totalDays: 1,
    assignedAt: "2026-07-28T08:00:00.000Z",
    startedAt: "2026-07-28T08:10:00.000Z",
  });

  const supabase = makeSupabase({
    dayResult: {
      data: [
        {
          id: DAY_1_ID,
          program_id: PROGRAM_ID,
          day_number: 1,
          title: "Tek Gün",
          description: null,
          status: "completed",
          available_at: "2026-07-28T08:00:00.000Z",
          started_at: "2026-07-28T08:15:00.000Z",
          completed_at: "2026-07-28T08:30:00.000Z",
        },
      ],
      error: null,
    },
    taskResult: { data: [], error: null },
  });

  const result = await loadTeacherStudentProgramProgress(
    supabase,
    activeProgram,
    null,
    STUDENT_ID,
    [],
    [],
  );

  assert.equal(result.programProgressError, null);
  assert.ok(result.programProgress);
  assert.equal(result.programProgress?.totalTasks, 0);
  assert.equal(result.programProgress?.completedTasks, 0);
  assert.equal(result.programProgress?.dayProgressPercent, 100);
  assert.equal(result.programProgress?.taskProgressPercent, 0);
  assert.equal(result.programProgress?.overallProgressPercent, 100);
  assert.equal(result.programProgress?.days[0]?.totalTasks, 0);
  assert.equal(result.programProgress?.days[0]?.progressPercent, 100);
  assert.equal(result.programProgress?.lastCompletedTask, null);
  assert.equal(result.programProgress?.nextPendingTask, null);
});

test("aktif program yoksa istek sorgu calistirmadan bos kalir", async () => {
  const supabase = makeSupabase({
    dayResult: { data: [], error: null },
    taskResult: { data: [], error: null },
  });

  const result = await loadTeacherStudentProgramProgress(
    supabase,
    null,
    null,
    STUDENT_ID,
    [],
    [],
  );

  assert.deepEqual(result, {
    programProgress: null,
    programProgressError: null,
  });
  assert.deepEqual(supabase.calls.from, []);
});

test("gun veya gorev sorgusu hata verirse yalniz program bolumu hata dondurur", async () => {
  const activeProgram = mapTeacherStudentProgramContext({
    id: PROGRAM_ID,
    visibleName: "Hata Programı",
    status: "active",
    currentDayNumber: 1,
    completedDays: 0,
    totalDays: 1,
    assignedAt: "2026-07-28T08:00:00.000Z",
    startedAt: null,
  });

  const supabase = makeSupabase({
    dayResult: { data: null, error: { message: "db down" } },
    taskResult: { data: null, error: null },
  });

  const result = await loadTeacherStudentProgramProgress(
    supabase,
    activeProgram,
    null,
    STUDENT_ID,
    [],
    [],
  );

  assert.equal(result.programProgress, null);
  assert.equal(result.programProgressError, "Program ilerlemesi şu anda yüklenemiyor.");
});

test("aktif program sorgusu hata verirse sorgu atlanir ve hata aynen dondurulur", async () => {
  const supabase = makeSupabase({
    dayResult: { data: [], error: null },
    taskResult: { data: [], error: null },
  });

  const result = await loadTeacherStudentProgramProgress(
    supabase,
    null,
    "Aktif program okunamıyor.",
    STUDENT_ID,
    [],
    [],
  );

  assert.deepEqual(result, {
    programProgress: null,
    programProgressError: "Aktif program okunamıyor.",
  });
  assert.deepEqual(supabase.calls.from, []);
});
