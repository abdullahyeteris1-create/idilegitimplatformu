import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("Assignment System V2 dosyalari FAZ 3A-3A'da da degismemis sekilde durur", async () => {
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

test("FAZ 3A-3A'da yeni migration olusturulmadi (dosya sayisi FAZ 3A-1'dekiyle ayni)", async () => {
  // NOT: Bu sayi yalniz FAZ 3A-3A anini tanimliyordu. Sonraki turlarda kasitli
  // olarak yeni migration'lar eklendi - bu artik beklenen bir durum,
  // regresyon degil (bkz. education-program-complete-task-migration.test.mjs,
  // duplicate_education_program_template_rpc migration'i - Program
  // Sablonlari "Kopyala" ozelligi icin, bkz.
  // education-program-template-duplicate.test.mjs - ve assign_education_
  // program_template_v1 egzersiz whitelist senkron duzeltmesi, bkz.
  // education-program-assign-exercise-whitelist-sync.test.mjs.
  // Phase 1B idempotency migration'iyle toplam sayi tekrar arttigi icin
  // mevcut migration toplamini kontrol ediyoruz.
  // 2026-07-29: cift-tarafli-odak exercise'i icin yeni migration eklendi.
  // 2026-07-29: goz-kaslari exercise'i icin yeni migration eklendi (20260729230000).
  // 2026-07-30: 13-nokta-emoji-takip whitelist forward migration'i eklendi.
  const files = await readdir(new URL("../supabase/migrations", import.meta.url));
  const sqlFiles = files.filter((name) => name.endsWith(".sql"));

  assert.equal(sqlFiles.length, 30);
});

test("Kare Gorme Alani route'u sonraki bir turda paylasilan helper'a gecirildi (kopyalanmis ozel dogrulama kaldirildi)", async () => {
  const source = await read("src/app/egzersizler/kare-gorme-alani/page.tsx");

  assert.match(source, /resolveEducationProgramExerciseLaunch/);
  assert.doesNotMatch(source, /await cookies\(\)/);
  assert.doesNotMatch(source, /getEducationProgramTaskLaunchContext/);
});

test("Eklenen yeni dosyalar eski Assignment System V2'ye bagimlilik icermez", async () => {
  const paths = [
    "src/lib/education-programs/exerciseLaunchValidation.ts",
    "src/app/egzersizler/ayni-olani-yakala/page.tsx",
    "src/app/egzersizler/benzer-kelimeler/page.tsx",
    "src/app/egzersizler/kelime-bulma/page.tsx",
    "src/app/egzersizler/goz-egzersizleri-kolonlar/page.tsx",
  ];
  const source = (await Promise.all(paths.map(read))).join("\n");

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
  assert.doesNotMatch(source, /student_assignment_program/);
});

test("FAZ 3B-2 completion entegrasyonu eski Assignment System V2 tamamlama yoluna dokunmaz", async () => {
  for (const clientPath of [
    "src/app/egzersizler/ayni-olani-yakala/CatchSameExerciseClient.tsx",
    "src/app/egzersizler/benzer-kelimeler/SimilarWordsExerciseClient.tsx",
    "src/app/egzersizler/kelime-bulma/WordFindingExerciseClient.tsx",
    "src/app/egzersizler/goz-egzersizleri-kolonlar/ColumnEyeExerciseClient.tsx",
  ]) {
    const source = await read(clientPath);
    assert.match(source, /saveExerciseResultSecure/);
    assert.match(source, /educationProgramLaunch\?\.taskId/);
    assert.doesNotMatch(source, /complete_student_assignment_program_task/);
    assert.doesNotMatch(source, /student_education_program_tasks/);
  }
});

test("FAZ2B/3A-1 izolasyon testleri hala gecerlidir: egitim-programim page.tsx yasakli desenleri icermez", async () => {
  const source = await read("src/app/ogrenci/egitim-programim/page.tsx");

  assert.doesNotMatch(source, /\bparams\b/);
  assert.doesNotMatch(source, /\bsearchParams\b/);
  assert.doesNotMatch(source, /formData/);
  assert.doesNotMatch(source, /hasAdminSession/);
  assert.doesNotMatch(source, /"use client"/);
});

test("Tekrarlanan educationLaunch query parametresi hicbir egzersizde cokme uretmez (ortak helper'daki typeof guard uzerinden)", async () => {
  const tokenSource = await read("src/lib/education-programs/launchToken.ts");

  const guardIndex = tokenSource.indexOf('typeof token !== "string"');
  const splitIndex = tokenSource.indexOf('token.split(".")');

  assert.notEqual(guardIndex, -1, "typeof token guard bulunamadi");
  assert.notEqual(splitIndex, -1, "token.split bulunamadi");
  assert.ok(guardIndex < splitIndex, "guard, split'ten ONCE calismali");

  for (const pagePath of [
    "src/app/egzersizler/ayni-olani-yakala/page.tsx",
    "src/app/egzersizler/benzer-kelimeler/page.tsx",
    "src/app/egzersizler/kelime-bulma/page.tsx",
    "src/app/egzersizler/goz-egzersizleri-kolonlar/page.tsx",
  ]) {
    const pageSource = await read(pagePath);
    assert.match(pageSource, /resolveEducationProgramExerciseLaunch/);
  }
});
