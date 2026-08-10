import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveEducationProgramExerciseRoute } from "../src/lib/education-programs/exerciseRouteCatalog.ts";
import { getEducationProgramExercise } from "../src/lib/education-programs/exerciseCatalog.ts";
import { formatRemainingTime } from "../src/lib/exercises/timing.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const CLIENT_PATH = "src/app/egzersizler/hafiza-gelistirme/MemoryGameExerciseClient.tsx";

test("hafiza-gelistirme route kataloginda dogru route ile kayitlidir", () => {
  assert.equal(
    resolveEducationProgramExerciseRoute("hafiza-gelistirme"),
    "/egzersizler/hafiza-gelistirme",
  );
});

test("hafiza-gelistirme resultExerciseType memory-game ile eslesir, supportsLevel exerciseCatalog kaydiyla uyumludur", () => {
  const definition = getEducationProgramExercise("hafiza-gelistirme");

  assert.equal(definition.resultExerciseType, "memory-game");
  assert.equal(definition.supportsLevel, true);
  assert.equal(definition.levelMin, 2);
  assert.equal(definition.levelMax, 10);
});

test("MemoryGameExerciseClient: exerciseType client payload'inda tam olarak memory-game", async () => {
  const source = await read(CLIENT_PATH);
  assert.match(source, /exerciseType: "memory-game",/);
});

test("MemoryGameExerciseClient: educationProgramLaunch prop'u opsiyonel ve tipli olarak tanimlanir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /import type \{ EducationProgramExerciseLaunchProps \} from "@\/lib\/education-programs\/exerciseLaunchProps"/,
  );
  assert.match(
    source,
    /export function MemoryGameExerciseClient\(\{\s*educationProgramLaunch,\s*\}: \{\s*educationProgramLaunch\?: EducationProgramExerciseLaunchProps;\s*\} = \{\}\)/,
  );
});

test("MemoryGameExerciseClient: durationSeconds ve initialLevel settings JSON icine tekrar yazilmaz", async () => {
  const source = await read(CLIENT_PATH);

  assert.doesNotMatch(source, /pickEducationProgramSettingOption\([^)]*"level"/);
  assert.doesNotMatch(source, /pickEducationProgramSettingOption\([^)]*"durationSeconds"/);
  assert.doesNotMatch(source, /pickEducationProgramSettingOption\([^)]*"initialLevel"/);
});

test("MemoryGameExerciseClient: standalone (educationProgramLaunch yoksa) mevcut varsayilanlar korunur", async () => {
  const source = await read(CLIENT_PATH);

  // pickEducationProgramSettingOption fallback degerleri client'in ONCEKI
  // standalone varsayilanlariyla ayni: gridLayout="5x5", displayMs=1000.
  assert.match(source, /"gridLayout", GRID_LAYOUT_OPTIONS, "5x5"/);
  assert.match(source, /"displayMs", DISPLAY_OPTIONS, 1000\)/);
});

test("MemoryGameExerciseClient: finishExercise cift cagriya karsi guard'lidir (hasSavedResultRef)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /if \(hasSavedResultRef\.current\) return;/);
  assert.match(source, /hasSavedResultRef\.current = true;/);
});

test("MemoryGameExerciseClient: studentId/service-role/token client'ta okunmaz", async () => {
  const source = await read(CLIENT_PATH);

  assert.doesNotMatch(source, /studentId/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE/);
  assert.doesNotMatch(source, /signedToken|launchToken/i);
});

test("MemoryGameExerciseClient: URL/query parametresi dogrudan okunmaz", async () => {
  const source = await read(CLIENT_PATH);

  assert.doesNotMatch(source, /window\.location\.search/);
  assert.doesNotMatch(source, /useSearchParams/);
});

test("MemoryGameExerciseClient: settings dogrudan spread edilmez, dereference edilmez", async () => {
  const source = await read(CLIENT_PATH);

  assert.doesNotMatch(source, /\.\.\.\s*educationProgramLaunch\.settings/);
  assert.doesNotMatch(source, /educationProgramLaunch\.settings\./);
  assert.doesNotMatch(source, /educationProgramLaunch\?\.settings\?\./);
});

test("formatRemainingTime: geri sayim degerlerini MM:SS formatinda yuvarlar", () => {
  assert.equal(formatRemainingTime(300), "05:00");
  assert.equal(formatRemainingTime(240), "04:00");
  assert.equal(formatRemainingTime(1), "00:01");
  assert.equal(formatRemainingTime(0), "00:00");
  assert.equal(formatRemainingTime(-3), "00:00");
  assert.equal(formatRemainingTime(8.1), "00:09");
});

test("MemoryGameExerciseClient: Egitim Programi suresi mevcut elapsedSeconds kaynagindan gorunur", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /const totalDurationSeconds = useAssignedDurationSeconds\(\s*educationProgramLaunch\?\.durationSeconds \?\? Number\.POSITIVE_INFINITY,\s*\);/s,
  );
  assert.match(
    source,
    /const remainingSeconds = hasEducationProgramCountdown\s*\? Math\.max\(0, totalDurationSeconds - elapsedSeconds\)\s*: null;/s,
  );
  assert.match(source, /label: "Kalan S\u00fcre"/);
  assert.match(source, /value: formatRemainingTime\(remainingSeconds\)/);
  assert.match(source, /Number\.isFinite\(totalDurationSeconds\)/);
});

test("MemoryGameExerciseClient: serbest kullanimda countdown gizli, son 60 saniyede vurgu artar", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /const hasEducationProgramCountdown =\s*isEducationProgramMode && Number\.isFinite\(totalDurationSeconds\);/s,
  );
  assert.match(source, /remainingSeconds !== null/);
  assert.match(source, /remainingSeconds <= 60/);
});

test("MemoryGameExerciseClient: mevcut timer tek interval ile ilerler ve finish guard/cleanup korunur", async () => {
  const source = await read(CLIENT_PATH);

  assert.equal((source.match(/window\.setInterval/g) ?? []).length, 1);
  assert.match(source, /if \(hasSavedResultRef\.current\) return;/);
  assert.match(source, /window\.clearInterval\(timerId\)/);
  assert.match(source, /if \(elapsedSeconds >= totalDurationSeconds\) \{\s*finishExercise\(\);/s);
  assert.doesNotMatch(source, /localStorage.*timer|timer.*localStorage/i);
});
