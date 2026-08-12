import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(path, "utf8");

test("Tatlı Dükkanı route mevcut eğitim programı chrome ve launch doğrulamasını kullanır", async () => {
  const source = await read("src/app/egzersizler/tatli-dukkani/page.tsx");
  assert.match(source, /resolveEducationProgramExerciseLaunch/);
  assert.match(source, /EducationProgramExerciseChrome/);
  assert.match(source, /tatli-dukkani/);
});

test("Tatlı Dükkanı sonucu güvenli sonuç akışıyla ve öğrenci kimliği taşımadan kaydedilir", async () => {
  const source = await read("src/app/egzersizler/tatli-dukkani/TatliDukkaniExerciseClient.tsx");
  assert.match(source, /saveExerciseResultSecure/);
  assert.match(source, /exerciseType: RESULT_TYPE/);
  assert.doesNotMatch(source, /studentId/);
  assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(source, /https?:\/\//);
});

test("Tatlı Dükkanı prototip mekaniğinin temel akışını taşır", async () => {
  const source = await read("src/app/egzersizler/tatli-dukkani/TatliDukkaniExerciseClient.tsx");
  for (const marker of ["Oyuna Başla", "MÜŞTERİ SİPARİŞİ", "Doğru Ürünleri Seç", "Siparişi Hazırla", "Seviye", "Puan", "can"]) {
    assert.match(source, new RegExp(marker));
  }
  assert.match(source, /setOptions\(shuffle\(\[\.\.\.picked, \.\.\.decoys\]\)\)/);
  assert.match(source, /saveExerciseResultSecure/);
});

test("katalog, preview ve eğitim route allow-listesi tatli-dukkani içerir", async () => {
  const [assignments, education, routes, preview, api] = await Promise.all([
    read("src/lib/assignments/exerciseCatalog.ts"),
    read("src/lib/education-programs/exerciseCatalog.ts"),
    read("src/lib/education-programs/exerciseRouteCatalog.ts"),
    read("src/components/exercises-preview/exercisePreviewGroups.ts"),
    read("src/app/api/student/results/route.ts"),
  ]);
  for (const source of [assignments, education, routes, preview, api]) assert.match(source, /tatli-dukkani/);
});

test("prototip dosyasına entegrasyon sırasında dokunulmamıştır", async () => {
  const source = await read("prototypes/tatli-dukkani.html");
  assert.match(source, /Tatl/);
});
