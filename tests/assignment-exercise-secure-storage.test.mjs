import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ASSIGNMENT_EXERCISE_CATALOG,
  getAssignmentExerciseDefinition,
} from "../src/lib/assignments/assignmentExerciseCatalog.ts";

/**
 * Odev havuzuna girebilen ("ready") her egzersizin BILESEN dosyasi.
 * Katalogdaki `route` degeri bir sayfa yolu oldugu icin bilesen dosyasi
 * elle eslenir; asagidaki ilk test bu eslemenin katalogla senkron kalmasini
 * garanti eder (yeni bir "ready" egzersiz eklenirse test kirilir).
 */
const READY_EXERCISE_COMPONENTS = {
  "kare-gorme-alani": "../src/app/egzersizler/kare-gorme-alani/SquareVisionExerciseClient.tsx",
  "ayni-olani-yakala": "../src/app/egzersizler/ayni-olani-yakala/CatchSameExerciseClient.tsx",
  "benzer-kelimeler": "../src/app/egzersizler/benzer-kelimeler/SimilarWordsExerciseClient.tsx",
  "kelime-bulma": "../src/app/egzersizler/kelime-bulma/WordFindingExerciseClient.tsx",
  "goz-egzersizleri-kolonlar": "../src/app/egzersizler/goz-egzersizleri-kolonlar/ColumnEyeExerciseClient.tsx",
  "goz-kaslari": "../src/app/egzersizler/goz-kaslari/EyeMuscleExerciseClient.tsx",
  "13-nokta-emoji-takip": "../src/app/egzersizler/13-nokta-emoji-takip/ThirteenPointEmojiTrackingClient.tsx",
  "harf-rakam-sayma": "../src/app/egzersizler/harf-rakam-sayma/LetterNumberCountingFocusClient.tsx",
  "hafiza-gelistirme": "../src/app/egzersizler/hafiza-gelistirme/MemoryGameExerciseClient.tsx",
  "kart-eslestirme": "../src/app/egzersizler/kart-eslestirme/CardMatchingExerciseClient.tsx",
  takistoskop: "../src/components/exercises/TachistoscopeExerciseClient.tsx",
};

const readComponent = (slug) => readFile(new URL(READY_EXERCISE_COMPONENTS[slug], import.meta.url), "utf8");

test("esleme tablosu katalogtaki TUM 'ready' egzersizleri kapsiyor", () => {
  const readySlugs = ASSIGNMENT_EXERCISE_CATALOG.filter((d) => d.integrationStatus === "ready")
    .map((d) => d.exerciseSlug)
    .sort();
  assert.deepEqual(Object.keys(READY_EXERCISE_COMPONENTS).sort(), readySlugs);
});

for (const slug of Object.keys(READY_EXERCISE_COMPONENTS)) {
  test(`${slug}: guvenli kayit (saveExerciseResultSecure) kullaniyor`, async () => {
    const source = await readComponent(slug);
    assert.match(source, /saveExerciseResultSecure/);
  });

  test(`${slug}: eski tarayici-tarafli kayit (saveExerciseResult) KULLANMIYOR`, async () => {
    const source = await readComponent(slug);
    // Eski yol sonucu odev gorevine baglamaz - gorev yalniz sure dolunca
    // kapanirdi. Bu kontrol o gerilemeyi engeller.
    assert.doesNotMatch(source, /\bsaveExerciseResult\b(?!Secure)/);
    assert.doesNotMatch(source, /from "@\/lib\/results\/resultStorage"/);
  });

  test(`${slug}: ogrenci kimligini client'tan GONDERMIYOR`, async () => {
    const source = await readComponent(slug);
    // Kimlik sunucuda imzali oturum cookie'sinden turetilmelidir.
    assert.doesNotMatch(source, /studentId:\s*student\?\./);
    assert.doesNotMatch(source, /studentName:\s*student\?\./);
  });
}

test("kaydedilen exerciseType degerleri katalogun resultExerciseType'i ile ESLESIYOR", async () => {
  // Uyusmazlik halinde tamamlama API'si 409 doner ve gorev sessizce acik
  // kalirdi - bu yuzden esleme acikca dogrulanir.
  const expected = {
    "goz-egzersizleri-kolonlar": "eye-columns",
    "goz-kaslari": "eye-muscle",
    "hafiza-gelistirme": "memory-game",
    "kart-eslestirme": "card-matching",
  };

  for (const [slug, exerciseType] of Object.entries(expected)) {
    const definition = getAssignmentExerciseDefinition(slug);
    assert.ok(definition, `${slug} katalogda bulunmali`);
    assert.equal(definition.resultExerciseType, exerciseType, `${slug} katalog turu uyusmali`);

    const source = await readComponent(slug);
    assert.match(source, new RegExp(`exerciseType:\\s*"${exerciseType}"`), `${slug} bu turu kaydetmeli`);
  }
});
