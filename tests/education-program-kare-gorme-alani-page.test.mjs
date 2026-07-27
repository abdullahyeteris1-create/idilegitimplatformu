import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const PAGE_PATH = "src/app/egzersizler/kare-gorme-alani/page.tsx";

// Bu dosya, kare-gorme-alani/page.tsx'in ozel/kopyalanmis launch dogrulama
// mantigindan (FAZ 3A-2'de elle yazilmis) diger 8 egzersizle ayni ortak
// resolveEducationProgramExerciseLaunch helper'ina gecirildigini dogrular.
// Dogrulama zincirinin (cookie/token/DB kontrolleri) kendisi artik
// exerciseLaunchValidation.ts icinde tek yerden test ediliyor - burada
// yalniz bu sayfanin o ortak helper'i dogru sekilde cagirdigi kontrol edilir.

test("kare-gorme-alani artik ortak resolveEducationProgramExerciseLaunch helper'ini kullanir", async () => {
  const source = await read(PAGE_PATH);

  assert.match(
    source,
    /import \{ resolveEducationProgramExerciseLaunch \} from "@\/lib\/education-programs\/exerciseLaunchValidation";/,
  );
  assert.match(source, /const EXERCISE_SLUG = "kare-gorme-alani";/);
  assert.match(
    source,
    /await resolveEducationProgramExerciseLaunch\(\s*params\[LAUNCH_QUERY_PARAM\],\s*EXERCISE_SLUG,?\s*\)/,
  );
});

test("kopyalanmis ozel launch dogrulama kodu (cookies/verifyStudentAccessToken/readEducationProgramLaunchToken/getEducationProgramTaskLaunchContext/getSupabaseServiceRoleClient/redirectWithError) kaldirilmistir", async () => {
  const source = await read(PAGE_PATH);

  assert.doesNotMatch(source, /await cookies\(\)/);
  assert.doesNotMatch(source, /verifyStudentAccessToken/);
  assert.doesNotMatch(source, /readEducationProgramLaunchToken/);
  assert.doesNotMatch(source, /getEducationProgramTaskLaunchContext/);
  assert.doesNotMatch(source, /getSupabaseServiceRoleClient/);
  assert.doesNotMatch(source, /redirectWithError/);
  assert.doesNotMatch(source, /STUDENT_SESSION_COOKIE_NAME/);
});

test("yalniz educationLaunch query parametresi okunur", async () => {
  const source = await read(PAGE_PATH);

  assert.match(source, /searchParams: Promise<\{\s*\[LAUNCH_QUERY_PARAM\]\?: string;\s*\}>/);
  assert.match(source, /const LAUNCH_QUERY_PARAM = "educationLaunch";/);
  assert.doesNotMatch(source, /params\.duration/);
  assert.doesNotMatch(source, /params\.level/);
  assert.doesNotMatch(source, /params\.settings/);
});

test("client bilesenine educationProgramLaunch prop'u undefined fallback'iyle iletilir (diger 8 egzersizle ayni desen)", async () => {
  const source = await read(PAGE_PATH);

  assert.match(
    source,
    /<SquareVisionExerciseClient educationProgramLaunch=\{educationProgramLaunch \?\? undefined\} \/>/,
  );
});

test("gecersiz/eksik launch standalone davranisa duser (page kendi null-token erken-donusunu kurmaz, sorumluluk helper'da)", async () => {
  const source = await read(PAGE_PATH);

  assert.doesNotMatch(source, /if \(!launchToken\)/);
  assert.doesNotMatch(source, /return <SquareVisionExerciseClient \/>;/);
});

test("Assignment System V2'ye bagli degildir", async () => {
  const source = await read(PAGE_PATH);

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
  assert.doesNotMatch(source, /assignment-program-tasks/);
});

test("HTTP 500 veya stack trace uretmez", async () => {
  const source = await read(PAGE_PATH);

  assert.doesNotMatch(source, /NextResponse\.json/);
  assert.doesNotMatch(source, /status: 500/);
  assert.doesNotMatch(source, /throw new Error/);
});
