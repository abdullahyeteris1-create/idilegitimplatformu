import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";

const routeSource = readFileSync("src/app/api/student/results/route.ts", "utf8");

function createHarness({ enabled = true, authenticated = true, rows = [] } = {}) {
  const calls = { from: [], eq: [], neq: [], persisted: [] };
  const access = authenticated
    ? { ok: true, studentId: "student-own", username: "own", paragraphExercisesEnabled: enabled }
    : { ok: false, status: 401, message: "Giriş gerekli.", clearSessionCookie: false };

  function resultsQuery() {
    let filtered = [...rows];
    return {
      select() { return this; },
      eq(field, value) {
        calls.eq.push([field, value]);
        filtered = filtered.filter((row) => row[field] === value);
        return this;
      },
      neq(field, value) {
        calls.neq.push([field, value]);
        filtered = filtered.filter((row) => row[field] !== value);
        return this;
      },
      async order() { return { data: filtered, error: null }; },
    };
  }

  function studentQuery() {
    return {
      select() { return this; },
      eq(field, value) {
        calls.eq.push([field, value]);
        return this;
      },
      async maybeSingle() {
        return { data: { id: "student-own", name: "Own Student", username: "own" }, error: null };
      },
    };
  }

  const client = {
    from(table) {
      calls.from.push(table);
      return table === "exercise_results" ? resultsQuery() : studentQuery();
    },
  };
  const modules = {
    "next/server": {
      NextResponse: {
        json(body, init = {}) {
          return { body, status: init.status ?? 200, headers: init.headers ?? {}, cookies: { set() {} } };
        },
      },
    },
    "@/lib/auth/studentSession": { clearStudentSessionCookie() {} },
    "@/lib/auth/verifyStudentAccess": { verifyStudentAccess: async () => access },
    "@/lib/assignments/exerciseCatalog": { ASSIGNMENT_EXERCISE_BY_SLUG: new Map() },
    "@/lib/assignments/assignmentRepository": {
      getAssignmentItemById: async () => null,
      getDailyAssignmentById: async () => null,
    },
    "@/lib/supabase/server": { getSupabaseServerClient: () => client },
    "@/lib/xp/xpRepository": {
      recordStudentResultAndAwardXp: async () => null,
      getStudentXpSnapshotByStudentId: async () => ({ totalXp: 0 }),
    },
    "@/lib/xp/xpPolicy": {
      exerciseTypeAwardsXp: () => false,
      getExerciseXpAward: () => null,
      getExerciseXpEventType: () => "exercise",
    },
    "@/lib/results/secureResultRepository": {
      recordStudentResultWithoutXp: async (_client, payload) => {
        calls.persisted.push(payload);
        return {
          replayed: false,
          resultRow: {
            id: "saved",
            student_id: payload.studentId,
            exercise_type: payload.exerciseType,
            exercise_title: payload.exerciseTitle,
            correct_count: payload.correctCount,
            wrong_count: payload.wrongCount,
            score: payload.score,
            success_rate: payload.successRate,
            completed_at: payload.completedAt,
            created_at: payload.completedAt,
            details: payload.details,
          },
        };
      },
    },
  };
  const compiled = ts.transpileModule(routeSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const compiledModule = { exports: {} };
  const context = vm.createContext({
    module: compiledModule,
    exports: compiledModule.exports,
    require(id) {
      if (!(id in modules)) throw new Error(`Unexpected import: ${id}`);
      return modules[id];
    },
    process: { env: { SUPABASE_SERVICE_ROLE_KEY: "test-only" } },
    TextEncoder,
    Date,
    Object,
    Array,
    Set,
    Number,
    String,
    Boolean,
    JSON,
  });
  new vm.Script(compiled, { filename: "student-results-route.compiled.cjs" }).runInContext(context);
  return { route: compiledModule.exports, calls };
}

function request(url = "https://example.test/api/student/results", body) {
  return {
    nextUrl: new URL(url),
    async json() { return body; },
  };
}

const rows = [
  { id: "p", student_id: "student-own", exercise_type: "paragraph", exercise_title: "Paragraph" },
  { id: "o", student_id: "student-own", exercise_type: "color-match", exercise_title: "Color" },
  { id: "foreign", student_id: "student-other", exercise_type: "color-match", exercise_title: "Foreign" },
];

const paragraphBody = {
  exerciseType: "paragraph",
  exerciseTitle: "Paragraph",
  score: 80,
  successRate: 80,
  correctCount: 1,
  wrongCount: 0,
  durationSeconds: 2,
  completedAt: "2026-09-01T10:00:00.000Z",
  submissionKey: "paragraph-security-test",
  details: {
    category: "main_idea",
    totalQuestions: 1,
    averageResponseTimeMs: 2_000,
    completedAt: "2026-09-01T10:00:00.000Z",
    questionIds: "q1",
    correctAnswers: 1,
    wrongAnswers: 0,
    answers: [{ questionId: "q1", category: "main_idea", correct: true, responseTimeMs: 2_000 }],
  },
};

test("enabled student GET receives only their own paragraph and other results", async () => {
  const { route, calls } = createHarness({ enabled: true, rows });
  const response = await route.GET(request());
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.results.map((item) => item.id), ["p", "o"]);
  assert.deepEqual(calls.eq[0], ["student_id", "student-own"]);
  assert.equal(calls.neq.length, 0);
});

