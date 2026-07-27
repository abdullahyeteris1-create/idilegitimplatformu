import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const IMPORT_PATTERN =
  /import \{ pickEducationProgramSettingOption \} from "@\/lib\/education-programs\/exerciseSettingsSchemas"/;

test("ColumnEyeExerciseClient: jumpSpeed/columnCount/flowDirection Egitim Programi settings'inden baslatilir", async () => {
  const source = await read(
    "src/app/egzersizler/goz-egzersizleri-kolonlar/ColumnEyeExerciseClient.tsx",
  );

  assert.match(source, IMPORT_PATTERN);
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "jumpSpeed", JUMP_SPEED_OPTIONS, 1000\)/,
  );
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "columnCount", COLUMN_OPTIONS, 5\)/,
  );
  assert.match(
    source,
    /pickEducationProgramSettingOption\(\s*educationProgramLaunch\?\.settings,\s*"flowDirection",\s*\["column", "row"\] as const,\s*"column",\s*\)/,
  );
});

test("ColumnEyeExerciseClient: Egitim Programi modunda ogretmen ayarlari kilitlenir (selectler disabled)", async () => {
  const source = await read(
    "src/app/egzersizler/goz-egzersizleri-kolonlar/ColumnEyeExerciseClient.tsx",
  );
  const disabledCount = (source.match(/disabled=\{isEducationProgramMode\}/g) ?? []).length;

  // 3 ayar (jumpSpeed, flowDirection, columnCount) x 2 render bloğu (controls + settings paneli)
  assert.equal(disabledCount, 6);
});

test("ColumnEyeExerciseClient: normal /egzersizler girisinde (educationProgramLaunch yok) mevcut davranis korunur", async () => {
  const source = await read(
    "src/app/egzersizler/goz-egzersizleri-kolonlar/ColumnEyeExerciseClient.tsx",
  );

  assert.match(
    source,
    /export function ColumnEyeExerciseClient\(\{\s*educationProgramLaunch,\s*\}: \{\s*educationProgramLaunch\?: EducationProgramExerciseLaunchProps;\s*\} = \{\}\)/,
  );
});

test("WordFindingExerciseClient: targetWordsPerText Egitim Programi settings'inden baslatilir ve EP modunda kilitlenir", async () => {
  const source = await read("src/app/egzersizler/kelime-bulma/WordFindingExerciseClient.tsx");

  assert.match(source, IMPORT_PATTERN);
  assert.match(
    source,
    /pickEducationProgramSettingOption\(\s*educationProgramLaunch\?\.settings,\s*"targetWordsPerText",\s*TARGET_WORD_OPTIONS,\s*3,\s*\)/,
  );
  assert.match(source, /disabled=\{isEducationProgramMode\}/);
});

test("SquareVisionExerciseClient: gridSize Egitim Programi settings'inden baslatilir ve EP modunda kilitlenir", async () => {
  const source = await read("src/app/egzersizler/kare-gorme-alani/SquareVisionExerciseClient.tsx");

  assert.match(source, IMPORT_PATTERN);
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "gridSize", GRID_OPTIONS, 13\)/,
  );
  assert.match(source, /disabled=\{isEducationProgramMode\}/);
});

test("CatchSameExerciseClient: mode/speed Egitim Programi settings'inden baslatilir ve EP modunda kilitlenir", async () => {
  const source = await read("src/app/egzersizler/ayni-olani-yakala/CatchSameExerciseClient.tsx");

  assert.match(source, IMPORT_PATTERN);
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "mode", MODE_OPTIONS, "word"\)/,
  );
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "speed", SPEED_OPTIONS, 1000\)/,
  );
  const disabledCount = (
    source.match(/disabled=\{status === "running" \|\| status === "paused" \|\| isEducationProgramMode\}/g) ?? []
  ).length;
  assert.equal(disabledCount, 2);
});

