import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  AssignmentV2LegacyPathBlockedError,
  saveExerciseResultSecure,
} from "../src/lib/results/secureResultStorage.ts";
import { assignmentV2Error } from "../src/lib/assignments/assignmentV2.ts";

const COMPLETE_URL = new URL(
  "../src/app/api/student/assignment-program-tasks/[taskId]/complete/route.ts",
  import.meta.url,
);
const RESULTS_URL = new URL("../src/app/api/student/results/route.ts", import.meta.url);
const GUARD_URL = new URL(
  "../src/lib/assignments/assignmentV2LegacyGuard.server.ts",
  import.meta.url,
);
const STORAGE_URL = new URL("../src/lib/results/secureResultStorage.ts", import.meta.url);
const FLAG_URL = new URL("../src/lib/assignments/assignmentV2Server.ts", import.meta.url);
const OLD_RPC_URL = new URL(
  "../supabase/migrations/20260725120000_complete_student_assignment_program_task_rpc.sql",
  import.meta.url,
);
const START_URL = new URL(
  "../src/app/api/student/assignment-program-tasks/[taskId]/start/route.ts",
  import.meta.url,
);
const COMPLETE_V2_URL = new URL(
  "../src/app/api/student/assignment-program-tasks/[taskId]/complete-v2/route.ts",
  import.meta.url,
);

const TASK_ID = "550e8400-e29b-41d4-a716-446655440000";
const read = (url) => readFile(url, "utf8");

function resultInput(overrides = {}) {
  return {
    exerciseType: "tachistoscope",
    exerciseTitle: "Takistoskop",
    score: 80,
    successRate: 75,
    correctCount: 3,
    wrongCount: 1,
    durationSeconds: 300,
    completedAt: "2026-07-25T10:05:00.000Z",
    ...overrides,
  };
}

