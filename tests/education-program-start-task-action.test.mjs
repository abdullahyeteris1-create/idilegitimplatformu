import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("Server Action kimligi yalniz imzali ogrenci cookie'sinden cozer", async () => {
  const source = await read("src/app/ogrenci/egitim-programim/actions.ts");

  assert.match(source, /"use server"/);
  assert.match(source, /await cookies\(\)/);
  assert.match(source, /verifyStudentAccessToken/);
  assert.match(source, /if \(!access\.ok\)/);
  assert.match(source, /redirect\("\/giris"\)/);
});

test("Server Action admin oturumu/ADMIN cookie mekanizmasini kullanmaz (yapisal admin reddi)", async () => {
  const source = await read("src/app/ogrenci/egitim-programim/actions.ts");

  assert.doesNotMatch(source, /ADMIN_SESSION_COOKIE_NAME/);
  assert.doesNotMatch(source, /hasAdminSession/);
  assert.doesNotMatch(source, /isAdminSessionValid/);
});

test("Server Action client'tan studentId almaz, yalniz taskId formdan okunur", async () => {
  const source = await read("src/app/ogrenci/egitim-programim/actions.ts");

  assert.match(source, /formData\.get\("taskId"\)/);
  assert.doesNotMatch(source, /formData\.get\("studentId"\)/);
  assert.doesNotMatch(source, /formData\.get\("programId"\)/);
  assert.doesNotMatch(source, /formData\.get\("dayId"\)/);
});

test("Server Action repository -> RPC -> imzali baglam -> redirect akisini izler", async () => {
  const source = await read("src/app/ogrenci/egitim-programim/actions.ts");

  assert.match(source, /startEducationProgramTask\(supabase, access\.studentId, taskId\)/);
  assert.match(source, /resolveEducationProgramExerciseRoute/);
  assert.match(source, /createEducationProgramLaunchToken/);
  assert.match(source, /redirect\(`\$\{route\}\?\$\{EDUCATION_PROGRAM_LAUNCH_QUERY_PARAM\}=/);
});

test("Server Action eski Assignment System V2'ye bagli degildir", async () => {
  const source = await read("src/app/ogrenci/egitim-programim/actions.ts");

  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /@\/components\/assignments\//);
  assert.doesNotMatch(source, /assignment-program-tasks/);
  assert.doesNotMatch(source, /assignment-items/);
  assert.doesNotMatch(source, /student_assignment_program/);
});
