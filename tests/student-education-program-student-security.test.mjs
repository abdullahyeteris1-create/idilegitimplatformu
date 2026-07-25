import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("route öğrenci kimliğini yalnız doğrulanmış server session'dan alır", async () => {
  const source = await read("src/app/ogrenci/egitim-programim/page.tsx");

  assert.match(source, /await cookies\(\)/);
  assert.match(source, /verifyStudentAccessToken/);
  assert.match(source, /if \(!access\.ok\)/);
  assert.match(source, /redirect\("\/giris"\)/);
  assert.match(source, /getSupabaseServiceRoleClient\(\)/);
  assert.match(
    source,
    /getActiveEducationProgramForStudent\(supabase, access\.studentId\)/,
  );
  assert.doesNotMatch(source, /\bparams\b/);
  assert.doesNotMatch(source, /\bsearchParams\b/);
  assert.doesNotMatch(source, /formData/);
  assert.doesNotMatch(source, /hasAdminSession/);
  assert.doesNotMatch(source, /"use client"/);
});

test("repository aktif program ve görevlerde student_id sahiplik filtresi kullanır", async () => {
  const source = await read(
    "src/lib/education-programs/studentProgramRepository.ts",
  );
  const studentFunction =
    source
      .split("export async function getActiveEducationProgramForStudent")[1]
      ?.split("export async function listEducationProgramAssignmentOptions")[0] ??
    "";

  assert.match(studentFunction, /\.eq\("student_id", studentId\)/);
  assert.match(studentFunction, /\.eq\("status", "active"\)/);
  assert.match(studentFunction, /programRow\.student_id !== studentId/);
});

test("FAZ 2B yeni public öğrenci API route'u oluşturmaz", async () => {
  const candidates = [
    "src/app/api/student/education-program",
    "src/app/api/student/education-programs",
    "src/app/api/student/student-education-program",
    "src/app/api/student/student-education-programs",
  ];

  for (const candidate of candidates) {
    await assert.rejects(access(new URL(`../${candidate}`, import.meta.url)));
  }
});

test("FAZ 2B katmanı assignment provider, helper veya route import etmez", async () => {
  const paths = [
    "src/app/ogrenci/egitim-programim/page.tsx",
    "src/app/ogrenci/egitim-programim/loading.tsx",
    "src/components/education-programs/StudentEducationProgramStudentView.tsx",
    "src/lib/education-programs/studentProgramPresentation.ts",
  ];
  const source = (await Promise.all(paths.map(read))).join("\n");

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
  assert.doesNotMatch(source, /AssignmentTaskProvider/);
  assert.doesNotMatch(source, /AssignmentTaskTimer/);
  assert.doesNotMatch(source, /useAssignmentExerciseAdapter/);
  assert.doesNotMatch(source, /assignment-program-tasks/);
  assert.doesNotMatch(source, /assignment-items/);
});

test("service role istemcisi client component veya hassas DTO içine taşınmaz", async () => {
  const component = await read(
    "src/components/education-programs/StudentEducationProgramStudentView.tsx",
  );
  const types = await read(
    "src/lib/education-programs/studentProgramTypes.ts",
  );
  const studentTypes =
    types.split("export type StudentEducationProgramStudentTask")[1] ?? "";

  assert.doesNotMatch(component, /"use client"/);
  assert.doesNotMatch(component, /getSupabaseServiceRoleClient/);
  assert.doesNotMatch(component, /SUPABASE_SERVICE_ROLE/);
  for (const forbidden of [
    "adminNote",
    "assignedBy",
    "category",
    "settings",
    "resultId",
    "sourceTemplate",
    "studentId",
  ]) {
    assert.doesNotMatch(studentTypes, new RegExp(forbidden));
  }
});