test("disabled student GET excludes paragraph but preserves other results", async () => {
  const { route, calls } = createHarness({ enabled: false, rows });
  const response = await route.GET(request());
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.results.map((item) => item.id), ["o"]);
  assert.deepEqual(calls.neq, [["exercise_type", "paragraph"]]);
});

test("forged studentId query is rejected and cannot change ownership filter", async () => {
  const { route, calls } = createHarness({ enabled: true, rows });
  const response = await route.GET(request("https://example.test/api/student/results?studentId=student-other"));
  assert.equal(response.status, 400);
  assert.equal(calls.from.length, 0);
});

test("unauthenticated GET and POST remain denied", async () => {
  const { route, calls } = createHarness({ authenticated: false, rows });
  assert.equal((await route.GET(request())).status, 401);
  assert.equal((await route.POST(request(undefined, paragraphBody))).status, 401);
  assert.equal(calls.persisted.length, 0);
});

test("enabled paragraph POST persists using verified student identity", async () => {
  const { route, calls } = createHarness({ enabled: true });
  const response = await route.POST(request(undefined, paragraphBody));
  assert.equal(response.status, 201);
  assert.equal(calls.persisted.length, 1);
  assert.equal(calls.persisted[0].studentId, "student-own");
  assert.equal(calls.persisted[0].exerciseType, "paragraph");
});

test("disabled paragraph POST returns 403 before DB access or persistence", async () => {
  const { route, calls } = createHarness({ enabled: false });
  const response = await route.POST(request(undefined, paragraphBody));
  assert.equal(response.status, 403);
  assert.equal(calls.from.length, 0);
  assert.equal(calls.persisted.length, 0);
});

test("body student identity override is rejected before persistence", async () => {
  const { route, calls } = createHarness({ enabled: true });
  const response = await route.POST(request(undefined, { ...paragraphBody, studentId: "student-other" }));
  assert.equal(response.status, 400);
  assert.equal(calls.persisted.length, 0);
});

test("paragraph-looking title does not gate a canonical non-paragraph type", async () => {
  const { route, calls } = createHarness({ enabled: false });
  const response = await route.POST(request(undefined, {
    ...paragraphBody,
    exerciseType: "color-match",
    exerciseTitle: "Paragraph",
    submissionKey: "canonical-type-test",
    details: {},
  }));
  assert.equal(response.status, 201);
  assert.equal(calls.persisted[0].exerciseType, "color-match");
});
