import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ASSIGN_EDUCATION_PROGRAM_RPC,
  assignStudentEducationProgram,
  mapEducationProgramAssignmentTemplate,
  mapStudentEducationProgramSummary,
  mergeEducationProgramAssignmentStudents,
} from "../src/lib/education-programs/studentProgramRepository.ts";

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const TEMPLATE_ID = "22222222-2222-4222-8222-222222222222";
const PROGRAM_ID = "33333333-3333-4333-8333-333333333333";

test("aktif ogrencileri aktif program bilgisiyle birlestirir ve pasifleri dislar", () => {
  const students = mergeEducationProgramAssignmentStudents(
    [
      {
        id: STUDENT_ID,
        name: "Ayşe Yılmaz",
        class_name: "4-A",
        is_active: true,
        status: "active",
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Pasif Öğrenci",
        is_active: false,
        status: "passive",
      },
    ],
    [{ id: PROGRAM_ID, student_id: STUDENT_ID, visible_name: "Aktif Program" }],
  );

  assert.equal(students.length, 1);
  assert.equal(students[0].activeProgramId, PROGRAM_ID);
  assert.equal(students[0].activeProgramName, "Aktif Program");
  assert.equal(students[0].className, "4-A");
});

test("yalniz published ve aktif sablon atama DTO'suna donusur", () => {
  const base = {
    id: TEMPLATE_ID,
    name: "Şablon",
    category: "grade_2",
    day_count: 20,
    status: "published",
    is_active: true,
    version: 3,
    updated_at: "2026-07-25T12:00:00.000Z",
  };

  assert.deepEqual(mapEducationProgramAssignmentTemplate(base), {
    id: TEMPLATE_ID,
    name: "Şablon",
    category: "grade_2",
    dayCount: 20,
    version: 3,
    updatedAt: "2026-07-25T12:00:00.000Z",
  });
  assert.equal(
    mapEducationProgramAssignmentTemplate({ ...base, status: "draft" }),
    null,
  );
  assert.equal(
    mapEducationProgramAssignmentTemplate({ ...base, is_active: false }),
    null,
  );
});

test("basarili atama RPC program ID'sini dondurur ve assigned_by sunucudan gelir", async () => {
  const calls = [];
  const supabase = {
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: PROGRAM_ID, error: null };
    },
  };

  const result = await assignStudentEducationProgram(
    supabase,
    {
      studentId: STUDENT_ID,
      templateId: TEMPLATE_ID,
      visibleName: "",
      studentMessage: null,
      adminNote: null,
    },
    "admin-user",
  );

  assert.deepEqual(result, { ok: true, value: { programId: PROGRAM_ID } });
  assert.equal(calls[0].name, ASSIGN_EDUCATION_PROGRAM_RPC);
  assert.deepEqual(calls[0].args, {
    p_student_id: STUDENT_ID,
    p_template_id: TEMPLATE_ID,
    p_visible_name: "Eğitim Programım",
    p_student_message: null,
    p_admin_note: null,
    p_assigned_by: "admin-user",
  });
});

test("ikinci aktif program hatasi Turkce conflict sonucuna map edilir", async () => {
  const supabase = {
    async rpc() {
      return {
        data: null,
        error: {
          code: "P0001",
          message: "STUDENT_EDUCATION_ACTIVE_PROGRAM_EXISTS",
        },
      };
    },
  };

  const result = await assignStudentEducationProgram(
    supabase,
    {
      studentId: STUDENT_ID,
      templateId: TEMPLATE_ID,
      visibleName: "Program",
      studentMessage: null,
      adminNote: null,
    },
    "teacher",
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "conflict");
  assert.equal(result.message, "Öğrencinin zaten aktif programı var.");
});

test("yonetici liste DTO'su snapshot ve ilerleme alanlarini dogru map eder", () => {
  const result = mapStudentEducationProgramSummary(
    {
      id: PROGRAM_ID,
      student_id: STUDENT_ID,
      source_template_id: TEMPLATE_ID,
      source_template_version: 2,
      source_template_name: "Kaynak Şablon",
      visible_name: "Programım",
      status: "active",
      current_day_number: 1,
      completed_days: 0,
      total_days: 20,
      assigned_at: "2026-07-25T12:00:00.000Z",
    },
    { id: STUDENT_ID, name: "Ayşe Yılmaz", class_name: "4-A" },
  );

  assert.ok(result);
  assert.equal(result.studentName, "Ayşe Yılmaz");
  assert.equal(result.studentClassName, "4-A");
  assert.equal(result.sourceTemplateName, "Kaynak Şablon");
  assert.equal(result.sourceTemplateVersion, 2);
  assert.equal(result.totalDays, 20);
  assert.equal(result.currentDayNumber, 1);
  assert.equal(result.completedDays, 0);
});

test("repository eski assignment helper veya tablolarina bagli degildir", async () => {
  const source = await readFile(
    new URL("../src/lib/education-programs/studentProgramRepository.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /student_assignment_program/);
  assert.doesNotMatch(source, /daily_assignment/);
  assert.doesNotMatch(source, /assignment-program-tasks/);
  assert.doesNotMatch(source, /result_id/);
});

test("sablon icerigi degismeden once draft yapilir ve surumu artirilir", async () => {
  const source = await readFile(
    new URL("../src/lib/education-programs/repository.ts", import.meta.url),
    "utf8",
  );
  const saveFunction =
    source.split("export async function saveEducationProgramTemplateDay")[1]?.split(
      "export async function publishEducationProgramTemplate",
    )[0] ?? "";

  assert.match(saveFunction, /status: "draft"/);
  assert.match(saveFunction, /version: Math\.max/);
  assert.ok(
    saveFunction.indexOf('status: "draft"') <
      saveFunction.indexOf(".upsert(rows"),
  );
});
