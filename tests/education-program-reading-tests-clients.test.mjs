import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const COMPREHENSION_PATH = "src/app/egzersizler/anlama-testi/ReadingComprehensionTestClient.tsx";
const SPEED_TEST_PATH = "src/app/egzersizler/okuma-hizi-testi/ReadingSpeedTestClient.tsx";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const CLIENTS = [
  {
    name: "Anlama Testi",
    path: COMPREHENSION_PATH,
    componentName: "ReadingComprehensionTestClient",
    expectedResultExerciseType: "reading-comprehension",
  },
  {
    name: "Okuma Hızı Testi",
    path: SPEED_TEST_PATH,
    componentName: "ReadingSpeedTestClient",
    expectedResultExerciseType: "reading-speed-test",
  },
];

for (const client of CLIENTS) {
  test(`${client.name}: educationProgramLaunch prop'u opsiyonel ve tipli olarak tanimlanir (standalone fallback {})`, async () => {
    const source = await read(client.path);

    assert.match(
      source,
      /import type \{ EducationProgramExerciseLaunchProps \} from "@\/lib\/education-programs\/exerciseLaunchProps";/,
    );
    assert.match(
      source,
      new RegExp(
        `export function ${client.componentName}\\(\\{\\s*\\n\\s*educationProgramLaunch,\\s*\\n\\s*\\}: \\{\\s*\\n\\s*educationProgramLaunch\\?: EducationProgramExerciseLaunchProps;\\s*\\n\\s*\\} = \\{\\}\\)`,
      ),
    );
  });

  // 4/13 - EP modunda test bitince task completion cagiriyor mu?
  test(`${client.name}: useEducationProgramTaskCompletion dogru resultExerciseType ile cagrilir, isAssignmentMode ile gate'lenir`, async () => {
    const source = await read(client.path);

    assert.match(
      source,
      new RegExp(`const EXPECTED_RESULT_EXERCISE_TYPE = "${client.expectedResultExerciseType}";`),
    );
    assert.match(
      source,
      /const educationProgramTaskId =\s*\n\s*isEducationProgramMode && !isAssignmentMode \? educationProgramLaunch\?\.taskId : undefined;/,
    );
    assert.match(
      source,
      /useEducationProgramTaskCompletion\(educationProgramTaskId, EXPECTED_RESULT_EXERCISE_TYPE\)/,
    );
  });

  test(`${client.name}: basarili kayittan sonra completeTaskAfterResultSave cagrilir (persistResult icinde)`, async () => {
    const source = await read(client.path);

    assert.match(
      source,
      /const saved = await saveExerciseResultSecure\(payload\);[\s\S]{0,300}await completeTaskAfterResultSave\(\);/,
    );
  });

  // 5 - standalone modda completion cagrilmiyor mu?
  test(`${client.name}: standalone modda (educationProgramLaunch yok) educationProgramTaskId undefined kalir, hook taskId olmadan completion API'sini hic cagirmaz`, async () => {
    const source = await read(client.path);

    // useEducationProgramTaskCompletion, taskId undefined ise
    // completeTaskAfterResultSave'i cagirinca hemen true ile resolve eder ve
    // hicbir agi istegi yapmaz (bkz. useEducationProgramTaskCompletion.ts:
    // "if (!taskId) return Promise.resolve(true);"). Client tarafinda
    // isEducationProgramMode false iken taskId'nin undefined kalmasi yeterli
    // kanittir - asagidaki desen bunu dogrular.
    assert.match(
      source,
      /const isEducationProgramMode = Boolean\(educationProgramLaunch\);/,
    );
    assert.match(
      source,
      /isEducationProgramMode && !isAssignmentMode \? educationProgramLaunch\?\.taskId : undefined/,
    );
  });

  // 6 - duplicate Bitir / result durumunda tek kayit olusuyor mu?
  test(`${client.name}: persistResult saveInFlightRef/saveCompletedRef ile cift-kayda karsi guard'lidir`, async () => {
    const source = await read(client.path);

    assert.match(
      source,
      /if \(saveInFlightRef\.current \|\| saveCompletedRef\.current\) \{\s*\n\s*return;\s*\n\s*\}/,
    );
    assert.match(source, /saveInFlightRef\.current = true;/);
    assert.match(source, /saveCompletedRef\.current = true;/);
  });

  test(`${client.name}: legacy saveExerciseResult kaldirilmis, saveExerciseResultSecure kullanilir`, async () => {
    const source = await read(client.path);

    assert.match(
      source,
      /import \{ saveExerciseResultSecure, type SecureExerciseResultInput \} from "@\/lib\/results\/secureResultStorage";/,
    );
    assert.doesNotMatch(source, /from "@\/lib\/results\/resultStorage"/);
    assert.match(source, /await saveExerciseResultSecure\(payload\)/);
  });

  test(`${client.name}: sure/cumulative kavrami eklenmedi (bu iki calisma sinirsiz sinamadir)`, async () => {
    const source = await read(client.path);

    assert.doesNotMatch(source, /assignedDurationSeconds/);
    assert.doesNotMatch(source, /cumulativeActiveSeconds/);
    assert.doesNotMatch(source, /hasReachedAssignedDuration/);
    assert.doesNotMatch(source, /textEndInFlightRef/);
    assert.doesNotMatch(source, /newTextNotice|NewTextNotice/);
  });

  test(`${client.name}: completion basarisiz olursa retry banner ayni ekranda kalir, otomatik yonlendirme yok, retry result'i yeniden kaydetmez`, async () => {
    const source = await read(client.path);

    assert.match(source, /completionStatus\.state === "error" && completionStatus\.canRetry/);
    assert.match(source, /onClick=\{\(\) => void retryTaskCompletion\(\)\}/);
    assert.doesNotMatch(source, /completeTaskAfterResultSave\(\)[\s\S]{0,120}router\.push/);

    const retrySite = source.indexOf("void retryTaskCompletion()");
    assert.ok(retrySite >= 0);
    const nearbyBlock = source.slice(retrySite - 200, retrySite + 50);
    assert.doesNotMatch(nearbyBlock, /saveExerciseResultSecure/);
  });

  test(`${client.name}: egzersiz bileseni studentId/service-role/launch token gibi hassas alanlari okumaz`, async () => {
    const source = await read(client.path);

    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE/);
    assert.doesNotMatch(source, /LAUNCH_SECRET/);
    assert.doesNotMatch(source, /signedToken|launchToken/i);
  });
}

