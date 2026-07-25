import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  mapAssignmentV2RpcError,
  normalizeAssignmentCompletionResponse,
  normalizeAssignmentStartResponse,
  parseAssignmentCompletionRequest,
  parseAssignmentStartRequest,
} from "../src/lib/assignments/assignmentV2.ts";

const CONFIG_URL = new URL(
  "../src/app/api/student/assignment-program-tasks/[taskId]/route.ts",
  import.meta.url,
);
const START_URL = new URL(
  "../src/app/api/student/assignment-program-tasks/[taskId]/start/route.ts",
  import.meta.url,
);
const COMPLETE_URL = new URL(
  "../src/app/api/student/assignment-program-tasks/[taskId]/complete-v2/route.ts",
  import.meta.url,
);
const FLAG_URL = new URL("../src/lib/assignments/assignmentV2Server.ts", import.meta.url);
const OLD_COMPLETE_URL = new URL(
  "../src/app/api/student/assignment-program-tasks/[taskId]/complete/route.ts",
  import.meta.url,
);

const TASK_ID = "550e8400-e29b-41d4-a716-446655440000";
const ATTEMPT_ID = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
const read = (url) => readFile(url, "utf8");

function validResult(overrides = {}) {
  return {
    score: 80,
    successRate: 75,
    correctCount: 3,
    wrongCount: 1,
    level: null,
    details: {},
    ...overrides,
  };
}

test("1 config: oturum signed helper ile doğrulanır ve 401 kodu modellenir", async () => {
  const source = await read(CONFIG_URL);
  assert.match(source, /verifyStudentAccess\(request\)/);
  assert.match(source, /"SESSION_REQUIRED"/);
});

test("2 config: başka öğrenci görevi TASK_NOT_OWNED ile reddedilir", async () => {
  const source = await read(CONFIG_URL);
  assert.match(source, /task\.student_id[\s\S]*access\.studentId/);
  assert.match(source, /errorResponse\("TASK_NOT_OWNED"\)/);
});

test("3 config: locked/future day ve önceki açık gün denetlenir", async () => {
  const source = await read(CONFIG_URL);
  assert.match(source, /day\.status === "locked"/);
  assert.match(source, /\.lt\("day_number", Number\(task\.day_number\)\)/);
  assert.match(source, /\.neq\("status", "completed"\)/);
});

test("4 config: süre, seviye ve settings yalnız task snapshot select'inden gelir", async () => {
  const source = await read(CONFIG_URL);
  assert.match(source, /starting_level,duration_seconds,settings/);
  assert.match(source, /startingLevel: typeof task\.starting_level/);
  assert.match(source, /durationSeconds: typeof task\.duration_seconds/);
  assert.match(source, /settings: sanitizeSettings\(task\.settings\)/);
});

test("5 config: şablon adı ve sınıf grubu sorgulanmaz veya dönmez", async () => {
  const source = await read(CONFIG_URL);
  assert.doesNotMatch(source, /template_name|class_group|templateName|classGroup/);
});

test("6 config: attempt ve start/deadline kolonları task select'ine sızmaz", async () => {
  const source = await read(CONFIG_URL);
  const select = source.match(/\.select\(\s*"([^"]+)"/)?.[1] ?? "";
  assert.doesNotMatch(select, /attempt_id|started_at|expires_at/);
});

test("7 config: URL query süre/settings manipülasyonu okunmaz", async () => {
  const source = await read(CONFIG_URL);
  assert.doesNotMatch(source, /searchParams|nextUrl|request\.url/);
  assert.match(source, /await context\.params/);
});

test("8 config: DB ve ilişki hataları fail-closed güvenli hata üretir", async () => {
  const source = await read(CONFIG_URL);
  assert.match(source, /taskError[\s\S]*CONFIG_UNAVAILABLE/);
  assert.match(source, /programError \|\| dayError[\s\S]*CONFIG_UNAVAILABLE/);
});

test("9 start: geçersiz attempt UUID parse edilmez", () => {
  assert.equal(parseAssignmentStartRequest({ attemptId: "x", exerciseSlug: "takistoskop" }), null);
});

test("10 start: studentId dahil bilinmeyen body alanları kabul edilmez", () => {
  assert.equal(
    parseAssignmentStartRequest({
      attemptId: ATTEMPT_ID,
      exerciseSlug: "takistoskop",
      studentId: TASK_ID,
    }),
    null,
  );
});

test("11 start: RPC student id'yi yalnız imzalı oturumdan alır", async () => {
  const source = await read(START_URL);
  assert.match(source, /p_student_id: access\.studentId/);
  assert.doesNotMatch(source, /p_student_id: payload|payload\.studentId/);
});

test("12 start: güvenli RPC başarı alanları normalize edilir", () => {
  const normalized = normalizeAssignmentStartResponse({
    taskId: TASK_ID,
    attemptId: ATTEMPT_ID,
    startedAt: "2026-07-25T10:00:00.000Z",
    expiresAt: "2026-07-25T10:05:00.000Z",
    serverNow: "2026-07-25T10:00:00.000Z",
    durationSeconds: 300,
    taskStatus: "in_progress",
    dayStatus: "in_progress",
    idempotent: true,
    secret: "drop-me",
  });
  assert.deepEqual(normalized, {
    ok: true,
    taskId: TASK_ID,
    attemptId: ATTEMPT_ID,
    startedAt: "2026-07-25T10:00:00.000Z",
    expiresAt: "2026-07-25T10:05:00.000Z",
    serverNow: "2026-07-25T10:00:00.000Z",
    durationSeconds: 300,
    taskStatus: "in_progress",
    dayStatus: "in_progress",
    idempotent: true,
  });
});

