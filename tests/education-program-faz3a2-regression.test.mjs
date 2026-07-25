import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("17) Assignment System V2 dosyalari FAZ 3A-2'de degismemis sekilde durur", async () => {
  for (const candidate of [
    "src/components/assignments/AssignmentTaskProvider.tsx",
    "src/components/assignments/AssignmentTaskTimer.tsx",
    "src/app/egzersizler/layout.tsx",
    "supabase/migrations/20260725120000_complete_student_assignment_program_task_rpc.sql",
  ]) {
    await assert.doesNotReject(access(new URL(`../${candidate}`, import.meta.url)));
  }

  const layout = await read("src/app/egzersizler/layout.tsx");
  assert.match(layout, /AssignmentTaskProvider/);
  assert.doesNotMatch(layout, /education-programs/);
});

test("diger 4 egzersiz route'u FAZ 3A-2'de degismedi (yalniz Kare Gorme Alani entegre edildi)", async () => {
  for (const slug of [
    "ayni-olani-yakala",
    "benzer-kelimeler",
    "kelime-bulma",
    "goz-egzersizleri-kolonlar",
  ]) {
    const source = await read(`src/app/egzersizler/${slug}/page.tsx`);
    assert.doesNotMatch(source, /educationLaunch/);
    assert.doesNotMatch(source, /educationProgramLaunch/);
    assert.doesNotMatch(source, /getEducationProgramTaskLaunchContext/);
  }
});

test("FAZ 3A-2 yeni dosyalari eski Assignment System V2'ye bagimlilik icermez", async () => {
  const paths = [
    "src/lib/education-programs/exerciseLaunchProps.ts",
    "src/lib/education-programs/launchErrorCodes.ts",
    "src/components/education-programs/EducationProgramLaunchErrorBanner.tsx",
  ];
  const source = (await Promise.all(paths.map(read))).join("\n");

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
  assert.doesNotMatch(source, /student_assignment_program/);
});

test("FAZ 3A-2'de yeni migration olusturulmadi (dosya sayisi FAZ 3A-1'dekiyle ayni)", async () => {
  const files = await readdir(new URL("../supabase/migrations", import.meta.url));
  const sqlFiles = files.filter((name) => name.endsWith(".sql"));

  assert.equal(sqlFiles.length, 15);
  assert.ok(sqlFiles.includes("20260725190000_start_education_program_task_rpc.sql"));

  const migrationSource = await read(
    "supabase/migrations/20260725190000_start_education_program_task_rpc.sql",
  );
  assert.match(
    migrationSource,
    /create or replace function public\.start_education_program_task_v1/,
  );
});

test("FAZ 2B/3A-1 izolasyon testleri hala gecerlidir: egitim-programim page.tsx yasakli desenleri icermez", async () => {
  const source = await read("src/app/ogrenci/egitim-programim/page.tsx");

  assert.doesNotMatch(source, /\bparams\b/);
  assert.doesNotMatch(source, /\bsearchParams\b/);
  assert.doesNotMatch(source, /formData/);
  assert.doesNotMatch(source, /hasAdminSession/);
  assert.doesNotMatch(source, /"use client"/);
  assert.match(source, /getActiveEducationProgramForStudent\(supabase, access\.studentId\)/);
});