test("SimilarWordsExerciseClient: boxCount/targetDifferentCount Egitim Programi settings'inden baslatilir ve EP modunda kilitlenir", async () => {
  const source = await read("src/app/egzersizler/benzer-kelimeler/SimilarWordsExerciseClient.tsx");

  assert.match(source, IMPORT_PATTERN);
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "boxCount", BOX_COUNT_OPTIONS, 16\)/,
  );
  assert.match(
    source,
    /pickEducationProgramSettingOption\(\s*educationProgramLaunch\?\.settings,\s*"targetDifferentCount",\s*TARGET_DIFFERENT_COUNT_OPTIONS,\s*4,\s*\)/,
  );
  const disabledCount = (source.match(/disabled=\{isEducationProgramMode\}/g) ?? []).length;
  // 2 ayar (boxCount, targetDifferentCount) x 2 render blogu (hazirlik + oynanis fazi)
  assert.equal(disabledCount, 4);
});

test("MemoryGameExerciseClient: gridLayout/displayMs Egitim Programi settings'inden baslatilir ve EP modunda kilitlenir, fontSize serbest kalir", async () => {
  const source = await read("src/app/egzersizler/hafiza-gelistirme/MemoryGameExerciseClient.tsx");

  assert.match(source, IMPORT_PATTERN);
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "gridLayout", GRID_LAYOUT_OPTIONS, "5x5"\)/,
  );
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "displayMs", DISPLAY_OPTIONS, 1000\)/,
  );

  const lockedCount = (
    source.match(/disabled=\{phase === "play" \|\| isEducationProgramMode\}/g) ?? []
  ).length;
  // 3 ayar (Kutu Duzeni, Seviye, Gosterim) EP modunda kilitlenir
  assert.equal(lockedCount, 3);

  // Gorunum (fontSize) yalniz gorsel tercih - EP modunda kilitlenmez
  assert.match(source, /value=\{fontSize\}[\s\S]{0,400}disabled=\{phase === "play"\}/);
});

test("MemoryGameExerciseClient: initialLevel yalniz 2-10 araliginda uygulanir, gecersizse mevcut varsayilan (2) kullanilir", async () => {
  const source = await read("src/app/egzersizler/hafiza-gelistirme/MemoryGameExerciseClient.tsx");

  assert.match(source, /function isValidLevel\(value: number \| null\): boolean \{/);
  assert.match(source, /return value !== null && LEVEL_OPTIONS\.includes\(value\);/);
  assert.match(
    source,
    /const initialLevel = isValidLevel\(educationProgramLaunch\?\.initialLevel \?\? null\)\s*\n\s*\? \(educationProgramLaunch!\.initialLevel as number\)\s*\n\s*: 2;/,
  );
  assert.match(source, /const \[level, setLevel\] = useState\(initialLevel\);/);
});

test("MemoryGameExerciseClient: gorev suresi useAssignedDurationSeconds ile uygulanir, standalone sinirsiz kalir", async () => {
  const source = await read("src/app/egzersizler/hafiza-gelistirme/MemoryGameExerciseClient.tsx");

  assert.match(
    source,
    /import \{ useAssignedDurationSeconds, useIsAssignmentMode \} from "@\/components\/assignments\/AssignmentTaskProvider"/,
  );
  assert.match(
    source,
    /useAssignedDurationSeconds\(\s*educationProgramLaunch\?\.durationSeconds \?\? Number\.POSITIVE_INFINITY,?\s*\)/,
  );
  assert.match(source, /Number\.isFinite\(totalDurationSeconds\)/);
});

test("MemoryGameExerciseClient: sonuc kaydi + gorev tamamlama akisi kablolanmis", async () => {
  const source = await read("src/app/egzersizler/hafiza-gelistirme/MemoryGameExerciseClient.tsx");

  assert.match(
    source,
    /import \{ useEducationProgramTaskCompletion \} from "@\/lib\/education-programs\/useEducationProgramTaskCompletion"/,
  );
  assert.match(
    source,
    /useEducationProgramTaskCompletion\(educationProgramTaskId, EXPECTED_RESULT_EXERCISE_TYPE\)/,
  );
  assert.match(source, /await completeTaskAfterResultSave\(\);/);
  assert.match(source, /void retryTaskCompletion\(\)/);
  assert.match(source, /EXPECTED_RESULT_EXERCISE_TYPE = "memory-game";/);
});

test("MemoryGameExerciseClient: mevcut result payload alanlari korunmus (gridRows/gridCols/totalBoxes/gridLabel/reachedLevel/levelCorrectCount/levelWrongCount/net/displayMs/levelUpCount/roundNumber/rule)", async () => {
  const source = await read("src/app/egzersizler/hafiza-gelistirme/MemoryGameExerciseClient.tsx");
  const detailsStart = source.indexOf('exerciseType: "memory-game"');
  const detailsBlock = source.slice(detailsStart, source.indexOf("} satisfies SecureExerciseResultInput;", detailsStart));

  for (const field of [
    "gridRows: gridInfo.rows",
    "gridCols: gridInfo.cols",
    "totalBoxes: gridInfo.totalBoxes",
    "gridLabel: gridInfo.label",
    "reachedLevel: level",
    "levelCorrectCount",
    "levelWrongCount",
    "net,",
    "displayMs,",
    "levelUpCount,",
    "roundNumber,",
    "rule:",
  ]) {
    assert.ok(detailsBlock.includes(field), `details payload missing: ${field}`);
  }
});

test("CardMatchingExerciseClient: previewDurationMs/flipBackDelayMs Egitim Programi settings'inden baslatilir ve EP modunda kilitlenir", async () => {
  const source = await read("src/app/egzersizler/kart-eslestirme/CardMatchingExerciseClient.tsx");

  assert.match(source, IMPORT_PATTERN);
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "previewDurationMs", PREVIEW_OPTIONS, 4000\)/,
  );
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "flipBackDelayMs", DELAY_OPTIONS, 1000\)/,
  );

  const lockedCount = (
    source.match(/disabled=\{phase === "playing" \|\| phase === "preview" \|\| isEducationProgramMode\}/g) ?? []
  ).length;
  // 3 ayar (Seviye, Bakma, Kapanma) EP modunda kilitlenir
  assert.equal(lockedCount, 3);
});

