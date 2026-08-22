import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const textStorage = await readFile("src/lib/settings/textLibraryStorage.ts", "utf8");
const questionStorage = await readFile("src/lib/settings/questionLibraryStorage.ts", "utf8");
const blockReading = await readFile("src/app/egzersizler/blok-okuma/BlockReadingExerciseClient.tsx", "utf8");
const shadowReading = await readFile("src/app/egzersizler/golgeleme/ShadowReadingExerciseClient.tsx", "utf8");
const focusedReading = await readFile("src/app/egzersizler/odakli-okuma/FocusedReadingExerciseClient.tsx", "utf8");
const groupingReading = await readFile("src/app/egzersizler/gruplama-calismasi/GroupingExerciseClient.tsx", "utf8");
const comprehension = await readFile("src/app/egzersizler/anlama-testi/ReadingComprehensionTestClient.tsx", "utf8");
const readingSpeed = await readFile("src/app/egzersizler/okuma-hizi-testi/ReadingSpeedTestClient.tsx", "utf8");
const {
  COMPREHENSION_QUESTIONS_RELATION,
  filterReadingPracticeTextRows,
  hasComprehensionQuestions,
} = await import("../src/lib/settings/readingPracticeTextPool.ts");

const withoutQuestions = {
  id: "text-without-questions",
  [COMPREHENSION_QUESTIONS_RELATION]: [],
};
const withOneQuestion = {
  id: "text-with-one-question",
  [COMPREHENSION_QUESTIONS_RELATION]: [{ id: "question-1" }],
};

test("öğrenci metin akışları ortak text_library kaynağını kullanır", () => {
  assert.match(textStorage, /from\(TEXT_LIBRARY_TABLE\)/);
  assert.match(focusedReading, /loadActiveReadingPracticeTextItems/);
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

test("anlama sorusu olmayan metin Blok Okuma havuzunda kalır", () => {
  assert.deepEqual(filterReadingPracticeTextRows([withoutQuestions, withOneQuestion]), [withoutQuestions]);
  assert.match(blockReading, /loadActiveReadingPracticeTextItems/);
});

test("anlama sorusu olan metin Blok Okuma havuzundan çıkar", () => {
  assert.equal(hasComprehensionQuestions(withOneQuestion), true);
  assert.equal(filterReadingPracticeTextRows([withOneQuestion]).length, 0);
  assert.doesNotMatch(blockReading, /loadActiveTextLibraryItems/);
});

test("anlama sorusu olan metin Gölgeleme havuzundan çıkar", () => {
  assert.match(shadowReading, /loadActiveReadingPracticeTextItems/);
  assert.doesNotMatch(shadowReading, /loadActiveTextLibraryItems/);
});

test("anlama sorusu olan metin Odaklı Okuma havuzundan çıkar", () => {
  assert.match(focusedReading, /loadActiveReadingPracticeTextItems/);
  assert.doesNotMatch(focusedReading, /loadActiveTextLibraryItems/);
});

test("anlama sorusu olan metin Gruplama havuzundan çıkar", () => {
  assert.match(groupingReading, /loadActiveReadingPracticeTextItems/);
  assert.doesNotMatch(groupingReading, /loadActiveTextLibraryItems/);
});

test("aynı metin Anlama Testleri kaynağında görünmeye devam eder", () => {
  assert.match(comprehension, /loadActiveTextLibraryItems/);
  assert.match(comprehension, /loadActiveQuestionLibraryItems/);
  assert.doesNotMatch(comprehension, /loadActiveReadingPracticeTextItems/);
});

test("birden fazla anlama sorusu metni yine yalnız bir kez havuzdan çıkarır", () => {
  const withMultipleQuestions = {
    id: "text-with-multiple-questions",
    [COMPREHENSION_QUESTIONS_RELATION]: [{ id: "question-1" }, { id: "question-2" }],
  };

  assert.equal(hasComprehensionQuestions(withMultipleQuestions), true);
  assert.deepEqual(filterReadingPracticeTextRows([withoutQuestions, withMultipleQuestions]), [withoutQuestions]);
});

test("sonradan soru eklenen metin bir sonraki havuz kurulumunda otomatik çıkar", () => {
  const text = { id: "dynamic-text", [COMPREHENSION_QUESTIONS_RELATION]: [] };
  assert.deepEqual(filterReadingPracticeTextRows([text]).map((item) => item.id), ["dynamic-text"]);

  const afterQuestionAdded = { ...text, [COMPREHENSION_QUESTIONS_RELATION]: [{ id: "new-question" }] };
  assert.deepEqual(filterReadingPracticeTextRows([afterQuestionAdded]), []);
});

test("soruları silinen metin bir sonraki havuz kurulumunda yeniden görünür", () => {
  const text = {
    id: "dynamic-text",
    [COMPREHENSION_QUESTIONS_RELATION]: [{ id: "question-to-delete" }],
  };
  assert.deepEqual(filterReadingPracticeTextRows([text]), []);

  const afterQuestionsDeleted = { ...text, [COMPREHENSION_QUESTIONS_RELATION]: [] };
  assert.deepEqual(filterReadingPracticeTextRows([afterQuestionsDeleted]).map((item) => item.id), ["dynamic-text"]);
});

test("diğer metin egzersizleri ve Anlama Testleri ortak filtreden etkilenmez", () => {
  assert.match(readingSpeed, /loadActiveTextLibraryItems/);
  assert.doesNotMatch(readingSpeed, /loadActiveReadingPracticeTextItems/);
  assert.doesNotMatch(comprehension, /loadActiveReadingPracticeTextItems/);
});

test("metin çalışma sorgusu tek anti-join kullanır ve ortak cache'i daraltmaz", () => {
  assert.match(textStorage, /\$\{COMPREHENSION_QUESTIONS_RELATION\}:\$\{QUESTION_LIBRARY_TABLE\}\(id\)/);
  assert.match(textStorage, /query = query\.is\(COMPREHENSION_QUESTIONS_RELATION, null\)/);
  assert.match(textStorage, /fetchTextLibraryFromSupabase\(true, true\)/);

  const practiceLoader = textStorage.slice(
    textStorage.indexOf("export async function loadActiveReadingPracticeTextItems"),
    textStorage.indexOf("export function saveTextLibraryItem"),
  );
  assert.doesNotMatch(practiceLoader, /writeItems\(/);
});
