import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

process.env.EDUCATION_PROGRAM_LAUNCH_SECRET ||= "test-secret-launch-token-value";

const {
  createEducationProgramLaunchToken,
  readEducationProgramLaunchToken,
  EDUCATION_PROGRAM_LAUNCH_TOKEN_MAX_AGE_SECONDS,
} = await import("../src/lib/education-programs/launchToken.ts");

const TASK_ID = "11111111-1111-4111-8111-111111111111";
const STUDENT_ID = "22222222-2222-4222-8222-222222222222";
const SLUG = "kare-gorme-alani";

test("gecerli baglam imzalanip geri okunabilir (signed context oluşur)", () => {
  const token = createEducationProgramLaunchToken({
    taskId: TASK_ID,
    studentId: STUDENT_ID,
    exerciseSlug: SLUG,
  });

  assert.ok(token);
  assert.match(token, /^[\w-]+\.[\w-]+$/);

  const decoded = readEducationProgramLaunchToken(token);
  assert.ok(decoded);
  assert.equal(decoded.taskId, TASK_ID);
  assert.equal(decoded.studentId, STUDENT_ID);
  assert.equal(decoded.exerciseSlug, SLUG);
});

test("degistirilmis payload veya imza reddedilir (URL manipülasyonu)", () => {
  const token = createEducationProgramLaunchToken({
    taskId: TASK_ID,
    studentId: STUDENT_ID,
    exerciseSlug: SLUG,
  });
  const [payload, signature] = token.split(".");

  const tamperedPayload = Buffer.from(
    JSON.stringify({
      taskId: "33333333-3333-4333-8333-333333333333",
      studentId: STUDENT_ID,
      exerciseSlug: SLUG,
      issuedAt: Date.now(),
    }),
  ).toString("base64url");

  assert.equal(readEducationProgramLaunchToken(`${tamperedPayload}.${signature}`), null);
  assert.equal(readEducationProgramLaunchToken(`${payload}.bozuk-imza`), null);
  assert.equal(readEducationProgramLaunchToken("gecersiz-token"), null);
  assert.equal(readEducationProgramLaunchToken(""), null);
});

test("süresi dolan token reddedilir", () => {
  const secret = process.env.EDUCATION_PROGRAM_LAUNCH_SECRET;
  const expiredPayload = Buffer.from(
    JSON.stringify({
      taskId: TASK_ID,
      studentId: STUDENT_ID,
      exerciseSlug: SLUG,
      issuedAt: Date.now() - (EDUCATION_PROGRAM_LAUNCH_TOKEN_MAX_AGE_SECONDS + 60) * 1000,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(expiredPayload).digest("base64url");

  assert.equal(readEducationProgramLaunchToken(`${expiredPayload}.${signature}`), null);
});

test("gelecekteki issuedAt reddedilir", () => {
  const secret = process.env.EDUCATION_PROGRAM_LAUNCH_SECRET;
  const futurePayload = Buffer.from(
    JSON.stringify({
      taskId: TASK_ID,
      studentId: STUDENT_ID,
      exerciseSlug: SLUG,
      issuedAt: Date.now() + 60_000,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(futurePayload).digest("base64url");

  assert.equal(readEducationProgramLaunchToken(`${futurePayload}.${signature}`), null);
});