test("CardMatchingExerciseClient: initialLevel yalniz 1-5 araliginda uygulanir, gecersizse mevcut varsayilan (1) kullanilir, pairCount level'dan turetilmeye devam eder", async () => {
  const source = await read("src/app/egzersizler/kart-eslestirme/CardMatchingExerciseClient.tsx");

  assert.match(source, /function isValidLevel\(value: number \| null\): boolean \{/);
  assert.match(source, /return value !== null && LEVEL_OPTIONS\.includes\(value\);/);
  assert.match(
    source,
    /const initialLevel = isValidLevel\(educationProgramLaunch\?\.initialLevel \?\? null\)\s*\n\s*\? \(educationProgramLaunch!\.initialLevel as number\)\s*\n\s*: 1;/,
  );
  assert.match(source, /const \[startLevel, setStartLevel\] = useState\(initialLevel\);/);
  assert.match(source, /const \[level, setLevel\] = useState\(initialLevel\);/);
  assert.match(source, /const pairCount = getPairCountByLevel\(level\);/);
  assert.doesNotMatch(source, /pickEducationProgramSettingOption\([^)]*"pairCount"/);
});

test("CardMatchingExerciseClient: gorev suresi useAssignedDurationSeconds ile uygulanir, standalone sinirsiz kalir, ikinci timer kurulmaz", async () => {
  const source = await read("src/app/egzersizler/kart-eslestirme/CardMatchingExerciseClient.tsx");

  assert.match(
    source,
    /import \{ useAssignedDurationSeconds, useIsAssignmentMode \} from "@\/components\/assignments\/AssignmentTaskProvider"/,
  );
  assert.match(
    source,
    /useAssignedDurationSeconds\(\s*educationProgramLaunch\?\.durationSeconds \?\? Number\.POSITIVE_INFINITY,?\s*\)/,
  );
  assert.match(source, /Number\.isFinite\(totalDurationSeconds\)/);

  const timerEffectMatches = source.match(/timerRef\.current = window\.setInterval/g) ?? [];
  assert.equal(timerEffectMatches.length, 1, "yalniz TEK bir setInterval tabanli elapsed-timer olmali");
});

test("CardMatchingExerciseClient: sonuc kaydi + gorev tamamlama akisi kablolanmis", async () => {
  const source = await read("src/app/egzersizler/kart-eslestirme/CardMatchingExerciseClient.tsx");

  assert.match(
    source,
    /import \{ useEducationProgramTaskCompletion \} from "@\/lib\/education-programs\/useEducationProgramTaskCompletion"/,
  );
  assert.match(
    source,
    /useEducationProgramTaskCompletion\(educationProgramTaskId, EXPECTED_RESULT_EXERCISE_TYPE\)/,
  );
  assert.match(source, /await completeTaskAfterResultSave\(\);/);
  assert.match(source, /void retryTaskCompletion\(\)/);
  assert.match(source, /EXPECTED_RESULT_EXERCISE_TYPE = "card-matching";/);
});

test("CardMatchingExerciseClient: mevcut result payload alanlari korunmus (startLevel/reachedLevel/pairCount/totalCards/totalMoves/correctMatches/wrongMatches/net/elapsedSeconds/levelUpCount/completedRounds/previewDurationMs/flipBackDelayMs/theme/scoreRule/maxLevel)", async () => {
  const source = await read("src/app/egzersizler/kart-eslestirme/CardMatchingExerciseClient.tsx");
  const detailsStart = source.indexOf('exerciseType: "card-matching"');
  const detailsBlock = source.slice(detailsStart, source.indexOf("} satisfies SecureExerciseResultInput;", detailsStart));

  for (const field of [
    "startLevel,",
    "reachedLevel: level",
    "pairCount,",
    "totalCards: pairCount * 2",
    "totalMoves,",
    "correctMatches: correctCount",
    "wrongMatches: wrongCount",
    "net: finalNet",
    "elapsedSeconds: durationSeconds",
    "levelUpCount,",
    "completedRounds,",
    "previewDurationMs,",
    "flipBackDelayMs,",
    "theme:",
    "scoreRule:",
    "maxLevel:",
  ]) {
    assert.ok(detailsBlock.includes(field), `details payload missing: ${field}`);
  }
});

test("CardMatchingExerciseClient: finish sonrasi bekleyen kart geri cevirme timeout'u temizlenir (clearResolveTimer)", async () => {
  const source = await read("src/app/egzersizler/kart-eslestirme/CardMatchingExerciseClient.tsx");
  const finishStart = source.indexOf("const finishExercise = useCallback(() => {");
  const finishBlock = source.slice(finishStart, source.indexOf("], [", finishStart));

  assert.match(finishBlock, /if \(hasSavedResultRef\.current\) \{\s*\n\s*return;\s*\n\s*\}/);
  assert.match(finishBlock, /clearTimer\(\);/);
  assert.match(finishBlock, /clearResolveTimer\(\);/);
  assert.match(finishBlock, /clearPreviewTimer\(\);/);
});

for (const { name, path } of [
  {
    name: "ColumnEyeExerciseClient",
    path: "src/app/egzersizler/goz-egzersizleri-kolonlar/ColumnEyeExerciseClient.tsx",
  },
  {
    name: "WordFindingExerciseClient",
    path: "src/app/egzersizler/kelime-bulma/WordFindingExerciseClient.tsx",
  },
  {
    name: "SquareVisionExerciseClient",
    path: "src/app/egzersizler/kare-gorme-alani/SquareVisionExerciseClient.tsx",
  },
  {
    name: "CatchSameExerciseClient",
    path: "src/app/egzersizler/ayni-olani-yakala/CatchSameExerciseClient.tsx",
  },
  {
    name: "SimilarWordsExerciseClient",
    path: "src/app/egzersizler/benzer-kelimeler/SimilarWordsExerciseClient.tsx",
  },
  {
    name: "MemoryGameExerciseClient",
    path: "src/app/egzersizler/hafiza-gelistirme/MemoryGameExerciseClient.tsx",
  },
  {
    name: "CardMatchingExerciseClient",
    path: "src/app/egzersizler/kart-eslestirme/CardMatchingExerciseClient.tsx",
  },
]) {
  test(`${name}: sonuc payload alanlari degismedi (details icinde ayni state degiskenleri kullanilir)`, async () => {
    const source = await read(path);
    assert.match(source, /satisfies SecureExerciseResultInput/);
  });
}
