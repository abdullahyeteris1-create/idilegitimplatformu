import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getExerciseSettingsSchema,
  pickEducationProgramSettingOption,
} from "../src/lib/education-programs/exerciseSettingsSchemas.ts";
import { resolveEducationProgramExerciseRoute } from "../src/lib/education-programs/exerciseRouteCatalog.ts";
import { getEducationProgramExercise } from "../src/lib/education-programs/exerciseCatalog.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const TACHISTOSCOPE_CLIENT_PATH = "src/components/exercises/TachistoscopeExerciseClient.tsx";
const LETTER_NUMBER_CLIENT_PATH =
  "src/app/egzersizler/harf-rakam-sayma/LetterNumberCountingFocusClient.tsx";
const RESULTS_ROUTE_PATH = "src/app/api/student/results/route.ts";

test("route katalogu: takistoskop ve harf-rakam-sayma gercek route ile kayitlidir", () => {
  assert.equal(resolveEducationProgramExerciseRoute("takistoskop"), "/egzersizler/takistoskop");
  assert.equal(
    resolveEducationProgramExerciseRoute("harf-rakam-sayma"),
    "/egzersizler/harf-rakam-sayma",
  );
});

test("exercise katalogu: supportsLevel her iki egzersiz icin de true ve resultExerciseType gercek payload ile eslesir", () => {
  const tachistoscope = getEducationProgramExercise("takistoskop");
  assert.equal(tachistoscope.supportsLevel, true);
  assert.equal(tachistoscope.levelMin, 1);
  assert.equal(tachistoscope.levelMax, 15);
  assert.equal(tachistoscope.resultExerciseType, "tachistoscope");

  const letterNumber = getEducationProgramExercise("harf-rakam-sayma");
  assert.equal(letterNumber.supportsLevel, true);
  assert.equal(letterNumber.levelMin, 1);
  assert.equal(letterNumber.levelMax, 4);
  assert.equal(letterNumber.resultExerciseType, "letter-number-counting-focus");
});

test("takistoskop settings semasi yalniz speedMs/workMode/contentType icerir, durationSeconds/level yoktur", () => {
  const schema = getExerciseSettingsSchema("takistoskop");
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  assert.deepEqual(Object.keys(fieldsByKey).sort(), ["contentType", "speedMs", "workMode"]);
  assert.deepEqual(
    fieldsByKey.speedMs.options,
    [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
  );
  assert.equal(fieldsByKey.speedMs.defaultValue, 300);
  assert.deepEqual(fieldsByKey.workMode.options, ["automatic", "manual"]);
  assert.equal(fieldsByKey.workMode.defaultValue, "manual");
  assert.deepEqual(fieldsByKey.contentType.options, ["letter", "number", "mixed"]);
  assert.equal(fieldsByKey.contentType.defaultValue, "letter");
  assert.equal("durationSeconds" in fieldsByKey, false);
  assert.equal("level" in fieldsByKey, false);
});

test("harf-rakam-sayma settings semasi yalniz mode/difficulty/speedSeconds icerir, durationSeconds/startLevel yoktur", () => {
  const schema = getExerciseSettingsSchema("harf-rakam-sayma");
  const fieldsByKey = Object.fromEntries(schema.fields.map((field) => [field.key, field]));

  assert.deepEqual(Object.keys(fieldsByKey).sort(), ["difficulty", "mode", "speedSeconds"]);
  assert.deepEqual(fieldsByKey.mode.options, ["letters", "numbers", "mixed"]);
  assert.equal(fieldsByKey.mode.defaultValue, "letters");
  assert.deepEqual(fieldsByKey.difficulty.options, ["normal", "hard"]);
  assert.equal(fieldsByKey.difficulty.defaultValue, "normal");
  assert.deepEqual(
    fieldsByKey.speedSeconds.options,
    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  );
  assert.equal(fieldsByKey.speedSeconds.defaultValue, 8);
  assert.equal("durationSeconds" in fieldsByKey, false);
  assert.equal("startLevel" in fieldsByKey, false);
});

test("gecersiz/eksik settings guvenli fallback'e duser (crash olmaz)", () => {
  const tachistoscopeSchema = getExerciseSettingsSchema("takistoskop");
  assert.equal(
    pickEducationProgramSettingOption(undefined, "speedMs", [100, 200], 300),
    300,
  );
  assert.equal(
    pickEducationProgramSettingOption({ speedMs: 999999 }, "speedMs", [100, 200], 300),
    300,
  );
  assert.ok(tachistoscopeSchema);

  const letterNumberSchema = getExerciseSettingsSchema("harf-rakam-sayma");
  assert.equal(
    pickEducationProgramSettingOption({}, "difficulty", ["normal", "hard"], "normal"),
    "normal",
  );
  assert.ok(letterNumberSchema);
});

test("onceden desteklenen bes egzersizin semasi bozulmadi", () => {
  assert.ok(getExerciseSettingsSchema("goz-egzersizleri-kolonlar"));
  assert.ok(getExerciseSettingsSchema("kelime-bulma"));
  assert.ok(getExerciseSettingsSchema("kare-gorme-alani"));
  assert.ok(getExerciseSettingsSchema("ayni-olani-yakala"));
  assert.ok(getExerciseSettingsSchema("benzer-kelimeler"));
});

test("TachistoscopeExerciseClient: speedMs/workMode/contentType settings'ten baslatilir, level initialLevel'dan (1-15) baslatilir", async () => {
  const source = await read(TACHISTOSCOPE_CLIENT_PATH);

  assert.match(
    source,
    /import \{ pickEducationProgramSettingOption \} from "@\/lib\/education-programs\/exerciseSettingsSchemas"/,
  );
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "speedMs", SPEED_OPTIONS, 300\)/,
  );
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "workMode", WORK_MODE_OPTIONS, "manual"\)/,
  );
  assert.match(
    source,
    /pickEducationProgramSettingOption\(\s*educationProgramLaunch\?\.settings,\s*"contentType",\s*CONTENT_TYPE_OPTIONS,\s*"letter",?\s*\)/,
  );
  assert.match(
    source,
    /isValidLevel\(educationProgramLaunch\?\.initialLevel \?\? null\) \? \(educationProgramLaunch!\.initialLevel as Level\) : 1/,
  );
  assert.match(source, /LEVEL_OPTIONS as number\[\]\)\.includes\(value\)/);
});