test("13 start: idempotent retry işareti normalize yanıtta korunur", () => {
  const normalized = normalizeAssignmentStartResponse({
    taskId: TASK_ID,
    attemptId: ATTEMPT_ID,
    startedAt: "2026-07-25T10:00:00Z",
    expiresAt: "2026-07-25T10:05:00Z",
    serverNow: "2026-07-25T10:00:03Z",
    durationSeconds: 300,
    taskStatus: "in_progress",
    dayStatus: "in_progress",
    idempotent: true,
  });
  assert.equal(normalized?.idempotent, true);
});

test("14 start: bilinen RPC hata kodları HTTP durumlarına eşlenir", () => {
  assert.equal(mapAssignmentV2RpcError("TASK_NOT_OWNED: raw").status, 403);
  assert.equal(mapAssignmentV2RpcError("TASK_NOT_FOUND: raw").status, 404);
  assert.equal(mapAssignmentV2RpcError("DAY_LOCKED: raw").status, 409);
  assert.equal(mapAssignmentV2RpcError("EXERCISE_MISMATCH: raw").status, 422);
});

test("15 start: ham DB metni güvenli eşleme mesajına dahil edilmez", () => {
  const mapped = mapAssignmentV2RpcError("TASK_LOCKED: gizli tablo ayrıntısı");
  assert.doesNotMatch(mapped.message, /gizli tablo ayrıntısı/);
  assert.equal(mapAssignmentV2RpcError("23505 duplicate secret").code, "UNKNOWN_ERROR");
});

test("16 complete-v2: feature flag kapalı kullanım güvenli ret verir", async () => {
  const [route, flag] = await Promise.all([read(COMPLETE_URL), read(FLAG_URL)]);
  assert.match(route, /isAssignmentV2Enabled\(\)[\s\S]*ASSIGNMENT_V2_DISABLED/);
  assert.match(flag, /=== "true"/);
});

test("17 complete-v2: geçersiz result body reddedilir", () => {
  assert.equal(
    parseAssignmentCompletionRequest({
      attemptId: ATTEMPT_ID,
      exerciseSlug: "takistoskop",
      result: validResult({ successRate: 101 }),
    }),
    null,
  );
});

test("18 complete-v2: duration/completedAt/programTask override alanları reddedilir", () => {
  for (const payload of [
    { attemptId: ATTEMPT_ID, exerciseSlug: "takistoskop", result: validResult(), durationSeconds: 1 },
    {
      attemptId: ATTEMPT_ID,
      exerciseSlug: "takistoskop",
      result: validResult({ details: { completedAt: "2020-01-01" } }),
    },
    {
      attemptId: ATTEMPT_ID,
      exerciseSlug: "takistoskop",
      result: validResult({ details: { programTaskId: TASK_ID } }),
    },
  ]) {
    assert.equal(parseAssignmentCompletionRequest(payload), null);
  }
});

test("19 complete-v2: RPC'ye yalnız güvenli parametreler gönderilir", async () => {
  const source = await read(COMPLETE_URL);
  assert.match(source, /p_student_id: access\.studentId/);
  assert.match(source, /p_task_id: taskId/);
  assert.match(source, /p_attempt_id: payload\.attemptId/);
  assert.match(source, /p_exercise_slug: payload\.exerciseSlug/);
  assert.match(source, /p_result: payload\.result/);
  assert.doesNotMatch(source, /p_duration|p_completed_at|p_program_task_id/);
});

test("20 complete-v2: DURATION_NOT_ELAPSED yalnız güvenli remainingSeconds döndürür", () => {
  const mapped = mapAssignmentV2RpcError("DURATION_NOT_ELAPSED: remainingSeconds=17 secret=x");
  assert.equal(mapped.status, 409);
  assert.equal(mapped.remainingSeconds, 17);
  assert.doesNotMatch(mapped.message, /secret/);
});

test("21 complete-v2: STALE_ATTEMPT 409'dur", () => {
  assert.equal(mapAssignmentV2RpcError("STALE_ATTEMPT: raw").status, 409);
});

test("22 complete-v2: RESULT_SCHEMA_INVALID 422'dir", () => {
  assert.equal(mapAssignmentV2RpcError("RESULT_SCHEMA_INVALID: raw").status, 422);
});

test("23 complete-v2: idempotent başarı alanı korunur", () => {
  const normalized = normalizeAssignmentCompletionResponse({
    ok: true,
    idempotent: true,
    taskId: TASK_ID,
    attemptId: ATTEMPT_ID,
    resultId: "16fd2706-8baf-433b-82eb-8c7fada847da",
    taskCompleted: true,
    dayCompleted: true,
    completedTasksInDay: 5,
    totalTasksInDay: 5,
    nextDayUnlocked: true,
    programCompleted: false,
    completedDays: 1,
    totalDays: 20,
    serverCompletedAt: "2026-07-25T10:05:00Z",
  });
  assert.equal(normalized?.idempotent, true);
  assert.equal(normalized?.taskCompleted, true);
});

test("24 complete-v2: beklenmeyen RPC hata kodu güvenli 500'e düşer", () => {
  const mapped = mapAssignmentV2RpcError("P0001: internal table name");
  assert.equal(mapped.status, 500);
  assert.equal(mapped.code, "UNKNOWN_ERROR");
  assert.doesNotMatch(mapped.message, /internal table name/);
});

test("eski completion route korunur ve V2 ayrı endpoint'tedir", async () => {
  const [oldRoute, v2Route] = await Promise.all([read(OLD_COMPLETE_URL), read(COMPLETE_URL)]);
  assert.match(oldRoute, /complete_student_assignment_program_task/);
  assert.doesNotMatch(oldRoute, /complete_student_assignment_program_task_v2/);
  assert.match(v2Route, /complete_student_assignment_program_task_v2/);
});
