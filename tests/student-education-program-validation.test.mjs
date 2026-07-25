import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_STUDENT_PROGRAM_VISIBLE_NAME,
  isEducationProgramUuid,
  validateStudentEducationProgramAssignment,
} from "../src/lib/education-programs/studentProgramValidation.ts";

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const TEMPLATE_ID = "22222222-2222-4222-8222-222222222222";

function input(overrides = {}) {
  return {
    studentId: STUDENT_ID,
    templateId: TEMPLATE_ID,
    visibleName: "20 Günlük Programım",
    studentMessage: "Başarılar",
    adminNote: "Yönetici notu",
    ...overrides,
  };
}

test("ogrenci ve sablon kimlikleri UUID olmak zorundadir", () => {
  assert.equal(isEducationProgramUuid(STUDENT_ID), true);
  assert.equal(isEducationProgramUuid("student-1"), false);

  const invalid = validateStudentEducationProgramAssignment(
    input({ studentId: "student-1", templateId: "" }),
  );
  assert.equal(invalid.ok, false);
  assert.deepEqual(
    invalid.issues.map((issue) => issue.field),
    ["studentId", "templateId"],
  );
});

test("gorunen ad bosken guvenli varsayilan ad kullanilir", () => {
  const result = validateStudentEducationProgramAssignment(
    input({ visibleName: "  " }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.value.visibleName, DEFAULT_STUDENT_PROGRAM_VISIBLE_NAME);
  assert.equal(result.value.visibleName, "Eğitim Programım");
});

test("metin alanlari trim edilir ve bos istege bagli alanlar null olur", () => {
  const result = validateStudentEducationProgramAssignment(
    input({
      visibleName: "  Öğrenci Programım  ",
      studentMessage: " ",
      adminNote: "  Not  ",
    }),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    studentId: STUDENT_ID,
    templateId: TEMPLATE_ID,
    visibleName: "Öğrenci Programım",
    studentMessage: null,
    adminNote: "Not",
  });
});

test("gorunen ad, ogrenci mesaji ve yonetici notu uzunluklari sinirlidir", () => {
  const result = validateStudentEducationProgramAssignment(
    input({
      visibleName: "a".repeat(121),
      studentMessage: "b".repeat(1001),
      adminNote: "c".repeat(2001),
    }),
  );

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.field),
    ["visibleName", "studentMessage", "adminNote"],
  );
});

test("kategori atama validasyonunun girdisi degildir", () => {
  const result = validateStudentEducationProgramAssignment({
    ...input(),
    studentClass: "4. sınıf",
    templateCategory: "grade_2",
  });

  assert.equal(result.ok, true);
});
