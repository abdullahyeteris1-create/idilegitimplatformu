import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const HELPER_PATH = "src/lib/education-programs/exerciseLaunchValidation.ts";

test("1) educationLaunch olmadan (token undefined) erken donus ile null doner", async () => {
  const source = await read(HELPER_PATH);

  assert.match(source, /if \(!launchToken\) \{\s*return null;/);
});

test("kimlik ve token sirali dogrulama akisi mevcuttur", async () => {
  const source = await read(HELPER_PATH);

  assert.match(source, /await cookies\(\)/);
  assert.match(source, /verifyStudentAccessToken/);
  assert.match(source, /if \(!access\.ok\) \{\s*redirect\("\/giris"\);/);
  assert.match(source, /readEducationProgramLaunchToken\(launchToken\)/);
  assert.match(source, /if \(!launchContext\) \{/);
});

test("4) token studentId oturum ogrencisiyle eslesmiyorsa reddedilir", async () => {
  const source = await read(HELPER_PATH);

  assert.match(
    source,
    /if \(launchContext\.studentId !== access\.studentId\) \{\s*redirectWithError\("unauthorized_task"\);/,
  );
});

test("10) token exerciseSlug beklenen slug ile eslesmiyorsa reddedilir", async () => {
  const source = await read(HELPER_PATH);

  assert.match(
    source,
    /if \(launchContext\.exerciseSlug !== expectedExerciseSlug\) \{\s*redirectWithError\("exercise_mismatch"\);/,
  );
});

test("11) DB exercise_slug beklenen slug ile eslesmiyorsa (ikinci kontrol) reddedilir", async () => {
  const source = await read(HELPER_PATH);

  assert.match(
    source,
    /if \(result\.value\.exerciseSlug !== expectedExerciseSlug\) \{\s*redirectWithError\("exercise_mismatch"\);/,
  );
});

test("gorev/repository dogrulamasi getEducationProgramTaskLaunchContext uzerinden yapilir", async () => {
  const source = await read(HELPER_PATH);

  assert.match(
    source,
    /getEducationProgramTaskLaunchContext\(\s*supabase,\s*access\.studentId,\s*launchContext\.taskId,?\s*\)/,
  );
});

test("basarili dogrulamada minimal tipli EducationProgramExerciseLaunchProps doner (studentId yok)", async () => {
  const source = await read(HELPER_PATH);
  const returnIndex = source.lastIndexOf("return {");
  const returnBlock = source.slice(returnIndex);

  assert.match(returnBlock, /taskId: result\.value\.taskId/);
  assert.match(returnBlock, /programId: result\.value\.programId/);
  assert.match(returnBlock, /dayId: result\.value\.dayId/);
  assert.match(returnBlock, /durationSeconds: result\.value\.durationSeconds/);
  assert.match(returnBlock, /initialLevel: result\.value\.initialLevel/);
  assert.match(returnBlock, /settings: result\.value\.settings/);
  assert.doesNotMatch(returnBlock, /studentId/);
});

test("20) hata durumunda yalniz sabit guvenli kod URL'e tasinir, ham mesaj yok", async () => {
  const source = await read(HELPER_PATH);

  assert.match(source, /redirect\(`\$\{EDUCATION_PROGRAM_ROUTE\}\?error=\$\{code\}`\)/);
  assert.doesNotMatch(source, /error=\$\{result\.message/);
  assert.doesNotMatch(source, /error=\$\{.*\.message/);
});

test("HTTP 500 veya stack trace uretmez - yalniz redirect ile hata yonetimi yapilir", async () => {
  const source = await read(HELPER_PATH);

  assert.doesNotMatch(source, /NextResponse\.json/);
  assert.doesNotMatch(source, /status: 500/);
  assert.doesNotMatch(source, /throw new Error/);
});

test("Assignment System V2'ye bagli degildir ve client bundle'a girmez (use client yok)", async () => {
  const source = await read(HELPER_PATH);

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
  assert.doesNotMatch(source, /assignment-program-tasks/);
  assert.doesNotMatch(source, /"use client"/);
});

test("fonksiyon expectedExerciseSlug'i parametre olarak alir (sabit tek slug'a kilitli degildir)", async () => {
  const source = await read(HELPER_PATH);

  assert.match(
    source,
    /export async function resolveEducationProgramExerciseLaunch\(\s*launchToken: string \| undefined,\s*expectedExerciseSlug: string,\s*\): Promise<EducationProgramExerciseLaunchProps \| null>/,
  );
});
