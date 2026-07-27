import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveEducationProgramExerciseRoute } from "../src/lib/education-programs/exerciseRouteCatalog.ts";
import { getEducationProgramExercise } from "../src/lib/education-programs/exerciseCatalog.ts";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const CLIENT_PATH = "src/app/egzersizler/kart-eslestirme/CardMatchingExerciseClient.tsx";
const ROUTE_PATH = "src/app/api/student/results/route.ts";

test("kart-eslestirme route kataloginda dogru route ile kayitlidir", () => {
  assert.equal(
    resolveEducationProgramExerciseRoute("kart-eslestirme"),
    "/egzersizler/kart-eslestirme",
  );
});

test("kart-eslestirme resultExerciseType card-matching ile eslesir, supportsLevel exerciseCatalog kaydiyla uyumludur", () => {
  const definition = getEducationProgramExercise("kart-eslestirme");

  assert.equal(definition.resultExerciseType, "card-matching");
  assert.equal(definition.supportsLevel, true);
  assert.equal(definition.levelMin, 1);
  assert.equal(definition.levelMax, 5);
});

test("CardMatchingExerciseClient: exerciseType client payload'inda tam olarak card-matching", async () => {
  const source = await read(CLIENT_PATH);
  assert.match(source, /exerciseType: "card-matching",/);
});

test("CardMatchingExerciseClient: educationProgramLaunch prop'u opsiyonel ve tipli olarak tanimlanir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /import type \{ EducationProgramExerciseLaunchProps \} from "@\/lib\/education-programs\/exerciseLaunchProps"/,
  );
  assert.match(
    source,
    /export function CardMatchingExerciseClient\(\{\s*educationProgramLaunch,\s*\}: \{\s*educationProgramLaunch\?: EducationProgramExerciseLaunchProps;\s*\} = \{\}\)/,
  );
});

test("CardMatchingExerciseClient: durationSeconds, initialLevel ve pairCount settings JSON icine yazilmaz", async () => {
  const source = await read(CLIENT_PATH);

  assert.doesNotMatch(source, /pickEducationProgramSettingOption\([^)]*"level"/);
  assert.doesNotMatch(source, /pickEducationProgramSettingOption\([^)]*"startLevel"/);
  assert.doesNotMatch(source, /pickEducationProgramSettingOption\([^)]*"durationSeconds"/);
  assert.doesNotMatch(source, /pickEducationProgramSettingOption\([^)]*"initialLevel"/);
  assert.doesNotMatch(source, /pickEducationProgramSettingOption\([^)]*"pairCount"/);
  assert.doesNotMatch(source, /pickEducationProgramSettingOption\([^)]*"theme"/);
});

test("CardMatchingExerciseClient: standalone (educationProgramLaunch yoksa) mevcut varsayilanlar korunur", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /"previewDurationMs", PREVIEW_OPTIONS, 4000/);
  assert.match(source, /"flipBackDelayMs", DELAY_OPTIONS, 1000\)/);
});

test("CardMatchingExerciseClient: tema/kart gorseli secimi Egitim Programi modunda zorunlu kilinmaz (statik kalir)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /title="Canlı Çocuk Görselleri"/);
  assert.doesNotMatch(source, /isEducationProgramMode[\s\S]{0,80}theme/);
});

test("CardMatchingExerciseClient: finishExercise cift cagriya karsi guard'lidir (hasSavedResultRef)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /if \(hasSavedResultRef\.current\) \{\s*\n\s*return;\s*\n\s*\}/);
  assert.match(source, /hasSavedResultRef\.current = true;/);
});

test("CardMatchingExerciseClient: unmount sonrasi bekleyen timeout'lar temizlenir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /useEffect\(\(\) => \{\s*\n\s*return \(\) => \{\s*\n\s*clearTimer\(\);\s*\n\s*clearResolveTimer\(\);\s*\n\s*clearPreviewTimer\(\);/,
  );
});

test("CardMatchingExerciseClient: studentId/service-role/token client'ta okunmaz", async () => {
  const source = await read(CLIENT_PATH);

  assert.doesNotMatch(source, /studentId/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE/);
  assert.doesNotMatch(source, /signedToken|launchToken/i);
});

test("CardMatchingExerciseClient: settings dogrudan spread edilmez, dereference edilmez", async () => {
  const source = await read(CLIENT_PATH);

  assert.doesNotMatch(source, /\.\.\.\s*educationProgramLaunch\.settings/);
  assert.doesNotMatch(source, /educationProgramLaunch\.settings\./);
  assert.doesNotMatch(source, /educationProgramLaunch\?\.settings\?\./);
});

test("Result API whitelist: card-matching DETAIL_SCHEMAS onceki turdaki gibi korunmus", async () => {
  const routeSource = await read(ROUTE_PATH);
  const keyIndex = routeSource.indexOf('"card-matching": {');
  assert.ok(keyIndex >= 0, '"card-matching" DETAIL_SCHEMAS icinde bulunmali');
  const blockEnd = routeSource.indexOf("\n  },", keyIndex);
  const schemaBlock = routeSource.slice(keyIndex, blockEnd);

  assert.match(schemaBlock, /previewDurationMs: \{ type: "integer", min: 2_000, max: 10_000 \}/);
  assert.match(schemaBlock, /flipBackDelayMs: \{ type: "integer", min: 500, max: 2_000 \}/);
  assert.match(schemaBlock, /theme: \{ type: "string", values: \["Canlı Çocuk Görselleri"\] \}/);
});

test("public/memory-card-visuals kart gorselleri bu turda degistirilmedi", async () => {
  const engineSource = await read("src/lib/exercise-engine/cardMatching.ts");

  assert.match(engineSource, /\/memory-card-visuals\//);
  assert.doesNotMatch(engineSource, /supabase/i);
  assert.doesNotMatch(engineSource, /base64/i);
});
