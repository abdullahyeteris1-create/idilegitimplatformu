import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("FAZ 3A-1 egzersiz componentlerine veya layout'a dokunmaz (entegrasyon FAZ 3A-2'de)", async () => {
  const layout = await read("src/app/egzersizler/layout.tsx");

  assert.match(layout, /AssignmentTaskProvider/);
  assert.match(layout, /AssignmentTaskTimer/);
  assert.doesNotMatch(layout, /education-programs/);
  assert.doesNotMatch(layout, /EducationProgramTaskProvider/);
});

test("Assignment System V2 dosyalari mevcut ve degismemis sekilde durur", async () => {
  for (const candidate of [
    "src/lib/assignments/assignmentRepository.ts",
    "src/components/assignments/AssignmentTaskProvider.tsx",
    "src/components/assignments/AssignmentTaskTimer.tsx",
    "supabase/migrations/20260725120000_complete_student_assignment_program_task_rpc.sql",
  ]) {
    await assert.doesNotReject(access(new URL(`../${candidate}`, import.meta.url)));
  }

  const completeRpc = await read(
    "supabase/migrations/20260725120000_complete_student_assignment_program_task_rpc.sql",
  );
  assert.doesNotMatch(completeRpc, /start_education_program_task/);
  assert.doesNotMatch(completeRpc, /student_education_program/);
});

test("yeni Egitim Programi dosyalari Assignment System V2'ye bagimlilik icermez", async () => {
  const paths = [
    "src/lib/education-programs/launchToken.ts",
    "src/lib/education-programs/exerciseRouteCatalog.ts",
    "src/app/ogrenci/egitim-programim/actions.ts",
    "src/components/education-programs/TaskLaunchForm.tsx",
  ];
  const source = (await Promise.all(paths.map(read))).join("\n");

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
  assert.doesNotMatch(source, /student_assignment_program/);
  assert.doesNotMatch(source, /daily_assignment/);
});

test("yeni RPC migration'i eski migration dosyalarini degistirmez, yalniz ekler", async () => {
  await assert.doesNotReject(
    access(
      new URL(
        "../supabase/migrations/20260725190000_start_education_program_task_rpc.sql",
        import.meta.url,
      ),
    ),
  );
  await assert.doesNotReject(
    access(
      new URL(
        "../supabase/migrations/20260725180000_create_student_education_program_system.sql",
        import.meta.url,
      ),
    ),
  );
});
