import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { completeEducationProgramTask } from "../src/lib/education-programs/completeEducationProgramTaskClient.ts";

const TASK_ID = "22222222-2222-4222-8222-222222222222";

function stubFetch(handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

function jsonResponse(body) {
  return { json: async () => body };
}

function successBody(overrides = {}) {
  return {
    success: true,
    outcome: "task_completed",
    alreadyCompleted: false,
    taskId: TASK_ID,
    taskStatus: "completed",
    dayId: "33333333-3333-4333-8333-333333333333",
    dayStatus: "in_progress",
    programId: "44444444-4444-4444-8444-444444444444",
    programStatus: "active",
    unlockedTaskId: null,
    unlockedDayId: null,
    currentDayNumber: 1,
    completedDays: 0,
    totalDays: 20,
    programCompleted: false,
    ...overrides,
  };
}

// 41) Dogru endpoint'e POST.
test("41) dogru endpoint'e POST atilir (same-origin, no-store, content-type json)", async () => {
  const stub = stubFetch(() => jsonResponse(successBody()));
  try {
    await completeEducationProgramTask(TASK_ID);

    assert.equal(stub.calls.length, 1);
    assert.equal(
      stub.calls[0].url,
      `/api/student/education-program-tasks/${TASK_ID}/complete`,
    );
    assert.equal(stub.calls[0].init.method, "POST");
    assert.equal(stub.calls[0].init.credentials, "same-origin");
    assert.equal(stub.calls[0].init.cache, "no-store");
    assert.equal(stub.calls[0].init.headers["content-type"], "application/json");
  } finally {
    stub.restore();
  }
});

// 42) StudentId gondermez.
test("42) hicbir govde alaninda studentId gonderilmez", async () => {
  const stub = stubFetch(() => jsonResponse(successBody()));
  try {
    await completeEducationProgramTask(TASK_ID, "square-vision");

    const body = JSON.parse(stub.calls[0].init.body);
    assert.deepEqual(Object.keys(body), ["expectedResultExerciseType"]);
    assert.equal(body.expectedResultExerciseType, "square-vision");
  } finally {
    stub.restore();
  }
});

// 43) Opsiyonel type dogru body.
test("43) expectedResultExerciseType verildiginde govdeye eklenir", async () => {
  const stub = stubFetch(() => jsonResponse(successBody()));
  try {
    await completeEducationProgramTask(TASK_ID, "catch-same");

    const body = JSON.parse(stub.calls[0].init.body);
    assert.equal(body.expectedResultExerciseType, "catch-same");
  } finally {
    stub.restore();
  }
});

// 44) Bos type durumunda guvenli body.
test("44) expectedResultExerciseType verilmezse govde bos obje olur", async () => {
  const stub = stubFetch(() => jsonResponse(successBody()));
  try {
    await completeEducationProgramTask(TASK_ID);

    const body = JSON.parse(stub.calls[0].init.body);
    assert.deepEqual(body, {});
  } finally {
    stub.restore();
  }
});

// 45) AbortSignal aktarilir.
test("45) verilen AbortSignal fetch init'ine aktarilir", async () => {
  const controller = new AbortController();
  const stub = stubFetch(() => jsonResponse(successBody()));
  try {
    await completeEducationProgramTask(TASK_ID, undefined, { signal: controller.signal });

    assert.equal(stub.calls[0].init.signal, controller.signal);
  } finally {
    stub.restore();
  }
});

// 46) Success payload doner.
test("46) basarili yanit tam tiplenmis sekilde doner", async () => {
  const stub = stubFetch(() => jsonResponse(successBody({ outcome: "program_completed", programCompleted: true })));
  try {
    const result = await completeEducationProgramTask(TASK_ID);

    assert.equal(result.ok, true);
    assert.equal(result.outcome, "program_completed");
    assert.equal(result.programCompleted, true);
    assert.equal(result.taskId, TASK_ID);
  } finally {
    stub.restore();
  }
});

// 47) API error tipli hata olur.
test("47) API hata govdesi tipli {ok:false, code, message} olarak doner", async () => {
  const stub = stubFetch(() =>
    jsonResponse({ success: false, error: { code: "task_not_in_progress", message: "Bu görev şu anda tamamlanamaz." } }),
  );
  try {
    const result = await completeEducationProgramTask(TASK_ID);

    assert.deepEqual(result, {
      ok: false,
      code: "task_not_in_progress",
      message: "Bu görev şu anda tamamlanamaz.",
    });
  } finally {
    stub.restore();
  }
});

// 48) Malformed response guvenli hata olur.
test("48) bozuk/eksik alanli basari govdesi guvenli varsayilan hataya duser", async () => {
  const stub = stubFetch(() => jsonResponse({ success: true, outcome: "task_completed" }));
  try {
    const result = await completeEducationProgramTask(TASK_ID);

    assert.equal(result.ok, false);
    assert.equal(result.code, "completion_failed");
  } finally {
    stub.restore();
  }
});

test("json parse hatasinda guvenli varsayilan hata doner", async () => {
  const stub = stubFetch(() => ({
    json: async () => {
      throw new Error("invalid json");
    },
  }));
  try {
    const result = await completeEducationProgramTask(TASK_ID);

    assert.equal(result.ok, false);
    assert.equal(result.code, "completion_failed");
  } finally {
    stub.restore();
  }
});

test("fetch reddedilirse (network hatasi) guvenli varsayilan hata doner", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  try {
    const result = await completeEducationProgramTask(TASK_ID);

    assert.equal(result.ok, false);
    assert.equal(result.code, "completion_failed");
  } finally {
    globalThis.fetch = original;
  }
});

// 49) Otomatik retry yok.
test("49) hata durumunda hicbir otomatik tekrar deneme yapilmaz (fetch tam olarak bir kez cagrilir)", async () => {
  const stub = stubFetch(() =>
    jsonResponse({ success: false, error: { code: "completion_failed", message: "Görev tamamlanamadı." } }),
  );
  try {
    await completeEducationProgramTask(TASK_ID);

    assert.equal(stub.calls.length, 1);
  } finally {
    stub.restore();
  }
});

// 50) Storage/router/Supabase bagimliligi yok.
test("50) client helper dosyasi storage/router/Supabase/Assignment V2'ye bagli degildir", async () => {
  const source = await readFile(
    new URL(
      "../src/lib/education-programs/completeEducationProgramTaskClient.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /next\/navigation/);
  assert.doesNotMatch(source, /useRouter/);
  assert.doesNotMatch(source, /@supabase\/supabase-js/);
  assert.doesNotMatch(source, /getSupabaseServiceRoleClient/);
  assert.doesNotMatch(source, /studentId/i);
  assert.doesNotMatch(source, /@\/lib\/assignments\//);
  assert.doesNotMatch(source, /toast/i);
  assert.doesNotMatch(source, /setTimeout/);
});
