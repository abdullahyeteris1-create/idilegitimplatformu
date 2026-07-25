import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const HOOK_PATH =
  "src/lib/education-programs/useEducationProgramTaskCompletion.ts";

const EXERCISES = [
  {
    name: "Kare Görme Alanı",
    path: "src/app/egzersizler/kare-gorme-alani/SquareVisionExerciseClient.tsx",
    expectedType: "square-vision",
    manualFinish: /onClick=\{finishExercise\}/,
    timeoutFinish:
      /elapsedSeconds >= totalDurationSeconds[\s\S]*?finishExercise\(\)/,
  },
  {
    name: "Aynı Olanı Yakala",
    path: "src/app/egzersizler/ayni-olani-yakala/CatchSameExerciseClient.tsx",
    expectedType: "catch-same",
    manualFinish: /saveResult\("manual"\)/,
    timeoutFinish: /saveResult\("finished"\)/,
  },
  {
    name: "Benzer Kelimeler",
    path: "src/app/egzersizler/benzer-kelimeler/SimilarWordsExerciseClient.tsx",
    expectedType: "similar-words",
    manualFinish:
      /const handleFinishEarly = \(\) => \{[\s\S]*?setPhase\("result"\)/,
    timeoutFinish:
      /if \(prev <= 1\) \{[\s\S]*?setPhase\("result"\)/,
  },
  {
    name: "Kelime Bulma",
    path: "src/app/egzersizler/kelime-bulma/WordFindingExerciseClient.tsx",
    expectedType: "word-finding",
    manualFinish:
      /const handleFinishEarly = \(\) => \{\s*finalizeExercise\(\)/,
    timeoutFinish:
      /remainingSeconds === 0[\s\S]*?window\.setTimeout\(finalizeExercise, 0\)/,
  },
  {
    name: "Göz Egzersizleri Kolonlar",
    path: "src/app/egzersizler/goz-egzersizleri-kolonlar/ColumnEyeExerciseClient.tsx",
    expectedType: "eye-columns",
    manualFinish: /onClick=\{finishExercise\}/,
    timeoutFinish:
      /window\.setTimeout\(\(\) => finishExerciseRef\.current\(\), 0\)/,
  },
];

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function findPersistStart(source) {
  const callbackStart = source.indexOf("const persistResult");
  const functionStart = source.indexOf("async function persistResult");
  const starts = [callbackStart, functionStart].filter((index) => index >= 0);
  assert.ok(starts.length > 0, "persistResult bulunmalı");
  return Math.min(...starts);
}

test("ortak completion hook'u yalnız client completion bounded context'ine bağlıdır", async () => {
  const source = await read(HOOK_PATH);

  assert.match(source, /^"use client";/);
  assert.match(
    source,
    /import \{ completeEducationProgramTask \} from "@\/lib\/education-programs\/completeEducationProgramTaskClient"/,
  );
  assert.doesNotMatch(
    source,
    /saveExerciseResultSecure|localStorage|sessionStorage|useRouter|next\/navigation|Supabase|@\/lib\/assignments|@\/components\/assignments|toast/i,
  );
});

test("educationProgram taskId yoksa completion helper çağrılmaz", async () => {
  const source = await read(HOOK_PATH);
  const gateIndex = source.indexOf("if (!taskId)");
  const callIndex = source.indexOf("await completeEducationProgramTask(");

  assert.ok(gateIndex >= 0);
  assert.ok(callIndex > gateIndex);
  assert.match(
    source,
    /completeEducationProgramTask\(\s*taskId,\s*expectedResultExerciseType,\s*\)/,
  );
});

test("ortak hook in-flight ve başarılı-completed guard taşır", async () => {
  const source = await read(HOOK_PATH);

  assert.match(source, /inFlightCompletionRef/);
  assert.match(
    source,
    /if \(inFlightCompletionRef\.current\?\.taskKey === taskKey\) \{\s*return inFlightCompletionRef\.current\.promise;/,
  );
  assert.match(source, /completedTaskKeyRef/);
  assert.match(
    source,
    /if \(completedTaskKeyRef\.current === taskKey\) \{\s*return Promise\.resolve\(true\);/,
  );
});

test("alreadyCompleted dahil tüm ok:true sonuçları başarı guard'ını kurar", async () => {
  const source = await read(HOOK_PATH);

  assert.match(
    source,
    /if \(result\.ok\) \{[\s\S]*?completedTaskKeyRef\.current = taskKey;/,
  );
  assert.match(source, /alreadyCompleted da ayni ok:true basari yolundan gelir/);
});

test("başarısız completion completed guard kurmaz ve yalnız completion retry bırakır", async () => {
  const source = await read(HOOK_PATH);
  const successBlock = source.indexOf("if (result.ok)");
  const completedAssignment = source.indexOf(
    "completedTaskKeyRef.current = taskKey",
  );
  const failureStatus = source.indexOf(
    "setCompletionStatus(getFailureStatus(result.code))",
  );

  assert.ok(successBlock >= 0);
  assert.ok(completedAssignment > successBlock);
  assert.ok(failureStatus > completedAssignment);
  assert.match(
    source,
    /retryTaskCompletion: completeTaskAfterResultSave/,
  );
  assert.doesNotMatch(source, /setTimeout|setInterval/);
});

test("completion pending, success, 404, 409 ve retryable hata metinleri ortaktır", async () => {
  const source = await read(HOOK_PATH);

  assert.match(source, /Program ilerlemeniz güncelleniyor…/);
  assert.match(source, /Program ilerlemeniz güncellendi\./);
  assert.match(
    source,
    /Bu program görevi artık bulunamıyor\. Program sayfasına dönüp yenileyin\./,
  );
  assert.match(
    source,
    /Program görevi şu anda tamamlanamadı\. Program sayfasına dönüp yenileyin\./,
  );
  assert.match(
    source,
    /Sonucunuz kaydedildi ancak program ilerlemeniz güncellenemedi\./,
  );
  assert.match(source, /canRetry: false/);
  assert.match(source, /canRetry: true/);
});

test("navigation/unmount completion isteğini abort etmez", async () => {
  const source = await read(HOOK_PATH);

  assert.doesNotMatch(source, /AbortController|\.abort\(/);
  assert.match(source, /isMountedRef\.current = false/);
});

for (const exercise of EXERCISES) {
  test(`${exercise.name}: doğru literal type ve educationProgramLaunch.taskId kullanır`, async () => {
    const source = await read(exercise.path);

    assert.match(
      source,
      /import \{ useEducationProgramTaskCompletion \} from "@\/lib\/education-programs\/useEducationProgramTaskCompletion"/,
    );
    assert.match(
      source,
      new RegExp(
        `const EXPECTED_RESULT_EXERCISE_TYPE = "${exercise.expectedType}";`,
      ),
    );
    assert.match(
      source,
      /const educationProgramTaskId =\s*isEducationProgramMode && !isAssignmentMode\s*\? educationProgramLaunch\?\.taskId\s*: undefined;/,
    );
    assert.match(
      source,
      /useEducationProgramTaskCompletion\(\s*educationProgramTaskId,\s*EXPECTED_RESULT_EXERCISE_TYPE,\s*\)/,
    );
    assert.doesNotMatch(
      source,
      /educationProgramLaunch\??\.resultExerciseType/,
    );
  });

  test(`${exercise.name}: completion güvenli sonuç kaydından sonra ve aynı try akışında çalışır`, async () => {
    const source = await read(exercise.path);
    const persistStart = findPersistStart(source);
    const saveIndex = source.indexOf(
      "await saveExerciseResultSecure",
      persistStart,
    );
    const completionIndex = source.indexOf(
      "await completeTaskAfterResultSave()",
      saveIndex,
    );
    const catchIndex = source.indexOf("} catch", saveIndex);

    assert.ok(saveIndex > persistStart, "secure result save await edilmeli");
    assert.ok(
      completionIndex > saveIndex,
      "completion result save sonrasında olmalı",
    );
    assert.ok(
      catchIndex > completionIndex,
      "save throw ederse completion satırına ulaşılmamalı",
    );
    assert.equal(
      source.match(/await completeTaskAfterResultSave\(\)/g)?.length,
      1,
      "completion persist akışında tek noktadan çağrılmalı",
    );
  });

  test(`${exercise.name}: result save retry ile completion retry ayrıdır`, async () => {
    const source = await read(exercise.path);

    assert.match(
      source,
      /pendingResultRef\.current[\s\S]*?void persistResult\(/,
    );
    assert.match(
      source,
      /onClick=\{\(\) => void retryTaskCompletion\(\)\}/,
    );
    assert.match(source, /Program ilerlemesini yeniden dene/);
  });

  test(`${exercise.name}: completion durumu navigation disabled koşuluna bağlanmaz`, async () => {
    const source = await read(exercise.path);

    assert.doesNotMatch(
      source,
      /disabled=\{[^}]*completionStatus/,
    );
    assert.doesNotMatch(
      source,
      /router\.push\([^)]*\)[\s\S]{0,120}completeTaskAfterResultSave/,
    );
  });

  test(`${exercise.name}: manuel ve timeout finish yolları korunur`, async () => {
    const source = await read(exercise.path);

    assert.match(source, exercise.manualFinish);
    assert.match(source, exercise.timeoutFinish);
  });
}

test("Kolonlar sonucu fire-and-forget yerine await/catch persist akışıyla kaydeder", async () => {
  const source = await read(
    "src/app/egzersizler/goz-egzersizleri-kolonlar/ColumnEyeExerciseClient.tsx",
  );

  assert.match(
    source,
    /const persistResult = useCallback\(async \(payload: SecureExerciseResultInput\)/,
  );
  assert.match(source, /await saveExerciseResultSecure\(payload\)/);
  assert.match(source, /\} catch \{/);
  assert.match(source, /pendingResultRef\.current = payload/);
  assert.doesNotMatch(source, /void saveExerciseResultSecure\(/);
});

test("ortak completion hook'u result payload veya öğrenci kimliği göndermez", async () => {
  const source = await read(HOOK_PATH);

  assert.doesNotMatch(
    source,
    /studentId|programId|dayId|score|launchToken|resultPayload/,
  );
});
