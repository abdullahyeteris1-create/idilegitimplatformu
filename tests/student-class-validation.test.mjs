import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getIndividualClassOptions,
  parseStudentClassGrade,
  validateStudentClassValue,
} from "../src/lib/students/studentClassValidation.ts";

const createRoute = await readFile("src/app/api/admin/students/route.ts", "utf8");
const updateRoute = await readFile("src/app/api/admin/students/[studentId]/route.ts", "utf8");
const createForm = await readFile("src/app/ogretmen/ogrenciler/yeni/NewStudentFormClient.tsx", "utf8");
const editForm = await readFile("src/app/ogretmen/ogrenciler/[studentId]/duzenle/EditStudentFormClient.tsx", "utf8");

test("individual class validation accepts grades and existing section formats", () => {
  for (const value of ["7", "8", "4/A", "4-A", "4 A", "4A", "11. Sınıf"]) {
    assert.notEqual(parseStudentClassGrade(value), null);
    assert.equal(validateStudentClassValue(value, { required: true }).ok, true);
  }
});

test("range and placeholder values are rejected when a school class is required", () => {
  for (const value of [null, undefined, "", "  ", "7-8", "7-8. Sınıf", "middle_7_8", "Demo"]) {
    assert.equal(validateStudentClassValue(value, { required: true }).ok, false);
  }
});

test("education-level options keep middle_7_8 explicit without changing class_name semantics", () => {
  assert.deepEqual(getIndividualClassOptions("middle_7_8"), [7, 8]);
  assert.deepEqual(getIndividualClassOptions("high_school"), [9, 10, 11, 12]);
});

test("create and edit flows validate the real class on the server and client", () => {
  assert.match(createRoute, /validateStudentClassValue\(body\.classLevel/);
  assert.match(updateRoute, /validateStudentClassValue\(body\.classLevel/);
  assert.match(createForm, /validateStudentClassValue\(classLevel/);
  assert.match(editForm, /validateStudentClassValue\(classLevel/);
  assert.match(createForm, /required=\{requiresIndividualClass\(educationLevel\)\}/);
  assert.match(editForm, /required=\{requiresIndividualClass\(educationLevel\)\}/);
});

test("legacy edit keeps a repair path and no automatic default", () => {
  assert.match(editForm, /!classLevel\.trim\(\)/);
  assert.doesNotMatch(editForm, /setClassLevel\([^)]*middle_7_8/);
});
