import assert from "node:assert/strict";
import test from "node:test";

process.env.ASSIGNMENT_V2_ENABLED = "true";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://assignment-v2.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
process.env.STUDENT_SESSION_SECRET = "test-student-session-secret";

const [{ NextRequest }, { createStudentSessionToken }, completeRoute, resultsRoute] = await Promise.all([
  import("next/server.js"),
  import("../src/lib/auth/studentSession.ts"),
  import("../src/app/api/student/assignment-program-tasks/[taskId]/complete/route.ts"),
  import("../src/app/api/student/results/route.ts"),
]);

const STUDENT_ID = "e7b4c4de-34ac-4e4f-83a5-7ace40a52a98";
const OTHER_STUDENT_ID = "4cbf4d31-9b80-4bbf-b8bc-cf74af968963";
const TASK_ID = "550e8400-e29b-41d4-a716-446655440000";
const PROGRAM_ID = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
const TOKEN = createStudentSessionToken(STUDENT_ID, "student", 0);

assert.ok(TOKEN);

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installSupabaseFetch({
  taskStudentId = STUDENT_ID,
  taskExists = true,
  taskStatus = "available",
  programStatus = "active",
} = {}) {
  const calls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const method = init?.method ?? (typeof input === "string" ? "GET" : input.method);
    calls.push({ url, method });

    if (url.pathname === "/rest/v1/students") {
      return jsonResponse({
        id: STUDENT_ID,
        username: "student",
        session_version: 0,
        is_active: true,
        status: "active",
        education_start_date: null,
        access_end_date: null,
      });
    }
    if (url.pathname === "/rest/v1/student_assignment_program_tasks") {
      return jsonResponse(taskExists
        ? { id: TASK_ID, student_id: taskStudentId, program_id: PROGRAM_ID, status: taskStatus }
        : null);
    }
    if (url.pathname === "/rest/v1/student_assignment_programs") {
      return jsonResponse({
        id: PROGRAM_ID,
        student_id: STUDENT_ID,
        status: programStatus,
      });
    }

    throw new Error(`Beklenmeyen Supabase çağrısı: ${method} ${url.pathname}`);
  };

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

function studentRequest(url, init = {}) {
  return new NextRequest(url, {
    ...init,
    headers: {
      cookie: `idil_student_session=${TOKEN}`,
      ...(init.headers ?? {}),
    },
  });
}

async function responseBody(response) {
  return response.json();
}

test("direct complete: empty body + query v2=false aktif task'ta 409, eski RPC çağrısı yok", async () => {
  const mock = installSupabaseFetch();
  try {
    const response = await completeRoute.POST(
      studentRequest(`http://localhost/api/student/assignment-program-tasks/${TASK_ID}/complete?v2=false`, {
        method: "POST",
      }),
      { params: Promise.resolve({ taskId: TASK_ID }) },
    );
    assert.equal(response.status, 409);
    assert.deepEqual(await responseBody(response), {
      ok: false,
      error: {
        code: "ASSIGNMENT_V2_COMPLETION_REQUIRED",
        message: "Bu görev yeni ödev tamamlama akışıyla tamamlanmalıdır.",
      },
    });
    assert.equal(mock.calls.some(({ url }) => url.pathname.includes("/rpc/")), false);
  } finally {
    mock.restore();
  }
});

test("direct results: fake result + legacy/studentId override aktif task'ta insert'ten önce 409", async () => {
  const mock = installSupabaseFetch();
  try {
    const response = await resultsRoute.POST(
      studentRequest("http://localhost/api/student/results?v2=false", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programTaskId: TASK_ID,
          legacy: true,
          assignmentV2Enabled: false,
          studentId: OTHER_STUDENT_ID,
          result: {},
        }),
      }),
    );
    assert.equal(response.status, 409);
    assert.equal((await responseBody(response)).error.code, "ASSIGNMENT_V2_RESULT_ROUTE_DISABLED");
    assert.equal(
      mock.calls.some(({ url, method }) => url.pathname === "/rest/v1/exercise_results" && method === "POST"),
      false,
    );
  } finally {
    mock.restore();
  }
});

test("direct complete: başka öğrenci task'ı signed session override edilemediği için 403", async () => {
  const mock = installSupabaseFetch({ taskStudentId: OTHER_STUDENT_ID });
  try {
    const response = await completeRoute.POST(
      studentRequest(`http://localhost/api/student/assignment-program-tasks/${TASK_ID}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: OTHER_STUDENT_ID, legacy: true }),
      }),
      { params: Promise.resolve({ taskId: TASK_ID }) },
    );
    assert.equal(response.status, 403);
    assert.equal((await responseBody(response)).error.code, "TASK_NOT_OWNED");
  } finally {
    mock.restore();
  }
});

test("direct results: bulunmayan programTaskId 404 ve result insert yok", async () => {
  const mock = installSupabaseFetch({ taskExists: false });
  try {
    const response = await resultsRoute.POST(
      studentRequest("http://localhost/api/student/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programTaskId: TASK_ID }),
      }),
    );
    assert.equal(response.status, 404);
    assert.equal((await responseBody(response)).error.code, "TASK_NOT_FOUND");
    assert.equal(
      mock.calls.some(({ url, method }) => url.pathname === "/rest/v1/exercise_results" && method === "POST"),
      false,
    );
  } finally {
    mock.restore();
  }
});

test("direct complete: task statusundan bağımsız aktif program guard'ı 409 üretir", async () => {
  for (const representedStatus of ["completed", "locked"]) {
    const mock = installSupabaseFetch({ taskStatus: representedStatus });
    try {
      const response = await completeRoute.POST(
        studentRequest(`http://localhost/api/student/assignment-program-tasks/${TASK_ID}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ representedStatus }),
        }),
        { params: Promise.resolve({ taskId: TASK_ID }) },
      );
      assert.equal(response.status, 409);
      assert.equal((await responseBody(response)).error.code, "ASSIGNMENT_V2_COMPLETION_REQUIRED");
    } finally {
      mock.restore();
    }
  }
});

test("direct complete: oturumsuz istek kontrollü 401 SESSION_REQUIRED döner", async () => {
  const response = await completeRoute.POST(
    new NextRequest(`http://localhost/api/student/assignment-program-tasks/${TASK_ID}/complete`, {
      method: "POST",
    }),
    { params: Promise.resolve({ taskId: TASK_ID }) },
  );
  assert.equal(response.status, 401);
  assert.equal((await responseBody(response)).error.code, "SESSION_REQUIRED");
});
