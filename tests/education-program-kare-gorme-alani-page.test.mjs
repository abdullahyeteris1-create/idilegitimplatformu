import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const PAGE_PATH = "src/app/egzersizler/kare-gorme-alani/page.tsx";

test("13) educationLaunch parametresi yoksa erken donus ile serbest akis calisir", async () => {
  const source = await read(PAGE_PATH);

  assert.match(source, /if \(!launchToken\) \{\s*return <SquareVisionExerciseClient \/>;/);
});

test("kimlik ve token sirali dogrulama akisi mevcuttur", async () => {
  const source = await read(PAGE_PATH);

  assert.match(source, /await cookies\(\)/);
  assert.match(source, /verifyStudentAccessToken/);
  assert.match(source, /if \(!access\.ok\) \{\s*redirect\("\/giris"\);/);
  assert.match(source, /readEducationProgramLaunchToken\(launchToken\)/);
  assert.match(source, /if \(!launchContext\) \{/);
});

test("4) token studentId oturum ogrencisiyle eslesmiyorsa reddedilir", async () => {
  const source = await read(PAGE_PATH);

  assert.match(source, /if \(launchContext\.studentId !== access\.studentId\) \{\s*redirectWithError\("unauthorized_task"\);/);
});

test("10) token exerciseSlug yanlissa reddedilir", async () => {
  const source = await read(PAGE_PATH);

  assert.match(
    source,
    /if \(launchContext\.exerciseSlug !== EXERCISE_SLUG\) \{\s*redirectWithError\("exercise_mismatch"\);/,
  );
});

test("11) DB exercise_slug yanlissa (ikinci kontrol) reddedilir", async () => {
  const source = await read(PAGE_PATH);

  assert.match(
    source,
    /if \(result\.value\.exerciseSlug !== EXERCISE_SLUG\) \{\s*redirectWithError\("exercise_mismatch"\);/,
  );
});

test("gorev/repository dogrulamasi getEducationProgramTaskLaunchContext uzerinden yapilir", async () => {
  const source = await read(PAGE_PATH);

  assert.match(source, /getEducationProgramTaskLaunchContext\(\s*supabase,\s*access\.studentId,\s*launchContext\.taskId,?\s*\)/);
});

test("1) basarili dogrulamada SquareVisionExerciseClient'e tipli educationProgramLaunch prop'u iletilir", async () => {
  const source = await read(PAGE_PATH);

  assert.match(source, /<SquareVisionExerciseClient\s+educationProgramLaunch=\{\{/);
  assert.match(source, /taskId: result\.value\.taskId/);
  assert.match(source, /programId: result\.value\.programId/);
  assert.match(source, /dayId: result\.value\.dayId/);
  assert.match(source, /durationSeconds: result\.value\.durationSeconds/);
  assert.match(source, /initialLevel: result\.value\.initialLevel/);
  assert.match(source, /settings: result\.value\.settings/);
});

test("15) client'a studentId veya access.studentId hicbir sekilde tasinmaz", async () => {
  const source = await read(PAGE_PATH);
  const startIndex = source.indexOf("educationProgramLaunch={{");
  const endIndex = source.indexOf("}}", startIndex);

  assert.ok(startIndex !== -1, "educationProgramLaunch prop bulunamadi");
  assert.doesNotMatch(source.slice(startIndex, endIndex), /studentId/);
});

test("16) query parametresinden yalniz educationLaunch okunur, baska hicbir key okunmaz", async () => {
  const source = await read(PAGE_PATH);

  assert.match(source, /searchParams: Promise<\{\s*\[LAUNCH_QUERY_PARAM\]\?: string;\s*\}>/);
  assert.doesNotMatch(source, /params\.duration/);
  assert.doesNotMatch(source, /params\.level/);
  assert.doesNotMatch(source, /params\.settings/);
});

test("20) hata durumunda yalniz sabit guvenli kod URL'e tasinir, ham mesaj yok", async () => {
  const source = await read(PAGE_PATH);

  assert.match(
    source,
    /redirect\(`\$\{EDUCATION_PROGRAM_ROUTE\}\?error=\$\{code\}`\)/,
  );
  assert.doesNotMatch(source, /error=\$\{result\.message/);
  assert.doesNotMatch(source, /error=\$\{.*\.message/);
});

test("HTTP 500 veya stack trace uretmez - yalniz redirect ile hata yonetimi yapilir", async () => {
  const source = await read(PAGE_PATH);

  assert.doesNotMatch(source, /NextResponse\.json/);
  assert.doesNotMatch(source, /status: 500/);
  assert.doesNotMatch(source, /throw new Error/);
});

test("11 (assignment izolasyonu) Assignment System V2'ye bagli degildir", async () => {
  const source = await read(PAGE_PATH);

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
  assert.doesNotMatch(source, /assignment-program-tasks/);
});