// Anlama Testi'ne ozel: legacy saveReadingTestResult ayri/ilgisiz bir ozellik
// (okuma testlerim gecmisi) - bu turda dokunulmadi, hala calisiyor olmali.
test("Anlama Testi: saveReadingTestResult cagrisi degismeden korunmustur (ilgisiz legacy ozellik, bilerek dokunulmadi)", async () => {
  const source = await read(COMPREHENSION_PATH);

  assert.match(
    source,
    /import \{ saveReadingTestResult \} from "@\/lib\/results\/readingTestStorage";/,
  );
  assert.match(source, /saveReadingTestResult\(\{/);
});

test("Anlama Testi: exerciseType payload'inda tam olarak reading-comprehension", async () => {
  const source = await read(COMPREHENSION_PATH);
  assert.match(source, /exerciseType: "reading-comprehension",/);
});

test("Okuma Hizi Testi: exerciseType payload'inda tam olarak reading-speed-test", async () => {
  const source = await read(SPEED_TEST_PATH);
  assert.match(source, /exerciseType: "reading-speed-test",/);
});

test("Okuma Hizi Testi: eski fire-and-forget (.catch(() => undefined)) kaldirildi, artik tracked persistResult kullanir", async () => {
  const source = await read(SPEED_TEST_PATH);
  assert.doesNotMatch(source, /\.catch\(\(\) => undefined\)/);
});

test("navigasyon butonlari her iki client'ta saveStatus success olmadan aktif olmaz", async () => {
  const comprehensionSource = await read(COMPREHENSION_PATH);
  const speedTestSource = await read(SPEED_TEST_PATH);

  const comprehensionDisabledMatches = [...comprehensionSource.matchAll(/disabled=\{saveStatus !== "success"\}/g)];
  assert.equal(comprehensionDisabledMatches.length, 2, "Anlama Testi: Yeniden Baslat + Ortak Sonuc Ekrani kilitlenmeli");

  const speedTestDisabledMatches = [...speedTestSource.matchAll(/disabled=\{saveStatus !== "success"\}/g)];
  assert.equal(speedTestDisabledMatches.length, 3, "Okuma Hizi Testi: Tekrar Olc + Baska Metin Sec + Ortak Sonuc Ekrani kilitlenmeli");
});