test("TachistoscopeExerciseClient: Egitim Programi modunda speedMs/level/workMode/contentType kilitlenir", async () => {
  const source = await read(TACHISTOSCOPE_CLIENT_PATH);
  const disabledCount = (source.match(/disabled=\{isEducationProgramMode\}/g) ?? []).length;

  assert.equal(disabledCount, 4);
});

test("TachistoscopeExerciseClient: gorev suresi useAssignedDurationSeconds ile uygulanir, standalone sinirsiz kalir", async () => {
  const source = await read(TACHISTOSCOPE_CLIENT_PATH);

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

test("TachistoscopeExerciseClient: sonuc kaydi + gorev tamamlama akisi kablolanmis", async () => {
  const source = await read(TACHISTOSCOPE_CLIENT_PATH);

  assert.match(
    source,
    /import \{ useEducationProgramTaskCompletion \} from "@\/lib\/education-programs\/useEducationProgramTaskCompletion"/,
  );
  assert.match(source, /useEducationProgramTaskCompletion\(educationProgramTaskId, EXPECTED_RESULT_EXERCISE_TYPE\)/);
  assert.match(source, /await completeTaskAfterResultSave\(\);/);
  assert.match(source, /void retryTaskCompletion\(\)/);
  assert.match(source, /exerciseType: "tachistoscope"/);
});

test("TachistoscopeExerciseClient: mevcut result payload alanlari korunmus (speedMs/level/contentType/mode/net/reachedLevel/autoLevelUpCount)", async () => {
  const source = await read(TACHISTOSCOPE_CLIENT_PATH);
  const detailsStart = source.indexOf("exerciseType: \"tachistoscope\"");
  const detailsBlock = source.slice(detailsStart, source.indexOf("resultUrl:", detailsStart));

  for (const field of ["speedMs", "level", "contentType", "mode: workMode", "net: totalNet", "reachedLevel", "autoLevelUpCount"]) {
    assert.ok(detailsBlock.includes(field), `details payload missing: ${field}`);
  }
});

test("LetterNumberCountingFocusClient: mode/difficulty/speedSeconds settings'ten baslatilir, startLevel initialLevel'dan (1-4) baslatilir", async () => {
  const source = await read(LETTER_NUMBER_CLIENT_PATH);

  assert.match(
    source,
    /import \{ pickEducationProgramSettingOption \} from "@\/lib\/education-programs\/exerciseSettingsSchemas"/,
  );
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "mode", MODE_OPTIONS, "letters"\)/,
  );
  assert.match(
    source,
    /pickEducationProgramSettingOption\(\s*educationProgramLaunch\?\.settings,\s*"difficulty",\s*DIFFICULTY_OPTIONS,\s*"normal",?\s*\)/,
  );
  assert.match(
    source,
    /pickEducationProgramSettingOption\(educationProgramLaunch\?\.settings, "speedSeconds", SPEED_OPTIONS, 8\)/,
  );
  assert.match(
    source,
    /isValidStartLevel\(educationProgramLaunch\?\.initialLevel \?\? null\)\s*\n?\s*\? \(educationProgramLaunch!\.initialLevel as number\)\s*\n?\s*: 1/,
  );
  assert.match(source, /START_LEVEL_OPTIONS\.includes\(value\)/);
});

