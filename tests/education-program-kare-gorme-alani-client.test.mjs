import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const CLIENT_PATH = "src/app/egzersizler/kare-gorme-alani/SquareVisionExerciseClient.tsx";

test("14) educationProgramLaunch prop'u opsiyonel ve tipli olarak tanimlanir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /educationProgramLaunch\?:\s*EducationProgramExerciseLaunchProps/,
  );
  assert.match(
    source,
    /import type \{ EducationProgramExerciseLaunchProps \} from "@\/lib\/education-programs\/exerciseLaunchProps"/,
  );
});

test("durationSeconds snapshot degeri useAssignedDurationSeconds fallback'ina baglanir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /useAssignedDurationSeconds\(\s*educationProgramLaunch\?\.durationSeconds \?\? durationMinutes \* 60,?\s*\)/,
  );
});

test("initialLevel yalniz gecerli bir Level degeriyse ilk state olarak kullanilir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /isValidLevel\(educationProgramLaunch\?\.initialLevel/);
  assert.match(source, /LEVEL_OPTIONS as number\[\]\)\.includes\(value\)/);
});

test("Egitim Programi modunda sure secici gizlenir (Assignment modundaki gibi)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /isAssignmentMode \|\| isEducationProgramMode \? null : \(/);
});

test("9) normal serbest akista educationProgramLaunch olmadan bilesen calisir (varsayilan {} parametresi)", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(
    source,
    /export function SquareVisionExerciseClient\(\{\s*educationProgramLaunch,\s*\}: \{\s*educationProgramLaunch\?: EducationProgramExerciseLaunchProps;\s*\} = \{\}\)/,
  );
});

test("15/client) egzersiz bileseninin kendisi hicbir studentId/service-role/secret alani okumaz", async () => {
  const source = await read(CLIENT_PATH);

  assert.doesNotMatch(source, /studentId/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE/);
  assert.doesNotMatch(source, /LAUNCH_SECRET/);
  assert.doesNotMatch(source, /signedToken|launchToken/i);
});

test("16) egzersiz bileseni URL/query parametresini hic okumaz (window.location.search yok)", async () => {
  const source = await read(CLIENT_PATH);

  assert.doesNotMatch(source, /window\.location\.search/);
  assert.doesNotMatch(source, /useSearchParams/);
});

test("12) Assignment System V2 baglamina hala izin veriliyor ama Egitim Programi kendi bagimsiz prop'unu kullanir", async () => {
  const source = await read(CLIENT_PATH);

  assert.match(source, /@\/components\/assignments\/AssignmentTaskProvider/);
  assert.doesNotMatch(source, /@\/lib\/assignments\//);
});
