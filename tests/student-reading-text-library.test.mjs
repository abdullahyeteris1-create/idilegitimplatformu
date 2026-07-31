import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const textStorage = await readFile("src/lib/settings/textLibraryStorage.ts", "utf8");
const questionStorage = await readFile("src/lib/settings/questionLibraryStorage.ts", "utf8");
const focusedReading = await readFile("src/app/egzersizler/odakli-okuma/FocusedReadingExerciseClient.tsx", "utf8");
const comprehension = await readFile("src/app/egzersizler/anlama-testi/ReadingComprehensionTestClient.tsx", "utf8");

test("öğrenci metin akışları ortak text_library kaynağını kullanır", () => {
  assert.match(textStorage, /from\(TEXT_LIBRARY_TABLE\)/);
  assert.match(focusedReading, /loadActiveTextLibraryItems/);
  assert.match(comprehension, /loadActiveTextLibraryItems/);
});

test("remote metin hatası yerel cache ile sessizce başarıya çevrilmez", () => {
  assert.match(textStorage, /items: remoteResult\.error \? \[\] : remoteResult\.items/);
  assert.match(textStorage, /error: remoteResult\.error/);
});

test("Anlama Testi aktif soruları aynı remote soru kaynağından alır ve hatayı gösterir", () => {
  assert.match(questionStorage, /loadActiveQuestionLibraryItems/);
  assert.match(questionStorage, /eq\("is_active", true\)/);
  assert.match(comprehension, /loadActiveQuestionLibraryItems/);
  assert.match(comprehension, /questionResult\.error/);
});

test("uzak kategori değerleri ortak kategori normalizasyonundan geçer", () => {
  assert.match(textStorage, /category: normalizeCategoryName\(/);
  assert.ok(textStorage.includes('.replace(/[İIı]/g, "i")'));
});

test("storage erişimi başarısız olsa bile remote metin sorgusu engellenmez", () => {
  assert.match(textStorage, /readTextLibraryStorageValue/);
  assert.match(textStorage, /writeTextLibraryStorageValue/);
  assert.match(textStorage, /catch \{\n    textLibraryStorageAccess = false;/);
  assert.match(textStorage, /stage=\$\{fields\.stage\}.*storageAccess=/s);
});

test("iOS teşhis logu yalnız güvenli primitive alanları kullanır", () => {
  assert.match(textStorage, /student-text-library-ios/);
  assert.doesNotMatch(textStorage, /console\.(info|error)\([^;]*(message|details|hint|content|token|cookie)/s);
});
