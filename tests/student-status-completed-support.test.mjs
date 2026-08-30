import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const MIGRATION_URL = new URL(
  "../supabase/migrations/20260728173000_add_completed_student_status.sql",
  import.meta.url,
);
const STATUS_HELPER_URL = new URL("../src/lib/students/studentStatus.ts", import.meta.url);
const ADMIN_CREATE_URL = new URL("../src/app/api/admin/students/route.ts", import.meta.url);
const ADMIN_UPDATE_URL = new URL("../src/app/api/admin/students/[studentId]/route.ts", import.meta.url);
const TRACKING_CLIENT_URL = new URL(
  "../src/components/teacher-panel/TeacherStudentTrackingClient.tsx",
  import.meta.url,
);
const DASHBOARD_OVERVIEW_URL = new URL(
  "../src/components/teacher-panel/TeacherDashboardOverview.tsx",
  import.meta.url,
);
const STUDENT_STORAGE_URL = new URL("../src/lib/students/studentStorage.ts", import.meta.url);
const ACCESS_CHECK_URL = new URL("../src/lib/auth/verifyStudentAccess.ts", import.meta.url);
const ACCESS_DATES_URL = new URL("../src/lib/students/studentAccessDates.ts", import.meta.url);
const STATUS_RUNTIME_URL = new URL("../src/lib/students/studentStatus.ts", import.meta.url);

async function read(url) {
  return readFile(url, "utf8");
}

test("completed ogrenci status migration check constrainti genisletir", async () => {
  const sql = await read(MIGRATION_URL);

  assert.match(sql, /drop constraint if exists students_status_check/);
  assert.match(sql, /check \(status in \('active', 'passive', 'completed'\)\)/);
});

test("status helper completed label ve filtreleri tanir", async () => {
  const source = await read(STATUS_HELPER_URL);

  assert.match(source, /export const STUDENT_STATUSES = \["active", "passive", "completed"\] as const;/);
  assert.match(source, /Eğitimi Tamamlandı/);
  assert.match(source, /Tamamlanmış Eğitimler/);
});

test("admin create ve update route'lari completed statusu kabul eder", async () => {
  const createSource = await read(ADMIN_CREATE_URL);
  const updateSource = await read(ADMIN_UPDATE_URL);

  assert.match(createSource, /isStudentStatus\(body\.status\)/);
  assert.match(createSource, /normalizeStudentStatus\(body\.status\)/);
  assert.match(createSource, /getStudentIsActiveValue\(status\)/);

  assert.match(updateSource, /isStudentStatus\(body\.status\)/);
  assert.match(updateSource, /normalizeStudentStatus\(body\.status\)/);
  assert.match(updateSource, /getStudentIsActiveValue\(normalizeStudentStatus\(body\.status\)\)/);
});

test("teacher tracking listesi completed'i varsayilan gosterimden cikarir", async () => {
  const source = await read(TRACKING_CLIENT_URL);

  assert.match(source, /useState<StatusFilter>\("current"\)/);
  assert.match(source, /value: "completed"/);
  assert.match(source, /isCurrentStudentStatus\(student\.status\)/);
  assert.match(source, /getStudentStatusLabel\(student\.status\)/);
});

test("dashboard completed ogrenci sayisini ayrik gösterir", async () => {
  const source = await read(DASHBOARD_OVERVIEW_URL);

  assert.match(source, /stats\.completedStudents/);
  assert.match(source, /label=\"Tamamlanan öğrenci\"/);
});

test("local student cache ve access kontrolu completed'i korur", async () => {
  const storageSource = await read(STUDENT_STORAGE_URL);
  const accessSource = await read(ACCESS_CHECK_URL);

  assert.match(storageSource, /normalizeStudentStatus\([\s\S]*?student\.status/s);
  assert.match(storageSource, /status: normalizeStudentStatus\(studentInput\.status, "active"\)/);
  assert.match(storageSource, /status,\s*educationStatus:/s);
  assert.match(accessSource, /status === "completed"/);
});

test("completed erisimi is_active degeri false olsa bile passive sayilmaz", async () => {
  const { isStudentActiveStatus } = await import(ACCESS_CHECK_URL);

  assert.equal(isStudentActiveStatus(true, "active"), true);
  assert.equal(isStudentActiveStatus(false, "completed"), true);
  assert.equal(isStudentActiveStatus(true, "completed"), true);
  assert.equal(isStudentActiveStatus(true, "passive"), false);
  assert.equal(isStudentActiveStatus(false, "active"), false);
});

test("completed status kaydi is_active true olarak yazilir, passive false kalir", async () => {
  const { getStudentIsActiveValue } = await import(STATUS_RUNTIME_URL);

  assert.equal(getStudentIsActiveValue("active"), true);
  assert.equal(getStudentIsActiveValue("completed"), true);
  assert.equal(getStudentIsActiveValue("passive"), false);
});

test("active ve completed erisim tarihi gecerliyken, gecmis tarih reddedilir", async () => {
  const { checkStudentDateAccess } = await import(ACCESS_DATES_URL);

  assert.equal(checkStudentDateAccess("2026-01-01", "2026-12-31", "2026-08-30").allowed, true);
  assert.equal(checkStudentDateAccess("2026-01-01", "2026-08-30", "2026-08-30").allowed, true);
  assert.equal(checkStudentDateAccess("2026-01-01", "2026-08-29", "2026-08-30").allowed, false);
});
