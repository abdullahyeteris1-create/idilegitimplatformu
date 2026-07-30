import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildTwoSideFocusResultPayload,
  getTwoSideFocusRemainingSeconds,
  isTwoSideFocusTimedMode,
  resolveTwoSideFocusDurationSeconds,
} from "../src/app/egzersizler/cift-tarafli-odak/twoSideFocusDuration.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

// --- Gerçek davranış testleri (saf fonksiyonlar, DOM/React gerekmez) -------

test("resolveTwoSideFocusDurationSeconds: Education Program modunda ogretmenin atadigi sure kullanilir", () => {
  const seconds = resolveTwoSideFocusDurationSeconds({
    isEducationProgramMode: true,
    isAssignmentMode: false,
    educationProgramDurationSeconds: 30,
    assignmentDurationSeconds: null,
  });

  assert.equal(seconds, 30);
});

test("Education Program katalogu cift-tarafli-odak icin speed ayarini sunar", async () => {
  const source = await read("src/lib/education-programs/exerciseSettingsSchemas.ts");
  assert.match(source, /exerciseSlug: "cift-tarafli-odak"/);
  assert.match(source, /key: "speed"/);
  assert.match(source, /options: \[5000, 3000, 1500, 900, 450\]/);
});

test("TwoSideFocusExerciseClient Education Program speed ayarini launch settings'ten okur ve kilitler", async () => {
  const source = await read("src/app/egzersizler/cift-tarafli-odak/TwoSideFocusExerciseClient.tsx");

  assert.match(source, /pickEducationProgramSettingOption\(\s*educationProgramLaunch\?\.settings,\s*"speed",\s*EDUCATION_PROGRAM_SPEED_OPTIONS,\s*DEFAULT_EDUCATION_PROGRAM_SPEED,/);
  assert.match(source, /const isSpeedLocked = controlledSpeed !== null;/);
  assert.match(source, /<select value=\{speed\} disabled/);
});

test("Eski Education Program gorevlerinde speed yoksa 5000 ms, serbest kullanimda 1500 ms varsayilani korunur", async () => {
  const source = await read("src/app/egzersizler/cift-tarafli-odak/TwoSideFocusExerciseClient.tsx");

  assert.match(source, /const DEFAULT_EDUCATION_PROGRAM_SPEED: EducationProgramSpeedOption = 5000;/);
  assert.match(source, /const DEFAULT_SPEED: SpeedOption = 1500;/);
  assert.match(source, /const \[freeSpeed, setFreeSpeed\] = useState<SpeedOption>\(DEFAULT_SPEED\);/);
  assert.match(source, /const speed = controlledSpeed \?\? freeSpeed;/);
});

test("Speed ayari mevcut generic settings JSON/form akisiyla tasinir, yeni kolon gerektirmez", async () => {
  const editor = await read("src/components/education-programs/EducationProgramTemplateEditor.tsx");
  const actions = await read("src/app/ogretmen/idil-panel/egitim-programlari/actions.ts");
  const launch = await read("src/lib/education-programs/exerciseLaunchValidation.ts");

  assert.match(editor, /getExerciseSettingsSchema\(exerciseSlug\)/);
  assert.match(editor, /settings-\$\{field\.key\}/);
  assert.match(actions, /readRawExerciseSettingsFromFormData/);
  assert.match(launch, /settings: result\.value\.settings/);
});

test("resolveTwoSideFocusDurationSeconds: Assignment modunda ogretmenin atadigi sure kullanilir", () => {
  const seconds = resolveTwoSideFocusDurationSeconds({
    isEducationProgramMode: false,
    isAssignmentMode: true,
    educationProgramDurationSeconds: null,
    assignmentDurationSeconds: 45,
  });

  assert.equal(seconds, 45);
});

test("resolveTwoSideFocusDurationSeconds: serbest kullanimda (hicbir mod aktif degil) sabit minimuma duser", () => {
  const seconds = resolveTwoSideFocusDurationSeconds({
    isEducationProgramMode: false,
    isAssignmentMode: false,
    educationProgramDurationSeconds: 999,
    assignmentDurationSeconds: 999,
  });

  // Serbest kullanimda hicbir sure kaynagi okunmaz - deger kullanilmaz
  // (isTwoSideFocusTimedMode false donerken UI'da hic gosterilmez) ama
  // fonksiyon her zaman guvenli bir pozitif sayi dondurur.
  assert.equal(seconds, 1);
});

test("resolveTwoSideFocusDurationSeconds: null/undefined/negatif deger 1'e kilitlenir (0'a bolme veya negatif sayac olmaz)", () => {
  assert.equal(
    resolveTwoSideFocusDurationSeconds({
      isEducationProgramMode: true,
      isAssignmentMode: false,
      educationProgramDurationSeconds: null,
    }),
    1,
  );

  assert.equal(
    resolveTwoSideFocusDurationSeconds({
      isEducationProgramMode: true,
      isAssignmentMode: false,
      educationProgramDurationSeconds: -10,
    }),
    1,
  );

  assert.equal(
    resolveTwoSideFocusDurationSeconds({
      isEducationProgramMode: true,
      isAssignmentMode: false,
      educationProgramDurationSeconds: undefined,
    }),
    1,
  );
});

test("resolveTwoSideFocusDurationSeconds: kesirli saniye en yakina yuvarlanir", () => {
  assert.equal(
    resolveTwoSideFocusDurationSeconds({
      isEducationProgramMode: true,
      isAssignmentMode: false,
      educationProgramDurationSeconds: 30.6,
    }),
    31,
  );
});

test("isTwoSideFocusTimedMode: yalniz Education Program veya Assignment modunda true doner", () => {
  assert.equal(isTwoSideFocusTimedMode(false, false), false);
  assert.equal(isTwoSideFocusTimedMode(true, false), true);
  assert.equal(isTwoSideFocusTimedMode(false, true), true);
});

test("getTwoSideFocusRemainingSeconds: 30 saniyeden geri sayar ve asla negatif olmaz", () => {
  assert.equal(getTwoSideFocusRemainingSeconds(30, 0), 30);
  assert.equal(getTwoSideFocusRemainingSeconds(30, 1), 29);
  assert.equal(getTwoSideFocusRemainingSeconds(30, 2), 28);
  assert.equal(getTwoSideFocusRemainingSeconds(30, 29), 1);
  assert.equal(getTwoSideFocusRemainingSeconds(30, 30), 0);
  assert.equal(getTwoSideFocusRemainingSeconds(30, 45), 0);
});

test("buildTwoSideFocusResultPayload: dogru/yanlis sayisindan skor ve basari orani hesaplar", () => {
  const payload = buildTwoSideFocusResultPayload({
    durationSeconds: 30,
    correctCount: 8,
    wrongCount: 2,
  });

  assert.equal(payload.exerciseType, "two-side-focus");
  assert.equal(payload.exerciseTitle, "Çift Taraflı Odak");
  assert.equal(payload.durationSeconds, 30);
  assert.equal(payload.correctCount, 8);
  assert.equal(payload.wrongCount, 2);
  assert.equal(payload.successRate, 80);
  assert.equal(payload.score, 6);
});

test("buildTwoSideFocusResultPayload: hic cevap yoksa basari orani ve skor 0'dir", () => {
  const payload = buildTwoSideFocusResultPayload({
    durationSeconds: 30,
    correctCount: 0,
    wrongCount: 0,
  });

  assert.equal(payload.successRate, 0);
  assert.equal(payload.score, 0);
});

test("buildTwoSideFocusResultPayload: yanlis sayisi dogrudan fazlaysa skor negatife dusmez", () => {
  const payload = buildTwoSideFocusResultPayload({
    durationSeconds: 30,
    correctCount: 1,
    wrongCount: 5,
  });

  assert.equal(payload.score, 0);
});

// --- Bilesen kablolama kontrolleri (React render ortami olmadigi icin -----
// --- kaynak uzerinden dogrulanir; yukaridaki testler mantigin GERCEKTEN ---
// --- calistigini kanitlar, burasi sadece dogru yerlere baglandigini gosterir.

test("TwoSideFocusExerciseClient saf sure helper'larini kullanir (mantigi tekrar yazmaz)", async () => {
  const source = await read("src/app/egzersizler/cift-tarafli-odak/TwoSideFocusExerciseClient.tsx");

  assert.match(
    source,
    /import \{\s*buildTwoSideFocusResultPayload,\s*getTwoSideFocusRemainingSeconds,\s*isTwoSideFocusTimedMode,\s*resolveTwoSideFocusDurationSeconds,\s*\} from "\.\/twoSideFocusDuration";/,
  );
  assert.match(source, /const isTimedMode = isTwoSideFocusTimedMode\(isEducationProgramMode, isAssignmentMode\);/);
  assert.match(source, /resolveTwoSideFocusDurationSeconds\(\{/);
  assert.match(source, /const remainingSeconds = getTwoSideFocusRemainingSeconds\(resolvedDurationSeconds, elapsedSeconds\);/);
  assert.match(source, /buildTwoSideFocusResultPayload\(\{/);
});

test("TwoSideFocusExerciseClient Assignment/Education Program ayrimi eye-muscle ile ayni desende", async () => {
  const source = await read("src/app/egzersizler/cift-tarafli-odak/TwoSideFocusExerciseClient.tsx");

  assert.match(source, /import \{ useAssignmentTask \} from "@\/components\/assignments\/AssignmentTaskProvider";/);
  assert.match(source, /const isAssignmentMode = !isEducationProgramMode && assignmentTask !== null;/);
  assert.match(source, /const educationProgramTaskId = isEducationProgramMode \? educationProgramLaunch\?\.taskId : undefined;/);
});

test("TwoSideFocusExerciseClient sayac yalniz zamanli modda gorunur, serbest kullanimda gizli", async () => {
  const source = await read("src/app/egzersizler/cift-tarafli-odak/TwoSideFocusExerciseClient.tsx");

  assert.match(source, /\{isTimedMode \? <span[^>]*>Süre: \{formatTime\(remainingSeconds\)\}<\/span> : null\}/);
});

test("TwoSideFocusExerciseClient dogal bitiste tek seferlik tamamlama koruyucusu var", async () => {
  const source = await read("src/app/egzersizler/cift-tarafli-odak/TwoSideFocusExerciseClient.tsx");

  assert.match(source, /const hasFinalizedRef = useRef\(false\);/);
  assert.match(source, /if \(hasFinalizedRef\.current\) return;\s*\n\s*hasFinalizedRef\.current = true;/);
  assert.match(source, /if \(saveInFlightRef\.current \|\| saveCompletedRef\.current\) return;/);
});

test("TwoSideFocusExerciseClient sure sayaci yalniz calisirken azalir (pause durdurur, resume kaldigi yerden devam eder)", async () => {
  const source = await read("src/app/egzersizler/cift-tarafli-odak/TwoSideFocusExerciseClient.tsx");

  assert.match(
    source,
    /useEffect\(\(\) => \{\s*\n\s*if \(!isTimedMode \|\| !isRunning\) return;\s*\n\s*\n\s*const intervalId = window\.setInterval\(\(\) => \{\s*\n\s*setElapsedSeconds\(\(previous\) => Math\.min\(previous \+ 1, resolvedDurationSeconds\)\);/,
  );
  // Reset elapsedSeconds'i sifirlar - "kaldigi yerden devam" yalniz pause/resume
  // icin gecerlidir, "Yeniden Başlat" tam sifirlama yapar.
  assert.match(source, /const handleReset = \(\) => \{[\s\S]*setElapsedSeconds\(0\);/);
});

test("TwoSideFocusExerciseClient stop/reset dogal tamamlamayi tetiklemez (finishExercise yalniz sure dolum efektinden cagrilir)", async () => {
  const source = await read("src/app/egzersizler/cift-tarafli-odak/TwoSideFocusExerciseClient.tsx");

  const finishExerciseCallSites = [...source.matchAll(/finishExercise\(\)/g)].length;
  // Tek cagri noktasi: sure dolum efekti. handleStartStop/handleReset/handleRefresh
  // finishExercise'i hic cagirmaz.
  assert.equal(finishExerciseCallSites, 1);

  const handleResetBody = source.slice(source.indexOf("const handleReset = () => {"), source.indexOf("const handleSpeedChange"));
  assert.doesNotMatch(handleResetBody, /finishExercise/);
});

test("TwoSideFocusExerciseClient sure dolunca Baslat butonu devre disi kalir (ogrenci suresiz tekrar baslatamaz)", async () => {
  const source = await read("src/app/egzersizler/cift-tarafli-odak/TwoSideFocusExerciseClient.tsx");

  assert.match(source, /const isTimeUp = isTimedMode && remainingSeconds <= 0;/);
  assert.match(source, /disabled=\{isTimeUp && !isRunning\}/);
});
