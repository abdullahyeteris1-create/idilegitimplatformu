import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getActiveEducationProgramForStudent,
  mapActiveEducationProgramForStudent,
} from "../src/lib/education-programs/studentProgramRepository.ts";

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_STUDENT_ID = "22222222-2222-4222-8222-222222222222";
const PROGRAM_ID = "33333333-3333-4333-8333-333333333333";
const DAY_1_ID = "44444444-4444-4444-8444-444444444444";
const DAY_2_ID = "55555555-5555-4555-8555-555555555555";

const programRow = {
  id: PROGRAM_ID,
  student_id: STUDENT_ID,
  visible_name: "Kişisel Programım",
  student_message: "Bugün harika bir başlangıç yapabilirsin.",
  status: "active",
  current_day_number: 1,
  completed_days: 0,
  total_days: 2,
  assigned_at: "2026-07-25T10:00:00.000Z",
  started_at: null,
  admin_note: "öğrenciye gitmemeli",
  assigned_by: "admin-user",
  category: "general_adult",
  source_template_id: "66666666-6666-4666-8666-666666666666",
};

const dayRows = [
  {
    id: DAY_2_ID,
    program_id: PROGRAM_ID,
    day_number: 2,
    title: "İkinci Gün",
    description: null,
    status: "locked",
    started_at: null,
    completed_at: null,
  },
  {
    id: DAY_1_ID,
    program_id: PROGRAM_ID,
    day_number: 1,
    title: "İlk Gün",
    description: "Başlangıç çalışmaları",
    status: "available",
    started_at: null,
    completed_at: null,
  },
];

const taskRows = [
  {
    id: "77777777-7777-4777-8777-777777777777",
    program_id: PROGRAM_ID,
    program_day_id: DAY_1_ID,
    student_id: STUDENT_ID,
    day_number: 1,
    order_number: 2,
    exercise_slug: "ikinci-egzersiz",
    exercise_title: "İkinci Egzersiz",
    duration_seconds: 150,
    starting_level: 2,
    status: "locked",
    settings: { secret: true },
    result_id: "88888888-8888-4888-8888-888888888888",
  },
  {
    id: "99999999-9999-4999-8999-999999999999",
    program_id: PROGRAM_ID,
    program_day_id: DAY_1_ID,
    student_id: STUDENT_ID,
    day_number: 1,
    order_number: 1,
    exercise_slug: "ilk-egzersiz",
    exercise_title: "İlk Egzersiz",
    duration_seconds: 60,
    starting_level: null,
    status: "available",
    settings: { secret: true },
    result_id: null,
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    program_id: PROGRAM_ID,
    program_day_id: DAY_1_ID,
    student_id: OTHER_STUDENT_ID,
    day_number: 1,
    order_number: 3,
    exercise_slug: "baska-ogrenci",
    exercise_title: "Başka Öğrencinin Görevi",
    duration_seconds: 60,
    starting_level: null,
    status: "available",
  },
];

test("öğrenci DTO'su yalnız kendi aktif programını güvenli alanlarla döndürür", () => {
  const result = mapActiveEducationProgramForStudent(
    programRow,
    dayRows,
    taskRows,
    STUDENT_ID,
  );

  assert.ok(result);
  assert.deepEqual(Object.keys(result).sort(), [
    "assignedAt",
    "completedDays",
    "currentDayNumber",
    "days",
    "id",
    "startedAt",
    "status",
    "studentMessage",
    "totalDays",
    "visibleName",
  ]);
  assert.equal(result.visibleName, "Kişisel Programım");
  assert.deepEqual(
    result.days.map((day) => day.dayNumber),
    [1, 2],
  );
  assert.deepEqual(
    result.days[0].tasks.map((task) => task.orderNumber),
    [1, 2],
  );
  assert.equal(result.days[0].tasks.some((task) => task.exerciseSlug === "baska-ogrenci"), false);
  assert.deepEqual(Object.keys(result.days[0].tasks[0]).sort(), [
    "dayNumber",
    "durationSeconds",
    "exerciseSlug",
    "exerciseTitle",
    "id",
    "orderNumber",
    "startingLevel",
    "status",
  ]);
});

test("başka öğrenciye ait veya aktif olmayan program dönmez", () => {
  assert.equal(
    mapActiveEducationProgramForStudent(
      programRow,
      dayRows,
      taskRows,
      OTHER_STUDENT_ID,
    ),
    null,
  );
  assert.equal(
    mapActiveEducationProgramForStudent(
      { ...programRow, status: "completed" },
      dayRows,
      taskRows,
      STUDENT_ID,
    ),
    null,
  );
  assert.equal(
    mapActiveEducationProgramForStudent(null, [], [], STUDENT_ID),
    null,
  );
});

test("boş veya geçersiz program adı güvenli fallback kullanır", () => {
  const result = mapActiveEducationProgramForStudent(
    { ...programRow, visible_name: "  " },
    dayRows,
    taskRows,
    STUDENT_ID,
  );

  assert.ok(result);
  assert.equal(result.visibleName, "Eğitim Programım");
});

test("aktif program yoksa repository null döndürür ve öğrenci/status filtresi uygular", async () => {
  const calls = [];
  const query = {
    select(columns) {
      calls.push(["select", columns]);
      return this;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return this;
    },
    async maybeSingle() {
      return { data: null, error: null };
    },
  };
  const supabase = {
    from(table) {
      calls.push(["from", table]);
      return query;
    },
  };

  const result = await getActiveEducationProgramForStudent(supabase, STUDENT_ID);

  assert.deepEqual(result, { ok: true, value: null });
  assert.ok(
    calls.some(
      (call) =>
        call[0] === "eq" && call[1] === "student_id" && call[2] === STUDENT_ID,
    ),
  );
  assert.ok(
    calls.some(
      (call) =>
        call[0] === "eq" && call[1] === "status" && call[2] === "active",
    ),
  );
});

test("öğrenci repository sorguları yönetici ve sonuç alanlarını seçmez", async () => {
  const source = await readFile(
    new URL(
      "../src/lib/education-programs/studentProgramRepository.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const viewSelect =
    source
      .split("const STUDENT_PROGRAM_VIEW_SELECT =")[1]
      ?.split("const STUDENT_PROGRAM_VIEW_ERROR")[0] ?? "";
  const studentFunction =
    source
      .split("export async function getActiveEducationProgramForStudent")[1]
      ?.split("export async function listEducationProgramAssignmentOptions")[0] ??
    "";

  for (const forbidden of [
    "admin_note",
    "assigned_by",
    "category",
    "settings",
    "result_id",
    "source_template",
  ]) {
    assert.doesNotMatch(viewSelect, new RegExp(forbidden));
    assert.doesNotMatch(studentFunction, new RegExp(forbidden));
  }
});
