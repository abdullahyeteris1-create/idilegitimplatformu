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
]) {
  test(`${name}: sonuc payload alanlari degismedi (details icinde ayni state degiskenleri kullanilir)`, async () => {
    const source = await read(path);
    assert.match(source, /satisfies SecureExerciseResultInput/);
  });
}
