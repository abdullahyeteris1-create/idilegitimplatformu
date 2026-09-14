import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const VERIFY_ACCESS_URL = new URL("../src/lib/auth/verifyStudentAccess.ts", import.meta.url);
const DASHBOARD_URL = new URL("../src/app/ogrenci/page.tsx", import.meta.url);
const verifyAccessSource = await readFile(VERIFY_ACCESS_URL, "utf8");
const dashboardSource = await readFile(DASHBOARD_URL, "utf8");

function compileVerifyStudentAccess() {
  return ts.transpileModule(verifyAccessSource, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

function createAccessHarness({ session = { studentId: "student-1", username: "ogrenci", sessionVersion: 4 }, queryResults = [] } = {}) {
  let queryCallCount = 0;
  const logs = [];
  const client = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle() {
                  const result = queryResults[queryCallCount];
                  queryCallCount += 1;
                  if (result instanceof Error) return Promise.reject(result);
                  return Promise.resolve(result);
                },
              };
            },
          };
        },
      };
    },
  };

  const compiledModule = { exports: {} };
  const context = vm.createContext({
    console: { error: (entry) => logs.push(entry) },
    exports: compiledModule.exports,
    module: compiledModule,
    Promise,
    process: { env: {} },
    require(specifier) {
      if (specifier === "@/lib/auth/studentSession") {
        return {
          parseSessionVersion: (value) => Number.isSafeInteger(value) ? value : null,
          readStudentSessionToken: () => session,
          STUDENT_SESSION_COOKIE_NAME: "idil_student_session",
          STUDENT_SESSION_EXPIRED_MESSAGE: "expired",
        };
      }
      if (specifier === "@/lib/students/studentAccessDates") {
        return { checkStudentDateAccess: () => ({ allowed: true }) };
      }
      if (specifier === "@/lib/supabase/server") {
        return { getSupabaseServiceRoleClient: () => client };
      }
      if (specifier === "@/lib/paragraph-exercises/paragraphAccessPolicy") {
        return { canAccessParagraphExercises: (student) => student?.paragraphExercisesEnabled === true };
      }
      throw new Error(`Beklenmeyen import: ${specifier}`);
    },
    setTimeout(callback) {
      callback();
      return 1;
    },
  });

  new vm.Script(compileVerifyStudentAccess(), { filename: "verifyStudentAccess.compiled.cjs" }).runInContext(context);
  return {
    exports: compiledModule.exports,
    getQueryCallCount: () => queryCallCount,
    logs,
  };
}

function activeStudent(paragraphExercisesEnabled = false) {
  return {
    data: {
      id: "student-1",
      username: "ogrenci",
      session_version: 4,
      is_active: true,
      status: "active",
      education_start_date: null,
      access_end_date: null,
      paragraph_exercises_enabled: paragraphExercisesEnabled,
    },
    error: null,
    status: 200,
  };
}

function gatewayTimeout() {
  return {
    data: null,
    error: { code: "PGRST003", message: "Gateway Timeout" },
    status: 504,
  };
}

test("ilk transient gateway timeout sonrasi bir kez retry edip access verir", async () => {
  const harness = createAccessHarness({ queryResults: [gatewayTimeout(), activeStudent(true)] });
  const result = await harness.exports.verifyStudentAccessToken("valid-token");

  assert.equal(harness.getQueryCallCount(), 2);
  assert.equal(result.ok, true);
  assert.equal(result.paragraphExercisesEnabled, true);
});

test("iki transient hata sonrasi structured transient_error doner", async () => {
  const harness = createAccessHarness({ queryResults: [gatewayTimeout(), gatewayTimeout()] });
  const result = await harness.exports.verifyStudentAccessToken("valid-token");

  assert.equal(harness.getQueryCallCount(), 2);
  assert.deepEqual(
    JSON.parse(JSON.stringify(result)),
    {
      ok: false,
      status: 503,
      message: "Ogrenci erisimi gecici olarak dogrulanamadi. Lutfen tekrar deneyin.",
      clearSessionCookie: false,
      reason: "transient_error",
    },
  );
});

test("invalid session DB sorgusu ve retry baslatmaz", async () => {
  const harness = createAccessHarness({ session: null, queryResults: [activeStudent()] });
  const result = await harness.exports.verifyStudentAccessToken("invalid-token");

  assert.equal(harness.getQueryCallCount(), 0);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "session_invalid");
  assert.equal(result.status, 401);
});

test("inactive student business denial icin retry yapilmaz", async () => {
  const inactive = activeStudent();
  inactive.data.is_active = false;
  inactive.data.status = "passive";
  const harness = createAccessHarness({ queryResults: [inactive, activeStudent()] });
  const result = await harness.exports.verifyStudentAccessToken("valid-token");

  assert.equal(harness.getQueryCallCount(), 1);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "student_inactive");
  assert.equal(result.status, 403);
});

test("non-transient Supabase error retry edilmez", async () => {
  const harness = createAccessHarness({
    queryResults: [{ data: null, error: { code: "42703", message: "column missing" }, status: 400 }, activeStudent()],
  });
  const result = await harness.exports.verifyStudentAccessToken("valid-token");

  assert.equal(harness.getQueryCallCount(), 1);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "access_check_failed");
  assert.equal(result.status, 500);
});

test("paragraph access true ve false map davranisi korunur", async () => {
  const enabledHarness = createAccessHarness({ queryResults: [activeStudent(true)] });
  const disabledHarness = createAccessHarness({ queryResults: [activeStudent(false)] });

  assert.equal((await enabledHarness.exports.verifyStudentAccessToken("valid-token")).paragraphExercisesEnabled, true);
  assert.equal((await disabledHarness.exports.verifyStudentAccessToken("valid-token")).paragraphExercisesEnabled, false);
});

test("dashboard transient access hatasini login redirectine cevirmez", () => {
  assert.match(dashboardSource, /if \(access\.status >= 500\) \{[^]*return <StudentAccessUnavailable \/>/);
  assert.match(dashboardSource, /href="\/ogrenci"[^]*Tekrar Dene/);
  assert.match(dashboardSource, /if \(!access\.ok\) \{[^]*redirect\("\/giris"\)/);
  assert.ok(dashboardSource.indexOf("access.status >= 500") < dashboardSource.indexOf('redirect("/giris")'));
});
