import assert from "node:assert/strict";
import test from "node:test";
import { buildTeacherDashboardSummary } from "../src/lib/teachers/teacherDashboardSummary.ts";

const baseStudent = (overrides = {}) => ({ id: overrides.id ?? "student-1", name: overrides.name ?? "Ada Öğrenci", class_name: "5-A", status: "active", is_active: true, access_end_date: null, last_login_at: overrides.last_login_at ?? null, created_at: "2026-08-01T08:00:00.000Z", ...overrides });
const result = (overrides = {}) => ({ id: overrides.id ?? "result-1", student_id: overrides.student_id ?? "student-1", student_name: "Ada Öğrenci", exercise_type: overrides.exercise_type ?? "reading-speed-test", exercise_title: "Okuma Hızı", completed_at: overrides.completed_at ?? "2026-08-13T10:00:00.000Z", created_at: "2026-08-13T10:00:00.000Z", correct_count: 8, wrong_count: 2, score: 80, success_rate: 80, submission_key: overrides.id ?? "submission-1", program_task_id: null, details: overrides.details ?? { readingSpeedWpm: 120 }, ...overrides });

test("teacher dashboard maps today status, program summary and reading metrics from real rows", () => {
  const summary = buildTeacherDashboardSummary({
    students: [baseStudent(), baseStudent({ id: "student-2", name: "Bora Öğrenci" }), baseStudent({ id: "student-3", name: "Cem Öğrenci", status: "passive", is_active: false })],
    activePrograms: [
      { id: "program-1", student_id: "student-1", visible_name: "Okuma Programı", status: "active", current_day_number: 3, completed_days: 1, total_days: 10, completed_at: null },
      { id: "program-2", student_id: "student-2", visible_name: "Tamamlanan Program", status: "completed", current_day_number: 4, completed_days: 4, total_days: 4, completed_at: "2026-08-12T10:00:00.000Z" },
    ],
    xpSummaries: [],
    results: [
      result({ id: "speed-1", completed_at: "2026-08-08T10:00:00.000Z", details: { readingSpeedWpm: 100 } }),
      result({ id: "speed-2", completed_at: "2026-08-13T10:00:00.000Z", details: { readingSpeedWpm: 120 } }),
      result({ id: "comp-1", exercise_type: "reading-comprehension", exercise_title: "Anlama", completed_at: "2026-08-13T11:00:00.000Z", success_rate: 80, details: { comprehensionScore: 80 } }),
    ],
    tasks: [{ id: "task-1", program_id: "program-1", student_id: "student-1", day_number: 1, order_number: 1, exercise_slug: "reading-speed-test", exercise_title: "Okuma Hızı", result_exercise_type: "reading-speed-test", status: "completed", started_at: "2026-08-13T09:00:00.000Z", completed_at: "2026-08-13T10:00:00.000Z", result_id: "speed-2" }],
    xpEvents: [],
    now: new Date("2026-08-13T12:00:00.000Z"),
  });
  assert.equal(summary.error, null);
  assert.equal(summary.summary?.stats.totalStudents, 3);
  assert.equal(summary.summary?.stats.todayActiveStudents, 1);
  assert.equal(summary.summary?.stats.todayInactiveStudents, 1);
  assert.equal(summary.summary?.stats.todayCompletedTasks, 1);
  assert.equal(summary.summary?.stats.activeProgramStudents, 1);
  assert.equal(summary.summary?.stats.completedProgramStudents, 1);
  assert.equal(summary.summary?.stats.behindProgramStudents, 1);
  assert.equal(summary.summary?.stats.averageReadingSpeedLast7Days, 110);
  assert.equal(summary.summary?.stats.averageComprehensionLast7Days, 80);
  assert.equal(summary.summary?.stats.readingTestsLast7Days, 3);
  assert.equal(summary.summary?.improvingStudents[0]?.studentId, "student-1");
});

test("teacher dashboard uses no-data-safe metrics and caps improving students", () => {
  const summary = buildTeacherDashboardSummary({ students: [baseStudent()], activePrograms: [], xpSummaries: [], results: [], tasks: [], xpEvents: [], now: new Date("2026-08-13T12:00:00.000Z") });
  assert.equal(summary.error, null);
  assert.equal(summary.summary?.stats.averageReadingSpeedLast7Days, null);
  assert.equal(summary.summary?.stats.averageComprehensionLast7Days, null);
  assert.equal(summary.summary?.stats.readingTestsLast7Days, 0);
  assert.deepEqual(summary.summary?.improvingStudents, []);
});