function successfulResultResponse() {
  return new Response(JSON.stringify({
    result: {
      id: "16fd2706-8baf-433b-82eb-8c7fada847da",
      studentId: "e7b4c4de-34ac-4e4f-83a5-7ace40a52a98",
      exerciseType: "tachistoscope",
      exerciseTitle: "Takistoskop",
      score: 80,
      successRate: 75,
      correctCount: 3,
      wrongCount: 1,
      durationSeconds: 300,
      date: "2026-07-25T10:05:00.000Z",
      details: {},
    },
  }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}

test("legacy complete guard imzalı oturum, gerçek task ve aktif programı ortak helper ile doğrular", async () => {
  const [route, guard] = await Promise.all([read(COMPLETE_URL), read(GUARD_URL)]);
  assert.match(route, /verifyStudentAccess\(request\)/);
  assert.match(route, /inspectAssignmentV2LegacyTask\(taskId, access\.studentId\)/);
  assert.match(guard, /\.from\(TASKS_TABLE\)[\s\S]*\.select\("id,student_id,program_id"\)/);
  assert.match(guard, /task\.student_id[\s\S]*signedStudentId/);
  assert.match(guard, /\.from\(PROGRAMS_TABLE\)[\s\S]*\.select\("id,student_id,status"\)/);
  assert.match(guard, /program\.student_id[\s\S]*signedStudentId/);
  assert.match(guard, /program\.status === "active"/);
});

test("legacy complete flag açık aktif task için body parse ve eski RPC'den önce 409 keser", async () => {
  const source = await read(COMPLETE_URL);
  const guard = source.indexOf("const guard = await inspectAssignmentV2LegacyTask");
  const blocked = source.indexOf('v2GuardErrorResponse("ASSIGNMENT_V2_COMPLETION_REQUIRED")');
  const bodyParse = source.indexOf("await request.json()");
  const rpc = source.indexOf("supabase.rpc(COMPLETE_TASK_RPC");
  assert.ok(guard >= 0 && guard < blocked);
  assert.ok(blocked < bodyParse, "boş/geçersiz body guard'ı aşmamalı");
  assert.ok(blocked < rpc, "guard eski RPC'den önce çalışmalı");
});

test("legacy complete guard completed ve locked task'larda da erken kesilir", async () => {
  const guard = await read(GUARD_URL);
  assert.doesNotMatch(guard, /task\.status|status.*completed|status.*locked/);
  assert.match(guard, /activeAssignmentTask: program\.status === "active"/);
});

test("legacy complete query/body v2=false, legacy=true ve studentId override alanlarını otorite saymaz", async () => {
  const [route, guard] = await Promise.all([read(COMPLETE_URL), read(GUARD_URL)]);
  assert.doesNotMatch(route, /searchParams|nextUrl|assignmentV2Enabled|rawPayload\.v2|payload\.legacy|payload\.studentId/);
  assert.doesNotMatch(guard, /rawBody\.|searchParams|assignmentV2Enabled|payload\.(?:v2|legacy|mode|studentId)/);
  assert.match(guard, /signedStudentId/);
});

test("legacy results yalnız body'deki programTaskId adayını alır, sahipliği DB ve signed session ile doğrular", async () => {
  const [route, guard] = await Promise.all([read(RESULTS_URL), read(GUARD_URL)]);
  assert.match(route, /rawBody\.programTaskId/);
  assert.match(route, /inspectAssignmentV2LegacyTask\(candidate, access\.studentId\)/);
  assert.match(guard, /task\.student_id[\s\S]*signedStudentId/);
  assert.doesNotMatch(guard, /rawBody\.|searchParams|assignmentV2Enabled|payload\.(?:v2|legacy|mode|studentId)/);
});

test("legacy results guard sonuç validasyonu ve insert'ten önce 409 keser", async () => {
  const source = await read(RESULTS_URL);
  const guard = source.indexOf("const guard = await inspectAssignmentV2LegacyTask");
  const blocked = source.indexOf('v2GuardErrorResponse("ASSIGNMENT_V2_RESULT_ROUTE_DISABLED")');
  const validation = source.indexOf("const body = validateResultBody(rawBody)");
  const insert = source.indexOf(".insert(insertPayload)");
  assert.ok(guard >= 0 && guard < blocked);
  assert.ok(blocked < validation, "göstermelik/fake result önce guard'a takılmalı");
  assert.ok(blocked < insert, "guard result insert'ten önce çalışmalı");
});

test("legacy results bilinmeyen mode/legacy/studentId alanlarıyla active task guard'ını atlayamaz", async () => {
  const source = await read(RESULTS_URL);
  const guardSection = source.slice(
    source.indexOf("if (isAssignmentV2Enabled() && isPlainObject(rawBody)"),
    source.indexOf("const body = validateResultBody(rawBody)"),
  );
  assert.match(guardSection, /rawBody\.programTaskId/);
  assert.doesNotMatch(guardSection, /rawBody\.(?:studentId|assignmentV2Enabled|v2|legacy|mode)/);
  assert.match(source, /FORBIDDEN_BODY_KEYS/);
});

test("task yoksa 404, başka öğrenci task'ıysa 403, guard altyapı hatasıysa kontrollü 500 modellenir", () => {
  assert.equal(assignmentV2Error("TASK_NOT_FOUND").status, 404);
  assert.equal(assignmentV2Error("TASK_NOT_OWNED").status, 403);
  assert.equal(assignmentV2Error("ASSIGNMENT_V2_GUARD_UNAVAILABLE").status, 500);
  assert.doesNotMatch(assignmentV2Error("ASSIGNMENT_V2_GUARD_UNAVAILABLE").message, /supabase|sql|table|postgres/i);
});

test("401 SESSION_REQUIRED ve iki legacy 409 kodu exact kontrollü mesajlara sahiptir", () => {
  assert.equal(assignmentV2Error("SESSION_REQUIRED").status, 401);
  assert.deepEqual(assignmentV2Error("ASSIGNMENT_V2_COMPLETION_REQUIRED"), {
    code: "ASSIGNMENT_V2_COMPLETION_REQUIRED",
    status: 409,
    message: "Bu görev yeni ödev tamamlama akışıyla tamamlanmalıdır.",
  });
  assert.deepEqual(assignmentV2Error("ASSIGNMENT_V2_RESULT_ROUTE_DISABLED"), {
    code: "ASSIGNMENT_V2_RESULT_ROUTE_DISABLED",
    status: 409,
    message: "Atanmış görev sonuçları yeni ödev tamamlama akışıyla kaydedilmelidir.",
  });
});

test("SecureResultStorage explicit V2 assignment context'inde hiçbir fetch/event yoluna girmez", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    throw new Error("fetch çağrılmamalı");
  };
  try {
    await assert.rejects(
      saveExerciseResultSecure(
        resultInput({ programTaskId: TASK_ID }),
        { assignmentV2Enabled: true },
      ),
      (error) => {
        assert.ok(error instanceof AssignmentV2LegacyPathBlockedError);
        assert.equal(error.code, "ASSIGNMENT_V2_LEGACY_PATH_BLOCKED");
        return true;
      },
    );
    assert.equal(fetchCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("SecureResultStorage flag açık free mode'da eski results API'yi kullanmaya devam eder", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return successfulResultResponse();
  };
  try {
    const saved = await saveExerciseResultSecure(resultInput(), { assignmentV2Enabled: true });
    assert.equal(saved.id, "16fd2706-8baf-433b-82eb-8c7fada847da");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/student/results");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("SecureResultStorage flag kapalı assignment legacy results + complete akışını korur", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return calls.length === 1
      ? successfulResultResponse()
      : new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
  };
  try {
    const saved = await saveExerciseResultSecure(
      resultInput({ programTaskId: TASK_ID }),
      { assignmentV2Enabled: false },
    );
    assert.equal(saved.programTaskCompletionStatus, "completed");
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, "/api/student/results");
    assert.match(String(calls[0].options?.body), new RegExp(TASK_ID));
    assert.match(calls[1].url, new RegExp(`/assignment-program-tasks/${TASK_ID}/complete$`));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("server feature flag varsayılanı false kalır ve yalnız exact true ile açılır", async () => {
  const source = await read(FLAG_URL);
  assert.match(source, /process\.env\.ASSIGNMENT_V2_ENABLED/);
  assert.match(source, /=== "true"/);
  assert.doesNotMatch(source, /\?\?\s*true|\|\|\s*true/);
});

test("flag matrisi: A/B false legacy, C true free legacy, D true active assignment blocked olarak kodlanır", async () => {
  const [complete, results, storage] = await Promise.all([
    read(COMPLETE_URL),
    read(RESULTS_URL),
    read(STORAGE_URL),
  ]);
  assert.match(complete, /if \(isAssignmentV2Enabled\(\)\)/);
  assert.match(complete, /if \(guard\.activeAssignmentTask\)/);
  assert.match(complete, /supabase\.rpc\(COMPLETE_TASK_RPC/);
  assert.match(results, /isAssignmentV2Enabled\(\)[\s\S]*rawBody\.programTaskId/);
  assert.match(results, /\.insert\(insertPayload\)/);
  assert.match(storage, /programTaskId && context\.assignmentV2Enabled === true/);
});

test("eski RPC izinleri yalnız service_role execute olacak şekilde zaten güvenlidir", async () => {
  const sql = await read(OLD_RPC_URL);
  const signature = String.raw`public\.complete_student_assignment_program_task\(uuid, uuid, uuid\)`;
  for (const role of ["public", "anon", "authenticated"]) {
    assert.match(sql, new RegExp(`revoke all on function ${signature} from ${role};`, "i"));
  }
  assert.match(sql, new RegExp(`grant execute on function ${signature} to service_role;`, "i"));
});

test("V2 start/complete endpointleri ve eski RPC/route birlikte korunur", async () => {
  const [start, completeV2, completeLegacy] = await Promise.all([
    read(START_URL),
    read(COMPLETE_V2_URL),
    read(COMPLETE_URL),
  ]);
  assert.match(start, /start_student_assignment_program_task/);
  assert.match(completeV2, /complete_student_assignment_program_task_v2/);
  assert.match(completeLegacy, /complete_student_assignment_program_task/);
  assert.doesNotMatch(completeLegacy, /complete_student_assignment_program_task_v2/);
});