test("LetterNumberCountingFocusClient: Egitim Programi modunda mode/difficulty/speedSeconds/startLevel kilitlenir", async () => {
  const source = await read(LETTER_NUMBER_CLIENT_PATH);
  const disabledCount = (source.match(/disabled=\{isEducationProgramMode\}/g) ?? []).length;

  assert.equal(disabledCount, 4);
});

test("LetterNumberCountingFocusClient: gorev suresi useAssignedDurationSeconds ile uygulanir, mevcut tur-timer'i ikinci bir sistem kurmadan genisletir", async () => {
  const source = await read(LETTER_NUMBER_CLIENT_PATH);

  assert.match(
    source,
    /import \{ useAssignedDurationSeconds, useIsAssignmentMode \} from "@\/components\/assignments\/AssignmentTaskProvider"/,
  );
  assert.match(
    source,
    /useAssignedDurationSeconds\(\s*educationProgramLaunch\?\.durationSeconds \?\? Number\.POSITIVE_INFINITY,?\s*\)/,
  );
  const timerEffectMatches = source.match(/timerRef\.current = window\.setInterval/g) ?? [];
  assert.equal(timerEffectMatches.length, 1, "yalniz TEK bir setInterval tabanli round-timer olmali");
});

test("LetterNumberCountingFocusClient: sonuc kaydi + gorev tamamlama akisi kablolanmis", async () => {
  const source = await read(LETTER_NUMBER_CLIENT_PATH);

  assert.match(
    source,
    /import \{ useEducationProgramTaskCompletion \} from "@\/lib\/education-programs\/useEducationProgramTaskCompletion"/,
  );
  assert.match(source, /useEducationProgramTaskCompletion\(educationProgramTaskId, EXPECTED_RESULT_EXERCISE_TYPE\)/);
  assert.match(source, /await completeTaskAfterResultSave\(\);/);
  assert.match(source, /void retryTaskCompletion\(\)/);
});

test("LetterNumberCountingFocusClient: mevcut result payload alanlari korunmus", async () => {
  const source = await read(LETTER_NUMBER_CLIENT_PATH);
  const detailsBlock = source.slice(
    source.indexOf("exerciseType: \"letter-number-counting-focus\""),
    source.indexOf("} satisfies SecureExerciseResultInput;"),
  );

  for (const field of [
    "mode", "startLevel", "reachedLevel: level", "difficulty",
    "speedSeconds: safeSpeedSeconds", "totalRounds", "unansweredCount", "levelUpCount",
    "scoreRule", "maxLevel: 4",
  ]) {
    assert.ok(detailsBlock.includes(field), `details payload missing: ${field}`);
  }
});

test("her iki egzersiz de studentId/service-role/token gibi guvenlik disi alanlari client'ta okumaz", async () => {
  for (const path of [TACHISTOSCOPE_CLIENT_PATH, LETTER_NUMBER_CLIENT_PATH]) {
    const source = await read(path);
    assert.doesNotMatch(source, /studentId/);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE/);
    assert.doesNotMatch(source, /signedToken|launchToken/i);
  }
});

test("Result API whitelist (DETAIL_SCHEMAS): tachistoscope ve letter-number-counting-focus gercek payload ile uyumlu", async () => {
  const source = await read(RESULTS_ROUTE_PATH);
  const schemasBlock = source.slice(
    source.indexOf("const DETAIL_SCHEMAS"),
    source.indexOf("type ValidatedResultBody"),
  );

  assert.match(schemasBlock, /tachistoscope: \{/);
  assert.match(schemasBlock, /speedMs: \{ type: "integer"/);
  assert.match(schemasBlock, /contentType: \{ type: "string", values: \["letter", "number", "mixed"\] \}/);
  assert.match(schemasBlock, /mode: \{ type: "string", values: \["automatic", "manual"\] \}/);

  assert.match(schemasBlock, /"letter-number-counting-focus": \{/);
  assert.match(schemasBlock, /mode: \{ type: "string", values: \["letters", "numbers", "mixed"\] \}/);
  assert.match(schemasBlock, /difficulty: \{ type: "string", values: \["normal", "hard"\] \}/);
  assert.match(schemasBlock, /startLevel: \{ type: "integer", min: 1, max: 4 \}/);
});
