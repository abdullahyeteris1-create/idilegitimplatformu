import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveEducationProgramExerciseRoute } from "../src/lib/education-programs/exerciseRouteCatalog.ts";
import { getEducationProgramExercise } from "../src/lib/education-programs/exerciseCatalog.ts";

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
